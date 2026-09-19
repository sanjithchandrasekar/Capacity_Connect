import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// @ts-nocheck

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in Edge Function secrets.')
    }

    // Format messages for Gemini API
    const geminiMessages = messages.map((msg: any) => ({
      role: msg.role === 'bot' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

    // Add a system instruction implicitly by injecting it as the first message or just letting it be conversational.
    // We'll just prepend a system prompt as a user message and a model acknowledgment if needed, 
    // or we can use the systemInstruction field if supported by the endpoint.
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiMessages,
        systemInstruction: {
          role: 'user',
          parts: [{ text: "You are the official AI assistant for Capacity Connect, a platform for training and learning. IMPORTANT: You must ONLY answer questions related to Capacity Connect, its features (like courses, trainees, trainers, admin dashboards), and website content. If a user asks about anything unrelated to this platform (e.g., general knowledge, coding, math, recipes, outside news), you MUST politely refuse to answer and remind them that you are only here to assist with Capacity Connect." }]
        }
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('Gemini API Error:', data)
      throw new Error(data.error?.message || 'Failed to fetch from Gemini API')
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that."

    return new Response(
      JSON.stringify({ reply }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
