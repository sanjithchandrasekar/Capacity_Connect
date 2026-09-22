import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, BrainCircuit, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'bot' | 'user'; content: string }[]>([
    {
      role: 'bot',
      content: 'Greetings! I am ConnectAI, your MoES & Capacity Connect platform assistant. How can I help you today?',
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const newMsg = inputValue.trim()
    const updatedMessages = [...messages, { role: 'user' as const, content: newMsg }]

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
                  text: 'You are ConnectAI, the Capacity Connect AI assistant for the Ministry of Earth Sciences (MoES) and IMD. You must ONLY answer questions about the Capacity Connect website, meteorological courses, earth sciences training modules, satellite telemetry tools, user registration, and platform navigation. Politely decline questions outside this scope.',
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
        throw new Error('Invalid response format')
      }
    } catch (err: any) {
      console.error('Chatbot error:', err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          content: `I am currently in telemetry standby mode. For instant support, please reach out via the Contact form or browse our course catalog.`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-16 right-0 w-[calc(100vw-3rem)] sm:w-96 bg-white/98 backdrop-blur-2xl border border-slate-200/90 shadow-2xl shadow-cyan-950/25 rounded-2xl overflow-hidden flex flex-col h-[520px]"
          >
            {/* Header: Atmospheric Cyan to Oceanic Blue with MoES badge */}
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

            {/* Light Theme Chat Area */}
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
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-cyan-100 border border-cyan-300 text-cyan-700">
                    <BrainCircuit className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-3.5 rounded-2xl max-w-[82%] bg-white border border-slate-200 text-slate-600 rounded-tl-sm shadow-sm flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 bg-cyan-600 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Light Theme Input Area */}
            <form
              onSubmit={handleSend}
              className="p-3 bg-white border-t border-slate-200/80 flex gap-2"
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask ConnectAI about MoES tracks..."
                className="rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-cyan-500 focus-visible:border-cyan-500 h-10 text-xs sm:text-sm"
              >
              </Input>
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

      {/* Floating Chatbot Trigger Button (Synchronized with Homepage Palette) */}
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
