import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Database } from '@/integrations/supabase/types'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  ArrowLeft, Plus, Trash2, Loader2, Calendar, Video, FileText, Save, Globe
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

type Course = Database['public']['Tables']['courses']['Row']
type Session = Database['public']['Tables']['course_sessions']['Row']
type Material = Database['public']['Tables']['materials']['Row']

export function CourseSessionsPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Partial<Session> | null>(null)

  const fetchData = useCallback(async () => {
    if (!user || !courseId) return
    setLoading(true)
    try {
      const { data: c } = await supabase.from('courses').select('*').eq('id', courseId).eq('trainer_id', user.id).single()
      if (c) setCourse(c)

      const { data: s } = await supabase.from('course_sessions').select('*').eq('course_id', courseId).order('order_index')
      if (s) setSessions(s)

      const { data: m } = await supabase.from('materials').select('*').eq('course_id', courseId)
      if (m) setMaterials(m)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user, courseId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSaveSession = async () => {
    if (!editingSession?.title) {
      toast.error('Title is required')
      return
    }
    setSaving(true)
    try {
      if (editingSession.id) {
        const { error } = await supabase.from('course_sessions').update({
          title: editingSession.title,
          description: editingSession.description || null,
          start_time: editingSession.start_time ? new Date(editingSession.start_time).toISOString() : null,
          end_time: editingSession.end_time ? new Date(editingSession.end_time).toISOString() : null,
          meet_link: editingSession.meet_link || null,
          location: editingSession.location || null,
          session_type: editingSession.session_type || 'recorded'
        }).eq('id', editingSession.id)
        if (error) throw error
        toast.success('Session updated')
      } else {
        const { error } = await supabase.from('course_sessions').insert({
          course_id: courseId!,
          title: editingSession.title,
          description: editingSession.description || null,
          start_time: editingSession.start_time ? new Date(editingSession.start_time).toISOString() : null,
          end_time: editingSession.end_time ? new Date(editingSession.end_time).toISOString() : null,
          meet_link: editingSession.meet_link || null,
          location: editingSession.location || null,
          order_index: sessions.length,
          session_type: editingSession.session_type || 'recorded'
        })
        if (error) throw error
        toast.success('Session created')
      }
      setDialogOpen(false)
      fetchData()
    } catch (err) {
      toast.error('Failed to save session')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this session?')) return
    try {
      await supabase.from('course_sessions').delete().eq('id', id)
      toast.success('Session deleted')
      fetchData()
    } catch (err) {
      toast.error('Failed to delete session')
    }
  }

  const openNew = () => {
    setEditingSession({ title: '', description: '', start_time: '', end_time: '', meet_link: '', location: '' })
    setDialogOpen(true)
  }

  if (loading) return <TrainerLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div></TrainerLayout>

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-4xl mx-auto space-y-6">
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <Link to={`/trainer/courses/${courseId}`} className="flex items-center gap-2 text-sm text-ink/60 hover:text-ink transition-colors mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to Course
            </Link>
            <h2 className="text-2xl font-bold tracking-tight text-ink">Course Sessions</h2>
            <p className="text-ink/60 text-sm mt-1">{course?.title}</p>
          </div>
          <Button onClick={openNew} className="bg-ink hover:bg-ink/90 text-cream">
            <Plus className="w-4 h-4 mr-2" /> Add Session
          </Button>
        </motion.div>

        {sessions.length === 0 ? (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border-ink/10">
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 text-ink/20 mx-auto mb-4" />
                <p className="text-ink/60 mb-4">No sessions created yet. Group your course into days or modules.</p>
                <Button onClick={openNew} className="bg-ink hover:bg-ink/90 text-cream">
                  <Plus className="w-4 h-4 mr-2" /> Add First Session
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session, index) => {
              const sessionMaterials = materials.filter(m => m.session_id === session.id)
              return (
                <motion.div key={session.id} variants={fadeUp}>
                  <Card className="bg-white border-ink/10 overflow-hidden group hover:border-ink/20 transition-all">
                    <CardHeader className="bg-ink/5 border-b border-ink/5 pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px]">Session {index + 1}</Badge>
                            <CardTitle className="text-lg text-ink">{session.title}</CardTitle>
                          </div>
                          {session.description && <p className="text-sm text-ink/60 mt-2">{session.description}</p>}
                          
                          <div className="flex flex-wrap gap-4 mt-3 text-xs text-ink/70">
                            {session.session_type && (
                              <Badge className={`text-[10px] capitalize ${session.session_type === 'live' || session.session_type === 'hybrid' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200' : session.session_type === 'recorded' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200' : 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200'}`}>
                                {session.session_type.replace('_', ' ')}
                              </Badge>
                            )}
                            {session.start_time && (
                              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {format(new Date(session.start_time), 'MMM d, yyyy h:mm a')}</span>
                            )}
                            {session.meet_link && (session.session_type === 'live' || session.session_type === 'hybrid') && (
                              <a href={session.meet_link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline">
                                <Video className="w-3.5 h-3.5" /> Join Live Class
                              </a>
                            )}
                            {session.location && (session.session_type === 'in_person' || session.session_type === 'hybrid') && (
                              <span className="flex items-center gap-1.5 text-ink/70">
                                <Globe className="w-3.5 h-3.5" /> {session.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setEditingSession({
                              ...session,
                              start_time: session.start_time ? new Date(session.start_time).toISOString().slice(0, 16) : '',
                              end_time: session.end_time ? new Date(session.end_time).toISOString().slice(0, 16) : ''
                            })
                            setDialogOpen(true)
                          }}>Edit</Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(session.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 bg-white">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-ink">Session Materials</h4>
                        <Link to={`/trainer/courses/${courseId}/materials?session=${session.id}`}>
                          <Button variant="outline" size="sm" className="h-8 text-xs border-ink/20">Manage Materials</Button>
                        </Link>
                      </div>
                      {sessionMaterials.length === 0 ? (
                        <p className="text-xs text-ink/50 italic">No materials assigned to this session.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {sessionMaterials.map(m => (
                            <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-ink/5 text-xs text-ink/80">
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{m.file_name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white border-ink/10">
          <DialogHeader><DialogTitle className="text-ink">{editingSession?.id ? 'Edit Session' : 'New Session'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-ink/80">Session Title *</Label>
              <Input className="bg-ink/5 border-ink/20 text-ink" value={editingSession?.title || ''} onChange={e => setEditingSession({ ...editingSession, title: e.target.value })} placeholder="e.g. Day 1: Basics" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-ink/80">Description</Label>
              <Textarea className="bg-ink/5 border-ink/20 text-ink" value={editingSession?.description || ''} onChange={e => setEditingSession({ ...editingSession, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-ink/80">Delivery Mode</Label>
              <Select value={editingSession?.session_type || 'recorded'} onValueChange={v => setEditingSession({ ...editingSession, session_type: v })}>
                <SelectTrigger className="bg-ink/5 border-ink/20 text-ink"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recorded">Fully Video Class</SelectItem>
                  <SelectItem value="live">Only Online Live Class</SelectItem>
                  <SelectItem value="in_person">Fully In-Person Class</SelectItem>
                  <SelectItem value="hybrid">Hybrid (Both Live & Video / In-Person)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-ink/80">Start Time</Label>
                <Input className="bg-ink/5 border-ink/20 text-ink" type="datetime-local" value={editingSession?.start_time || ''} onChange={e => setEditingSession({ ...editingSession, start_time: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-ink/80">End Time</Label>
                <Input className="bg-ink/5 border-ink/20 text-ink" type="datetime-local" value={editingSession?.end_time || ''} onChange={e => setEditingSession({ ...editingSession, end_time: e.target.value })} />
              </div>
            </div>
            {(editingSession?.session_type === 'live' || editingSession?.session_type === 'hybrid') && (
              <div className="space-y-1.5">
                <Label className="text-ink/80">Live Class Meet Link</Label>
                <Input className="bg-ink/5 border-ink/20 text-ink" type="url" value={editingSession?.meet_link || ''} onChange={e => setEditingSession({ ...editingSession, meet_link: e.target.value })} placeholder="https://meet.google.com/..." />
              </div>
            )}
            {(editingSession?.session_type === 'in_person' || editingSession?.session_type === 'hybrid') && (
              <div className="space-y-1.5">
                <Label className="text-ink/80">Physical Location</Label>
                <Input className="bg-ink/5 border-ink/20 text-ink" type="text" value={editingSession?.location || ''} onChange={e => setEditingSession({ ...editingSession, location: e.target.value })} placeholder="e.g. Room 402, Main Campus" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-ink/20 text-ink" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSession} disabled={saving} className="bg-ink text-cream hover:bg-ink/90">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TrainerLayout>
  )
}
