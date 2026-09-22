import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Send, BrainCircuit, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { supabase } from '@/lib/supabase'

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{role: 'bot'|'user', content: string}[]>([
    { role: 'bot', content: 'Hi there! I am ConnectAI. How can I help you today?' }
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

    let API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
    const API_KEYS_STRING = import.meta.env.VITE_GEMINI_API_KEYS;
    if (API_KEYS_STRING) {
      const keys = API_KEYS_STRING.split(',');
      API_KEY = keys[Math.floor(Math.random() * keys.length)].trim();
    }

    try {
      const formattedMessages = updatedMessages.map(msg => ({
        role: msg.role === 'bot' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }))

      // Filter out the initial greeting from history or keep it as model context
      const contents = formattedMessages.slice(1) // skip the initial hardcoded greeting for context, or leave it
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: "You are ConnectAI, the Capacity Connect AI assistant. You must ONLY answer questions about the Capacity Connect website, course catalog, training modules, how to use the platform, registration, and its specific features. You must politely refuse to answer any general knowledge questions, coding questions, or topics unrelated to this training website." }]
          },
          contents: formattedMessages,
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Gemini API error: ${response.status} - ${errText}`)
      }

      const data = await response.json()
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (reply) {
        setMessages(prev => [...prev, { role: 'bot', content: reply }])
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err: any) {
      console.error('Chatbot error:', err)
      setMessages(prev => [...prev, { role: 'bot', content: `Error: ${err.message}. API Key exists: ${!!API_KEY}` }])
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
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">ConnectAI</h3>
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
                    {msg.role === 'bot' ? <BrainCircuit className="w-3 h-3" /> : <User className="w-3 h-3" />}
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
                    <BrainCircuit className="w-3 h-3" />
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
        {isOpen ? <X className="w-6 h-6" /> : <BrainCircuit className="w-6 h-6" />}
      </motion.button>
    </div>
  )
}
