import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Megaphone, Plus, Loader2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

export function CourseAnnouncements({ courseId, isTrainer }: { courseId: string; isTrainer: boolean }) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['course_announcements', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_announcements')
        .select('*, trainer:trainers!course_announcements_trainer_id_fkey(full_name)')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!courseId
  })

  const addAnnouncement = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !content.trim()) throw new Error('Title and content are required.')
      const { error } = await supabase.from('course_announcements').insert({
        course_id: courseId,
        trainer_id: profile!.id,
        title: title.trim(),
        content: content.trim()
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Announcement posted successfully!')
      queryClient.invalidateQueries({ queryKey: ['course_announcements', courseId] })
      setIsAdding(false)
      setTitle('')
      setContent('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to post announcement')
    }
  })

  return (
    <div className="space-y-4">
      {isTrainer && (
        <div className="flex justify-between items-center bg-[#070E20]/90 p-4 border border-cyan-500/30 rounded-2xl shadow-sm">
          <div>
            <h3 className="font-bold text-zinc-200">Course Announcements</h3>
            <p className="text-xs text-zinc-200/50">Post updates and news for your trainees.</p>
          </div>
          <Button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl gap-2"
          >
            <Plus className="w-4 h-4" /> {isAdding ? 'Cancel' : 'New Announcement'}
          </Button>
        </div>
      )}

      {isAdding && isTrainer && (
        <Card className="bg-cyan-950/30 border-cyan-500/30">
          <CardContent className="p-4 space-y-4">
            <Input 
              placeholder="Announcement Title" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="bg-[#070E20]/90 border-cyan-500/30 text-zinc-200"
            />
            <Textarea 
              placeholder="What do you want to tell your trainees?" 
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
              className="bg-[#070E20]/90 border-cyan-500/30 text-zinc-200 resize-none"
            />
            <div className="flex justify-end">
              <Button 
                onClick={() => addAnnouncement.mutate()}
                disabled={addAnnouncement.isPending || !title.trim() || !content.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {addAnnouncement.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Post Announcement'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 bg-[#070E20]/90 border border-cyan-500/30 rounded-2xl">
          <Megaphone className="w-12 h-12 text-zinc-200/20 mx-auto mb-3" />
          <h3 className="text-zinc-200 font-bold">No announcements yet</h3>
          <p className="text-zinc-200/50 text-sm mt-1">There are no updates posted for this course right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a: any) => (
            <Card key={a.id} className="bg-[#070E20]/90 border-cyan-500/30 overflow-hidden relative group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-600" />
              <CardContent className="p-5 pl-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-950/40 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0 border border-cyan-500/30">
                    {a.trainer?.full_name?.charAt(0) || 'T'}
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-200 text-sm leading-none">{a.title}</h4>
                    <p className="text-xs text-zinc-200/50 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })} by {a.trainer?.full_name || 'Trainer'}
                    </p>
                  </div>
                </div>
                <p className="text-zinc-200/80 text-sm whitespace-pre-wrap ml-10">
                  {a.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
