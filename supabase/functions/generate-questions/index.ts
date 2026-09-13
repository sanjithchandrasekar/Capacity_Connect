import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { material_id, course_id, content, topic } = await req.json()

    if (!content || !course_id) {
      return new Response(
        JSON.stringify({ error: "content and course_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Get Gemini key from environment
    const geminiKey = Deno.env.get("GEMINI_API_KEY")
    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Truncate content to fit within token limits (roughly 12k chars ≈ 3k tokens)
    const truncatedContent = content.slice(0, 12000)

    const systemPrompt = `You are an expert assessment question generator for Ministry of Earth Sciences (MoES) training courses. 
Generate high-quality MCQ (Multiple Choice Questions) based on the provided course material.

Rules:
- Generate exactly 5 questions per request
- Each question must have 4 options (A, B, C, D)
- Only one correct answer per question
- Questions should test understanding, not just recall
- Include a brief explanation for the correct answer
- Questions should be relevant to Indian meteorology, oceanography, disaster management, or earth sciences context where applicable
- Vary difficulty: 2 easy, 2 medium, 1 hard
- Return valid JSON only, no markdown`

    const userPrompt = `Generate 5 MCQ questions based on this course material:

Topic: ${topic || "General Course Content"}

Material Content:
${truncatedContent}

Return a JSON array with this exact format:
[
  {
    "question_text": "What is ...?",
    "options": {"A": "Option 1", "B": "Option 2", "C": "Option 3", "D": "Option 4"},
    "correct_answer": "B",
    "explanation": "Because ..."
  }
]`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: userPrompt }]
        }],
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
          responseMimeType: "application/json",
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error("Gemini API error:", errText)
      return new Response(
        JSON.stringify({ error: "AI generation failed", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const aiData = await response.json()
    const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || ""

    // Extract JSON from the response (handle markdown code blocks)
    let questions
    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error("No JSON array found in AI response")
      questions = JSON.parse(jsonMatch[0])
    } catch (parseErr) {
      console.error("Parse error:", parseErr, "Raw text:", rawText)
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: rawText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Validate question structure
    const validQuestions = questions.filter((q: any) =>
      q.question_text &&
      q.options &&
      q.options.A && q.options.B && q.options.C && q.options.D &&
      ["A", "B", "C", "D"].includes(q.correct_answer)
    )

    // Save questions to database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    // Find or create assessment for this course
    let { data: assessment } = await supabase
      .from("assessments")
      .select("id")
      .eq("course_id", course_id)
      .single()

    if (!assessment) {
      const { data: newAssessment } = await supabase
        .from("assessments")
        .insert({
          course_id,
          title: "Course Assessment",
          passing_score: 60,
        })
        .select("id")
        .single()
      assessment = newAssessment
    }

    if (!assessment) {
      return new Response(
        JSON.stringify({ error: "Failed to create/find assessment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Get current max position
    const { data: existing } = await supabase
      .from("questions")
      .select("position")
      .eq("assessment_id", assessment.id)
      .order("position", { ascending: false })
      .limit(1)

    const maxPos = existing?.[0]?.position ?? 0

    // Insert questions
    const questionsToInsert = validQuestions.map((q: any, i: number) => ({
      assessment_id: assessment.id,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation || null,
      position: maxPos + i + 1,
      approved: false,
    }))

    const { data: inserted, error: insertErr } = await supabase
      .from("questions")
      .insert(questionsToInsert)
      .select()

    if (insertErr) {
      console.error("Insert error:", insertErr)
      return new Response(
        JSON.stringify({ error: "Failed to save questions", details: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Update material extraction status
    if (material_id) {
      await supabase
        .from("materials")
        .update({ extraction_status: "completed" })
        .eq("id", material_id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        questions_generated: inserted?.length ?? 0,
        assessment_id: assessment.id,
        questions: inserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("Function error:", err)
    return new Response(
      JSON.stringify({ error: "Internal error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
