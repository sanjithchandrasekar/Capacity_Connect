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
  ArrowLeft, Plus, Trash2, Loader2, Calendar, Video, FileText, Save, Globe, Clock, UserCheck
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { useConfirm } from '@/hooks/useConfirm'
import { LiveAttendanceTrainerPanel } from '../courses/LiveAttendanceTrainerPanel'
type Course = Database['public']['Tables']['courses']['Row']
type Session = Database['public']['Tables']['course_sessions']['Row']
type Material = Database['public']['Tables']['materials']['Row']

export function CourseSessionsPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user, profile } = useAuth()
  const isTrainer = profile?.role === 'trainer'
  const baseCoursePath = isTrainer ? '/trainer/courses' : '/admin/courses'
  const [course, setCourse] = useState<Course | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Partial<Session> | null>(null)
  const [sessionDate, setSessionDate] = useState('')
  const [sessionStartTime, setSessionStartTime] = useState('')
  const [sessionEndTime, setSessionEndTime] = useState('')
  const [ConfirmDialog, confirm] = useConfirm()

  // Attendance Modal state
  const [allEnrollments, setAllEnrollments] = useState<any[]>([])
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false)
  const [attendanceSession, setAttendanceSession] = useState<Session | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, 'present' | 'absent' | 'late'>>({})

  const isSessionFinished = (session: Session) => {
    if (!session.end_time && !session.start_time) return false
    const sessionEndTime = session.end_time ? new Date(session.end_time) : new Date(session.start_time!)
    return sessionEndTime < new Date()
  }

  const activeSessions = sessions.filter(s => !isSessionFinished(s))
  const pastSessions = sessions.filter(s => isSessionFinished(s))
  const activeEnrollments = allEnrollments.filter(e => ['enrolled', 'in_progress', 'completed'].includes(e.status))

  const handleOpenAttendance = (session: Session) => {
    setAttendanceSession(session)
    const initial: Record<string, 'present' | 'absent' | 'late'> = {}
    activeEnrollments.forEach(e => {
      initial[e.user_id] = 'present'
    })
    setAttendanceRecords(initial)
    setAttendanceDialogOpen(true)
  }

  const handleSaveAttendance = () => {
    toast.success(`Attendance saved for "${attendanceSession?.title || 'Session'}"!`)
    setAttendanceDialogOpen(false)
  }

  const fetchData = useCallback(async () => {
    if (!user || !courseId) return
    setLoading(true)
    try {
      let query = supabase.from('courses').select('*').eq('id', courseId)
      if (profile?.role === 'trainer') {
        query = query.eq('trainer_id', user.id)
      }
      const { data: c } = await query.single()
      if (c) setCourse(c)

      const { data: s } = await supabase.from('course_sessions').select('*').eq('course_id', courseId).order('order_index')
      if (s) setSessions(s)

      const { data: m } = await supabase.from('materials').select('*').eq('course_id', courseId)
      if (m) setMaterials(m)

      const { data: enrollmentsData } = await supabase.from('enrollments').select('*').eq('course_id', courseId)
      if (enrollmentsData && enrollmentsData.length > 0) {
        const userIds = enrollmentsData.map(e => e.user_id)
        const { data: traineesData } = await supabase.from('trainees').select('id, full_name, email').in('id', userIds)
        setAllEnrollments(enrollmentsData.map(e => ({
          ...e,
          trainee: traineesData?.find(t => t.id === e.user_id) || { full_name: 'Unknown Trainee', email: '' }
        })))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user, profile?.role, courseId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSaveSession = async () => {
    if (!editingSession?.title?.trim()) {
      toast.error('Title is required')
      return
    }
    setSaving(true)
    try {
      let finalStartTime: string | null = null
      let finalEndTime: string | null = null

      if (sessionDate && sessionStartTime) {
        const d = new Date(`${sessionDate}T${sessionStartTime}:00`)
        if (!isNaN(d.getTime())) finalStartTime = d.toISOString()
      } else if (sessionDate) {
        const d = new Date(`${sessionDate}T00:00:00`)
        if (!isNaN(d.getTime())) finalStartTime = d.toISOString()
      }

      if (sessionDate && sessionEndTime) {
        const d = new Date(`${sessionDate}T${sessionEndTime}:00`)
        if (!isNaN(d.getTime())) finalEndTime = d.toISOString()
      } else if (sessionDate && sessionStartTime) {
        // default end time to 1 hour after start if not set
        const d = new Date(`${sessionDate}T${sessionStartTime}:00`)
        if (!isNaN(d.getTime())) {
          d.setHours(d.getHours() + 1)
          finalEndTime = d.toISOString()
        }
      }

      if (editingSession.id) {
        const { error } = await supabase.from('course_sessions').update({
          title: editingSession.title.trim(),
          description: editingSession.description?.trim() || null,
          start_time: finalStartTime,
          end_time: finalEndTime,
          meet_link: editingSession.meet_link?.trim() || null,
          session_type: editingSession.session_type || 'live'
        }).eq('id', editingSession.id)
        if (error) throw error
        toast.success('Session updated successfully')
      } else {
        const { error } = await supabase.from('course_sessions').insert({
          course_id: courseId!,
          title: editingSession.title.trim(),
          description: editingSession.description?.trim() || null,
          start_time: finalStartTime,
          end_time: finalEndTime,
          meet_link: editingSession.meet_link?.trim() || null,
          order_index: sessions.length,
          session_type: editingSession.session_type || 'live'
        })
        if (error) throw error
        toast.success('Session created successfully')
      }

      // Direct notification dispatch for enrolled trainees
      try {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('user_id')
          .eq('course_id', courseId!)
          .in('status', ['enrolled', 'in_progress', 'completed'])

        if (enrollments && enrollments.length > 0) {
          const sessionTitle = editingSession.title.trim()
          const timeText = finalStartTime ? ` on ${new Date(finalStartTime).toLocaleDateString()} at ${new Date(finalStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''
          const isEdit = !!editingSession.id

          const notifs = enrollments
            .filter(e => e.user_id !== user?.id)
            .map(e => ({
              user_id: e.user_id,
              type: `course_session:${courseId}`,
              title: isEdit ? `📅 Session Updated: ${sessionTitle}` : `📅 New Session: ${sessionTitle}`,
              message: `A session has been scheduled in "${course?.title || 'your course'}"${timeText}.`
            }))

          if (notifs.length > 0) {
            await supabase.from('notifications').insert(notifs)
          }
        }
      } catch (nErr) {
        console.warn('Direct notification insertion handled or skipped:', nErr)
      }

      if (editingSession.meet_link?.trim() && courseId) {
        supabase.from('courses').update({ meet_link: editingSession.meet_link.trim() }).eq('id', courseId).then(() => {}, (err) => console.warn(err))
      }

      setDialogOpen(false)
      fetchData()
    } catch (err: any) {
      console.error('Failed to save session:', err)
      toast.error(err?.message || 'Failed to save session')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm('Are you sure you want to delete this session?', 'Delete Session')
    if (!isConfirmed) return
    try {
      await supabase.from('course_sessions').delete().eq('id', id)
      toast.success('Session deleted')
      fetchData()
    } catch (err) {
      toast.error('Failed to delete session')
    }
  }

  const openNew = () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    setEditingSession({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      meet_link: course?.meet_link || '',
      location: '',
      session_type: 'live'
    })
    setSessionDate(today)
    setSessionStartTime('10:00')
    setSessionEndTime('11:00')
    setDialogOpen(true)
  }

  const openEdit = (session: Session) => {
    let dateStr = format(new Date(), 'yyyy-MM-dd')
    let startStr = '10:00'
    let endStr = '11:00'

    if (session.start_time) {
      const d = new Date(session.start_time)
      if (!isNaN(d.getTime())) {
        dateStr = format(d, 'yyyy-MM-dd')
        startStr = format(d, 'HH:mm')
      }
    }
    if (session.end_time) {
      const d = new Date(session.end_time)
      if (!isNaN(d.getTime())) {
        endStr = format(d, 'HH:mm')
      }
    }

    setEditingSession({ ...session })
    setSessionDate(dateStr)
    setSessionStartTime(startStr)
    setSessionEndTime(endStr)
    setDialogOpen(true)
  }

  const renderSessionCard = (session: Session, index: number, isFinished: boolean) => {
    const sessionMaterials = materials.filter(m => m.session_id === session.id)
    return (
      <motion.div key={session.id} variants={fadeUp}>
        <Card className={`bg-white border ${isFinished ? 'border-slate-200/70 bg-slate-50/40 opacity-95' : 'border-slate-200/90'} shadow-sm hover:shadow-md hover:border-slate-300 transition-all overflow-hidden rounded-3xl group`}>
          <CardHeader className="bg-slate-50/80 border-b border-slate-100 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px] bg-white border-slate-200 text-slate-700 font-semibold">
                    Session {index + 1}
                  </Badge>
                  {isFinished && (
                    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      Completed
                    </Badge>
                  )}
                  <CardTitle className="text-lg font-bold text-slate-900">{session.title}</CardTitle>
                </div>
                {session.description && <p className="text-sm text-slate-600 mt-2 font-medium">{session.description}</p>}
                
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500 font-medium">
                  {session.session_type && (
                    <Badge className={`text-[10px] capitalize font-semibold ${session.session_type === 'live' || session.session_type === 'hybrid' ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                      {session.session_type.replace('_', ' ')}
                    </Badge>
                  )}
                  {session.start_time && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {format(new Date(session.start_time), 'MMM d, yyyy h:mm a')}
                      {session.end_time && ` - ${format(new Date(session.end_time), 'h:mm a')}`}
                    </span>
                  )}
                  {session.meet_link && !isFinished && (
                    <a href={session.meet_link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-cyan-600 hover:text-cyan-700 font-semibold hover:underline">
                      <Video className="w-3.5 h-3.5" /> Join Live Class
                    </a>
                  )}
                  {session.location && (
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <Globe className="w-3.5 h-3.5 text-slate-400" /> {session.location}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => handleOpenAttendance(session)} className="border-cyan-200 text-cyan-700 bg-cyan-50 hover:bg-cyan-100 font-semibold text-xs rounded-xl h-8">
                  <UserCheck className="w-3.5 h-3.5 mr-1" /> Attendance
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900" onClick={() => openEdit(session)}>Edit</Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(session.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-800">Session Materials</h4>
              <Link to={`${baseCoursePath}/${courseId}/materials?session=${session.id}`}>
                <Button variant="outline" size="sm" className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl">Manage Materials</Button>
              </Link>
            </div>
            {sessionMaterials.length === 0 ? (
              <p className="text-xs text-slate-400 italic font-medium">No materials assigned to this session.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sessionMaterials.map(m => (
                  <div key={m.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 font-medium">
                    <FileText className="w-3.5 h-3.5 shrink-0 text-cyan-600" />
                    <span className="truncate">{m.file_name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (loading) return <TrainerLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div></TrainerLayout>

  return (
    <TrainerLayout>
      <ConfirmDialog />
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-4xl mx-auto space-y-6">
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <Link to={`${baseCoursePath}/${courseId}`} className="flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-600 transition-colors mb-4 font-medium">
              <ArrowLeft className="w-4 h-4" /> Back to Course
            </Link>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Course Sessions</h2>
            <p className="text-slate-500 text-sm mt-1 font-medium">{course?.title}</p>
          </div>
          <Button onClick={openNew} className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:opacity-95 text-white font-bold rounded-xl shadow-md shadow-cyan-600/10">
            <Plus className="w-4 h-4 mr-2" /> Add Session
          </Button>
        </motion.div>

        {sessions.length === 0 ? (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border border-slate-200/90 shadow-sm rounded-3xl">
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 mb-4 font-medium">No sessions created yet. Group your course into days or modules.</p>
                <Button onClick={openNew} className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:opacity-95 text-white font-bold rounded-xl shadow-sm">
                  <Plus className="w-4 h-4 mr-2" /> Add First Session
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Active & Upcoming Sessions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-600" /> Active & Upcoming Sessions
                  <Badge className="bg-cyan-50 text-cyan-700 border border-cyan-200 text-[10px] font-bold">{activeSessions.length}</Badge>
                </h3>
              </div>
              {activeSessions.length > 0 ? (
                activeSessions.map((session, index) => renderSessionCard(session, index, false))
              ) : (
                <Card className="bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                  <CardContent className="py-6 text-center text-xs text-slate-400 italic">
                    No active upcoming sessions. All completed sessions appear in history below.
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Session History (Completed Sessions) */}
            {pastSessions.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" /> Session History (Completed)
                    <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">{pastSessions.length}</Badge>
                  </h3>
                </div>
                {pastSessions.map((session, index) => renderSessionCard(session, activeSessions.length + index, true))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Attendance Modal Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="sm:max-w-[700px] bg-transparent border-0 shadow-none p-0 overflow-hidden">
          <LiveAttendanceTrainerPanel session={attendanceSession} enrollments={activeEnrollments} />
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[440px] bg-white border border-slate-200/90 shadow-2xl rounded-3xl text-slate-900">
          <DialogHeader><DialogTitle className="text-slate-900 font-black text-xl">{editingSession?.id ? 'Edit Session' : 'New Session'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-semibold text-xs">Session Title *</Label>
              <Input className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl" value={editingSession?.title || ''} onChange={e => setEditingSession({ ...editingSession, title: e.target.value })} placeholder="e.g. Day 1: Basics" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-semibold text-xs">Description</Label>
              <Textarea className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl" value={editingSession?.description || ''} onChange={e => setEditingSession({ ...editingSession, description: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-semibold text-xs">Delivery Mode</Label>
              <Select value={editingSession?.session_type || 'live'} onValueChange={v => setEditingSession({ ...editingSession, session_type: v })}>
                <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl"><SelectValue placeholder="Online Live Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">Online Live Class</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-semibold text-xs">Session Date</Label>
              <Input 
                className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl" 
                type="date" 
                value={sessionDate} 
                onChange={e => setSessionDate(e.target.value)} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-xs">Start Time</Label>
                <Input 
                  className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl" 
                  type="time" 
                  value={sessionStartTime} 
                  onChange={e => setSessionStartTime(e.target.value)} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold text-xs">End Time</Label>
                <Input 
                  className="bg-slate-50 border-slate-200 text-slate-900 rounded-xl" 
                  type="time" 
                  value={sessionEndTime} 
                  onChange={e => setSessionEndTime(e.target.value)} 
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700 font-semibold text-xs">Live Class Meet Link *</Label>
              <Input className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl" type="url" value={editingSession?.meet_link || ''} onChange={e => setEditingSession({ ...editingSession, meet_link: e.target.value })} placeholder="https://meet.google.com/..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSession} disabled={saving} className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:opacity-95 text-white font-semibold rounded-xl shadow-sm">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TrainerLayout>
  )
}
