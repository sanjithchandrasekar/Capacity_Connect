import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Loader2, Lock, MessageSquare, Shield, User } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

export function CourseChat({ courseId, isTrainer }: { courseId: string; isTrainer: boolean }) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [newMessage, setNewMessage] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [recipientId, setRecipientId] = useState('')
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { data: trainees = [] } = useQuery({
    queryKey: ['course_trainees', courseId],
    queryFn: async () => {
      if (!isTrainer) return []
      const { data: enrollmentsData, error } = await supabase
        .from('enrollments')
        .select('user_id')
        .eq('course_id', courseId)
        .in('status', ['enrolled', 'completed', 'in_progress'])
      if (error) {
        console.error('Error fetching enrollments for chat:', error)
        return []
      }
      if (!enrollmentsData || enrollmentsData.length === 0) return []

      const userIds = enrollmentsData.map(e => e.user_id)
      const { data: traineesData } = await supabase
        .from('trainees')
        .select('id, full_name, email')
        .in('id', userIds)

      return enrollmentsData.map(e => ({
        user_id: e.user_id,
        trainees: traineesData?.find(t => t.id === e.user_id) || { full_name: 'Unknown Trainee' }
      }))
    },
    enabled: !!courseId && isTrainer
  })

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['course_messages', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_messages')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: true })
      if (error) {
        console.error('Error fetching course messages:', error)
        throw error
      }
      if (!data || data.length === 0) return []

      // Fetch sender details from trainers, trainees, and admins
      const senderIds = Array.from(new Set(data.map(m => m.sender_id)))
      const [trainersRes, traineesRes, adminsRes] = await Promise.all([
        supabase.from('trainers').select('id, full_name, role').in('id', senderIds),
        supabase.from('trainees').select('id, full_name, role').in('id', senderIds),
        supabase.from('admins').select('id, full_name, role').in('id', senderIds),
      ])

      const senderMap = new Map<string, { full_name: string; role: string }>()
      trainersRes.data?.forEach(t => senderMap.set(t.id, { full_name: t.full_name || 'Trainer', role: t.role || 'trainer' }))
      traineesRes.data?.forEach(t => senderMap.set(t.id, { full_name: t.full_name || 'Trainee', role: t.role || 'trainee' }))
      adminsRes.data?.forEach(a => senderMap.set(a.id, { full_name: a.full_name || 'Admin', role: a.role || 'admin' }))

      return data.map(m => ({
        ...m,
        sender: senderMap.get(m.sender_id) || { full_name: 'User', role: 'trainee' }
      }))
    },
    enabled: !!courseId && !!profile?.id
  })

  // Set up realtime subscription
  useEffect(() => {
    if (!courseId || !profile?.id) return

    const channel = supabase
      .channel(`chat_${courseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'course_messages',
          filter: `course_id=eq.${courseId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['course_messages', courseId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [courseId, profile?.id, queryClient])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages])

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!newMessage.trim() || !profile?.id) return
      
      const payload: any = {
        course_id: courseId,
        sender_id: profile.id,
        content: newMessage.trim(),
        is_private: isPrivate,
      }
      
      if (isPrivate && isTrainer && recipientId) {
        payload.recipient_id = recipientId
      }

      const { data, error } = await supabase.from('course_messages').insert(payload).select()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      setNewMessage('')
      queryClient.invalidateQueries({ queryKey: ['course_messages', courseId] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to send message')
    }
  })

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage.mutate()
    }
  }

  return (
    <div className="flex flex-col h-[520px] bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
      {/* Header with polished dark contrast banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4 border-b border-slate-800 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Course Discussion & Q&A</h3>
            <p className="text-[11px] text-slate-300 hidden sm:block">
              {isTrainer ? 'Interact with trainees, answer questions, or send direct private feedback.' : 'Ask questions, discuss topics, or send private messages to your trainer.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-semibold text-slate-300">Live</span>
        </div>
      </div>

      {/* Chat Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/70">
        {isLoading ? (
          <div className="flex justify-center h-full items-center">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
            <MessageSquare className="w-10 h-10 mb-2 opacity-30 text-cyan-600" />
            <p className="text-xs font-semibold text-slate-600">No messages yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Start the conversation with your course group!</p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const isMe = msg.sender_id === profile?.id
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  {!isMe && (
                    <span className={`text-[11px] font-bold ${
                      msg.sender?.role === 'trainer' ? 'text-cyan-700' : 'text-slate-700'
                    }`}>
                      {msg.sender?.full_name || 'User'}
                    </span>
                  )}
                  {msg.is_private && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md">
                      <Lock className="w-2.5 h-2.5" /> {msg.sender?.role === 'trainer' ? 'Private to Trainee' : 'Private to Trainer'}
                    </span>
                  )}
                </div>
                
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-xs ${
                  isMe 
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-xs' 
                    : msg.sender?.role === 'trainer'
                      ? 'bg-white border border-cyan-200 text-slate-900 rounded-bl-xs shadow-xs'
                      : 'bg-white border border-slate-200/90 text-slate-900 rounded-bl-xs shadow-xs'
                }`}>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
                
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Chat Input Section */}
      <div className="p-3.5 bg-white border-t border-slate-200/90 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2 px-1">
          <button
            type="button"
            onClick={() => {
              setIsPrivate(!isPrivate)
              if (isPrivate) setRecipientId('')
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              isPrivate 
                ? 'bg-rose-50 text-rose-700 border border-rose-300 shadow-xs' 
                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200/80 hover:text-slate-800'
            }`}
          >
            <Lock className="w-3 h-3" />
            {isPrivate ? 'Private Mode Active' : (isTrainer ? 'Send Privately' : 'Ask Privately')}
          </button>
          
          {isTrainer && isPrivate && (
            <select 
              value={recipientId} 
              onChange={e => setRecipientId(e.target.value)}
              className="bg-slate-50 border border-rose-300 text-slate-800 text-xs font-medium rounded-full px-3 py-1.5 focus:bg-white outline-none cursor-pointer"
            >
              <option value="" disabled>Select Trainee recipient...</option>
              {trainees.map((t: any) => (
                <option key={t.user_id} value={t.user_id}>
                  {t.trainees?.full_name || 'Unknown Trainee'}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-2">
          <Input 
            placeholder={isPrivate ? (isTrainer ? "Type a private message to trainee..." : "Type a private question to trainer...") : "Type a message to the course discussion..."}
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`flex-1 bg-slate-50 text-slate-900 border transition-all h-10 rounded-xl text-xs placeholder:text-slate-400 focus:bg-white ${
              isPrivate 
                ? 'border-rose-300 focus-visible:ring-rose-400' 
                : 'border-slate-200 focus-visible:ring-cyan-500'
            }`}
          />
          <Button 
            onClick={() => sendMessage.mutate()}
            disabled={sendMessage.isPending || !newMessage.trim() || (isPrivate && isTrainer && !recipientId)}
            className={`shrink-0 h-10 px-4 font-bold text-xs rounded-xl shadow-xs text-white ${
              isPrivate 
                ? 'bg-rose-600 hover:bg-rose-700' 
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700'
            }`}
          >
            {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
