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
  GraduationCap, Award, BarChart3, AlertCircle, PlayCircle,
  ListOrdered, BookCheck, Mail, Send, XCircle
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

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

function getMaterialIcon(type: string) {
  if (type === 'video') return <Play className="w-4 h-4 text-blue-500" />
  if (type === 'link') return <Link2 className="w-4 h-4 text-emerald-500" />
  return <FileText className="w-4 h-4 text-purple-500" />
}

function getMaterialBg(type: string) {
  if (type === 'video') return 'bg-blue-50 border-blue-100'
  if (type === 'link') return 'bg-emerald-50 border-emerald-100'
  return 'bg-cyan-950/30 border-cyan-500/30'
}

/**
 * Parses session_flow_text into an array of session steps.
 * Handles formats like:
 *   "Session 1 – Title: Description"
 *   "Session 1: Title"
 *   "1. Title"
 *   plain paragraphs
 */
function parseSessionFlowText(text: string): Array<{ number: string; title: string; description: string }> {
  if (!text) return []
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  const results: Array<{ number: string; title: string; description: string }> = []

  for (const line of lines) {
    // Match: "Session N – Title: Description" or "Session N: Title"
    const sessionMatch = line.match(/^[Ss]ession\s+(\d+)\s*[–\-:]\s*([^:]+?)(?::\s*(.+))?$/)
    if (sessionMatch) {
      results.push({
        number: sessionMatch[1],
        title: sessionMatch[2].trim(),
        description: sessionMatch[3]?.trim() || '',
      })
      continue
    }
    // Match: "N. Title: Description" or "N. Title"
    const numMatch = line.match(/^(\d+)\.\s+([^:]+?)(?::\s*(.+))?$/)
    if (numMatch) {
      results.push({
        number: numMatch[1],
        title: numMatch[2].trim(),
        description: numMatch[3]?.trim() || '',
      })
      continue
    }
    // If previous item exists, append as description
    if (results.length > 0 && !results[results.length - 1].description) {
      results[results.length - 1].description = line.trim()
    }
  }

  return results
}

export function TraineeCourseDetails() {
  const { courseId } = useParams<{ courseId: string }>()
  const { profile } = useAuth()
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
          filter: `course_id=eq.${courseId}&user_id=eq.${profile.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['enrollment', courseId, profile.id] })
          queryClient.invalidateQueries({ queryKey: ['enrollments-count', courseId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile?.id, courseId, queryClient])

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const { data: currentEnrollments, error: fetchError } = await supabase
        .from('enrollments')
        .select('status')
        .eq('course_id', courseId!)

      if (fetchError) throw fetchError

      const activeStatuses = ['enrolled', 'in_progress', 'completed', 'pending_approval']
      const activeCount = currentEnrollments.filter(e => activeStatuses.includes(e.status)).length
      const waitlistCount = currentEnrollments.filter(e => (e.status as string) === 'waitlisted').length

      const seatLimit = course?.max_trainees ?? 50
      const waitlistLimit = course?.waitlist_limit ?? 10

      let newStatus = 'pending_approval'

      if (activeCount >= seatLimit) {
        if (waitlistCount >= waitlistLimit) {
          throw new Error('Course and waitlist are currently full.')
        }
        newStatus = 'waitlisted'
      }

      const { data: enrollData, error: enrollError } = await supabase
        .from('enrollments')
        .insert({ course_id: courseId!, user_id: profile!.id, status: newStatus as any, progress_percent: 0 })
        .select().single()
      if (enrollError) throw enrollError

      if (course?.trainer_id) {
        await supabase.from('notifications').insert({
          user_id: course.trainer_id,
          type: `enrollment_request:${courseId}`,
          title: newStatus === 'waitlisted' ? 'New Waitlist Request' : 'New Enrollment Request',
          message: `${profile?.full_name || 'A trainee'} wants to enroll in ${course.title}${newStatus === 'waitlisted' ? ' (Waitlisted)' : ''}.`,
        })
      }

      return { enrollData, status: newStatus }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['enrollment', courseId, profile?.id] })
      queryClient.invalidateQueries({ queryKey: ['enrollments-count', courseId] })
      if (data.status === 'waitlisted') {
         toast.success('Course is full. You have been added to the waitlist.')
      } else {
         toast.success('Enrollment request sent. Pending approval from trainer.')
      }
      handleCloseOtpDialog()
    },
    onError: (error: any) => toast.error(error.message || 'Failed to request enrollment'),
  })

  const dropMutation = useMutation({
    mutationFn: async () => {
      const { data: enrollData, error: enrollError } = await supabase
        .from('enrollments')
        .update({ status: 'withdrawn' as any })
        .eq('course_id', courseId!)
        .eq('user_id', profile!.id)
        .select().single()
      if (enrollError) throw enrollError
      return enrollData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment', courseId, profile?.id] })
      queryClient.invalidateQueries({ queryKey: ['enrollments-count', courseId] })
      toast.success('You have successfully dropped the course.')
      handleCloseOtpDialog()
    },
    onError: (error: any) => toast.error(error.message || 'Failed to drop course'),
  })

  const handleInitiateOtp = (type: 'enroll' | 'drop') => {
    setOtpDialogType(type)
    setOtpSent(false)
    setOtpInput('')
  }

  const handleSendOtp = async () => {
    if (!profile?.email || !otpDialogType) {
      toast.error('No email address found for your profile.')
      return
    }
    
    setIsSendingOtp(true)
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { identifier: profile.email, type: 'email' }
      })
      if (error) throw error
      
      setOtpSent(true)
      toast.success('OTP sent to your email address')
    } catch (error: any) {
      console.error(error)
      toast.error('Failed to send OTP')
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!profile?.email || !otpInput || otpInput.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP')
      return
    }
    
    setIsVerifyingOtp(true)
    try {
      const { data: isValid, error } = await supabase.rpc('verify_otp', {
        p_identifier: profile.email,
        p_otp: otpInput,
        p_user_id: profile.id,
        p_type: 'email'
      })
      
      if (error) throw error
      if (!isValid) throw new Error('Invalid or expired OTP')

      if (otpDialogType === 'enroll') {
        enrollMutation.mutate()
      } else if (otpDialogType === 'drop') {
        dropMutation.mutate()
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Failed to verify OTP')
      setIsVerifyingOtp(false)
    }
  }

  const handleCloseOtpDialog = () => {
    setOtpDialogType(null)
    setOtpInput('')
    setOtpSent(false)
    setIsVerifyingOtp(false)
  }

  const handleDownload = async (material: any) => {
    setDownloadingId(material.id)
    try {
      const { data, error } = await supabase.storage.from('materials').createSignedUrl(material.storage_path, 3600)
      if (error) throw error
      const link = document.createElement('a')
      link.href = data.signedUrl; link.download = material.file_name; link.target = '_blank'
      document.body.appendChild(link); link.click(); document.body.removeChild(link)
    } catch { toast.error('Failed to generate download link') }
    finally { setDownloadingId(null) }
  }

  const handlePreview = async (material: any) => {
    if (!enrollment) { toast.error('Please enroll to access materials'); return }
    if (material.material_type === 'link') { window.open(material.url!, '_blank'); return }
    setPreviewMaterial(material); setPreviewUrl(null)
    try {
      const { data, error } = await supabase.storage.from('materials').createSignedUrl(material.storage_path, 3600)
      if (error) throw error
      setPreviewUrl(data.signedUrl)
    } catch { toast.error('Failed to load preview'); setPreviewMaterial(null) }
  }

  const handleOpenSessionDoc = async () => {
    if (!course?.session_flow_document_path) return
    setDocLoading(true)
    // Open in the preview dialog so the user sees it in the website
    setPreviewMaterial({
      file_name: 'Session Flow Document',
      material_type: 'file',
      storage_path: course.session_flow_document_path,
    })
    setPreviewUrl(null)
    try {
      const { data, error } = await supabase.storage
        .from('materials')
        .createSignedUrl(course.session_flow_document_path, 3600)
      if (error) throw error
      setPreviewUrl(data.signedUrl)
    } catch {
      // If RLS still blocks after migration, fall back to new tab
      setPreviewMaterial(null)
      toast.error('Could not load document. Please contact your instructor.')
    } finally {
      setDocLoading(false)
    }
  }


  const isLoading = isCourseLoading || isEnrollmentLoading
  
  const seatLimit = course?.max_trainees ?? 50
  const waitlistLimit = course?.waitlist_limit ?? 10
  
  const activeCount = enrollmentCounts?.active ?? 0
  const waitlistCount = enrollmentCounts?.waitlisted ?? 0
  const myWaitlistPosition = enrollmentCounts?.myWaitlistPosition ?? 0
  
  const isCourseFull = activeCount >= seatLimit
  const isWaitlistFull = waitlistCount >= waitlistLimit
  const isFull = isCourseFull && isWaitlistFull
  
  const spotsLeft = isCourseFull ? (isWaitlistFull ? 0 : waitlistLimit - waitlistCount) : (seatLimit - activeCount)
  const spotsLabel = isCourseFull ? (spotsLeft === 1 ? 'Waitlist Spot' : 'Waitlist Spots') : (spotsLeft === 1 ? 'Spot' : 'Spots')
  const totalMaterials = course?.materials?.length ?? 0

  // 10-day Drop Course Constraint Logic
  const checkCanDrop = () => {
    if (!enrollment || enrollment.status !== 'enrolled') return false;
    if (!course?.start_date) return true; 
    const startDate = new Date(course.start_date);
    const now = new Date();
    const diffTime = startDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 10;
  }
  const canDrop = checkCanDrop();

  const objectives: string[] = course?.learning_objectives
    ? (Array.isArray(course.learning_objectives)
        ? course.learning_objectives
        : typeof course.learning_objectives === 'string'
          ? [course.learning_objectives]
          : [])
    : []

  // Parse session flow text into structured steps
  const sessionFlowSteps = course?.session_flow_text
    ? parseSessionFlowText(course.session_flow_text)
    : []

  const sessionTypeColors: Record<string, string> = {
    live: 'bg-orange-50 text-orange-700 border-orange-200',
    recorded: 'bg-blue-50 text-blue-700 border-blue-200',
    hybrid: 'bg-pink-50 text-pink-700 border-pink-200',
  }
  return (
    <ErrorBoundary>
    <DashboardShell
      title="Course Details"
      icon={Compass}
      navLinks={[
        { to: '/trainee', label: 'Overview', icon: BookMarked },
        { to: '/trainee/courses', label: 'Course Catalog', icon: Compass },
        { to: '/trainee/my-learning', label: 'My Learning', icon: BookOpen },
      ]}
    >
      <div className="max-w-6xl">
        <Link
          to="/trainee/courses"
          className="inline-flex items-center gap-2 text-sm text-zinc-200/60 hover:text-cyan-400 transition-colors mb-6 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Course Catalog
        </Link>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : !course ? (
          <div className="text-center p-12 bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl shadow-sm">
            <h3 className="text-xl font-bold text-zinc-200">Course Not Found</h3>
            <p className="text-zinc-200/50 mt-2 text-sm">This course does not exist or has been removed.</p>
          </div>
        ) : (
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6">

            {/* ── Hero Header ───────────────────────────────────── */}
            <div className="bg-gradient-to-br from-purple-900 via-purple-800 to-midnight text-white rounded-3xl overflow-hidden shadow-2xl shadow-cyan-950/50 border border-cyan-500/30 relative">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-500/25 to-orange-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 p-8 md:p-10">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  <span className="bg-[#070E20]/90/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-orange-300 uppercase tracking-wider border border-white/15 capitalize">
                    {course.course_type} Program
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                    course.status === 'published'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                  }`}>
                    {course.status.replace('_', ' ')}
                  </span>
                  {enrollment && enrollment.status !== 'pending_approval' && enrollment.status !== 'rejected' && (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Enrolled
                    </span>
                  )}
                  {enrollment?.status === 'pending_approval' && (
                    <span className="bg-orange-500/20 text-orange-300 border border-orange-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pending Approval
                    </span>
                  )}
                  {(enrollment as any)?.status === 'waitlisted' ? (
                    <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
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
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/75 mb-6 font-medium">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-pink-400 shrink-0" />
                    <span>{course.trainer?.full_name || 'Assigned Instructor'}</span>
                  </div>
                  {course.duration_minutes && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-400 shrink-0" />
                      <span>
                        {course.duration_minutes >= 60
                          ? `${Math.floor(course.duration_minutes / 60)}h${course.duration_minutes % 60 ? ` ${course.duration_minutes % 60}m` : ''}`
                          : `${course.duration_minutes} min`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-300 shrink-0" />
                    <span>{course.sessions?.length || 0} Sessions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-300 shrink-0" />
                    <span className="capitalize">{course.delivery_mode || 'Recorded'} Delivery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Pass: {course.passing_score}%</span>
                  </div>
                  {enrollmentCounts !== undefined && (
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{enrollmentCounts.active} enrolled / {seatLimit}</span>
                      {enrollmentCounts.waitlisted > 0 && (
                        <span className="text-yellow-300 ml-1">({enrollmentCounts.waitlisted} waitlisted)</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Progress bar for enrolled users */}
                {enrollment && (
                  <div className="mb-6 max-w-md">
                    <div className="flex items-center justify-between text-xs font-semibold text-white/70 mb-2">
                      <span>Your Progress</span>
                      <span className="text-white font-bold">{enrollment.progress_percent ?? 0}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-[#070E20]/90/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${enrollment.progress_percent ?? 0}%` }}
                        transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
                        className={`h-full rounded-full ${
                          enrollment.progress_percent === 100
                            ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                            : 'bg-gradient-to-r from-pink-400 via-orange-400 to-yellow-300'
                        }`}
                      />
                    </div>
                    <p className="text-xs text-white/50 mt-1.5 capitalize">
                      Status: <span className="text-white/80 font-semibold">{enrollment?.status?.replace('_', ' ') || 'Unknown'}</span>
                    </p>
                  </div>
                )}

                {/* CTA */}
                <div className="flex flex-wrap items-center gap-3">
                  {enrollment && enrollment.status === 'enrolled' ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        onClick={() => navigate('/trainee/my-learning')}
                        className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-bold rounded-2xl px-6 py-3 shadow-lg shadow-pink-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                      >
                        <PlayCircle className="w-4 h-4" /> Go to My Learning
                      </Button>
                      
                      <div className="space-y-1">
                        <Button
                          onClick={() => handleInitiateOtp('drop')}
                          disabled={!canDrop || dropMutation.isPending}
                          variant="outline"
                          className="border-white/20 text-white hover:bg-[#070E20]/90/10 font-bold rounded-2xl px-6 py-3"
                        >
                          {dropMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                          Drop Course
                        </Button>
                        {!canDrop && course?.start_date && (
                          <p className="text-[10px] text-pink-200/70 font-medium">Cannot drop within 10 days of start.</p>
                        )}
                      </div>
                    </div>
                  ) : enrollment && enrollment.status === 'pending_approval' ? (
                    <Button disabled className="bg-orange-500/20 text-orange-300 border border-orange-500/30 font-bold rounded-2xl px-6 py-3 cursor-not-allowed flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Approval Pending
                    </Button>
                  ) : enrollment && enrollment.status === 'rejected' ? (
                    <Button disabled className="bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold rounded-2xl px-6 py-3 cursor-not-allowed flex items-center gap-2">
                      <XCircle className="w-4 h-4" /> Enrollment Rejected
                    </Button>
                  ) : enrollment && (enrollment.status as string) === 'waitlisted' ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <Button disabled className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-bold rounded-2xl px-6 py-3 cursor-not-allowed flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Waitlisted {myWaitlistPosition > 0 && `(WL-${myWaitlistPosition})`}
                      </Button>
                      <Button
                        onClick={() => handleInitiateOtp('drop')}
                        disabled={dropMutation.isPending}
                        variant="outline"
                        className="border-white/20 text-white hover:bg-[#070E20]/90/10 font-bold rounded-2xl px-6 py-3"
                      >
                        {dropMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                        Quit Waitlist
                      </Button>
                    </div>
                  ) : isFull ? (
                    <div className="space-y-1">
                      <Button disabled className="bg-[#070E20]/90/10 text-white/50 border border-white/20 font-bold rounded-2xl px-6 py-3 cursor-not-allowed">
                        Course & Waitlist Full
                      </Button>
                      <p className="text-xs text-rose-300 font-medium">Capacity limit of {seatLimit + waitlistLimit} reached.</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Button
                        onClick={() => handleInitiateOtp('enroll')}
                        disabled={isSendingOtp || otpDialogType === 'enroll'}
                        className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-extrabold text-base rounded-2xl px-8 py-5 shadow-xl shadow-pink-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                      >
                        {isSendingOtp && otpDialogType === 'enroll'
                          ? <Loader2 className="w-5 h-5 animate-spin" />
                          : <GraduationCap className="w-5 h-5" />}
                        {isFull ? 'Join Waitlist' : 'Enroll in Course'}
                      </Button>
                      {spotsLeft !== null && (
                        <p className="text-xs text-pink-300 font-semibold">
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
                  <div className="bg-yellow-50/50 border border-yellow-200 rounded-2xl p-5 mb-6 flex items-start gap-4">
                    <div className="p-2 bg-yellow-100 rounded-xl shrink-0"><Lock className="w-5 h-5 text-yellow-600" /></div>
                    <div>
                      <h4 className="text-sm font-bold text-yellow-900 mb-1">Preview Mode</h4>
                      <p className="text-sm text-yellow-700/80">
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
                  <div className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-zinc-200 mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-purple-600" /> About This Course
                    </h2>
                    <p className="text-zinc-200/70 text-sm leading-relaxed whitespace-pre-wrap">{course.description}</p>
                  </div>
                )}

                {/* Announcements & Assessments */}
                {enrollment && (enrollment.status === 'enrolled' || enrollment.status === 'in_progress' || enrollment.status === 'completed') && (
                  <div className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-zinc-200 mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4 text-rose-500" /> Announcements & Assessments
                    </h2>
                    <div className="space-y-6">
                      <CourseAnnouncements courseId={courseId!} isTrainer={false} />
                      
                      {course.assessments?.length > 0 && (
                        <div className="space-y-3">
                          {course.assessments.map((assessment: any) => (
                        <div key={assessment.id} className="p-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/40 flex items-center justify-between gap-4 hover:border-cyan-500/30 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="font-bold text-zinc-200 text-sm truncate max-w-xs">{assessment.title}</h3>
                              <span className={`shrink-0 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                assessment.assessment_type === 'daily_test' ? 'bg-blue-100 text-blue-700' :
                                assessment.assessment_type === 'mock_test' ? 'bg-orange-100 text-orange-700' :
                                'bg-rose-100 text-rose-700'
                              }`}>
                                {assessment.assessment_type?.replace('_', ' ') || 'Assessment'}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-200/60">
                              {assessment.assessment_type === 'daily_test'
                                ? 'Optional practice test. Take at any time.'
                                : `Strictly timed: ${assessment.duration_minutes || 30} mins. Contributes to internal marks.`}
                            </p>
                            {assessment.scheduled_date && (
                              <p className="text-xs text-cyan-400 mt-1 font-medium flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" /> Scheduled for {new Date(assessment.scheduled_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <Button
                            onClick={() => navigate(`/trainee/courses/${course.id}/assessments/${assessment.id}`)}
                            className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold"
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
                  <div className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-zinc-200 mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4 text-orange-500" /> What You'll Learn
                    </h2>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {objectives.map((obj: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-xs text-zinc-200/75 leading-snug font-medium">{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Session Flow — structured timeline OR raw text */}
                {course.session_flow_text && (
                  <div className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                        <ListOrdered className="w-4 h-4 text-purple-600" /> Session Flow
                      </h2>
                      {course.session_flow_document_path && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={docLoading}
                          className="h-8 rounded-xl border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/30 text-xs font-semibold gap-1.5"
                          onClick={handleOpenSessionDoc}
                        >
                          {docLoading
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <FileText className="w-3.5 h-3.5" />}
                          View Document
                        </Button>
                      )}
                    </div>

                    {sessionFlowSteps.length > 0 ? (
                      /* Structured timeline */
                      <div className="relative">
                        {/* vertical line */}
                        <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-purple-300 via-pink-300 to-orange-300 rounded-full" />
                        <ol className="space-y-4 pl-12">
                          {sessionFlowSteps.map((step, i) => (
                            <li key={i} className="relative">
                              {/* dot */}
                              <div className="absolute -left-8 top-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-[10px] font-black shadow-sm shadow-pink-500/30">
                                {step.number || i + 1}
                              </div>
                              <div className="group">
                                <p className="text-sm font-bold text-zinc-200 leading-snug">{step.title}</p>
                                {step.description && (
                                  <p className="text-xs text-zinc-200/55 mt-0.5 leading-relaxed">{step.description}</p>
                                )}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : (
                      /* Fallback: plain text */
                      <p className="text-sm text-zinc-200/70 leading-relaxed whitespace-pre-wrap">{course.session_flow_text}</p>
                    )}
                  </div>
                )}

                {/* Course Sessions — Accordion */}
                {course.sessions?.length > 0 && (
                  <div className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                        <BookCheck className="w-4 h-4 text-purple-600" /> Course Sessions
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-cyan-400">
                          {course.sessions.length}
                        </span>
                      </h2>
                      {!enrollment && (
                        <div className="flex items-center gap-1.5 text-xs text-zinc-200/50 font-medium">
                          <Lock className="w-3.5 h-3.5" /> Enroll to access materials
                        </div>
                      )}
                    </div>

                    <div className="space-y-2.5">
                      {course.sessions.map((session: any, index: number) => {
                        const sessionMaterials = course.materials?.filter((m: any) => m.session_id === session.id) || []
                        const isOpen = openSessions.has(session.id)
                        const typeColor = sessionTypeColors[session.session_type] || 'bg-slate-50 text-slate-600 border-slate-200'

                        return (
                          <div
                            key={session.id}
                            className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                              isOpen ? 'border-cyan-500/30 shadow-md shadow-cyan-950/50' : 'border-cyan-500/30'
                            }`}
                          >
                            {/* Session header */}
                            <button
                              onClick={() => toggleSession(session.id)}
                              className="w-full flex items-center gap-4 p-4 bg-cyan-950/30/40 hover:bg-cyan-950/30/80 transition-colors text-left"
                            >
                              {/* Number chip */}
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-xs transition-all ${
                                isOpen ? 'bg-gradient-to-br from-purple-600 to-pink-500 text-white shadow-md shadow-pink-500/25' : 'bg-[#070E20]/90 border border-cyan-500/30 text-cyan-400'
                              }`}>
                                {index + 1}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                  <p className="text-sm font-bold text-zinc-200">{session.title}</p>
                                  {session.session_type && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${typeColor}`}>
                                      {session.session_type === 'recorded' ? 'Video' : session.session_type}
                                    </span>
                                  )}
                                </div>
                                {session.start_time && (
                                  <p className="text-xs text-zinc-200/50 flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-purple-400" />
                                    {new Date(session.start_time).toLocaleString(undefined, {
                                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                                    })}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {sessionMaterials.length > 0 && (
                                  <span className="text-[11px] text-zinc-200/50 font-semibold bg-[#070E20]/90 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                                    {sessionMaterials.length} file{sessionMaterials.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {session.meet_link && enrollment && (session.session_type === 'live' || session.session_type === 'hybrid') && (
                                  <a
                                    href={session.meet_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors font-semibold"
                                  >
                                    <Video className="w-3.5 h-3.5" /> Join
                                  </a>
                                )}
                                {session.location && enrollment && (session.session_type === 'in_person' || session.session_type === 'hybrid') && (
                                  <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold truncate max-w-[120px]">
                                    <Target className="w-3.5 h-3.5" /> {session.location}
                                  </span>
                                )}
                                {isOpen
                                  ? <ChevronUp className="w-4 h-4 text-purple-500 shrink-0" />
                                  : <ChevronDown className="w-4 h-4 text-zinc-200/35 shrink-0" />}
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
                                  <div className="px-4 pb-4 pt-3 bg-[#070E20]/90 border-t border-cyan-500/30">
                                    {session.description && (
                                      <p className="text-xs text-zinc-200/60 mb-3 leading-relaxed">{session.description}</p>
                                    )}

                                    {sessionMaterials.length === 0 ? (
                                      <div className="flex items-center gap-2 py-3 px-3 rounded-xl bg-slate-50 border border-slate-100">
                                        <FileText className="w-4 h-4 text-zinc-200/20 shrink-0" />
                                        <p className="text-xs text-zinc-200/35 italic">No materials uploaded for this session yet.</p>
                                      </div>
                                    ) : (
                                      <ul className="space-y-2">
                                        {sessionMaterials.map((m: any) => (
                                          <li
                                            key={m.id}
                                            onClick={() => handlePreview(m)}
                                            className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                                              enrollment
                                                ? `cursor-pointer hover:shadow-sm ${getMaterialBg(m.material_type)}`
                                                : 'bg-slate-50 border-slate-100 opacity-60 cursor-not-allowed'
                                            }`}
                                          >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${getMaterialBg(m.material_type)}`}>
                                              {getMaterialIcon(m.material_type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-xs font-semibold text-zinc-200 truncate">{m.file_name}</p>
                                              <p className="text-[10px] text-zinc-200/45 capitalize">{m.material_type}</p>
                                            </div>
                                            {enrollment ? (
                                              m.material_type === 'link'
                                                ? <ExternalLink className="w-3.5 h-3.5 text-zinc-200/30 shrink-0" />
                                                : downloadingId === m.id
                                                  ? <Loader2 className="w-3.5 h-3.5 text-purple-500 animate-spin shrink-0" />
                                                  : <Download className="w-3.5 h-3.5 text-zinc-200/30 shrink-0" />
                                            ) : (
                                              <Lock className="w-3.5 h-3.5 text-zinc-200/25 shrink-0" />
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
                  <div className="space-y-6 mt-6 pt-6 border-t border-cyan-500/30">
                    <CourseChat courseId={courseId!} isTrainer={false} />
                  </div>
                )}
              </div>

              {/* Right sidebar (1/3) */}
              <div className="space-y-4">

                {/* Quick Stats */}
                <div className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-5 shadow-sm">
                  <h3 className="text-[11px] font-bold text-cyan-300/60 uppercase tracking-wider mb-4">Course Stats</h3>
                  <div className="space-y-3">
                    {[
                      {
                        icon: <Clock className="w-3.5 h-3.5 text-orange-500" />,
                        label: 'Duration',
                        value: course.duration_minutes
                          ? course.duration_minutes >= 60
                            ? `${Math.floor(course.duration_minutes / 60)}h${course.duration_minutes % 60 ? ` ${course.duration_minutes % 60}m` : ''}`
                            : `${course.duration_minutes}m`
                          : 'Self-paced',
                      },
                      { icon: <Layers className="w-3.5 h-3.5 text-purple-500" />, label: 'Sessions', value: String(course.sessions?.length || 0) },
                      { icon: <FileText className="w-3.5 h-3.5 text-blue-500" />, label: 'Materials', value: String(totalMaterials) },
                      { icon: <Target className="w-3.5 h-3.5 text-emerald-500" />, label: 'Passing Score', value: `${course.passing_score ?? '—'}%` },
                      { icon: <Users className="w-3.5 h-3.5 text-cyan-500" />, label: 'Enrolled', value: `${activeCount} / ${seatLimit}` },
                      { icon: <Video className="w-3.5 h-3.5 text-pink-500" />, label: 'Delivery', value: course.delivery_mode ? course.delivery_mode.charAt(0).toUpperCase() + course.delivery_mode.slice(1) : 'Recorded' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                          {item.icon}
                        </div>
                        <span className="text-xs text-zinc-200/50 font-medium flex-1">{item.label}</span>
                        <span className="text-xs font-bold text-zinc-200">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Instructor */}
                <div className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-5 shadow-sm">
                  <h3 className="text-[11px] font-bold text-cyan-300/60 uppercase tracking-wider mb-4">Instructor</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white font-black text-base shadow-md shadow-pink-500/20 shrink-0">
                      {course.trainer?.full_name?.charAt(0) || 'T'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-200">{course.trainer?.full_name || 'Assigned Instructor'}</p>
                      {course.trainer?.years_of_experience && (
                        <p className="text-xs text-zinc-200/50">{course.trainer.years_of_experience} yrs experience</p>
                      )}
                    </div>
                  </div>
                  {course.trainer?.bio && (
                    <p className="text-xs text-zinc-200/60 leading-relaxed line-clamp-4 mb-3">{course.trainer.bio}</p>
                  )}
                  {course.trainer?.qualifications && (
                    <div className="mb-3 p-2.5 bg-cyan-950/30 rounded-xl border border-cyan-500/30">
                      <p className="text-[11px] font-semibold text-purple-800">
                        <Award className="w-3 h-3 inline mr-1 text-orange-500" />
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
                      <p className="text-[10px] font-bold text-zinc-200/40 uppercase tracking-wide mb-1.5">Expertise</p>
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
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-cyan-500/30 hover:border-pink-200 hover:shadow-sm transition-all group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#070E20]/90 border border-cyan-500/30 flex items-center justify-center shrink-0 group-hover:bg-cyan-950/30 transition-colors">
                        <Mail className="w-3.5 h-3.5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide">Contact</p>
                        <p className="text-xs text-zinc-200 font-semibold truncate">{course.trainer.email}</p>
                      </div>
                      <Send className="w-3.5 h-3.5 text-purple-400 group-hover:text-pink-500 transition-colors shrink-0" />
                    </a>
                  )}
                </div>

                {/* Schedule */}
                {(course.start_date || course.end_date || course.live_class_timing ||
                  course.mock_test_timing || course.final_exam_timing || course.final_test_date) && (
                  <div className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-5 shadow-sm">
                    <h3 className="text-[11px] font-bold text-cyan-300/60 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-500" /> Schedule
                    </h3>
                    <div className="space-y-2.5">
                      {(course.start_date || course.end_date) && (
                        <div className="p-3 rounded-xl bg-cyan-950/30/70 border border-cyan-500/30">
                          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide mb-0.5">Course Period</p>
                          <p className="text-xs font-semibold text-zinc-200">
                            {course.start_date && new Date(course.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            {course.start_date && course.end_date && ' – '}
                            {course.end_date && new Date(course.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      )}
                      {course.live_class_timing && (
                        <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-100">
                          <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wide mb-0.5">Live Classes</p>
                          <p className="text-xs font-semibold text-zinc-200">{course.live_class_timing}</p>
                        </div>
                      )}
                      {course.mock_test_timing && (
                        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100">
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-0.5">Mock Test</p>
                          <p className="text-xs font-semibold text-zinc-200">
                            {new Date(course.mock_test_timing).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                      )}
                      {course.final_exam_timing && (
                        <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100">
                          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wide mb-0.5">Final Exam</p>
                          <p className="text-xs font-semibold text-zinc-200">
                            {new Date(course.final_exam_timing).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                      )}
                      {course.final_test_date && (
                        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-0.5">Final Test</p>
                          <p className="text-xs font-semibold text-zinc-200">
                            {new Date(course.final_test_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            {course.final_test_start_time && ` at ${course.final_test_start_time}`}
                            {course.final_test_end_time && ` – ${course.final_test_end_time}`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Enroll prompt for non-enrolled */}
                {!enrollment && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 font-medium leading-relaxed">
                      Enroll to access all materials, track your progress, and earn a certificate upon completion.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Course Feedback Section */}
        {enrollment && (enrollment.status === 'enrolled' || enrollment.status === 'completed') && (
          <motion.div variants={fadeUp} className="mt-8">
            <CourseFeedback courseId={courseId!} />
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
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-[#070E20]/90 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-zinc-200 text-center mb-1">
              {otpDialogType === 'enroll' ? 'Confirm Enrollment' : 'Confirm Drop Course'}
            </DialogTitle>
            <DialogDescription className="text-center text-zinc-200/60 text-sm">
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
                    ? 'bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 shadow-cyan-950/50' 
                    : 'bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 shadow-rose-500/20'
                } shadow-lg transition-all`}
              >
                {isSendingOtp ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Verification Code'}
              </Button>
              <Button
                variant="ghost"
                onClick={handleCloseOtpDialog}
                disabled={isSendingOtp}
                className="w-full text-zinc-200/60 hover:text-zinc-200 h-11 rounded-xl"
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
                    className="text-center text-lg tracking-[0.25em] font-bold h-12 rounded-xl border-cyan-500/30 focus-visible:ring-purple-500"
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
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/20' 
                      : 'bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 shadow-rose-500/20'
                  } shadow-lg transition-all`}
                >
                  {isVerifyingOtp ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Code'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleCloseOtpDialog}
                  disabled={isVerifyingOtp}
                  className="w-full text-zinc-200/60 hover:text-zinc-200 h-11 rounded-xl"
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
