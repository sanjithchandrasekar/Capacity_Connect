import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Database } from '@/integrations/supabase/types'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft, Edit3, Target, BarChart3, FileText, Clock, Users, Loader2, Calendar,
  Video, BookOpen, CheckCircle2, XCircle, UserCheck, Layers, Trophy, Globe,
  Image as ImageIcon, ExternalLink, HelpCircle, ChevronDown, ChevronUp, Sparkles,
  Eye, AlertCircle, Send, Check, Film, Camera, AlignLeft, Link2, Download, Trash2,
  Star, MessageSquare, Info, BookMarked
} from 'lucide-react'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { MaterialPreviewDialog } from '@/components/ui/MaterialPreviewDialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { CourseAnnouncements } from '../courses/CourseAnnouncements'
import { CourseChat } from '../courses/CourseChat'
import { CourseFeedback } from '../courses/CourseFeedback'
import { CourseMaterials } from '../courses/CourseMaterials'
import { LiveAttendanceTrainerPanel } from '../courses/LiveAttendanceTrainerPanel'

type Course = Database['public']['Tables']['courses']['Row'] & {
  modules?: any[] | null
  edit_request_status?: string | null
  edit_request_reason?: string | null
  edit_request_at?: string | null
  edit_window_expires_at?: string | null
  edit_window_duration_hours?: number | null
  admin_edit_notes?: string | null
}
type CourseSkill = Database['public']['Tables']['course_skills']['Row'] & { skills: { name: string } | null }
type Session = Database['public']['Tables']['course_sessions']['Row']
type Material = Database['public']['Tables']['materials']['Row']

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border border-slate-200',
  pending_review: 'bg-amber-50 text-amber-700 border border-amber-200',
  published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  archived: 'bg-rose-50 text-rose-700 border border-rose-200',
}

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null
}

function getFormattedObjectives(raw: any): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw.join('\n\n')
  if (typeof raw === 'object') {
    const parts: string[] = []
    if (raw.description) parts.push(raw.description)
    if (raw.understand) parts.push(`What you'll understand: ${raw.understand}`)
    if (raw.able_to_do) parts.push(`What you'll be able to do: ${raw.able_to_do}`)
    return parts.length > 0 ? parts.join('\n\n') : JSON.stringify(raw)
  }
  return String(raw)
}

function formatTime12(timeStr?: string | null): string {
  if (!timeStr) return ''
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr
  const parts = timeStr.split(':')
  if (parts.length < 2) return timeStr
  let hour = parseInt(parts[0], 10)
  const minute = parts[1]
  const ampm = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  return `${hour.toString().padStart(2, '0')}:${minute} ${ampm}`
}

function parseSessionFlowText(text: string): Array<{ number: string; title: string; description: string }> {
  if (!text) return []
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  const results: Array<{ number: string; title: string; description: string }> = []

  for (const line of lines) {
    const sessionMatch = line.match(/^[Ss]ession\s+(\d+)\s*[–\-:]\s*([^:]+?)(?::\s*(.+))?$/)
    if (sessionMatch) {
      results.push({
        number: sessionMatch[1],
        title: sessionMatch[2].trim(),
        description: sessionMatch[3]?.trim() || '',
      })
      continue
    }
    const numMatch = line.match(/^(\d+)\.\s+([^:]+?)(?::\s*(.+))?$/)
    if (numMatch) {
      results.push({
        number: numMatch[1],
        title: numMatch[2].trim(),
        description: numMatch[3]?.trim() || '',
      })
      continue
    }
    if (results.length > 0 && !results[results.length - 1].description) {
      results[results.length - 1].description = line.trim()
    } else {
      results.push({
        number: String(results.length + 1),
        title: line.trim(),
        description: '',
      })
    }
  }

  return results
}

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [course, setCourse] = useState<Course | null>(null)
  const [courseSkills, setCourseSkills] = useState<CourseSkill[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [assessmentCount, setAssessmentCount] = useState(0)
  const [enrollmentCount, setEnrollmentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [docLoading, setDocLoading] = useState(false)
  const [aboutModalOpen, setAboutModalOpen] = useState(false)
  const [aboutActiveTab, setAboutActiveTab] = useState<'about' | 'outline'>('about')
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [allEnrollments, setAllEnrollments] = useState<any[]>([])
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null)

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const isTrainer = profile?.role === 'trainer'
  const baseCoursePath = isTrainer ? '/trainer/courses' : '/admin/courses'

  // Module Preview Expansion State
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null)

  // Edit Request Modal State
  const [editRequestOpen, setEditRequestOpen] = useState(false)
  const [editReason, setEditReason] = useState('')
  const [submittingEditRequest, setSubmittingEditRequest] = useState(false)

  // Attendance Modal state
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false)
  const [attendanceSession, setAttendanceSession] = useState<Session | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, 'present' | 'absent' | 'late'>>({})

  const pendingEnrollments = allEnrollments.filter(e => e.status === 'pending_approval')
  const waitlistedEnrollments = allEnrollments.filter(e => e.status === 'waitlisted')
  const activeEnrollments = allEnrollments.filter(e => ['enrolled', 'in_progress', 'completed'].includes(e.status))
  const historyEnrollments = allEnrollments.filter(e => e.status !== 'pending_approval')

  const isSessionFinished = (session: Session) => {
    if (!session.end_time && !session.start_time) return false
    const sessionEndTime = session.end_time ? new Date(session.end_time) : new Date(session.start_time!)
    return sessionEndTime < new Date()
  }

  const activeSessions = sessions.filter(s => !isSessionFinished(s))
  const pastSessions = sessions.filter(s => isSessionFinished(s))
  const activeUpcomingLiveSession = sessions.find(s => s.meet_link && !isSessionFinished(s))

  const handleOpenAttendance = (session: Session) => {
    setAttendanceSession(session)
    const initial: Record<string, 'present' | 'absent' | 'late'> = {}
    activeEnrollments.forEach(e => {
      initial[e.user_id] = 'present'
    })
    setAttendanceRecords(initial)
    setAttendanceDialogOpen(true)
  }

  const toggleModule = (modId: string) => {
    setOpenModules(prev => {
      const next = new Set(prev)
      if (next.has(modId)) next.delete(modId)
      else next.add(modId)
      return next
    })
  }

  const toggleAllModules = (expand: boolean) => {
    if (!course?.modules || !Array.isArray(course.modules)) return
    if (expand) {
      setOpenModules(new Set(course.modules.map((m: any) => m.id)))
    } else {
      setOpenModules(new Set())
    }
  }

  const fetchData = useCallback(async (isInitial = false) => {
    if (!user || !courseId) return
    if (isInitial) setLoading(true)
    try {
      let courseQuery = supabase.from('courses').select('*').eq('id', courseId)
      if (profile?.role === 'trainer') {
        courseQuery = courseQuery.eq('trainer_id', user.id)
      }

      let assessQuery = supabase.from('assessments').select('id', { count: 'exact', head: true }).eq('course_id', courseId)
      if (profile?.role === 'trainer') {
        assessQuery = assessQuery.eq('created_by', user.id)
      }

      const [cRes, csRes, mRes, aRes, eRes, sRes, enrollmentsRes] = await Promise.all([
        courseQuery.single(),
        supabase.from('course_skills').select('*, skills(name)').eq('course_id', courseId),
        supabase.from('materials').select('*').eq('course_id', courseId),
        assessQuery,
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('course_id', courseId).in('status', ['enrolled', 'in_progress', 'completed']),
        supabase.from('course_sessions').select('*').eq('course_id', courseId).order('order_index'),
        supabase.from('enrollments').select('*').eq('course_id', courseId).order('enrolled_at', { ascending: false }),
      ])

      let mergedEnrollments: any[] = []
      if (enrollmentsRes.error) {
        console.error('Error fetching enrollments:', enrollmentsRes.error)
      } else if (enrollmentsRes.data && enrollmentsRes.data.length > 0) {
        const userIds = enrollmentsRes.data.map(e => e.user_id)
        const { data: traineesData, error: traineesError } = await supabase.from('trainees').select('id, full_name, email').in('id', userIds)
        if (traineesError) console.error('Error fetching trainees:', traineesError)

        mergedEnrollments = enrollmentsRes.data.map(e => ({
          ...e,
          trainee: traineesData?.find(t => t.id === e.user_id) || { full_name: 'Unknown Trainee', email: '' }
        }))
      }

      if (cRes.data) {
        let loadedCourse = cRes.data as Course
        if (!loadedCourse.modules || !Array.isArray(loadedCourse.modules) || loadedCourse.modules.length === 0) {
          const { data: dbModules } = await (supabase as any)
            .from('course_modules')
            .select('*, quiz_questions:quiz_questions(*)')
            .eq('course_id', courseId)
            .order('order_index', { ascending: true })
          if (dbModules && dbModules.length > 0) {
            loadedCourse = {
              ...loadedCourse,
              modules: dbModules
            }
          }
        }
        setCourse(loadedCourse)
        // Default open first 2 modules on initial load
        if (isInitial && loadedCourse.modules && Array.isArray(loadedCourse.modules)) {
          setOpenModules(new Set(loadedCourse.modules.slice(0, 2).map((m: any) => m.id)))
        }
      }
      if (csRes.data) setCourseSkills(csRes.data as any)
      if (mRes.data) setMaterials(mRes.data)
      if (aRes.count !== null) setAssessmentCount(aRes.count)
      setEnrollmentCount(eRes.count ?? 0)
      if (sRes.data) setSessions(sRes.data)
      setAllEnrollments(mergedEnrollments)
    } catch (err) {
      console.error(err)
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [user, profile?.role, courseId])

  useEffect(() => { fetchData(true) }, [fetchData])

  const handleOpenSessionDoc = async () => {
    if (!course?.session_flow_document_path) return
    setDocLoading(true)
    try {
      const { data, error } = await supabase.storage
        .from('materials')
        .createSignedUrl(course.session_flow_document_path, 300)
      if (error) throw error
      if (data?.signedUrl) {
        setPreviewMaterial({
          id: 'syllabus-doc',
          file_name: 'Course Syllabus Document',
          storage_path: course.session_flow_document_path,
          material_type: 'document',
          course_id: course.id,
          created_at: new Date().toISOString(),
          description: 'Uploaded Course Syllabus Document',
          duration_minutes: null,
          external_url: null,
          order_index: 0,
          thumbnail_url: null,
          title: 'Course Outline & Syllabus',
          topic_name: 'Outline',
          uploader_id: course.trainer_id
        } as any)
        setPreviewUrl(data.signedUrl)
      }
    } catch {
      toast.error('Could not open syllabus document.')
    } finally {
      setDocLoading(false)
    }
  }

  const handleDownload = async (mat: Material) => {
    if (!mat.storage_path) return
    try {
      const { data, error } = await supabase.storage
        .from('materials')
        .download(mat.storage_path)
      if (error) throw error
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = mat.file_name || 'download'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Downloaded successfully')
    } catch {
      toast.error('Failed to download file')
    }
  }

  const handleApproval = async (enrollmentId: string, action: 'approve' | 'reject', trainee: any) => {
    setIsProcessingId(enrollmentId)
    try {
      const newStatus = action === 'approve' ? 'enrolled' : 'rejected'

      const { error: updateError } = await supabase
        .from('enrollments')
        .update({ status: newStatus })
        .eq('id', enrollmentId)

      if (updateError) throw updateError

      const { error: notificationError } = await supabase.from('notifications').insert({
        user_id: trainee.id,
        type: `enrollment_status:${course?.id}`,
        title: `Enrollment ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        message: `Your request to enroll in ${course?.title} was ${action === 'approve' ? 'approved' : 'rejected'}.`,
      })
      if (notificationError) console.error(notificationError)

      toast.success(`Enrollment ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
      fetchData()
    } catch (e: any) {
      toast.error(e.message || 'Failed to process enrollment')
      console.error(e)
    } finally {
      setIsProcessingId(null)
    }
  }

  // Handle Trainer Requesting Edit Permission from Admin
  const handleRequestEditPermission = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editReason.trim() || editReason.trim().length < 10) {
      toast.error('Please enter a valid description (at least 10 characters) explaining why edits are needed.')
      return
    }
    if (!course || !user) return

    setSubmittingEditRequest(true)
    try {
      // 1. Insert into course_edit_requests
      const { error: reqErr } = await (supabase as any).from('course_edit_requests').insert({
        course_id: course.id,
        trainer_id: user.id,
        reason: editReason.trim(),
        status: 'pending',
        created_at: new Date().toISOString()
      })
      if (reqErr) console.warn('Edit request table insert warning:', reqErr)

      // 2. Update courses table
      const { error: courseErr } = await supabase
        .from('courses')
        .update({
          edit_request_status: 'pending',
          edit_request_reason: editReason.trim(),
          edit_request_at: new Date().toISOString(),
          admin_edit_notes: null
        } as any)
        .eq('id', course.id)

      if (courseErr) throw courseErr

      // 3. Notify Admins
      try {
        const { data: admins } = await supabase.from('admins').select('id')
        if (admins && admins.length > 0) {
          await supabase.from('notifications').insert(
            admins.map(adm => ({
              user_id: adm.id,
              type: `course_edit_request:${course.id}`,
              title: `Course Edit Permission Requested: ${course.title}`,
              message: `Trainer requested permission to edit "${course.title}". Reason: ${editReason.trim().slice(0, 100)}...`,
            }))
          )
        }
      } catch (err) {
        console.warn('Could not notify admins', err)
      }

      toast.success('Edit permission request submitted to Admin! You will be notified once a time limit is granted.')
      setEditRequestOpen(false)
      setEditReason('')
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit edit request')
    } finally {
      setSubmittingEditRequest(false)
    }
  }

  // Determine active editing window
  const isEditWindowActive = Boolean(
    course?.edit_request_status === 'approved' &&
    course?.edit_window_expires_at &&
    new Date(course.edit_window_expires_at).getTime() > Date.now()
  )

  const canDirectEdit = isAdmin || course?.status === 'draft' || course?.status === 'pending_review' || isEditWindowActive

  // Format countdown string for active editing window
  const getRemainingTimeStr = () => {
    if (!course?.edit_window_expires_at) return ''
    const diff = new Date(course.edit_window_expires_at).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${mins}m remaining`
  }

  const objectives = (course?.learning_objectives as Record<string, string> | null) ?? null

  if (loading) {
    return (
      <TrainerLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
        </div>
      </TrainerLayout>
    )
  }

  if (!course) {
    return (
      <TrainerLayout>
        <div className="max-w-3xl mx-auto py-20 text-center">
          <p className="text-slate-500 mb-4">Course not found or you don't have access.</p>
          <RouterLink to={isTrainer ? '/trainer/courses' : '/admin'}><Button variant="outline" className="border-slate-200 text-slate-700">Back to Courses</Button></RouterLink>
        </div>
      </TrainerLayout>
    )
  }

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-4xl mx-auto space-y-6">
        <motion.div variants={fadeUp}>
          <RouterLink to={isTrainer ? '/trainer/courses' : '/admin'} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Courses
          </RouterLink>
        </motion.div>

        {/* 1. Active Editing Window Banner (if authorized by Admin) */}
        {isEditWindowActive && !isAdmin && (
          <motion.div variants={fadeUp} className="p-5 rounded-2xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping" />
                <h3 className="font-bold text-sm text-white">⚡ Course Editing Permission Active</h3>
                <span className="text-[11px] font-extrabold bg-white/20 text-white px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                  {getRemainingTimeStr()}
                </span>
              </div>
              <p className="text-xs text-cyan-100 leading-relaxed">
                Admin has approved your edit request. Changes must be submitted for re-approval before{' '}
                <strong>{new Date(course.edit_window_expires_at!).toLocaleString()}</strong>.
              </p>
            </div>
            <RouterLink to={isTrainer ? `/trainer/courses/${courseId}/edit` : `/admin/courses/${courseId}/edit`}>
              <Button size="sm" className="bg-white text-cyan-900 hover:bg-cyan-50 font-bold text-xs rounded-xl shadow-md shrink-0">
                <Edit3 className="w-3.5 h-3.5 mr-1.5 text-cyan-700" /> Open Course Editor
              </Button>
            </RouterLink>
          </motion.div>
        )}

        {/* 2. Pending Edit Request Status Banner */}
        {!isEditWindowActive && !isAdmin && course.edit_request_status === 'pending' && (
          <motion.div variants={fadeUp} className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 text-xs">
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-amber-950">⏳ Edit Permission Request Pending Admin Review</p>
                <span className="text-[10px] font-semibold text-amber-700">
                  {course.edit_request_at ? new Date(course.edit_request_at).toLocaleDateString() : ''}
                </span>
              </div>
              <p className="mt-1 text-slate-700 leading-relaxed">
                <strong>Your Reason:</strong> <em>"{course.edit_request_reason}"</em>
              </p>
              <p className="text-[11px] text-amber-800 mt-1.5">
                The administrator has been notified and will set a time window for your edits.
              </p>
            </div>
          </motion.div>
        )}

        {/* 3. Hero Header Card */}
        <motion.div variants={fadeUp} className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-4">
              {course.thumbnail_path && (
                <div className="w-full sm:w-32 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                  <Thumbnail path={course.thumbnail_path} alt={course.title} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                  <div>
                    <Badge className={`${statusColors[course.status]} text-[10px] font-semibold mb-2`}>{course.status.replace('_', ' ')}</Badge>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-2xl font-black text-slate-900 leading-tight">{course.title}</h1>
                      <button
                        onClick={() => {
                          setAboutActiveTab('about')
                          setAboutModalOpen(true)
                        }}
                        title="About Course"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 text-xs font-bold transition-all shadow-xs cursor-pointer group shrink-0"
                      >
                        <Info className="w-3.5 h-3.5 text-cyan-600 group-hover:scale-110 transition-transform" />
                        <span>About</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {canDirectEdit ? (
                      <RouterLink to={isTrainer ? `/trainer/courses/${courseId}/edit` : `/admin/courses/${courseId}/edit`}>
                        <Button size="sm" className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-xs">
                          <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit Course
                        </Button>
                      </RouterLink>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => setEditRequestOpen(true)}
                        disabled={course.edit_request_status === 'pending'}
                        className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold rounded-xl shadow-xs text-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                        {course.edit_request_status === 'pending' ? 'Edit Request Pending' : 'Request Edit Permission'}
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">{course.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-cyan-600" /> {course.duration_minutes ? Math.floor(course.duration_minutes / 60) : 0} hours</span>
                  <span>&bull;</span>
                  <span>{course.course_type === 'standard' ? 'Standard' : 'Scenario'} Training</span>
                  <span>&bull;</span>
                  <span>{course.department || 'General'}</span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-cyan-600" /> {enrollmentCount} {course.max_trainees ? `/ ${course.max_trainees}` : ''} enrolled</span>
                </div>
              </div>
            </div>

            {/* Pending Enrollments Section */}
            <div className="mb-4">
              <Card className="bg-amber-50/50 border border-amber-200 rounded-2xl">
                <CardContent className="p-5">
                  <h3 className="text-sm font-bold text-amber-900 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" /> Pending Enrollment Requests
                    <Badge className="bg-amber-100 text-amber-800 ml-2 font-bold">{pendingEnrollments.length}</Badge>
                  </h3>
                  <div className="space-y-2.5">
                    {pendingEnrollments.length > 0 ? (
                      pendingEnrollments.map((enrollment) => (
                        <div key={enrollment.id} className="p-3.5 rounded-xl bg-white border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{enrollment.trainee?.full_name || 'Unknown Trainee'}</h4>
                            <p className="text-xs text-slate-500">{enrollment.trainee?.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 h-8 font-semibold rounded-lg"
                              disabled={isProcessingId === enrollment.id}
                              onClick={() => handleApproval(enrollment.id, 'approve', enrollment.trainee)}
                            >
                              {isProcessingId === enrollment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-rose-300 text-rose-700 hover:bg-rose-50 h-8 font-semibold rounded-lg"
                              disabled={isProcessingId === enrollment.id}
                              onClick={() => handleApproval(enrollment.id, 'reject', enrollment.trainee)}
                            >
                              {isProcessingId === enrollment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-amber-800/80 font-medium">No pending enrollment requests at this time.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Schedule & Live Class Timing */}
            {(course.start_date || course.end_date || activeUpcomingLiveSession?.meet_link) && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3 mt-4">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2"><Calendar className="w-4 h-4 text-cyan-600" /> Schedule & Dates</h4>
                {(course.start_date || course.end_date) && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800 w-24">Course Span:</span>
                    {course.start_date ? new Date(course.start_date).toLocaleDateString() : 'TBD'}
                    {' - '}
                    {course.end_date ? new Date(course.end_date).toLocaleDateString() : 'TBD'}
                  </div>
                )}
                {activeUpcomingLiveSession?.meet_link && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/70">
                    <div className="flex items-center gap-2 text-xs text-slate-600 min-w-0">
                      <span className="font-semibold text-slate-800 w-24 shrink-0">Meeting Link:</span>
                      <a href={activeUpcomingLiveSession.meet_link} target="_blank" rel="noreferrer" className="text-cyan-600 hover:underline break-all font-medium">
                        {activeUpcomingLiveSession.meet_link}
                      </a>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleOpenAttendance(activeUpcomingLiveSession)}
                      className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 text-white font-bold text-xs rounded-xl shadow-xs h-8"
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Monitor Attendance
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Test & Assessment Plan Card */}
            {(course.final_test_date || course.final_exam_timing || course.mock_test_timing || course.end_date) && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 md:p-5 mt-4 space-y-1.5 shadow-2xs">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-600" /> Test & Assessment Plan
                </h4>
                <div className="pl-6 space-y-0.5">
                  <p className="text-xs font-semibold text-slate-400">
                    {(course as any).final_test_name || 'Final Exam'}
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {course.final_test_date
                      ? new Date(course.final_test_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
                      : course.final_exam_timing
                        ? new Date(course.final_exam_timing).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
                        : course.end_date
                          ? new Date(course.end_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
                          : '10/27/2026'}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    {(course as any).final_test_start_time && (course as any).final_test_end_time
                      ? `${formatTime12((course as any).final_test_start_time)} - ${formatTime12((course as any).final_test_end_time)}`
                      : course.final_exam_timing
                        ? `${new Date(course.final_exam_timing).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
                        : '06:30 PM - 07:30 PM'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* 3. QUICK NAVIGATION / STATS OVERVIEW CARDS */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Card 1: Sessions */}
          <div
            onClick={() => navigate(`${baseCoursePath}/${courseId}/sessions`)}
            className="bg-[#0c1322] border border-slate-800 hover:border-cyan-500/50 text-white rounded-2xl p-4 flex items-center gap-3.5 transition-all cursor-pointer shadow-lg group hover:bg-[#0f172a]"
          >
            <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">Sessions</h4>
              <p className="text-xs text-slate-400">{sessions.length} sessions</p>
            </div>
          </div>

          {/* Card 2: Materials */}
          <div
            onClick={() => navigate(`${baseCoursePath}/${courseId}/materials`)}
            className="bg-[#0c1322] border border-slate-800 hover:border-blue-500/50 text-white rounded-2xl p-4 flex items-center gap-3.5 transition-all cursor-pointer shadow-lg group hover:bg-[#0f172a]"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">Materials</h4>
              <p className="text-xs text-slate-400">{materials.length} files</p>
            </div>
          </div>

          {/* Card 3: Assessments */}
          <div
            onClick={() => navigate(`${baseCoursePath}/${courseId}/assessments`)}
            className="bg-[#0c1322] border border-slate-800 hover:border-emerald-500/50 text-white rounded-2xl p-4 flex items-center gap-3.5 transition-all cursor-pointer shadow-lg group hover:bg-[#0f172a]"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">Assessments</h4>
              <p className="text-xs text-slate-400">{assessmentCount > 0 ? `${assessmentCount} tests` : 'Not created'}</p>
            </div>
          </div>

          {/* Card 4: Performance */}
          <div
            onClick={() => navigate(`${baseCoursePath}/${courseId}/performance`)}
            className="bg-[#0c1322] border border-slate-800 hover:border-purple-500/50 text-white rounded-2xl p-4 flex items-center gap-3.5 transition-all cursor-pointer shadow-lg group hover:bg-[#0f172a]"
          >
            <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">Performance</h4>
              <p className="text-xs text-slate-400">{activeEnrollments.length} trainees</p>
            </div>
          </div>
        </motion.div>

        {/* 4. COMPLETE INTERACTIVE COURSE MODULES PREVIEW */}
        {(course as any).modules && Array.isArray((course as any).modules) && (course as any).modules.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-sm space-y-4">
              <CardContent className="p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-cyan-600" />
                      <h3 className="text-base font-bold text-slate-900">
                        Course Modules Preview ({(course as any).modules.length})
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Full inspection of structured videos, diagrams, notes, and pass-gate assessments.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleAllModules(true)}
                      className="h-8 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-100"
                    >
                      Expand All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleAllModules(false)}
                      className="h-8 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-100"
                    >
                      Collapse All
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {(course as any).modules.map((m: any, idx: number) => {
                    const rawItems = m.items || m.content_items || []
                    const quizQuestions = m.quiz_questions || []
                    
                    let unifiedItems: any[] = [...rawItems]
                    const hasQuizInItems = rawItems.some((it: any) => it.type === 'quiz')
                    if (!hasQuizInItems && quizQuestions.length > 0) {
                      quizQuestions.forEach((q: any, qIdx: number) => {
                        unifiedItems.push({
                          id: q.id || `legacy-quiz-${qIdx}`,
                          type: 'quiz',
                          title: `Quiz: ${q.question.slice(0, 50)}...`,
                          quiz_data: q,
                        })
                      })
                    }

                    const isOpen = openModules.has(m.id)

                    return (
                      <div
                        key={m.id || idx}
                        className={`rounded-2xl border transition-all overflow-hidden ${
                          isOpen ? 'border-cyan-300 ring-2 ring-cyan-100/60 bg-white shadow-xs' : 'border-slate-200 bg-slate-50/60'
                        }`}
                      >
                        {/* Module Accordion Header */}
                        <button
                          onClick={() => toggleModule(m.id)}
                          className="w-full flex items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-slate-100/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 truncate">{m.title || `Module ${idx + 1}`}</h4>
                              {m.description && (
                                <p className="text-xs text-slate-500 truncate max-w-xl">{m.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className="bg-cyan-50 text-cyan-800 border-cyan-200 text-[11px] font-semibold">
                              {unifiedItems.length} item{unifiedItems.length !== 1 ? 's' : ''}
                            </Badge>
                            {quizQuestions.length > 0 && (
                              <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[11px] font-bold flex items-center gap-1">
                                <HelpCircle className="w-3 h-3 text-amber-600" />
                                {quizQuestions.length} Q Quiz (≥80% Pass Gate)
                              </Badge>
                            )}
                            {isOpen ? <ChevronUp className="w-4 h-4 text-cyan-600" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                          </div>
                        </button>

                        {/* Complete Module Contents Body */}
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              key="content"
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="border-t border-slate-200 p-5 bg-slate-50/40 space-y-4"
                            >
                              {m.description && (
                                <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 leading-relaxed">
                                  <strong className="text-slate-900 font-bold">Module Overview: </strong> {m.description}
                                </div>
                              )}

                              {unifiedItems.length > 0 ? (
                                <div className="space-y-3">
                                  {unifiedItems.map((item: any, sIdx: number) => {
                                    const itemType = (item.type || item.step_type || 'text').toLowerCase()
                                    const qData = item.quiz_data || (itemType === 'quiz' ? quizQuestions[0] : null)
                                    const mediaUrl = item.media_url || item.url || item.previewUrl || item.file_url || item.link
                                    const textContent = item.content || item.text_content || item.text || item.description || item.body || item.notes || (itemType === 'text' && item.url ? item.url : null)

                                    return (
                                      <div
                                        key={item.id || sIdx}
                                        className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
                                      >
                                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                                          <div className="flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-cyan-600 text-white text-[10px] font-bold flex items-center justify-center">
                                              {sIdx + 1}
                                            </span>
                                            <Badge variant="outline" className="text-[11px] font-bold capitalize flex items-center gap-1 bg-slate-50 border-slate-200 text-slate-800">
                                              {itemType === 'video' && <Film className="w-3 h-3 text-blue-600" />}
                                              {itemType === 'photo' && <Camera className="w-3 h-3 text-purple-600" />}
                                              {itemType === 'text' && <AlignLeft className="w-3 h-3 text-cyan-600" />}
                                              {itemType === 'quiz' && <HelpCircle className="w-3 h-3 text-amber-600" />}
                                              {itemType === 'link' && <Link2 className="w-3 h-3 text-emerald-600" />}
                                              {itemType === 'photo' ? 'Photo / Diagram' : itemType === 'video' ? 'Video Lesson' : itemType}
                                            </Badge>
                                            <h5 className="text-xs font-bold text-slate-900">{item.title || `Item ${sIdx + 1}`}</h5>
                                          </div>
                                        </div>

                                        {/* 1. Text Content Viewer */}
                                        {itemType === 'text' && (
                                          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans shadow-2xs">
                                            {textContent ? (
                                              textContent
                                            ) : (
                                              <p className="text-slate-400 italic">No detailed lecture notes provided for this section.</p>
                                            )}
                                          </div>
                                        )}

                                        {/* 2. Photo / Diagram Viewer with Zoom */}
                                        {itemType === 'photo' && mediaUrl && (
                                          <div className="space-y-2">
                                            <div
                                              onClick={() => setZoomImage({ url: mediaUrl, title: item.title || 'Photo Preview' })}
                                              className="rounded-xl overflow-hidden border border-slate-200 max-h-80 bg-slate-900 flex items-center justify-center cursor-pointer group relative"
                                            >
                                              <img
                                                src={mediaUrl}
                                                alt={item.title || 'Module diagram'}
                                                className="max-h-80 w-auto object-contain transition-transform group-hover:scale-102"
                                              />
                                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                                                <Eye className="w-4 h-4" /> Click to view full resolution
                                              </div>
                                            </div>
                                            {textContent && <p className="text-xs text-slate-600 italic px-1">{textContent}</p>}
                                          </div>
                                        )}

                                        {/* 3. Video Player Preview */}
                                        {itemType === 'video' && mediaUrl && (
                                          <div className="space-y-2">
                                            {getYouTubeEmbedUrl(mediaUrl) ? (
                                              <div className="aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xs max-h-80">
                                                <iframe
                                                  src={getYouTubeEmbedUrl(mediaUrl)!}
                                                  title={item.title}
                                                  className="w-full h-full"
                                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                  allowFullScreen
                                                />
                                              </div>
                                            ) : (
                                              <video
                                                controls
                                                className="w-full rounded-xl border border-slate-200 max-h-80 bg-black"
                                                src={mediaUrl}
                                              >
                                                Your browser does not support video playback.
                                              </video>
                                            )}
                                            {textContent && <p className="text-xs text-slate-600 px-1">{textContent}</p>}
                                          </div>
                                        )}

                                        {/* 4. Link Item */}
                                        {itemType === 'link' && mediaUrl && (
                                          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <Link2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                              <a href={mediaUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-emerald-700 hover:underline truncate">
                                                {mediaUrl}
                                              </a>
                                            </div>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 shrink-0 gap-1"
                                              onClick={() => window.open(mediaUrl, '_blank')}
                                            >
                                              <ExternalLink className="w-3 h-3" /> Open Link
                                            </Button>
                                          </div>
                                        )}

                                        {/* 5. Multiple-choice Quiz Card */}
                                        {itemType === 'quiz' && qData && (
                                          <div className="p-4 bg-amber-50/40 border border-amber-200 rounded-xl space-y-3">
                                            <div className="flex items-start gap-2">
                                              <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                              <div>
                                                <p className="text-xs font-bold text-slate-900 leading-snug">{qData.question}</p>
                                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                                                  Passing Gate: ≥80% Required to Unlock Next Module
                                                </span>
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-6">
                                              {(qData.options || []).map((opt: string, optIdx: number) => {
                                                const isCorrect = optIdx === (qData.correct_answer ?? qData.correct_option ?? 0)
                                                return (
                                                  <div
                                                    key={optIdx}
                                                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
                                                      isCorrect
                                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold shadow-xs'
                                                        : 'bg-white border-slate-200 text-slate-700'
                                                    }`}
                                                  >
                                                    <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                                                    {isCorrect && (
                                                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                        <Check className="w-3 h-3" /> Correct Answer
                                                      </span>
                                                    )}
                                                  </div>
                                                )
                                              })}
                                            </div>

                                            {qData.explanation && (
                                              <p className="text-[11px] text-slate-600 italic bg-white p-2.5 rounded-lg border border-amber-200 pl-6">
                                                <strong className="text-amber-900 not-italic">Explanation: </strong> {qData.explanation}
                                              </p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic text-center py-4">No sequential content items configured for this module.</p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 6. COURSE ANNOUNCEMENTS */}
        <motion.div variants={fadeUp}>
          <CourseAnnouncements courseId={courseId!} isTrainer={true} />
        </motion.div>

        {/* 8. Learning Outcomes & Skills */}
        {courseSkills.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-sm">
              <CardContent className="p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-600" /> Outcomes of Learning & Skills Developed
                </h3>
                <div className="flex flex-wrap gap-2">
                  {courseSkills.map((cs: any, i: number) => (
                    <span
                      key={cs.id || i}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-800 border border-cyan-200 text-xs font-semibold shadow-xs"
                    >
                      {cs.skills?.name || 'Skill'}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 8. ENROLLMENT HISTORY & STATS */}
        <motion.div variants={fadeUp} id="enrollment-stats-section">
          <Card className="bg-gradient-to-br from-[#0c1322] via-[#090e1a] to-[#040814] text-white border border-slate-800/90 rounded-3xl shadow-xl overflow-hidden">
            <CardContent className="p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
                    <Users className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-white tracking-wide">Enrollment History & Stats</h3>
                </div>
                <Badge className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-xs font-bold px-3 py-1 rounded-full">
                  {activeEnrollments.length} / {course.max_trainees || 60} Enrolled
                </Badge>
              </div>

              {/* 4 Colored Stat Boxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col items-center justify-center text-center space-y-1 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                  <span className="text-3xl font-black text-emerald-400">{activeEnrollments.length}</span>
                  <span className="text-[11px] font-black tracking-wider text-emerald-400/90 uppercase">ACCEPTED</span>
                </div>

                <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 flex flex-col items-center justify-center text-center space-y-1 shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                  <span className="text-3xl font-black text-amber-400">{waitlistedEnrollments.length + pendingEnrollments.length}</span>
                  <span className="text-[11px] font-black tracking-wider text-amber-400/90 uppercase">WAITLISTED</span>
                </div>

                <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-950/20 flex flex-col items-center justify-center text-center space-y-1 shadow-[0_0_15px_rgba(244,63,94,0.05)]">
                  <span className="text-3xl font-black text-rose-400">{allEnrollments.filter(e => e.status === 'rejected').length}</span>
                  <span className="text-[11px] font-black tracking-wider text-rose-400/90 uppercase">REJECTED</span>
                </div>

                <div className="p-4 rounded-2xl border border-slate-700/60 bg-slate-900/40 flex flex-col items-center justify-center text-center space-y-1">
                  <span className="text-3xl font-black text-slate-300">{allEnrollments.filter(e => ['dropped', 'withdrawn', 'cancelled'].includes(e.status)).length}</span>
                  <span className="text-[11px] font-black tracking-wider text-slate-400 uppercase">WITHDRAWN</span>
                </div>
              </div>

              {/* Historical List or Empty State */}
              {historyEnrollments.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium bg-[#060a14]/60 rounded-2xl border border-slate-800/60">
                  No historical enrollments yet.
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historical Records ({historyEnrollments.length})</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {historyEnrollments.map((enr: any) => (
                      <div key={enr.id} className="p-3 rounded-xl bg-[#070d1a] border border-slate-800/80 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-white">{enr.trainee?.full_name || 'Trainee'}</p>
                          <p className="text-[11px] text-slate-400">{enr.trainee?.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-[10px] font-bold capitalize ${
                            ['enrolled', 'in_progress', 'completed'].includes(enr.status)
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : enr.status === 'rejected'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}>
                            {enr.status.replace('_', ' ')}
                          </Badge>
                          <span className="text-[10px] text-slate-500">
                            {enr.enrolled_at ? new Date(enr.enrolled_at).toLocaleDateString() : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 9. COURSE FEEDBACK & RATINGS */}
        <motion.div variants={fadeUp}>
          <CourseFeedback courseId={courseId!} isTrainer={true} />
        </motion.div>

        {/* 10. Course Chat & Discussions */}
        <motion.div variants={fadeUp} className="pt-4 border-t border-slate-200">
          <CourseChat courseId={courseId!} isTrainer={true} />
        </motion.div>
      </motion.div>

      {/* MODAL 1: REQUEST EDIT PERMISSION FROM ADMIN */}
      <Dialog open={editRequestOpen} onOpenChange={setEditRequestOpen}>
        <DialogContent className="sm:max-w-[550px] bg-white border-slate-200 text-slate-900 shadow-2xl rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-cyan-600" /> Request Course Edit Permission
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Since "{course?.title}" is published, modifications require administrator review. Please explain what you plan to update. The Admin will assign an active time window for your edits.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRequestEditPermission} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">
                Detailed Reason & Planned Changes *
              </Label>
              <Textarea
                rows={4}
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                placeholder="e.g. Need to update Module 2 quiz pass criteria, upload revised syllabus PDF, and adjust session 3 meeting date..."
                className="bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-medium resize-none"
                required
              />
              <p className="text-[11px] text-slate-400">
                Minimum 10 characters. Please specify sections or modules you will edit.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-900 leading-relaxed">
              <strong>Workflow:</strong> Once approved, an edit countdown window will start. When you finish making updates, you will submit them back to the Admin for final re-approval.
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditRequestOpen(false)}
                className="border-slate-300 text-slate-700 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submittingEditRequest || editReason.trim().length < 10}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold rounded-xl text-xs shadow-md gap-1.5"
              >
                {submittingEditRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Submit Edit Request to Admin
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: IMAGE ZOOM MODAL */}
      {zoomImage && (
        <Dialog open={Boolean(zoomImage)} onOpenChange={() => setZoomImage(null)}>
          <DialogContent className="max-w-4xl bg-slate-950 border-slate-800 p-6 text-white rounded-3xl">
            <DialogHeader className="pb-3 border-b border-slate-800">
              <DialogTitle className="text-base font-bold text-white flex items-center justify-between">
                <span>{zoomImage.title}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-slate-700 bg-slate-900 text-slate-200"
                  onClick={() => window.open(zoomImage.url, '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-1" /> Open Full Image
                </Button>
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-center max-h-[75vh] overflow-hidden py-2">
              <img src={zoomImage.url} alt={zoomImage.title} className="max-h-[70vh] w-auto object-contain rounded-xl" />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Attendance Modal */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="sm:max-w-[700px] bg-transparent border-0 shadow-none p-0">
          <LiveAttendanceTrainerPanel session={attendanceSession} enrollments={activeEnrollments} isCompleted={attendanceSession ? isSessionFinished(attendanceSession) : false} />
        </DialogContent>
      </Dialog>

      <MaterialPreviewDialog
        material={previewMaterial}
        previewUrl={previewUrl}
        onClose={() => setPreviewMaterial(null)}
        onDownload={() => previewMaterial && handleDownload(previewMaterial)}
      />

      {/* About Course & Course Outline Modal */}
      <Dialog open={aboutModalOpen} onOpenChange={setAboutModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 md:p-8 bg-white border border-slate-200 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 pr-6">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold uppercase text-cyan-800 bg-cyan-50 border-cyan-200">
                    {course?.course_type || 'Standard'} Program
                  </Badge>
                  {course?.department && (
                    <Badge variant="outline" className="text-[10px] font-semibold text-slate-600 border-slate-200">
                      {course.department}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                  {course?.title}
                </DialogTitle>
                <p className="text-xs text-slate-500 font-medium">
                  {course?.duration_minutes ? `${Math.floor(course.duration_minutes / 60)} Hours` : 'Self-Paced'} &bull; Pass Gate: {course?.passing_score || 80}%
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 pt-4">
              <button
                type="button"
                onClick={() => setAboutActiveTab('about')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  aboutActiveTab === 'about'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                About This Course
              </button>
              <button
                type="button"
                onClick={() => setAboutActiveTab('outline')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  aboutActiveTab === 'outline'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Course Outline & Roadmap
              </button>
            </div>
          </DialogHeader>

          {/* TAB 1: ABOUT THIS COURSE */}
          {aboutActiveTab === 'about' && (
            <div className="space-y-6 pt-2">
              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-600" /> Course Overview
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/80 whitespace-pre-line">
                  {course?.description || 'Comprehensive competency-based training designed for operational excellence.'}
                </p>
              </div>

              {/* Objectives */}
              {course?.learning_objectives && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-cyan-600" /> Key Learning Objectives
                  </h4>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                    {getFormattedObjectives(course.learning_objectives)}
                  </div>
                </div>
              )}

              {/* Key Course Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-cyan-50/50 border border-cyan-200/60">
                  <span className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider block">Passing Threshold</span>
                  <span className="text-sm font-extrabold text-cyan-950 mt-0.5 block">{course?.passing_score || 80}% Overall</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Duration</span>
                  <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">{course?.duration_minutes ? `${Math.floor(course.duration_minutes / 60)} Hours` : 'Flexible'}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Max Trainees</span>
                  <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">{course?.max_trainees || 'Unlimited'} Seats</span>
                </div>
              </div>

              {/* Skills Covered */}
              {courseSkills && courseSkills.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-600" /> Core Competencies & Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {courseSkills.map((cs, idx) => (
                      <span key={(cs as any).id || cs.skill_id || idx} className="px-3 py-1.5 rounded-xl bg-cyan-50 border border-cyan-200/80 text-cyan-900 text-xs font-bold">
                        {cs.skills?.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COURSE OUTLINE & ROADMAP */}
          {aboutActiveTab === 'outline' && (
            <div className="space-y-6 pt-2">
              {/* Syllabus Document Download / Preview */}
              {course?.session_flow_document_path && (
                <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-5 h-5 text-cyan-700 shrink-0" />
                    <div>
                      <h5 className="text-xs font-bold text-cyan-950">Official Syllabus Document</h5>
                      <p className="text-[11px] text-cyan-700">Detailed curriculum plan and reading materials</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleOpenSessionDoc}
                    disabled={docLoading}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs h-8 rounded-xl shrink-0"
                  >
                    {docLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                    View Document
                  </Button>
                </div>
              )}

              {/* Session Schedule & Timeline */}
              {course?.session_flow_text && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-600" /> Session Schedule & Timeline
                  </h4>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-normal">
                    {course.session_flow_text}
                  </div>
                </div>
              )}

              {/* Structured Modules Preview */}
              {course?.modules && Array.isArray(course.modules) && course.modules.length > 0 && (
                <div className="space-y-3 pt-1">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <BookMarked className="w-3.5 h-3.5 text-cyan-600" /> Learning Modules Breakdown ({course.modules.length})
                  </h4>
                  <div className="space-y-2.5">
                    {course.modules.map((mod: any, mIdx: number) => {
                      const rawItems = mod.items || mod.content_items || []
                      const quizQuestions = mod.quiz_questions || []
                      const videoCount = rawItems.filter((i: any) => i.type === 'video').length
                      const notesCount = rawItems.filter((i: any) => i.type === 'notes' || i.type === 'pdf' || i.type === 'doc').length
                      const quizCount = quizQuestions.length + rawItems.filter((i: any) => i.type === 'quiz').length

                      return (
                        <div key={mod.id || mIdx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-cyan-100 text-cyan-800 font-bold text-xs flex items-center justify-center shrink-0">
                                {mIdx + 1}
                              </span>
                              <h5 className="text-xs sm:text-sm font-bold text-slate-900">{mod.title || `Module ${mIdx + 1}`}</h5>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-semibold bg-white border-slate-200 text-slate-600 shrink-0">
                              {rawItems.length} activities
                            </Badge>
                          </div>
                          {mod.description && (
                            <p className="text-xs text-slate-500 pl-8 line-clamp-2">{mod.description}</p>
                          )}
                          <div className="flex items-center gap-3 pl-8 pt-1 text-[10px] text-slate-500 font-medium">
                            {videoCount > 0 && <span className="text-blue-600 font-semibold">{videoCount} Video{videoCount > 1 ? 's' : ''}</span>}
                            {notesCount > 0 && <span className="text-emerald-600 font-semibold">{notesCount} Note{notesCount > 1 ? 's' : ''}</span>}
                            {quizCount > 0 && <span className="text-purple-600 font-semibold">{quizCount} Quiz Qs</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TrainerLayout>
  )
}
