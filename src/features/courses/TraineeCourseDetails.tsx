import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShell } from '@/pages/Dashboards'
import {
  Compass, BookOpen, Clock, User, ArrowLeft, CheckCircle2, Loader2,
  BookMarked, Layers, ChevronDown, ChevronUp, Play, FileText, Link2,
  Lock, Target, Calendar, Video, Download, ExternalLink, Users,
  GraduationCap, Award, PlayCircle,
  ListOrdered, BookCheck, Mail, Send, XCircle, FileCheck, AlertCircle, BarChart3
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { MaterialPreviewDialog } from '@/components/ui/MaterialPreviewDialog'
import { CourseFeedback } from './CourseFeedback'
import { CourseAnnouncements } from './CourseAnnouncements'
import { CourseChat } from './CourseChat'
import { generateTraineeCertificate, triggerFileDownload } from '@/lib/certificateGenerator'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

function getMaterialIcon(type: string) {
  if (type === 'video') return <Play className="w-4 h-4 text-blue-500" />
  if (type === 'link') return <Link2 className="w-4 h-4 text-emerald-500" />
  return <FileText className="w-4 h-4 text-cyan-600" />
}

function getMaterialBg(type: string) {
  if (type === 'video') return 'bg-blue-50 border-blue-100'
  if (type === 'link') return 'bg-emerald-50 border-emerald-100'
  return 'bg-cyan-50 border-cyan-100'
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
    }
  }

  return results
}

export function TraineeCourseDetails() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [openSessions, setOpenSessions] = useState<Set<string>>(new Set())
  const [previewMaterial, setPreviewMaterial] = useState<any | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [docLoading, setDocLoading] = useState(false)

  // OTP Verification States
  const [otpDialogType, setOtpDialogType] = useState<'enroll' | 'drop' | null>(null)
  const [otpInput, setOtpInput] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [otpSent, setOtpSent] = useState(false)

  const toggleSession = (id: string) => {
    setOpenSessions(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const { data: course, isLoading: isCourseLoading } = useQuery({
    queryKey: ['course-with-trainer', courseId],
    queryFn: async () => {
      const { data: courseData, error } = await supabase
        .from('courses')
        .select(`*, trainer:trainers!courses_trainer_id_fkey(full_name, bio, years_of_experience, qualifications, email, study_details)`)
        .eq('id', courseId!)
        .single() as any
      if (error) throw error

      const { data: sessionsData } = await supabase
        .from('course_sessions')
        .select('*')
        .eq('course_id', courseId!)
        .order('order_index')

      const { data: materialsData } = await supabase
        .from('materials')
        .select('*')
        .eq('course_id', courseId!)
        .order('created_at')

      const { data: assessmentsData } = await supabase
        .from('assessments')
        .select('id, title, passing_score, status, requires_sea, sea_link, scheduled_date, start_time, end_time, duration_minutes, instructions, created_at')
        .eq('course_id', courseId!)
        .eq('status', 'published')
        .order('created_at')

      return { ...courseData, sessions: sessionsData || [], materials: materialsData || [], assessments: assessmentsData || [] }
    },
    enabled: !!courseId,
  })

  const { data: enrollment, isLoading: isEnrollmentLoading } = useQuery({
    queryKey: ['enrollment', courseId, profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments').select('*')
        .eq('course_id', courseId!).eq('user_id', profile!.id).maybeSingle()
      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: !!courseId && !!profile?.id,
  })

  const { data: enrollmentCounts } = useQuery({
    queryKey: ['enrollments-count', courseId],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)('get_course_enrollment_counts', {
        p_course_id: courseId!,
        p_user_id: profile?.id || null
      })
      if (error) throw error
      return (data as any) as { active: number, waitlisted: number, total: number, myWaitlistPosition: number }
    },
    enabled: !!courseId,
  })

  useEffect(() => {
    if (!profile?.id || !courseId) return

    const channel = supabase
      .channel('enrollment_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'enrollments',
          filter: `course_id=eq.${courseId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['enrollments-count', courseId] })
          queryClient.invalidateQueries({ queryKey: ['enrollment', courseId, profile?.id] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [courseId, profile?.id, queryClient])

  const dropMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as any)('drop_enrollment', {
        p_course_id: courseId!,
        p_user_id: profile!.id
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment', courseId, profile?.id] })
      queryClient.invalidateQueries({ queryKey: ['enrollments-count', courseId] })
      queryClient.invalidateQueries({ queryKey: ['trainee-dashboard-enrollments', profile?.id] })
      toast.success('Successfully un-enrolled / dropped from the course.')
      setOtpDialogType(null)
      setOtpSent(false)
      setOtpInput('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to drop course.')
    },
  })

  const handlePreview = async (material: any) => {
    if (material.material_type === 'link') {
      window.open(material.external_url, '_blank')
      return
    }
    if (!material.storage_path) return

    try {
      setPreviewMaterial(material)
      setPreviewUrl(null)
      const { data, error } = await supabase.storage
        .from('materials')
        .createSignedUrl(material.storage_path, 300)
      if (error) throw error
      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl)
      }
    } catch {
      toast.error('Failed to load preview')
      setPreviewMaterial(null)
    }
  }

  const handleDownload = async (material: any) => {
    if (!material.storage_path) return
    setDownloadingId(material.id)
    try {
      const { data, error } = await supabase.storage
        .from('materials')
        .download(material.storage_path)
      if (error) throw error
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = material.file_name || 'download'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Downloaded successfully')
    } catch {
      toast.error('Failed to download file')
    } finally {
      setDownloadingId(null)
    }
  }

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
          file_name: 'Session Flow Document',
          storage_path: course.session_flow_document_path,
          material_type: 'document'
        })
        setPreviewUrl(data.signedUrl)
      }
    } catch {
      toast.error('Could not open session flow document.')
    } finally {
      setDocLoading(false)
    }
  }

  const handleInitiateOtp = async (type: 'enroll' | 'drop') => {
    setOtpDialogType(type)
    setOtpSent(false)
    setOtpInput('')
  }

  const handleSendOtp = async () => {
    if (!profile?.email) return
    setIsSendingOtp(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: profile.email,
        options: {
          shouldCreateUser: false,
        }
      })
      if (error) throw error
      setOtpSent(true)
      toast.success(`Verification code sent to ${profile.email}`)
    } catch (e: any) {
      toast.error(e.message || 'Failed to send OTP verification code.')
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!profile?.email || otpInput.length !== 6) return
    setIsVerifyingOtp(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: profile.email,
        token: otpInput,
        type: 'email'
      })
      if (error) throw error

      if (otpDialogType === 'enroll') {
        const { error: enrollErr } = await (supabase.rpc as any)('enroll_trainee', {
          p_course_id: courseId!,
          p_user_id: profile.id
        })
        if (enrollErr) throw enrollErr

        queryClient.invalidateQueries({ queryKey: ['enrollment', courseId, profile?.id] })
        queryClient.invalidateQueries({ queryKey: ['enrollments-count', courseId] })
        queryClient.invalidateQueries({ queryKey: ['trainee-dashboard-enrollments', profile?.id] })
        toast.success('Successfully registered / enrolled in course!')
        setOtpDialogType(null)
        setOtpSent(false)
        setOtpInput('')
      } else if (otpDialogType === 'drop') {
        dropMutation.mutate()
      }
    } catch (e: any) {
      toast.error(e.message || 'Invalid or expired OTP code.')
    } finally {
      setIsVerifyingOtp(false)
    }
  }

  const handleCloseOtpDialog = () => {
    setOtpDialogType(null)
    setOtpSent(false)
    setOtpInput('')
  }

  const [downloadingCert, setDownloadingCert] = useState(false)

  const handleDownloadCertificate = async () => {
    if (!profile || !course) return
    setDownloadingCert(true)
    try {
      const traineeName = profile.full_name || user?.email?.split('@')[0] || 'Trainee'
      const percentage = enrollment?.progress_percent ?? 100

      const { blob, fileName } = await generateTraineeCertificate(
        (course as any).certificate_template_url,
        {
          traineeName,
          traineeEmail: profile.email || user?.email,
          traineeId: user!.id,
          courseId: course.id,
          courseTitle: course.title,
          trainerName: course.trainer?.full_name || 'Lead Trainer',
          percentage,
          completedAt: new Date().toISOString(),
        }
      )

      triggerFileDownload(blob, fileName)
      toast.success('Certificate downloaded successfully! 🎉')
    } catch (err: any) {
      console.error('Certificate generation error:', err)
      toast.error(err.message || 'Failed to download certificate')
    } finally {
      setDownloadingCert(false)
    }
  }

  const isLoading = isCourseLoading || isEnrollmentLoading

  const seatLimit = course?.seat_limit ?? 50
  const waitlistLimit = course?.waitlist_limit ?? 10
  const activeCount = enrollmentCounts?.active ?? 0
  const waitlistedCount = enrollmentCounts?.waitlisted ?? 0
  const myWaitlistPosition = enrollmentCounts?.myWaitlistPosition ?? 0

  const isSeatFull = activeCount >= seatLimit
  const isWaitlistFull = waitlistedCount >= waitlistLimit
  const isFull = isSeatFull && isWaitlistFull

  const spotsLeft = !isSeatFull
    ? Math.max(0, seatLimit - activeCount)
    : Math.max(0, waitlistLimit - waitlistedCount)
  const spotsLabel = !isSeatFull ? 'seats' : 'waitlist spots'

  const canDrop = (() => {
    if (!course?.start_date) return true
    const start = new Date(course.start_date).getTime()
    const now = new Date().getTime()
    const diffDays = (start - now) / (1000 * 3600 * 24)
    return diffDays >= 10
  })()

  const sessionFlowSteps = parseSessionFlowText(course?.session_flow_text || '')
  const totalMaterials = course?.materials?.length || 0

  const sessionTypeColors: Record<string, string> = {
    recorded: 'bg-blue-50 text-blue-700 border-blue-200',
    live: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    in_person: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    hybrid: 'bg-purple-50 text-purple-700 border-purple-200',
  }

  const objectives: string[] = Array.isArray(course?.learning_objectives)
    ? course.learning_objectives
    : []

  return (
    <ErrorBoundary>
      <DashboardShell
        title={course?.title || 'Course Details'}
        icon={BookOpen}
        navLinks={[
          { to: '/trainee', label: 'Dashboard', icon: BarChart3 },
          { to: '/trainee/courses', label: 'Course Catalog', icon: Compass },
          { to: '/trainee/my-learning', label: 'My Learning', icon: BookOpen },
          { to: '/trainee/assessments', label: 'Assessments', icon: FileCheck },
          { to: '/trainee/profile', label: 'Profile', icon: User },
        ]}
      >
        <div className="max-w-6xl space-y-6">
          <Link
            to="/trainee/courses"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-cyan-700 transition-colors font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Catalog
          </Link>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
            </div>
          ) : !course ? (
            <div className="text-center p-12 bg-white border border-slate-200 rounded-3xl shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">Course Not Found</h3>
              <p className="text-slate-500 mt-2 text-sm">This course does not exist or has been removed.</p>
            </div>
          ) : (
            <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6">

              {/* Hero Header (Midnight Dark Aesthetic) */}
              <div className="bg-gradient-to-r from-[#040814] via-[#07132a] to-[#0a1e3f] text-white rounded-3xl overflow-hidden shadow-xl border border-cyan-500/30 relative">
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-500/25 to-blue-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-600/20 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 p-8 md:p-10">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-5">
                    <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-amber-300 uppercase tracking-wider border border-white/15 capitalize">
                      {course.course_type} Program
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                      course.status === 'published'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}>
                      {course.status.replace('_', ' ')}
                    </span>
                    {enrollment && enrollment.status !== 'pending_approval' && enrollment.status !== 'rejected' && (
                      <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Enrolled
                      </span>
                    )}
                    {enrollment?.status === 'pending_approval' && (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Pending Approval
                      </span>
                    )}
                    {(enrollment as any)?.status === 'waitlisted' ? (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Waitlisted
                      </span>
                    ) : null}
                    {enrollment?.status === 'rejected' && (
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Rejected
                      </span>
                    )}
                  </div>

                  <h1 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight max-w-3xl">
                    {course.title}
                  </h1>

                  {/* Meta chips */}
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300 mb-6 font-medium">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{course.trainer?.full_name || 'Assigned Instructor'}</span>
                    </div>
                    {course.duration_minutes && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          {course.duration_minutes >= 60
                            ? `${Math.floor(course.duration_minutes / 60)}h${course.duration_minutes % 60 ? ` ${course.duration_minutes % 60}m` : ''}`
                            : `${course.duration_minutes} min`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>{course.sessions?.length || 0} Sessions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="capitalize">{course.delivery_mode || 'Recorded'} Delivery</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Pass: {course.passing_score}%</span>
                    </div>
                    {enrollmentCounts !== undefined && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-cyan-300 shrink-0" />
                        <span>{enrollmentCounts.active} enrolled / {seatLimit}</span>
                        {enrollmentCounts.waitlisted > 0 && (
                          <span className="text-amber-300 ml-1">({enrollmentCounts.waitlisted} waitlisted)</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Progress bar for enrolled users */}
                  {enrollment && (
                    <div className="mb-6 max-w-md">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
                        <span>Your Progress</span>
                        <span className="text-white font-bold">{enrollment.progress_percent ?? 0}%</span>
                      </div>
                      <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/20">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${enrollment.progress_percent ?? 0}%` }}
                          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
                          className={`h-full rounded-full ${
                            enrollment.progress_percent === 100
                              ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                              : 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500'
                          }`}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 capitalize">
                        Status: <span className="text-slate-200 font-semibold">{enrollment?.status?.replace('_', ' ') || 'Unknown'}</span>
                      </p>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="flex flex-wrap items-center gap-3">
                    {enrollment && (enrollment.status === 'completed' || enrollment.progress_percent === 100) ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          onClick={handleDownloadCertificate}
                          disabled={downloadingCert}
                          className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white font-bold rounded-2xl px-6 py-3 shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                          {downloadingCert ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4 text-amber-300" />}
                          {downloadingCert ? 'Generating...' : 'Download Certificate'}
                        </Button>
                        <Button
                          onClick={() => navigate('/trainee/my-learning')}
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10 font-bold rounded-2xl px-6 py-3"
                        >
                          <PlayCircle className="w-4 h-4 mr-2" /> Review Lessons
                        </Button>
                      </div>
                    ) : enrollment && enrollment.status === 'enrolled' ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          onClick={() => navigate('/trainee/my-learning')}
                          className="bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-2xl px-6 py-3 shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                          <PlayCircle className="w-4 h-4" /> Go to My Learning
                        </Button>
                        
                        <div className="space-y-1">
                          <Button
                            onClick={() => handleInitiateOtp('drop')}
                            disabled={!canDrop || dropMutation.isPending}
                            variant="outline"
                            className="border-white/20 text-white hover:bg-white/10 font-bold rounded-2xl px-6 py-3"
                          >
                            {dropMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                            Drop Course
                          </Button>
                          {!canDrop && course?.start_date && (
                            <p className="text-[10px] text-rose-300 font-medium">Cannot drop within 10 days of start.</p>
                          )}
                        </div>
                      </div>
                    ) : enrollment && enrollment.status === 'pending_approval' ? (
                      <Button disabled className="bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold rounded-2xl px-6 py-3 cursor-not-allowed flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Approval Pending
                      </Button>
                    ) : enrollment && enrollment.status === 'rejected' ? (
                      <Button disabled className="bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold rounded-2xl px-6 py-3 cursor-not-allowed flex items-center gap-2">
                        <XCircle className="w-4 h-4" /> Enrollment Rejected
                      </Button>
                    ) : enrollment && (enrollment.status as string) === 'waitlisted' ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <Button disabled className="bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold rounded-2xl px-6 py-3 cursor-not-allowed flex items-center gap-2">
                          <Clock className="w-4 h-4" /> Waitlisted {myWaitlistPosition > 0 && `(WL-${myWaitlistPosition})`}
                        </Button>
                        <Button
                          onClick={() => handleInitiateOtp('drop')}
                          disabled={dropMutation.isPending}
                          variant="outline"
                          className="border-white/20 text-white hover:bg-white/10 font-bold rounded-2xl px-6 py-3"
                        >
                          {dropMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                          Quit Waitlist
                        </Button>
                      </div>
                    ) : isFull ? (
                      <div className="space-y-1">
                        <Button disabled className="bg-white/10 text-white/50 border border-white/20 font-bold rounded-2xl px-6 py-3 cursor-not-allowed">
                          Course & Waitlist Full
                        </Button>
                        <p className="text-xs text-rose-300 font-medium">Capacity limit of {seatLimit + waitlistLimit} reached.</p>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Button
                          onClick={() => handleInitiateOtp('enroll')}
                          disabled={isSendingOtp || otpDialogType === 'enroll'}
                          className="bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-extrabold text-base rounded-2xl px-8 py-5 shadow-xl shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                          {isSendingOtp && otpDialogType === 'enroll'
                            ? <Loader2 className="w-5 h-5 animate-spin" />
                            : <GraduationCap className="w-5 h-5" />}
                          {isFull ? 'Join Waitlist' : 'Enroll in Course'}
                        </Button>
                        {spotsLeft !== null && (
                          <p className="text-xs text-amber-300 font-semibold">
                            🔥 Only {spotsLeft} {spotsLabel} remaining!
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Main 2-col grid ────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left column (2/3) */}
                <div className="lg:col-span-2 space-y-5">

                  {(!enrollment || enrollment.status === 'pending_approval' || enrollment.status === 'rejected') && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-4">
                      <div className="p-2 bg-amber-100 rounded-xl shrink-0"><Lock className="w-5 h-5 text-amber-600" /></div>
                      <div>
                        <h4 className="text-sm font-bold text-amber-900 mb-1">Preview Mode</h4>
                        <p className="text-sm text-amber-800/90">
                          {enrollment?.status === 'pending_approval' 
                            ? "Your enrollment is pending approval by the instructor. You will gain access to course materials once approved."
                            : enrollment?.status === 'rejected'
                            ? "Your enrollment request was rejected. Please contact your instructor for more details."
                            : "You are currently viewing this course in preview mode. Enroll and get approved to access learning materials and sessions."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* About */}
                  {course.description && (
                    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
                      <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-cyan-600" /> About This Course
                      </h2>
                      <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{course.description}</p>
                    </div>
                  )}

                  {/* Announcements & Assessments */}
                  {enrollment && (enrollment.status === 'enrolled' || enrollment.status === 'in_progress' || enrollment.status === 'completed') && (
                    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
                      <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4 text-cyan-600" /> Announcements & Assessments
                      </h2>
                      <div className="space-y-6">
                        <CourseAnnouncements courseId={courseId!} isTrainer={false} />
                        
                        {course.assessments?.length > 0 && (
                          <div className="space-y-3">
                            {course.assessments.map((assessment: any) => (
                          <div key={assessment.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-4 hover:border-cyan-300 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h3 className="font-bold text-slate-900 text-sm truncate max-w-xs">{assessment.title}</h3>
                                <span className={`shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                  assessment.assessment_type === 'daily_test' ? 'bg-blue-100 text-blue-700' :
                                  assessment.assessment_type === 'mock_test' ? 'bg-amber-100 text-amber-700' :
                                  'bg-rose-100 text-rose-700'
                                }`}>
                                  {assessment.assessment_type?.replace('_', ' ') || 'Assessment'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">
                                {assessment.assessment_type === 'daily_test'
                                  ? 'Optional practice test. Take at any time.'
                                  : `Strictly timed: ${assessment.duration_minutes || 30} mins. Contributes to internal marks.`}
                              </p>
                              {assessment.scheduled_date && (
                                <p className="text-xs text-cyan-700 mt-1 font-semibold flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" /> Scheduled for {new Date(assessment.scheduled_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <Button
                              onClick={() => navigate(`/trainee/courses/${course.id}/assessments/${assessment.id}`)}
                              className="shrink-0 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold shadow-xs"
                            >
                              Start Test
                            </Button>
                          </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Learning Objectives */}
                  {objectives.length > 0 && (
                    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
                      <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4 text-amber-500" /> What You'll Learn
                      </h2>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {objectives.map((obj: string, i: number) => (
                          <li key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="text-xs text-emerald-900 leading-snug font-medium">{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Course Outline */}
                  {course.session_flow_text && (
                    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <ListOrdered className="w-4 h-4 text-cyan-600" /> Course Outline
                        </h2>
                        {course.session_flow_document_path && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={docLoading}
                            className="h-8 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold gap-1.5"
                            onClick={handleOpenSessionDoc}
                          >
                            {docLoading
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <FileText className="w-3.5 h-3.5" />}
                            View Outline Document
                          </Button>
                        )}
                      </div>

                      {sessionFlowSteps.length > 0 ? (
                        <div className="relative">
                          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-cyan-300 via-sky-300 to-blue-300 rounded-full" />
                          <ol className="space-y-4 pl-12">
                            {sessionFlowSteps.map((step, i) => (
                              <li key={i} className="relative">
                                <div className="absolute -left-8 top-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white text-[10px] font-black shadow-xs">
                                  {step.number || i + 1}
                                </div>
                                <div className="group">
                                  <p className="text-sm font-bold text-slate-900 leading-snug">{step.title}</p>
                                  {step.description && (
                                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.description}</p>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ol>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{course.session_flow_text}</p>
                      )}
                    </div>
                  )}

                  {/* Course Sessions — Accordion */}
                  {course.sessions?.length > 0 && (
                    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
                      <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <BookCheck className="w-4 h-4 text-cyan-600" /> Course Sessions
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                            {course.sessions.length}
                          </span>
                        </h2>
                        {!enrollment && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                            <Lock className="w-3.5 h-3.5" /> Enroll to access materials
                          </div>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        {course.sessions.map((session: any, index: number) => {
                          const sessionMaterials = course.materials?.filter((m: any) => m.session_id === session.id) || []
                          const isOpen = openSessions.has(session.id)
                          
                          // Determine real-time session status
                          const now = Date.now()
                          const startTime = session.start_time ? new Date(session.start_time).getTime() : null
                          const endTime = session.end_time ? new Date(session.end_time).getTime() : (startTime ? startTime + 60 * 60 * 1000 : null)
                          
                          const isFinished = endTime ? endTime < now : (startTime ? startTime < now : false)
                          const isLiveNow = startTime && endTime ? (now >= startTime && now <= endTime) : false

                          return (
                            <div
                              key={session.id}
                              className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                                isLiveNow ? 'border-rose-300 ring-2 ring-rose-100 shadow-sm' : isOpen ? 'border-cyan-300 shadow-sm' : 'border-slate-200'
                              }`}
                            >
                              {/* Session header */}
                              <button
                                onClick={() => toggleSession(session.id)}
                                className={`w-full flex items-center gap-4 p-4 transition-colors text-left ${
                                  isLiveNow ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'bg-slate-50/70 hover:bg-slate-50'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-xs transition-all ${
                                  isLiveNow
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : isOpen
                                      ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-xs'
                                      : 'bg-white border border-slate-200 text-cyan-700'
                                }`}>
                                  {index + 1}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                    <p className="text-sm font-bold text-slate-900">{session.title}</p>
                                    {isLiveNow ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1 shadow-xs animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" /> Live Now
                                      </span>
                                    ) : isFinished ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-slate-400" /> Completed
                                      </span>
                                    ) : session.session_type ? (
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${sessionTypeColors[session.session_type] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                        {session.session_type === 'recorded' ? 'Video' : session.session_type === 'live' ? 'Live Online' : session.session_type.replace('_', ' ')}
                                      </span>
                                    ) : null}
                                  </div>
                                  {session.start_time && (
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-cyan-600" />
                                      {new Date(session.start_time).toLocaleString(undefined, {
                                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                                      })}
                                      {session.end_time && ` - ${new Date(session.end_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {sessionMaterials.length > 0 && (
                                    <span className="text-[11px] text-slate-600 font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                                      {sessionMaterials.length} file{sessionMaterials.length !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {session.meet_link && enrollment && (session.session_type === 'live' || session.session_type === 'hybrid') && (
                                    isFinished ? (
                                      <span
                                        onClick={e => e.stopPropagation()}
                                        className="text-[11px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg"
                                      >
                                        Ended
                                      </span>
                                    ) : (
                                      <a
                                        href={session.meet_link}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={e => e.stopPropagation()}
                                        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-all font-semibold ${
                                          isLiveNow
                                            ? 'text-white bg-gradient-to-r from-red-600 to-rose-600 border-rose-500 hover:opacity-90 shadow-sm animate-pulse'
                                            : 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100'
                                        }`}
                                      >
                                        <Video className="w-3.5 h-3.5" /> {isLiveNow ? 'Join Live Now' : 'Join'}
                                      </a>
                                    )
                                  )}
                                  {session.location && enrollment && (session.session_type === 'in_person' || session.session_type === 'hybrid') && (
                                    <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold truncate max-w-[120px]">
                                      <Target className="w-3.5 h-3.5" /> {session.location}
                                    </span>
                                  )}
                                  {isOpen
                                    ? <ChevronUp className="w-4 h-4 text-cyan-600 shrink-0" />
                                    : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                                </div>
                              </button>

                              {/* Session body */}
                              <AnimatePresence initial={false}>
                                {isOpen && (
                                  <motion.div
                                    key="body"
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    style={{ overflow: 'hidden' }}
                                  >
                                    <div className="px-4 pb-4 pt-3 bg-white border-t border-slate-200">
                                      {session.description && (
                                        <p className="text-xs text-slate-600 mb-3 leading-relaxed">{session.description}</p>
                                      )}

                                      {sessionMaterials.length === 0 ? (
                                        <div className="flex items-center gap-2 py-3 px-3 rounded-xl bg-slate-50 border border-slate-100">
                                          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                          <p className="text-xs text-slate-500 italic">No materials uploaded for this session yet.</p>
                                        </div>
                                      ) : (
                                        <ul className="space-y-2">
                                          {sessionMaterials.map((m: any) => (
                                            <li
                                              key={m.id}
                                              onClick={() => handlePreview(m)}
                                              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                                                enrollment
                                                  ? `cursor-pointer hover:shadow-xs ${getMaterialBg(m.material_type)}`
                                                  : 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed'
                                              }`}
                                            >
                                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${getMaterialBg(m.material_type)}`}>
                                                {getMaterialIcon(m.material_type)}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-slate-900 truncate">{m.file_name}</p>
                                                <p className="text-[10px] text-slate-500 capitalize">{m.material_type}</p>
                                              </div>
                                              {enrollment ? (
                                                m.material_type === 'link'
                                                  ? <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                  : downloadingId === m.id
                                                    ? <Loader2 className="w-3.5 h-3.5 text-cyan-600 animate-spin shrink-0" />
                                                    : <Download className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                              ) : (
                                                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                              )}
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Course Chat */}
                  {enrollment && (enrollment.status === 'enrolled' || enrollment.status === 'completed' || enrollment.status === 'in_progress') && (
                    <div className="space-y-6 mt-6 pt-6 border-t border-slate-200">
                      <CourseChat courseId={courseId!} isTrainer={false} />
                    </div>
                  )}
                </div>

                {/* Right sidebar (1/3) */}
                <div className="space-y-4">

                  {/* Quick Stats */}
                  <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Course Stats</h3>
                    <div className="space-y-3">
                      {[
                        {
                          icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
                          label: 'Duration',
                          value: course.duration_minutes
                            ? course.duration_minutes >= 60
                              ? `${Math.floor(course.duration_minutes / 60)}h${course.duration_minutes % 60 ? ` ${course.duration_minutes % 60}m` : ''}`
                              : `${course.duration_minutes}m`
                            : 'Self-paced',
                        },
                        { icon: <Layers className="w-3.5 h-3.5 text-cyan-600" />, label: 'Sessions', value: String(course.sessions?.length || 0) },
                        { icon: <FileText className="w-3.5 h-3.5 text-blue-500" />, label: 'Materials', value: String(totalMaterials) },
                        { icon: <Target className="w-3.5 h-3.5 text-emerald-500" />, label: 'Passing Score', value: `${course.passing_score ?? '—'}%` },
                        { icon: <Users className="w-3.5 h-3.5 text-sky-500" />, label: 'Enrolled', value: `${activeCount} / ${seatLimit}` },
                        { icon: <Video className="w-3.5 h-3.5 text-indigo-500" />, label: 'Delivery', value: course.delivery_mode ? course.delivery_mode.charAt(0).toUpperCase() + course.delivery_mode.slice(1) : 'Recorded' },
                      ].map(item => (
                        <div key={item.label} className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                            {item.icon}
                          </div>
                          <span className="text-xs text-slate-500 font-medium flex-1">{item.label}</span>
                          <span className="text-xs font-bold text-slate-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Instructor */}
                  <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Instructor</h3>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white font-black text-base shadow-xs shrink-0">
                        {course.trainer?.full_name?.charAt(0) || 'T'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900">{course.trainer?.full_name || 'Assigned Instructor'}</p>
                        {course.trainer?.years_of_experience && (
                          <p className="text-xs text-slate-500">{course.trainer.years_of_experience} yrs experience</p>
                        )}
                      </div>
                    </div>
                    {course.trainer?.bio && (
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-4 mb-3">{course.trainer.bio}</p>
                    )}
                    {course.trainer?.qualifications && (
                      <div className="mb-3 p-2.5 bg-cyan-50 rounded-xl border border-cyan-200">
                        <p className="text-[11px] font-semibold text-cyan-800">
                          <Award className="w-3 h-3 inline mr-1 text-amber-500" />
                          {course.trainer.qualifications}
                        </p>
                      </div>
                    )}
                    {course.trainer?.study_details && (
                      <div className="mb-3 p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                        <p className="text-[11px] font-semibold text-blue-800">
                          <GraduationCap className="w-3 h-3 inline mr-1 text-blue-500" />
                          {course.trainer.study_details}
                        </p>
                      </div>
                    )}
                    {course.trainer?.expertise_areas && course.trainer.expertise_areas.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Expertise</p>
                        <div className="flex flex-wrap gap-1.5">
                          {course.trainer.expertise_areas.map((skill: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-[10px] font-semibold text-emerald-700">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Contact email */}
                    {course.trainer?.email && (
                      <a
                        href={`mailto:${course.trainer.email}?subject=Regarding: ${encodeURIComponent(course.title)}`}
                        className="flex items-center gap-2.5 p-3 rounded-xl bg-cyan-50/70 border border-cyan-200 hover:bg-cyan-50 hover:shadow-xs transition-all group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-white border border-cyan-200 flex items-center justify-center shrink-0">
                          <Mail className="w-3.5 h-3.5 text-cyan-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-wide">Contact</p>
                          <p className="text-xs text-slate-900 font-semibold truncate">{course.trainer.email}</p>
                        </div>
                        <Send className="w-3.5 h-3.5 text-cyan-600 transition-colors shrink-0" />
                      </a>
                    )}
                  </div>

                  {/* Schedule */}
                  {(course.start_date || course.end_date || course.live_class_timing ||
                    course.mock_test_timing || course.final_exam_timing || course.final_test_date) && (
                    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm">
                      <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cyan-600" /> Schedule
                      </h3>
                      <div className="space-y-2.5">
                        {(course.start_date || course.end_date) && (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-wide mb-0.5">Course Period</p>
                            <p className="text-xs font-semibold text-slate-900">
                              {course.start_date && new Date(course.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              {course.start_date && course.end_date && ' – '}
                              {course.end_date && new Date(course.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        )}
                        {course.live_class_timing && (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-0.5">Live Classes</p>
                            <p className="text-xs font-semibold text-slate-900">{course.live_class_timing}</p>
                          </div>
                        )}
                        {course.mock_test_timing && (
                          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-0.5">Mock Test</p>
                            <p className="text-xs font-semibold text-slate-900">
                              {new Date(course.mock_test_timing).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </p>
                          </div>
                        )}
                        {course.final_exam_timing && (
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                            <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wide mb-0.5">Final Exam</p>
                            <p className="text-xs font-semibold text-slate-900">
                              {new Date(course.final_exam_timing).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </p>
                          </div>
                        )}
                        {course.final_test_date && (
                          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-0.5">Final Test</p>
                            <p className="text-xs font-semibold text-slate-900">
                              {new Date(course.final_test_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              {course.final_test_start_time && ` at ${course.final_test_start_time}`}
                              {course.final_test_end_time && ` – ${course.final_test_end_time}`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Feedback Card in Sidebar */}
                  {enrollment && (enrollment.status === 'enrolled' || enrollment.status === 'completed' || enrollment.status === 'in_progress') && (
                    <CourseFeedback courseId={courseId!} isTrainer={false} />
                  )}

                  {/* Enroll prompt for non-enrolled */}
                  {!enrollment && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-900 font-medium leading-relaxed">
                        Enroll to access all materials, track your progress, and earn a certificate upon completion.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <MaterialPreviewDialog
          material={previewMaterial}
          previewUrl={previewUrl}
          onClose={() => setPreviewMaterial(null)}
          onDownload={() => previewMaterial && handleDownload(previewMaterial)}
        />

        <Dialog open={otpDialogType !== null} onOpenChange={(open) => !open && handleCloseOtpDialog()}>
          <DialogContent className="max-w-sm rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900 text-center mb-1">
                {otpDialogType === 'enroll' ? 'Confirm Enrollment' : 'Confirm Drop Course'}
              </DialogTitle>
              <DialogDescription className="text-center text-slate-600 text-sm">
                {otpSent 
                  ? <>We've sent a 6-digit code to <strong>{profile?.email}</strong>. Enter it below to confirm.</>
                  : <>Are you sure you want to {otpDialogType === 'enroll' ? 'enroll in' : 'drop'} this course? We will send a verification code to <strong>{profile?.email}</strong>.</>}
              </DialogDescription>
            </DialogHeader>

            {!otpSent ? (
              <DialogFooter className="flex-col sm:flex-col gap-2 mt-4">
                <Button
                  onClick={handleSendOtp}
                  disabled={isSendingOtp}
                  className={`w-full font-bold h-11 rounded-xl text-white ${
                    otpDialogType === 'enroll' 
                      ? 'bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-cyan-600/20' 
                      : 'bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 shadow-rose-500/20'
                  } shadow-lg transition-all`}
                >
                  {isSendingOtp ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Verification Code'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleCloseOtpDialog}
                  disabled={isSendingOtp}
                  className="w-full text-slate-600 hover:text-slate-900 h-11 rounded-xl"
                >
                  Cancel
                </Button>
              </DialogFooter>
            ) : (
              <>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter 6-digit OTP"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      className="text-center text-lg tracking-[0.25em] font-bold h-12 rounded-xl border-slate-200 focus-visible:ring-cyan-500 bg-slate-50 text-slate-900"
                      maxLength={6}
                    />
                  </div>
                </div>

                <DialogFooter className="flex-col sm:flex-col gap-2">
                  <Button
                    onClick={handleVerifyOtp}
                    disabled={isVerifyingOtp || otpInput.length !== 6}
                    className={`w-full font-bold h-11 rounded-xl text-white ${
                      otpDialogType === 'enroll' 
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20' 
                        : 'bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 shadow-rose-500/20'
                    } shadow-lg transition-all`}
                  >
                    {isVerifyingOtp ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Code'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleCloseOtpDialog}
                    disabled={isVerifyingOtp}
                    className="w-full text-slate-600 hover:text-slate-900 h-11 rounded-xl"
                  >
                    Cancel
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </DashboardShell>
    </ErrorBoundary>
  )
}
