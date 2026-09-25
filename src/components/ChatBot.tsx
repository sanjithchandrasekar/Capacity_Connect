import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, User, RotateCcw, Lock, LogIn, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChatBotLogo } from './ChatBotLogo'
import { useAuth } from '@/hooks/useAuth'

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

interface Message {
  role: 'bot' | 'user'
  content: string
  time?: string
}

const SUGGESTED_PROMPTS = [
  'Explore available courses',
  'How do I register?',
  'Browse training tracks',
  'Tell me about certifications',
]

const CANNED_RESPONSES: Record<string, string> = {
  'Explore available courses':
    'You can explore our full catalog of scientific courses covering Atmospheric Science, Doppler Weather Radar, Oceanography, and Climatology on the **Courses** page. Filter by department or competency level to find your ideal training track.',
  'How do I register?':
    'To register, click **Get Started** or **Register** at the top right of the navigation bar. Select your role as a **Trainee** or **Trainer**, complete your institutional details, and submit for verification.',
  'Browse training tracks':
    'Capacity Connect offers dedicated training tracks including:\n• Atmospheric & Meteorological Sciences\n• Ocean Observations & Coastal Modeling\n• Doppler Weather Radar Operations & Calibration\n• Seismological & Geohazard Monitoring\n• Climate Forecasting & Disaster Risk Reduction',
  'Tell me about certifications':
    'Upon completing all course modules and passing the final assessments (minimum 60% passing score), you receive an official MoES-accredited, verifiable digital PDF certificate complete with cryptographic validation and QR code.',
}

export function ChatBot() {
  const { user } = useAuth()
  const isLoggedIn = Boolean(user)

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      content: 'Greetings! I am Capacity Connect AI, your platform assistant. How can I help you today?',
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  useEffect(() => {
    if (isOpen && inputRef.current && isLoggedIn) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, isLoggedIn])

  const handleResetChat = () => {
    setMessages([
      {
        role: 'bot',
        content: 'Greetings! I am Capacity Connect AI, your platform assistant. How can I help you today?',
      },
    ])
  }

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return

    const trimmedMsg = textToSend.trim()

    // When NOT logged in, enforce that only the 4 suggested questions are permitted
    if (!isLoggedIn && !SUGGESTED_PROMPTS.includes(trimmedMsg)) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: trimmedMsg },
        {
          role: 'bot',
          content:
            'Please log in to ask custom questions freely. As a guest, you can select any of the 4 suggested questions above.',
        },
      ])
      setInputValue('')
      return
    }

    const updatedMessages: Message[] = [...messages, { role: 'user', content: trimmedMsg }]
    setMessages(updatedMessages)
    setInputValue('')
    setIsLoading(true)

    // Check if we have an instant canned answer for a suggested prompt
    if (CANNED_RESPONSES[trimmedMsg]) {
      setTimeout(() => {
        setMessages((prev) => [...prev, { role: 'bot', content: CANNED_RESPONSES[trimmedMsg] }])
        setIsLoading(false)
      }, 400)
      return
    }

    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''

    try {
      if (!API_KEY) {
        throw new Error('No API key configured')
      }

      const formattedMessages = updatedMessages.map((msg) => ({
        role: msg.role === 'bot' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: 'You are Capacity Connect AI, the intelligent platform assistant for Capacity Connect (Ministry of Earth Sciences, Govt of India). You assist users with exploring courses, training modules, user registration, certifications, and platform navigation. Provide clear, helpful, and concise responses.',
                },
              ],
            },
            contents: formattedMessages,
          }),
        }
      )

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Gemini API error: ${response.status} - ${errText}`)
      }

      const data = await response.json()
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (reply) {
        setMessages((prev) => [...prev, { role: 'bot', content: reply }])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'bot', content: 'I could not understand that. Could you please rephrase?' },
        ])
      }
    } catch (err: any) {
      console.warn('Chatbot fallback:', err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          content:
            'I am currently operating with platform knowledge. For specific inquiries, explore our Courses catalog or contact official MoES administrators via the Contact page.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!isLoggedIn) return
    sendMessage(inputValue)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-16 right-0 w-[calc(100vw-2.5rem)] sm:w-[410px] bg-[#060D1E]/95 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_20px_60px_rgba(0,0,0,0.7),0_0_30px_rgba(6,182,212,0.15)] rounded-2xl overflow-hidden flex flex-col h-[550px] max-h-[82vh]"
          >
            {/* Header */}
            <div className="px-4 py-3.5 bg-gradient-to-r from-[#040814] via-[#07132a] to-[#0a1e3f] border-b border-cyan-500/25 flex justify-between items-center text-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ChatBotLogo variant="badge" size={36} />
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-[#040814]" />
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
                    Capacity Connect AI
                  </h3>
                  <p className="text-[10px] text-cyan-300 font-medium">
                    {isLoggedIn ? 'Online • Full Access' : 'Guest Mode • Suggested Questions'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleResetChat}
                  title="Reset conversation"
                  aria-label="Reset conversation"
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close chat"
                  aria-label="Close chat"
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div
              ref={scrollRef}
              className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#f8fafc] flex flex-col gap-3.5 scroll-smooth"
            >
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {msg.role === 'bot' ? (
                    <ChatBotLogo variant="badge" size={28} />
                  ) : (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-sm">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`p-3.5 rounded-2xl max-w-[82%] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 text-white rounded-tr-xs shadow-md shadow-cyan-600/20 font-medium'
                        : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs shadow-md shadow-slate-200/50'
                    }`}
                  >
                    {msg.role === 'bot' ? <BotMessage content={msg.content} /> : msg.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2.5 items-center">
                  <ChatBotLogo variant="badge" size={28} />
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-600 rounded-tl-xs shadow-sm flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              )}

              {/* Suggested Questions: Available for guests anytime, or initial greeting for logged in users */}
              {(!isLoggedIn || messages.length <= 1) && (
                <div className="pt-2 flex flex-col gap-1.5">
                  <p className="text-[11px] font-semibold text-slate-500 px-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-600" />
                    Suggested questions:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTED_PROMPTS.map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => sendMessage(prompt)}
                        className="text-xs px-3 py-1.5 rounded-xl bg-white hover:bg-cyan-50 text-slate-700 hover:text-cyan-800 border border-slate-200/90 hover:border-cyan-400/50 shadow-xs hover:shadow-sm transition-all text-left font-medium cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            {isLoggedIn ? (
              <form
                onSubmit={handleSend}
                className="p-3 bg-[#040814] border-t border-cyan-500/20 flex gap-2 items-center"
              >
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask Capacity Connect AI..."
                  className="rounded-xl bg-[#081226] border border-cyan-500/30 text-white placeholder:text-slate-400 focus-visible:ring-cyan-500 focus-visible:border-cyan-400 h-10 text-xs sm:text-sm shadow-inner"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isLoading || !inputValue.trim()}
                  className="rounded-xl h-10 w-10 bg-gradient-to-r from-cyan-500 via-blue-600 to-amber-500 hover:opacity-95 text-white shadow-lg shadow-cyan-500/25 shrink-0 cursor-pointer disabled:opacity-40 transition-all"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            ) : (
              <div className="p-3 bg-[#040814] border-t border-cyan-500/20 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#081226] border border-cyan-500/25 text-xs text-slate-300">
                  <div className="flex items-center gap-2 truncate">
                    <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">Log in to type custom queries</span>
                  </div>
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm"
                  >
                    <LogIn className="w-3 h-3" />
                    <span>Log In</span>
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-tr from-cyan-500 via-blue-600 to-amber-500 rounded-full flex items-center justify-center text-white shadow-[0_0_25px_rgba(6,182,212,0.5),0_0_10px_rgba(56,189,248,0.35)] border border-cyan-300/40 cursor-pointer group"
        aria-label="Toggle Capacity Connect AI platform assistant"
      >
        {isOpen ? (
          <X className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200 text-white" />
        ) : (
          <ChatBotLogo variant="icon-only" size={28} className="text-white drop-shadow-sm transition-transform group-hover:scale-110 duration-200" />
        )}
      </motion.button>
    </div>
  )
}



