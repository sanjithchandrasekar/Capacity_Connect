import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, User, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChatBotLogo } from './ChatBotLogo'

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

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      content: 'Greetings! I am Capacity Connect AI, your platform assistant. How can I help you today?',
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
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading, statusText])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

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

    const newMsg = textToSend.trim()
    const updatedMessages: Message[] = [...messages, { role: 'user', content: newMsg }]

    setMessages(updatedMessages)
    setInputValue('')
    setIsLoading(true)

    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''

    try {
      const formattedMessages = updatedMessages.map((msg) => ({
        role: msg.role === 'bot' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: 'You are Capacity Connect AI, the intelligent platform assistant for Capacity Connect. You assist users with exploring courses, training modules, user registration, certifications, and platform navigation. Provide clear, helpful, and concise responses. Politely decline inquiries that are completely outside the scope of Capacity Connect.',
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
        setMessages((prev) => [...prev, { role: 'bot', content: 'I could not understand that. Could you please try again?' }])
      }
    } catch (err: any) {
      console.error('Chatbot error:', err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          content: 'I am currently in standby mode. For immediate assistance, please reach out via the Contact page or browse our course catalog.',
        },
      ])
    } finally {
      setStatusText(null)
      setIsLoading(false)
    }
  }

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
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
            {/* Header: Cosmic Navy to Deep Space Cyan matching Homepage Header */}
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

            {/* Chat Messages Body: Clean Light Theme Canvas */}
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

              {/* Suggested prompt chips on initial greeting */}
              {messages.length <= 1 && (
                <div className="pt-2 flex flex-col gap-1.5">
                  <p className="text-[11px] font-semibold text-slate-500 px-1">Suggested questions:</p>
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

            {/* Input Bar: Sleek Dark Cockpit Matching Home Page Dark Elements */}
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


