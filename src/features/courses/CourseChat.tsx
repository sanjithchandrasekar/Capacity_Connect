import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Loader2, Lock, MessageSquare } from 'lucide-react'
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
      const { data, error } = await supabase
        .from('enrollments')
        .select('user_id, trainees(*)')
        .eq('course_id', courseId)
        .in('status', ['enrolled', 'completed', 'in_progress'])
      if (error) throw error
      return data || []
    },
    enabled: !!courseId && isTrainer
  })

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['course_messages', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_messages')
        .select('*, sender:profiles!course_messages_sender_id_fkey(full_name, role)')
        .eq('course_id', courseId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
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
          // Re-fetch messages when a new one is inserted
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
      if (!newMessage.trim()) return
      
      const payload: any = {
        course_id: courseId,
        sender_id: profile!.id,
        content: newMessage.trim(),
        is_private: isPrivate,
      }
      
      if (isPrivate && isTrainer && recipientId) {
        payload.recipient_id = recipientId
      }

      const { error } = await supabase.from('course_messages').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      setNewMessage('')
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
    <div className="flex flex-col h-[500px] bg-[#070E20]/90 border border-cyan-500/30 rounded-2xl overflow-hidden shadow-sm">
      {/* Chat Header */}
      <div className="bg-cyan-950/40 p-4 border-b border-cyan-500/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-purple-500" />
          <h3 className="font-bold text-zinc-200">Course Discussion</h3>
        </div>
        <p className="text-xs text-zinc-200/50 hidden sm:block">
          {isTrainer ? 'Answer trainee doubts here' : 'Ask questions to your trainer'}
        </p>
      </div>

      {/* Chat Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center h-full items-center">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-200/40">
            <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const isMe = msg.sender_id === profile?.id
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {!isMe && (
                    <span className={`text-[10px] font-bold ${msg.sender?.role === 'trainer' ? 'text-orange-400' : 'text-zinc-400'}`}>
                      {msg.sender?.full_name || 'User'}
                    </span>
                  )}
                  {msg.is_private && (
                    <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                      <Lock className="w-3 h-3" /> {msg.sender?.role === 'trainer' ? 'Private to Trainee' : 'Private to Trainer'}
                    </span>
                  )}
                </div>
                
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2 ${
                  isMe 
                    ? 'bg-purple-600 text-white rounded-br-sm' 
                    : msg.sender?.role === 'trainer'
                      ? 'bg-cyan-950/60 border border-cyan-500/30 text-zinc-200 rounded-bl-sm'
                      : 'bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-bl-sm'
                }`}>
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
                
                <span className="text-[10px] text-zinc-200/30 mt-1">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Chat Input */}
      <div className="p-3 bg-cyan-950/20 border-t border-cyan-500/30">
        <div className="flex flex-wrap items-center gap-2 mb-3 px-1">
          <button
            onClick={() => {
              setIsPrivate(!isPrivate)
              if (isPrivate) setRecipientId('')
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              isPrivate 
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.1)]' 
                : 'bg-zinc-800/40 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-800/80 hover:text-zinc-300'
            }`}
          >
            <Lock className="w-3 h-3" />
            {isPrivate ? 'Private Mode ON' : (isTrainer ? 'Send Privately' : 'Ask Privately')}
          </button>
          
          {isTrainer && isPrivate && (
            <select 
              value={recipientId} 
              onChange={e => setRecipientId(e.target.value)}
              className="bg-zinc-900/80 border border-rose-500/30 text-rose-200/90 text-[11px] rounded-full px-3 py-1.5 focus:ring-1 focus:ring-rose-500 outline-none transition-all appearance-none cursor-pointer"
              style={{ backgroundImage: 'linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%)', backgroundPosition: 'calc(100% - 12px) calc(1em + 2px), calc(100% - 8px) calc(1em + 2px)', backgroundSize: '4px 4px, 4px 4px', backgroundRepeat: 'no-repeat' }}
            >
              <option value="" disabled>Select Trainee to message...</option>
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
            placeholder={isPrivate ? (isTrainer ? "Type a private message..." : "Type a private message to the trainer...") : "Type a message to the course..."}
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`flex-1 bg-zinc-950/50 text-zinc-200 border transition-all ${
              isPrivate 
                ? 'border-rose-500/30 focus-visible:ring-rose-500/50 placeholder:text-rose-200/30' 
                : 'border-cyan-500/30 focus-visible:ring-cyan-500/50 placeholder:text-zinc-200/30'
            }`}
          />
          <Button 
            onClick={() => sendMessage.mutate()}
            disabled={sendMessage.isPending || !newMessage.trim() || (isPrivate && isTrainer && !recipientId)}
            className={`shrink-0 ${isPrivate ? 'bg-rose-600 hover:bg-rose-700' : 'bg-purple-600 hover:bg-purple-700'} text-white rounded-xl`}
          >
            {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
