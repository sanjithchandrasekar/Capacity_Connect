import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, Bot, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { supabase } from '@/lib/supabase'

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{role: 'bot'|'user', content: string}[]>([
    { role: 'bot', content: 'Hi there! I am the Capacity Connect AI assistant. How can I help you today?' }
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
    const updatedMessages = [...messages, { role: 'user', content: newMsg }]
    
    // Using assertion to avoid TS errors
    setMessages(updatedMessages as any)
    setInputValue('')
    setIsLoading(true)

    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '' // fallback to user provided key if any

    try {
      const formattedMessages = updatedMessages.map(msg => ({
        role: msg.role === 'bot' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))

      // Filter out the initial greeting from history or keep it as model context
      const contents = formattedMessages.slice(1) // skip the initial hardcoded greeting for context, or leave it
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: "You are the Capacity Connect AI assistant. You must ONLY answer questions about the Capacity Connect website, course catalog, training modules, how to use the platform, registration, and its specific features. You must politely refuse to answer any general knowledge questions, coding questions, or topics unrelated to this training website." }]
          },
          contents: formattedMessages,
        })
      })

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`)
      }

      const data = await response.json()
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (reply) {
        setMessages(prev => [...prev, { role: 'bot', content: reply }])
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err) {
      console.error('Chatbot error:', err)
      setMessages(prev => [...prev, { role: 'bot', content: "Oops, I encountered an error connecting to my brain. Please check your network or ensure the Gemini API key is configured correctly in the environment!" }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-16 right-0 w-[calc(100vw-3rem)] sm:w-96 bg-white/95 backdrop-blur-xl border border-purple-200 shadow-2xl shadow-purple-500/20 rounded-2xl overflow-hidden flex flex-col h-[500px]"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-purple-600 to-pink-500 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">AI Assistant</h3>
                  <p className="text-[10px] text-white/70">Online</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Area */}
            <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto bg-slate-50/50 flex flex-col gap-3 scroll-smooth">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'bot' ? 'bg-purple-100 text-purple-600' : 'bg-pink-100 text-pink-600'}`}>
                    {msg.role === 'bot' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  </div>
                  <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-pink-500 to-orange-400 text-white rounded-tr-sm' 
                      : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 bg-purple-100 text-purple-600">
                    <Bot className="w-3 h-3" />
                  </div>
                  <div className="p-3 rounded-2xl max-w-[80%] text-sm bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2">
              <Input 
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="Ask me anything..." 
                className="rounded-full bg-slate-50 border-slate-200 focus-visible:ring-purple-500 h-10"
              />
              <Button type="submit" size="icon" className="rounded-full h-10 w-10 bg-purple-600 hover:bg-purple-700 shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-pink-500/30 border-2 border-white/20"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </motion.button>
    </div>
  )
}
