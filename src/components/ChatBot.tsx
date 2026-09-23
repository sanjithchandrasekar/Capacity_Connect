import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, BrainCircuit, User, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Render bot message: convert markdown-style bullets and newlines to JSX
function BotMessage({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return null
        const isBullet = /^[-*•]\s+/.test(trimmed)
        const text = isBullet ? trimmed.replace(/^[-*•]\s+/, '') : trimmed
        return isBullet ? (
          <div key={i} className="flex gap-1.5 items-start">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
            <span>{text}</span>
          </div>
        ) : (
          <p key={i}>{text}</p>
        )
      })}
    </div>
  )
}

const SYSTEM_PROMPT =
  'You are ConnectAI, the Capacity Connect AI assistant for the Ministry of Earth Sciences (MoES) and IMD. ' +
  'You must ONLY answer questions about the Capacity Connect website, meteorological courses, earth sciences training modules, ' +
  'satellite telemetry tools, user registration, and platform navigation. Politely decline questions outside this scope.'

// ─── Groq (primary — OpenAI-compatible, very generous free tier) ───────────
async function callGroq(
  key: string,
  messages: { role: string; content: string }[]
): Promise<string | null> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'llama3-70b-8192',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    console.warn(`Groq ${res.status}:`, txt)
    return null // fall through to Gemini
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? null
}

// ─── Gemini (fallback) ──────────────────────────────────────────────────────
async function callGemini(
  key: string,
  history: { role: 'bot' | 'user'; content: string }[]
): Promise<string | null> {
  const MODEL = 'gemini-3.6-flash'
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: history
          .filter((m, i) => !(i === 0 && m.role === 'bot'))
          .map((m) => ({
            role: m.role === 'bot' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
      }),
    }
  )
  if (res.status === 429 || res.status === 503) return null
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Gemini error: ${res.status} - ${txt}`)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'bot' | 'user'; content: string }[]>([
    {
      role: 'bot',
      content:
        'Greetings! I am ConnectAI, your MoES & Capacity Connect platform assistant. How can I help you today?',
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [statusText, setStatusText] = useState<string | null>(null)
  const [failedMsg, setFailedMsg] = useState<{
    text: string
    history: { role: 'bot' | 'user'; content: string }[]
  } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading, statusText])

  const runWithFallback = async (
    history: { role: 'bot' | 'user'; content: string }[]
  ): Promise<string | '__rate_limited__'> => {
    const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || ''
    const GEMINI_KEYS: string[] = (
      import.meta.env.VITE_GEMINI_API_KEYS || import.meta.env.VITE_GEMINI_API_KEY || ''
    )
      .split(',')
      .map((k: string) => k.trim())
      .filter(Boolean)

    // Convert history to OpenAI format for Groq
    const openAiMessages = history
      .filter((m, i) => !(i === 0 && m.role === 'bot'))
      .map((m) => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.content }))

    // 1️⃣ Try Groq first (fastest, most generous free tier)
    if (GROQ_KEY && GROQ_KEY !== 'your_groq_key_here') {
      setStatusText('Thinking...')
      try {
        const reply = await callGroq(GROQ_KEY, openAiMessages)
        if (reply) return reply
      } catch (e: any) {
        console.warn('Groq failed:', e.message)
      }
    }

    // 2️⃣ Fall back to Gemini
    setStatusText('Switching to Gemini...')
    for (const key of GEMINI_KEYS) {
      try {
        const reply = await callGemini(key, history)
        if (reply) return reply
      } catch (e: any) {
        console.warn('Gemini key failed:', e.message)
      }
    }

    // 3️⃣ Auto-retry with countdown (15s → 30s)
    for (const delaySecs of [15, 30]) {
      for (let s = delaySecs; s > 0; s--) {
        setStatusText(`Rate limited — retrying in ${s}s...`)
        await new Promise((r) => setTimeout(r, 1000))
      }

      // Retry Groq
      if (GROQ_KEY && GROQ_KEY !== 'your_groq_key_here') {
        try {
          const reply = await callGroq(GROQ_KEY, openAiMessages)
          if (reply) return reply
        } catch {}
      }

      // Retry Gemini
      for (const key of GEMINI_KEYS) {
        try {
          const reply = await callGemini(key, history)
          if (reply) return reply
        } catch {}
      }
    }

    return '__rate_limited__'
  }

  const sendMessage = async (
    userMsg: string,
    history: { role: 'bot' | 'user'; content: string }[]
  ) => {
    setIsLoading(true)
    setStatusText(null)
    setFailedMsg(null)
    try {
      const result = await runWithFallback(history)
      if (result === '__rate_limited__') {
        setFailedMsg({ text: userMsg, history })
        setMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            content: '⚠️ All AI services are busy right now. Tap **Try Again** when ready.',
          },
        ])
      } else {
        setMessages((prev) => [...prev, { role: 'bot', content: result }])
      }
    } catch (err: any) {
      console.error('Chatbot error:', err)
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setStatusText(null)
      setIsLoading(false)
    }
  }

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputValue.trim() || isLoading) return
    const newMsg = inputValue.trim()
    const updated = [...messages, { role: 'user' as const, content: newMsg }]
    setMessages(updated)
    setInputValue('')
    await sendMessage(newMsg, updated)
  }

  const handleRetry = async () => {
    if (!failedMsg || isLoading) return
    const cleanHistory = failedMsg.history
    setMessages(cleanHistory)
    await sendMessage(failedMsg.text, cleanHistory)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-20 right-0 w-[min(calc(100vw-2rem),24rem)] bg-white/98 backdrop-blur-2xl border border-slate-200/90 shadow-2xl shadow-cyan-950/25 rounded-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: 'min(520px, calc(100dvh - 8rem))' }}
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-cyan-600 via-blue-700 to-indigo-800 border-b border-cyan-500/30 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-sm">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm font-display text-white">ConnectAI</h3>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/20 border border-white/30 text-[10px] text-white font-mono font-medium">
                      MoES
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-300" />
                    </span>
                    <p className="text-[10px] text-cyan-100 font-mono">Online • Platform Assistant</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Area */}
            <div
              ref={scrollRef}
              className="flex-1 p-4 overflow-y-auto bg-slate-50/80 flex flex-col gap-3.5 scroll-smooth"
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      msg.role === 'bot'
                        ? 'bg-cyan-100 border border-cyan-300 text-cyan-700'
                        : 'bg-amber-100 border border-amber-300 text-amber-700'
                    }`}
                  >
                    {msg.role === 'bot' ? (
                      <BrainCircuit className="w-3.5 h-3.5" />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div
                    className={`p-3.5 rounded-2xl max-w-[82%] text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white rounded-tr-sm shadow-sm font-medium'
                        : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {msg.role === 'bot' ? <BotMessage content={msg.content} /> : msg.content}
                  </div>
                </div>
              ))}

              {/* Try Again button */}
              {failedMsg && !isLoading && (
                <div className="flex justify-center">
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Try Again
                  </button>
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-cyan-100 border border-cyan-300 text-cyan-700">
                    <BrainCircuit className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-3.5 rounded-2xl max-w-[82%] bg-white border border-slate-200 text-slate-600 rounded-tl-sm shadow-sm flex items-center gap-1.5">
                    {statusText ? (
                      <span className="text-xs text-amber-600 font-medium">{statusText}</span>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 bg-cyan-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200/80 flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask ConnectAI about MoES tracks..."
                className="rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-cyan-500 focus-visible:border-cyan-500 h-10 text-xs sm:text-sm"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !inputValue.trim()}
                className="rounded-xl h-10 w-10 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-600/20 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-tr from-cyan-500 via-blue-600 to-amber-500 rounded-full flex items-center justify-center text-white shadow-[0_0_25px_rgba(0,210,255,0.4)] border border-cyan-300/40 cursor-pointer group"
        aria-label="Toggle ConnectAI platform assistant"
      >
        {isOpen ? (
          <X className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200" />
        ) : (
          <BrainCircuit className="w-6 h-6 transition-transform group-hover:scale-110 duration-200" />
        )}
      </motion.button>
    </div>
  )
}
