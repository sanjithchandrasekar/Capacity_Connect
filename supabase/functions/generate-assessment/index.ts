import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { courseId, type, topic, trainerId, passingScore } = await req.json()

    if (!courseId || !type || !topic) {
      return new Response(
        JSON.stringify({ error: "courseId, type, and topic are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Get Gemini keys from environment (comma-separated for load balancing)
    const geminiKeysStr = Deno.env.get("GEMINI_API_KEYS") || Deno.env.get("GEMINI_API_KEY")
    if (!geminiKeysStr) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY(S) not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }
    const geminiKeys = geminiKeysStr.split(',').map((k: string) => k.trim())
    // Simple random load balancing
    const geminiKey = geminiKeys[Math.floor(Math.random() * geminiKeys.length)]

    const systemPrompt = `You are an expert assessment question generator for training courses.
Generate high-quality MCQ (Multiple Choice Questions) based on the provided topic.

Rules:
- Generate exactly 10 questions
- Each question must have 4 options (A, B, C, D)
- Only one correct answer per question
- Include a brief explanation for the correct answer
- Return valid JSON only, no markdown, like:
[
  {
    "question_text": "...",
    "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
    "correct_answer": "A",
    "explanation": "..."
  }
]`

    const userPrompt = `Topic: ${topic}\nGenerate 10 MCQ questions for this topic.`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return new Response(JSON.stringify({ error: "AI generation failed", details: errText }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const aiData = await response.json()
    const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || ""

    let questions
    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error("No JSON array found in AI response")
      questions = JSON.parse(jsonMatch[0])
    } catch (parseErr) {
      return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: rawText }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const validQuestions = questions.filter((q: any) =>
      q.question_text && q.options && q.options.A && q.options.B && q.options.C && q.options.D &&
      ["A", "B", "C", "D"].includes(q.correct_answer)
    )

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    
    if (!supabaseUrl || !supabaseKey) {
        return new Response(JSON.stringify({ error: "Missing Supabase env vars" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Create the assessment
    // Status is 'published' for daily_tests, otherwise 'pending_review' (requires approval)
    const status = type === 'daily_test' ? 'published' : 'pending_review'
    
    const { data: assessment, error: assessmentErr } = await supabase
      .from("assessments")
      .insert({
        course_id: courseId,
        title: `AI Generated ${type.replace('_', ' ')} - ${topic.slice(0, 30)}`,
        assessment_type: type,
        passing_score: passingScore || 60,
        status: status,
        created_by: trainerId
      })
      .select("id")
      .single()

    if (assessmentErr || !assessment) {
      return new Response(JSON.stringify({ error: "Failed to create assessment", details: assessmentErr?.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const questionsToInsert = validQuestions.map((q: any, i: number) => ({
      assessment_id: assessment.id,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation || null,
      position: i + 1,
      approved: type === 'daily_test' ? true : false,
    }))

    const { data: inserted, error: insertErr } = await supabase
      .from("questions")
      .insert(questionsToInsert)
      .select()

    if (insertErr) {
      return new Response(JSON.stringify({ error: "Failed to save questions", details: insertErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    return new Response(JSON.stringify({ success: true, assessment_id: assessment.id, count: inserted?.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error", details: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
