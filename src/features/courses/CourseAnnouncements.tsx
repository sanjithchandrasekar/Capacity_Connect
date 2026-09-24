import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Megaphone, Plus, Loader2, Calendar, Sparkles } from 'lucide-react'
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
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Error fetching course announcements:', error)
        throw error
      }
      if (!data || data.length === 0) return []

      const trainerIds = Array.from(new Set(data.map(a => a.trainer_id)))
      const [trainersRes, adminsRes] = await Promise.all([
        supabase.from('trainers').select('id, full_name').in('id', trainerIds),
        supabase.from('admins').select('id, full_name').in('id', trainerIds),
      ])

      const trainerMap = new Map<string, string>()
      trainersRes.data?.forEach(t => trainerMap.set(t.id, t.full_name || 'Course Trainer'))
      adminsRes.data?.forEach(a => trainerMap.set(a.id, a.full_name || 'Admin'))

      return data.map(a => ({
        ...a,
        trainer: {
          full_name: trainerMap.get(a.trainer_id) || 'Course Trainer'
        }
      }))
    },
    enabled: !!courseId
  })

  const addAnnouncement = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !content.trim()) throw new Error('Title and content are required.')
      if (!profile?.id) throw new Error('User profile not loaded.')
      const { data, error } = await supabase.from('course_announcements').insert({
        course_id: courseId,
        trainer_id: profile.id,
        title: title.trim(),
        content: content.trim()
      }).select()
      if (error) throw error
      return data
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
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 border border-slate-200/90 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Course Announcements</h3>
            <p className="text-xs text-slate-500">
              {isTrainer ? 'Post broadcast updates and important news for your trainees.' : 'Latest updates and notices from your trainer.'}
            </p>
          </div>
        </div>
        {isTrainer && (
          <Button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl gap-2 shadow-xs shrink-0 self-start sm:self-auto h-9 px-3.5"
          >
            <Plus className="w-3.5 h-3.5" /> {isAdding ? 'Cancel' : 'New Announcement'}
          </Button>
        )}
      </div>

      {/* Adding Form */}
      {isAdding && isTrainer && (
        <Card className="bg-gradient-to-br from-cyan-50/50 via-sky-50/30 to-blue-50/20 border border-cyan-200 rounded-2xl shadow-xs overflow-hidden">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-900 pb-2 border-b border-cyan-200/60">
              <Sparkles className="w-4 h-4 text-cyan-600" /> Create New Broadcast Announcement
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Announcement Title *</label>
              <Input 
                placeholder="e.g. Schedule Update for Module 2 Live Session" 
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="bg-white border-slate-200 text-slate-900 rounded-xl text-xs focus:bg-white h-10 font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Announcement Content *</label>
              <Textarea 
                placeholder="Write the full announcement message for trainees..." 
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={3}
                className="bg-white border-slate-200 text-slate-900 resize-none rounded-xl text-xs focus:bg-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button 
                variant="outline"
                onClick={() => setIsAdding(false)}
                className="text-xs font-semibold border-slate-200 rounded-xl h-9 text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => addAnnouncement.mutate()}
                disabled={addAnnouncement.isPending || !title.trim() || !content.trim()}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl h-9 px-4 shadow-xs"
              >
                {addAnnouncement.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Post Announcement'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Announcements List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-10 bg-white border border-dashed border-slate-200 rounded-2xl shadow-xs">
          <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-slate-800 font-bold text-sm">No announcements yet</h3>
          <p className="text-slate-500 text-xs mt-1">There are no updates posted for this course right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a: any) => (
            <Card key={a.id} className="bg-white border border-slate-200/90 hover:border-cyan-300 rounded-2xl overflow-hidden shadow-xs transition-all">
              <CardContent className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 flex items-center justify-center font-bold text-xs shrink-0">
                      {a.trainer?.full_name?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-tight">{a.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })} by <span className="font-semibold text-slate-600">{a.trainer?.full_name || 'Trainer'}</span>
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-slate-700 text-xs leading-relaxed bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 whitespace-pre-wrap">
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
