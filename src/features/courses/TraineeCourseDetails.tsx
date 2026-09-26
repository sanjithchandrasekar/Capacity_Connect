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
  Lock, Target, Calendar, Video, Download, ExternalLink, Users, UserCheck,
  GraduationCap, Award, PlayCircle,
  ListOrdered, BookCheck, Mail, Send, XCircle, FileCheck, AlertCircle, BarChart3,
  HelpCircle, Sparkles, CheckSquare, RotateCcw, Unlock, Image as ImageIcon, Check, Trophy,
  Eye, Film, Camera, AlignLeft, Globe, Bell, Info
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { MaterialPreviewDialog } from '@/components/ui/MaterialPreviewDialog'
import { CourseFeedback } from './CourseFeedback'
import { CourseAnnouncements } from './CourseAnnouncements'
import { CourseChat } from './CourseChat'
import { LiveAttendanceTraineePanel } from './LiveAttendanceTraineePanel'
import { generateTraineeCertificate, triggerFileDownload } from '@/lib/certificateGenerator'
import {
  calculateCourseGradeBreakdown,
  getAssessmentTypeLabel,
  isPracticeAssessment,
  isFinalAssessment,
  isRegularAssessment,
  type CourseGradeBreakdown
} from '@/lib/courseGrading'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null
}

function LinkedinIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  )
}

function GithubIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
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
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())
  const [completedModules, setCompletedModules] = useState<string[]>([])
  const [moduleQuizAnswers, setModuleQuizAnswers] = useState<Record<string, Record<number, number>>>({})
  const [moduleQuizScores, setModuleQuizScores] = useState<Record<string, { score: number; passed: boolean; submitted: boolean }>>({})
  const [previewMaterial, setPreviewMaterial] = useState<any | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [docLoading, setDocLoading] = useState(false)
  const [aboutModalOpen, setAboutModalOpen] = useState(false)
  const [aboutActiveTab, setAboutActiveTab] = useState<'about' | 'outline'>('about')

  // OTP Verification States
  const [otpDialogType, setOtpDialogType] = useState<'enroll' | 'drop' | null>(null)
  const [otpInput, setOtpInput] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [showAttendanceDetails, setShowAttendanceDetails] = useState(false)
  const [sessionAttendance, setSessionAttendance] = useState<Record<string, { entered: number, generated: number, override: string | null }>>({})



  // Load completed modules from storage
  useEffect(() => {
    if (!courseId || !profile?.id) return
    const stored = localStorage.getItem(`cc_mod_progress_${courseId}_${profile.id}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed.completed)) setCompletedModules(parsed.completed)
        if (parsed.scores) setModuleQuizScores(parsed.scores)
      } catch (e) {
        console.error('Error loading module progress:', e)
      }
    }
  }, [courseId, profile?.id])

  const toggleSession = (id: string) => {
    setOpenSessions(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleModule = (id: string) => {
    setOpenModules(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSelectQuizAnswer = (moduleId: string, questionIdx: number, optionIdx: number) => {
    setModuleQuizAnswers(prev => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || {}),
        [questionIdx]: optionIdx
      }
    }))
  }

  const handleSubmitModuleQuiz = async (mod: any) => {
    const rawItems = mod.items || mod.content_items || []
    const quizQuestionsFromItems = rawItems.filter((i: any) => i.type === 'quiz' && i.quiz_data).map((i: any) => i.quiz_data)
    const legacyQuizQuestions = (mod.quiz_questions || [])
    const questions: any[] = [...quizQuestionsFromItems]
    legacyQuizQuestions.forEach((lq: any) => {
      if (!questions.some(q => q.id === lq.id || q.question === lq.question)) {
        questions.push(lq)
      }
    })

    if (questions.length === 0) return

    const userAnswers = moduleQuizAnswers[mod.id] || {}
    const answeredCount = Object.keys(userAnswers).length
    if (answeredCount < questions.length) {
      toast.error(`Please answer all ${questions.length} questions before submitting. (${answeredCount}/${questions.length} answered)`)
      return
    }

    let correctCount = 0
    questions.forEach((q: any, idx: number) => {
      if (userAnswers[idx] === q.correct_option) {
        correctCount++
      }
    })

    const scorePercent = Math.round((correctCount / questions.length) * 100)
    const passed = scorePercent >= 80

    const updatedScores = {
      ...(moduleQuizScores || {}),
      [mod.id]: {
        score: scorePercent,
        passed,
        submitted: true
      }
    }
    setModuleQuizScores(updatedScores)

    if (passed) {
      const newCompleted = Array.from(new Set([...completedModules, mod.id]))
      setCompletedModules(newCompleted)

      if (profile?.id && courseId) {
        localStorage.setItem(`cc_mod_progress_${courseId}_${profile.id}`, JSON.stringify({
          completed: newCompleted,
          scores: updatedScores
        }))
      }

      // Update progress in database
      const totalMods = (course?.modules?.length) || 1
      const progressPercent = Math.min(100, Math.round((newCompleted.length / totalMods) * 100))
      
      if (profile?.id) {
        try {
          await supabase
            .from('enrollments')
            .update({
              progress_percent: progressPercent,
              status: progressPercent === 100 ? 'completed' : 'in_progress'
            } as any)
            .eq('course_id', courseId!)
            .eq('user_id', profile.id)
          queryClient.invalidateQueries({ queryKey: ['enrollment', courseId, profile.id] })
          queryClient.invalidateQueries({ queryKey: ['my_learning', profile.id] })
          queryClient.invalidateQueries({ queryKey: ['trainee-profile-completed-badges'] })
        } catch (err) {
          console.warn('Could not update enrollment progress', err)
        }
      }

      toast.success(`🎉 Excellent! You scored ${scorePercent}% (${correctCount}/${questions.length} correct). Module passed! Next module is now unlocked!`, {
        duration: 5000
      })
    } else {
      toast.error(`⚠️ Score: ${scorePercent}% (${correctCount}/${questions.length} correct). Minimum 80% passing score is required to unlock the next module. Please review the module and try again.`, {
        duration: 5000
      })
    }
  }

  const handleRetakeModuleQuiz = (moduleId: string) => {
    setModuleQuizAnswers(prev => ({ ...prev, [moduleId]: {} }))
    setModuleQuizScores(prev => {
      const next = { ...prev }
      delete next[moduleId]
      return next
    })
    toast.info('Quiz reset. You can now choose your answers and try again!')
  }

  const handleCompleteContentModule = async (mod: any) => {
    const newCompleted = Array.from(new Set([...completedModules, mod.id]))
    setCompletedModules(newCompleted)

    if (profile?.id && courseId) {
      localStorage.setItem(`cc_mod_progress_${courseId}_${profile.id}`, JSON.stringify({
        completed: newCompleted,
        scores: moduleQuizScores
      }))
    }

    const totalMods = (course?.modules?.length) || 1
    const progressPercent = Math.min(100, Math.round((newCompleted.length / totalMods) * 100))
    
    try {
      await supabase
        .from('enrollments')
        .update({
          progress_percent: progressPercent,
          status: progressPercent === 100 ? 'completed' : 'in_progress'
        } as any)
        .eq('course_id', courseId!)
        .eq('user_id', profile!.id)
      queryClient.invalidateQueries({ queryKey: ['enrollment', courseId, profile?.id] })
      queryClient.invalidateQueries({ queryKey: ['my_learning', profile?.id] })
      queryClient.invalidateQueries({ queryKey: ['trainee-profile-completed-badges'] })
    } catch (err) {
      console.warn('Could not update enrollment progress', err)
    }

    toast.success(`Module "${mod.title}" marked complete! Next module unlocked.`)
  }

  const { data: course, isLoading: isCourseLoading } = useQuery({
    queryKey: ['course-with-trainer', courseId],
    queryFn: async () => {
      const { data: courseData, error } = await supabase
        .from('courses')
        .select(`*, trainer:trainers!courses_trainer_id_fkey(full_name, bio, years_of_experience, qualifications, email, study_details, work_experience, expertise_areas, linkedin_url, website_url, github_url, avatar_path)`)
        .eq('id', courseId!)
        .single() as any
      if (error) throw error

      let modulesList = (courseData.modules && Array.isArray(courseData.modules) && courseData.modules.length > 0)
        ? courseData.modules
        : []

      if (modulesList.length === 0) {
        try {
          const { data: cmData } = await (supabase as any)
            .from('course_modules')
            .select('*')
            .eq('course_id', courseId!)
            .order('order_index')
          if (cmData && cmData.length > 0) {
            modulesList = cmData.map((m: any) => ({
              id: m.id,
              title: m.title,
              description: m.description,
              items: m.content_items || [],
              quiz_questions: m.quiz_questions || [],
              passing_score: m.passing_score ?? 80,
            }))
          }
        } catch {
          // ignore
        }
      }

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
        .select('id, title, passing_score, status, requires_sea, sea_link, scheduled_date, start_time, end_time, duration_minutes, instructions, created_at, assessment_type')
        .eq('course_id', courseId!)
        .eq('status', 'published')
        .order('created_at')

      return {
        ...courseData,
        modules: modulesList,
        sessions: sessionsData || [],
        materials: materialsData || [],
        assessments: assessmentsData || []
      }
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

  const { data: traineeAttempts = [] } = useQuery({
    queryKey: ['trainee-course-attempts', courseId, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('assessment_attempts' as any)
        .select('*')
        .eq('user_id', profile.id)
      if (error) return []
      return (data || []) as any[]
    },
    enabled: !!profile?.id,
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

  const { data: courseSkills = [] } = useQuery({
    queryKey: ['course-skills', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_skills')
        .select('*, skills(name)')
        .eq('course_id', courseId!)
      if (error) return []
      return data || []
    },
    enabled: !!courseId,
  })

  // Fetch session attendance data from DB
  useEffect(() => {
    if (!course?.sessions || !profile?.id) return
    const fetchAttendance = async () => {
      const sessionIds = course.sessions.map((s: any) => s.id)
      if (sessionIds.length === 0) return

      const [{ data: metaData }, { data: attendanceData }] = await Promise.all([
        (supabase as any).from('session_attendance_meta').select('*').in('session_id', sessionIds),
        (supabase as any).from('session_attendance').select('*').in('session_id', sessionIds).eq('user_id', profile.id)
      ])

      const newAttendance: Record<string, { entered: number, generated: number, override: string | null }> = {}
      
      course.sessions.forEach((s: any) => {
        const meta = metaData?.find((m: any) => m.session_id === s.id)
        const att = attendanceData?.find((a: any) => a.session_id === s.id)
        
        newAttendance[s.id] = {
          generated: meta?.total_generated || 0,
          entered: att?.entered_count || 0,
          override: att?.status_override || null
        }
      })
      
      setSessionAttendance(newAttendance)
    }
    fetchAttendance()
  }, [course?.sessions, profile?.id])

  // Calculate attendance aggregates
  const attendanceAggregates = React.useMemo(() => {
    let totalTracked = 0
    let presentCount = 0
    let partialCount = 0
    let absentCount = 0
    let percentage = 0
    
    if (!profile?.id || !course?.sessions) return { totalTracked, presentCount, partialCount, absentCount, percentage, userId: profile?.id }
    
    course.sessions.forEach((s: any) => {
      let att = sessionAttendance[s.id]
      
      // Fallback to localStorage for legacy local testing data if DB has no data
      if (!att || att.generated === 0) {
        try {
          const localStr = localStorage.getItem(`trainee_attendance_${s.id}_${profile.id}`)
          if (localStr) {
            const localData = JSON.parse(localStr)
            if (localData.generated > 0 || localData.override) {
              att = localData
            }
          }
        } catch(e) {}
      }

      if (att && (att.generated > 0 || att.override)) {
        totalTracked++
        if (att.override === 'present' || att.override === 'P') {
          presentCount++
        } else if (att.override === 'late') {
          partialCount++
        } else if (att.override === 'absent' || att.override === 'F') {
          absentCount++
        } else if (att.entered >= att.generated * 0.5) {
          presentCount++
        } else if (att.entered > 0) {
          partialCount++
        } else {
          absentCount++
        }
      }
    })
    
    percentage = totalTracked > 0 ? Math.round((presentCount / totalTracked) * 100) : 0
    const userId = profile.id
    return { totalTracked, presentCount, partialCount, absentCount, percentage, userId }
  }, [profile?.id, sessionAttendance, course?.sessions])

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
      // 1. Update status to 'withdrawn'
      const { error: updateErr } = await supabase
        .from('enrollments')
        .update({ status: 'withdrawn' } as any)
        .eq('course_id', courseId!)
        .eq('user_id', profile!.id)

      if (updateErr) {
        // Fallback to RPC or delete
        const { error: rpcErr } = await (supabase.rpc as any)('drop_enrollment', {
          p_course_id: courseId!,
          p_user_id: profile!.id
        })
        if (rpcErr) {
          const { error: delErr } = await supabase
            .from('enrollments')
            .delete()
            .eq('course_id', courseId!)
            .eq('user_id', profile!.id)
          if (delErr) throw updateErr
        }
      }
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
    if (!profile?.email || otpInput.trim().length < 6 || otpInput.trim().length > 8) return
    setIsVerifyingOtp(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: profile.email,
        token: otpInput.trim(),
        type: 'email'
      })
      if (error) throw error

      if (otpDialogType === 'enroll') {
        // 1. Calculate capacity status
        const { count: currentEnrolled } = await supabase
          .from('enrollments')
          .select('id', { count: 'exact', head: true })
          .eq('course_id', courseId!)
          .in('status', ['enrolled', 'in_progress', 'completed'])

        const isFull = course?.max_trainees ? (currentEnrolled ?? 0) >= course.max_trainees : false
        const targetStatus = isFull ? 'waitlisted' : 'pending_approval'

        // 2. Check if already has an enrollment record (e.g. previously dropped or rejected)
        const { data: existingRecord } = await supabase
          .from('enrollments')
          .select('id')
          .eq('course_id', courseId!)
          .eq('user_id', profile.id)
          .maybeSingle()

        if (existingRecord) {
          const { error: updateErr } = await supabase
            .from('enrollments')
            .update({
              status: targetStatus,
              enrolled_at: new Date().toISOString(),
              progress_percent: 0,
            } as any)
            .eq('id', existingRecord.id)

          if (updateErr) {
            // Try RPC fallback
            await (supabase.rpc as any)('enroll_trainee', {
              p_course_id: courseId!,
              p_user_id: profile.id
            })
          }
        } else {
          const { error: insertErr } = await supabase
            .from('enrollments')
            .insert({
              course_id: courseId!,
              user_id: profile.id,
              status: targetStatus,
              enrolled_at: new Date().toISOString(),
              progress_percent: 0,
            } as any)

          if (insertErr) {
            // Try RPC fallback
            const { error: rpcErr } = await (supabase.rpc as any)('enroll_trainee', {
              p_course_id: courseId!,
              p_user_id: profile.id
            })
            if (rpcErr) throw insertErr
          }
        }

        // 3. Notify Trainer of Enrollment Request
        if (course?.trainer_id) {
          try {
            await supabase.from('notifications').insert({
              user_id: course.trainer_id,
              type: `enrollment_request:${course.id}`,
              title: isFull ? 'New Course Waitlist Request' : 'New Enrollment Approval Request',
              message: `${profile.full_name || profile.email} has requested to enroll in "${course.title}".`,
            } as any)
          } catch (notifErr) {
            console.warn('Could not notify trainer:', notifErr)
          }
        }

        queryClient.invalidateQueries({ queryKey: ['enrollment', courseId, profile?.id] })
        queryClient.invalidateQueries({ queryKey: ['enrollments-count', courseId] })
        queryClient.invalidateQueries({ queryKey: ['trainee-dashboard-enrollments', profile?.id] })
        
        if (isFull) {
          toast.success('Course is currently full. You have been added to the Waitlist!')
        } else {
          toast.success('Enrollment request submitted! Awaiting trainer approval.')
        }

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

  const gradeBreakdown = calculateCourseGradeBreakdown({
    moduleProgressPercent: enrollment?.progress_percent ?? (completedModules.length > 0 && course?.modules?.length ? Math.round((completedModules.length / course.modules.length) * 100) : 0),
    courseAssessments: (course?.assessments || []) as any,
    traineeAttempts,
    passingScore: course?.passing_score ?? 50,
  })

  const [downloadingCert, setDownloadingCert] = useState(false)

  const handleDownloadCertificate = async () => {
    if (!profile || !course) return
    if (!gradeBreakdown.isCompleted) {
      if (gradeBreakdown.hasFinalAssessment && !gradeBreakdown.finalAssessmentCompleted) {
        toast.error('You must take and pass the Final Assessment before downloading the certificate.')
      } else if (!gradeBreakdown.isPassed) {
        toast.error(`Your total score (${gradeBreakdown.totalScore}%) is below the passing criteria (${gradeBreakdown.passingScore}%).`)
      } else {
        toast.error('Please complete all course requirements before downloading the certificate.')
      }
      return
    }
    setDownloadingCert(true)
    try {
      const traineeName = profile.full_name || user?.email?.split('@')[0] || 'Trainee'
      const percentage = `${gradeBreakdown.totalScore}%`

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

  const isApprovedTrainee = Boolean(enrollment && (['enrolled', 'in_progress', 'completed'] as string[]).includes(enrollment.status))

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
          { to: '/trainee/notifications', label: 'Notifications', icon: Bell },
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

                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">
                      {course.title}
                    </h1>
                    <button
                      onClick={() => {
                        setAboutActiveTab('about')
                        setAboutModalOpen(true)
                      }}
                      title="About Course"
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 border border-cyan-400/40 text-xs font-bold transition-all shadow-xs backdrop-blur-md cursor-pointer group shrink-0"
                    >
                      <Info className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <span>About</span>
                    </button>
                  </div>

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
                  </div>

                  {/* Progress bar for enrolled users */}
                  {enrollment && (
                    <div className="mb-6 max-w-md space-y-4">
                      <div>
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

                      {/* Top Overall Attendance Bar */}
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
                          <span className="flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Overall Attendance</span>
                          <span className="text-white font-bold">{attendanceAggregates.percentage}%</span>
                        </div>
                        <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/20">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${attendanceAggregates.percentage}%` }}
                            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.5 }}
                            className={`h-full rounded-full ${
                              attendanceAggregates.percentage >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                              attendanceAggregates.percentage >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'
                            }`}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                          <span className="text-emerald-300 font-semibold">{attendanceAggregates.presentCount} Present</span> • <span className="text-rose-300 font-semibold">{attendanceAggregates.absentCount} Absent</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="flex flex-wrap items-center gap-3">
                    {enrollment && gradeBreakdown.isCompleted ? (
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
                          onClick={() => window.open(`/trainee/courses/${courseId}/learn`, '_blank')}
                          className="bg-white/10 hover:bg-white/20 text-white border border-white/25 backdrop-blur-md font-bold rounded-2xl px-6 py-3 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-sm"
                        >
                          <PlayCircle className="w-4 h-4 text-cyan-300" />
                          <span>Review Modules (New Tab)</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                        </Button>
                      </div>
                    ) : isApprovedTrainee ? (
                      <div className="flex flex-wrap items-center gap-3">
                        {gradeBreakdown.hasFinalAssessment && !gradeBreakdown.finalAssessmentCompleted && gradeBreakdown.isFinalUnlocked ? (
                          <Button
                            onClick={() => {
                              if (gradeBreakdown.finalAssessmentId) {
                                window.location.href = `/trainee/courses/${courseId}/assessments/${gradeBreakdown.finalAssessmentId}`
                              }
                            }}
                            className="bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-extrabold text-sm sm:text-base rounded-2xl px-8 py-4 shadow-xl shadow-purple-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 animate-pulse"
                          >
                            <FileCheck className="w-5 h-5 text-amber-300" />
                            <span>Take Final Exam (50% Grade)</span>
                          </Button>
                        ) : null}

                        <Button
                          onClick={() => window.open(`/trainee/courses/${courseId}/learn`, '_blank')}
                          className="bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-extrabold text-sm sm:text-base rounded-2xl px-8 py-4 shadow-xl shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                          <PlayCircle className="w-5 h-5" />
                          <span>{enrollment?.progress_percent && enrollment.progress_percent >= 100 ? 'Review Modules' : enrollment?.progress_percent && enrollment.progress_percent > 0 ? 'Resume Learning' : 'Start Learning'}</span>
                          <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
                        </Button>
                        
                        <div className="space-y-1">
                          <Button
                            onClick={() => handleInitiateOtp('drop')}
                            disabled={!canDrop || dropMutation.isPending}
                            className="bg-white/10 hover:bg-rose-500/20 text-white border border-white/20 hover:border-rose-400/40 backdrop-blur-md font-bold rounded-2xl px-6 py-3 transition-all"
                          >
                            {dropMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2 text-rose-400" />}
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
                          className="bg-white/10 hover:bg-rose-500/20 text-white border border-white/20 hover:border-rose-400/40 backdrop-blur-md font-bold rounded-2xl px-6 py-3 transition-all"
                        >
                          {dropMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2 text-rose-400" />}
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
                    )}
                  </div>
                </div>
              </div>

              {/* ── Main 2-col grid ────────────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left column (2/3) */}
                <div className="lg:col-span-2 space-y-5">

                  {/* 1. Preview Mode Banner (if not approved) */}
                  {!isApprovedTrainee && (
                    <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 sm:p-6 flex items-start gap-4 shadow-xs">
                      <div className="p-2.5 bg-amber-100 rounded-2xl shrink-0">
                        <Lock className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-amber-900 mb-1">
                          {enrollment?.status === 'pending_approval'
                            ? 'Enrollment Pending Approval'
                            : enrollment?.status === 'rejected'
                            ? 'Enrollment Not Approved'
                            : 'Preview Mode'}
                        </h4>
                        <p className="text-xs sm:text-sm text-amber-800/90 leading-relaxed font-normal">
                          {enrollment?.status === 'pending_approval' 
                            ? "Your enrollment is currently pending approval by the course trainer. Interactive learning modules, videos, notes, and quizzes will unlock automatically once approved."
                            : enrollment?.status === 'rejected'
                            ? "Your enrollment request was not approved. Please contact your trainer for further assistance."
                            : "You are currently viewing this course in preview mode. Enroll and receive trainer approval to unlock the interactive learning experience and assessments."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 2. Resume Learning Action Banner / Completed Banner (for Approved Trainees) */}
                  {isApprovedTrainee && (() => {
                    const isCourseFullyCompleted = Boolean(gradeBreakdown.isCompleted)
                    const isFinalPending = Boolean(gradeBreakdown.hasFinalAssessment && !gradeBreakdown.finalAssessmentCompleted && gradeBreakdown.isFinalUnlocked)

                    return (
                      <div className={`border rounded-3xl p-6 shadow-xl relative overflow-hidden transition-all ${
                        isCourseFullyCompleted
                          ? 'bg-gradient-to-r from-[#061c14] via-[#08281b] to-[#04120c] border-emerald-500/40 shadow-emerald-950/30'
                          : isFinalPending
                          ? 'bg-gradient-to-r from-[#17092c] via-[#120724] to-[#080314] border-purple-500/40 shadow-purple-950/30'
                          : 'bg-gradient-to-r from-[#0c162c] via-[#091224] to-[#040814] border-cyan-500/30'
                      }`}>
                        <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
                          isCourseFullyCompleted ? 'bg-emerald-500/15' : isFinalPending ? 'bg-purple-500/20' : 'bg-cyan-500/15'
                        }`} />
                        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {isCourseFullyCompleted ? (
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                              ) : isFinalPending ? (
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
                              ) : (
                                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                              )}
                              <span className={`text-xs font-bold uppercase tracking-wider ${
                                isCourseFullyCompleted ? 'text-emerald-400' : isFinalPending ? 'text-purple-300' : 'text-cyan-400'
                              }`}>
                                {isCourseFullyCompleted ? 'Course Completed 🎉' : isFinalPending ? 'Final Exam Required 📝' : 'Active Learning Session'}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-white">
                              {isCourseFullyCompleted
                                ? "Course Completed! You've mastered all modules & evaluations"
                                : isFinalPending
                                ? "Modules Completed! Take the Final Exam to earn your certificate"
                                : 'Ready to learn? Resume your course modules'}
                            </h3>
                            <p className="text-xs text-slate-300">
                              {isCourseFullyCompleted
                                ? `All ${course.modules?.length || completedModules.length} modules completed • Grade: ${gradeBreakdown.totalScore}% (Passed)`
                                : isFinalPending
                                ? `All ${course.modules?.length || completedModules.length} modules completed (25/25 pts) • Final Exam (50% weight) ready to take`
                                : `${completedModules.length} of ${course.modules?.length || 0} modules completed • ${enrollment?.progress_percent ?? 0}% overall progress`}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 shrink-0">
                            {isFinalPending && gradeBreakdown.finalAssessmentId ? (
                              <Button
                                onClick={() => {
                                  window.location.href = `/trainee/courses/${courseId}/assessments/${gradeBreakdown.finalAssessmentId}`
                                }}
                                className="bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-extrabold text-sm rounded-2xl px-6 py-3.5 shadow-lg shadow-purple-500/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                              >
                                <FileCheck className="w-4 h-4 text-amber-300" />
                                <span>Take Final Exam</span>
                              </Button>
                            ) : null}
                            <Button
                              onClick={() => window.open(`/trainee/courses/${courseId}/learn`, '_blank')}
                              className={`text-white font-extrabold text-sm rounded-2xl px-6 py-3.5 shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shrink-0 ${
                                isCourseFullyCompleted
                                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 shadow-emerald-500/25'
                                  : isFinalPending
                                  ? 'bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md'
                                  : 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-cyan-500/30'
                              }`}
                            >
                              {isCourseFullyCompleted || isFinalPending ? <BookOpen className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                              <span>{isCourseFullyCompleted || isFinalPending ? 'Review Modules' : 'Resume Learning'}</span>
                              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Curriculum Modules Sequence */}
                  {course.modules && Array.isArray(course.modules) && course.modules.length > 0 && (
                    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <BookMarked className="w-4 h-4 text-cyan-600" /> Curriculum Modules ({course.modules.length})
                        </h3>
                        <span className="text-[11px] font-semibold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-200">
                          Passing Gate: ≥80% on Module Quizzes
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {course.modules.map((mod: any, mIdx: number) => {
                          const isCompleted = completedModules.includes(mod.id)
                          const isUnlocked = isApprovedTrainee && (mIdx === 0 || completedModules.includes(course.modules[mIdx - 1]?.id))
                          const rawItems = mod.items || mod.content_items || []
                          const quizCount = rawItems.filter((i: any) => i.type === 'quiz').length + (mod.quiz_questions?.length || 0)

                          return (
                            <div
                              key={mod.id || mIdx}
                              className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                isCompleted
                                  ? 'bg-emerald-50/40 border-emerald-200 shadow-xs'
                                  : isUnlocked
                                    ? 'bg-cyan-50/20 border-cyan-200/80 shadow-xs'
                                    : 'bg-slate-50/50 border-slate-200/80 opacity-85'
                              }`}
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isCompleted
                                    ? 'bg-emerald-500 text-white'
                                    : isUnlocked
                                      ? 'bg-cyan-600 text-white'
                                      : 'bg-slate-200 text-slate-500'
                                }`}>
                                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : mIdx + 1}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-slate-900 truncate">
                                      {mod.title || `Module ${mIdx + 1}`}
                                    </p>
                                    {isCompleted ? (
                                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                                        Completed
                                      </Badge>
                                    ) : isUnlocked ? (
                                      <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200 text-[10px] font-bold">
                                        Unlocked
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-slate-400 border-slate-200 text-[10px] flex items-center gap-1">
                                        <Lock className="w-2.5 h-2.5" /> Locked
                                      </Badge>
                                    )}
                                  </div>
                                  {mod.description && (
                                    <p className="text-xs text-slate-500 truncate max-w-xl mt-0.5">{mod.description}</p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 ml-4">
                                <div className="text-right hidden sm:block">
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    {rawItems.length} item{rawItems.length !== 1 ? 's' : ''}
                                    {quizCount > 0 ? ` • ${quizCount} Quiz` : ''}
                                  </span>
                                </div>
                                {isApprovedTrainee ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => window.open(`/trainee/courses/${courseId}/learn`, '_blank')}
                                    className="h-7 px-2.5 rounded-lg text-xs font-semibold text-cyan-700 hover:text-cyan-800 hover:bg-cyan-100/60"
                                  >
                                    Launch Player <ExternalLink className="w-3 h-3 ml-1" />
                                  </Button>
                                ) : (
                                  <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                    <Lock className="w-3 h-3" /> Locked
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. Outcomes of Learning & Skills Developed */}
                  {(objectives.length > 0 || (courseSkills && courseSkills.length > 0)) && (
                    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-6">
                      {/* What You'll Learn */}
                      {objectives.length > 0 && (
                        <div>
                          <h2 className="text-sm font-bold text-slate-900 mb-3.5 flex items-center gap-2">
                            <Target className="w-4 h-4 text-emerald-600" /> Outcomes of Learning (What You'll Master)
                          </h2>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {objectives.map((obj: string, i: number) => (
                              <li key={i} className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100/80">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span className="text-xs text-emerald-950 leading-relaxed font-medium">{obj}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Skills Developed */}
                      {courseSkills && courseSkills.length > 0 && (
                        <div className={objectives.length > 0 ? 'pt-4 border-t border-slate-100' : ''}>
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-600" /> Skills You'll Gain
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {courseSkills.map((cs: any, idx: number) => {
                              const skillName = cs.skills?.name || cs.name || cs.skill_name || 'Skill'
                              return (
                                <span
                                  key={cs.id || idx}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-50 to-sky-50 text-cyan-800 border border-cyan-200 text-xs font-semibold shadow-xs"
                                >
                                  <Award className="w-3.5 h-3.5 text-cyan-600" />
                                  {skillName}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Course Assessments & Grading Breakdown (25% Modules + 25% Assessments Avg + 50% Final Exam) */}
                  <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Target className="w-4 h-4 text-cyan-600" /> Course Grading &amp; Assessments
                          </h2>
                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                            100% Total Grade
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Evaluated via: 25% Course Modules + 25% Assessments Average + 50% Final Exam.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-right">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Your Total Score</span>
                          <span className="text-sm font-black text-cyan-700">
                            {gradeBreakdown.totalScore}% <span className="text-[10px] text-slate-400 font-semibold">(Pass: {gradeBreakdown.passingScore}%)</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3 Pillars Scorecards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {/* Pillar 1: Modules Completion (25%) */}
                      <div className="p-4 rounded-2xl bg-cyan-50/40 border border-cyan-200/80 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-700">1. Course Modules</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">25% Weight</span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium">All video lessons and module checkpoints</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-cyan-200/60">
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-500">Earned:</span>
                            <span className="text-base font-black text-cyan-700">{gradeBreakdown.moduleScore} <span className="text-xs text-slate-400">/ 25 pts</span></span>
                          </div>
                          <div className="w-full bg-white rounded-full h-1.5 overflow-hidden border border-cyan-200">
                            <div className="bg-cyan-600 h-full rounded-full transition-all" style={{ width: `${gradeBreakdown.moduleProgressPercent}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 text-right font-medium">{gradeBreakdown.moduleProgressPercent}% completed</p>
                        </div>
                      </div>

                      {/* Pillar 2: Regular Assessments Average (25%) */}
                      <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/80 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800">2. Assessments Avg</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">25% Weight</span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium">Average score of all regular course tests</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-amber-200/60">
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-500">Earned:</span>
                            <span className="text-base font-black text-amber-700">{gradeBreakdown.regularAssessmentScore} <span className="text-xs text-slate-400">/ 25 pts</span></span>
                          </div>
                          <div className="w-full bg-white rounded-full h-1.5 overflow-hidden border border-amber-200">
                            <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${gradeBreakdown.regularAssessmentAveragePercent}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 text-right font-medium">
                            {gradeBreakdown.regularAssessmentsTotal > 0
                              ? `${gradeBreakdown.regularAssessmentAveragePercent}% avg (${gradeBreakdown.regularAssessmentsCompleted}/${gradeBreakdown.regularAssessmentsTotal} completed)`
                              : `${gradeBreakdown.moduleProgressPercent}% module aligned`}
                          </p>
                        </div>
                      </div>

                      {/* Pillar 3: Final Assessment (50%) */}
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
                        gradeBreakdown.finalAssessmentCompleted
                          ? 'bg-purple-50/40 border-purple-200/80'
                          : gradeBreakdown.isFinalUnlocked
                            ? 'bg-emerald-50/40 border-emerald-200/80'
                            : 'bg-slate-50/60 border-slate-200'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-800">3. Final Exam</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900">50% Weight</span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium">
                            {gradeBreakdown.isFinalUnlocked ? 'Unlocked after 100% modules complete' : 'Locked until modules 100%'}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-purple-200/60">
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-500">Earned:</span>
                            <span className="text-base font-black text-purple-700">
                              {gradeBreakdown.finalAssessmentWeightedScore} <span className="text-xs text-slate-400">/ 50 pts</span>
                            </span>
                          </div>
                          <div className="w-full bg-white rounded-full h-1.5 overflow-hidden border border-purple-200">
                            <div
                              className="bg-purple-600 h-full rounded-full transition-all"
                              style={{ width: `${gradeBreakdown.finalAssessmentScorePercent ?? (gradeBreakdown.isFinalUnlocked ? 100 : 0)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 text-right font-medium">
                            {gradeBreakdown.finalAssessmentCompleted
                              ? `${gradeBreakdown.finalAssessmentScorePercent}% score`
                              : gradeBreakdown.isFinalUnlocked
                                ? 'Ready to take!'
                                : 'Locked (Modules Pending)'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Published Course Assessments List */}
                    <div className="space-y-3 pt-2">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-cyan-600" /> Course Assessments ({course.assessments?.length || 0})
                      </h3>

                      {(!course.assessments || course.assessments.length === 0) ? (
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500 font-medium">
                          No scheduled assessments configured for this course yet.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {course.assessments.map((a: any) => {
                            const isFinal = a.assessment_type === 'final'
                            const isPractice = a.assessment_type === 'mock' || a.assessment_type === 'daily'
                            const isUnlocked = !isFinal || gradeBreakdown.isFinalUnlocked
                            const attempt = traineeAttempts.find((at: any) => at.assessment_id === a.id)
                            const hasAttempt = Boolean(attempt)

                            return (
                              <div
                                key={a.id}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border gap-3 transition-all ${
                                  hasAttempt
                                    ? 'bg-emerald-50/30 border-emerald-200'
                                    : !isUnlocked
                                      ? 'bg-slate-50/70 border-slate-200 opacity-90'
                                      : 'bg-white border-slate-200 hover:border-cyan-300 shadow-xs'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <h4 className="text-sm font-bold text-slate-900">{a.title}</h4>
                                    {isPractice ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                        {a.assessment_type === 'mock' ? 'Mock Test' : 'Daily Test'} • Practice Only (0% Weight)
                                      </span>
                                    ) : isFinal ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                        Final Exam • 50% Grade Weight
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                        Assessment Test • 25% Grade Weight (Averaged)
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                                    {a.duration_minutes && <span>⏱ {a.duration_minutes} mins</span>}
                                    {a.scheduled_date && (
                                      <span>📅 {new Date(a.scheduled_date).toLocaleDateString()}</span>
                                    )}
                                    {hasAttempt && (
                                      <span className="text-emerald-700 font-bold">
                                        ✓ Scored: {attempt.score ?? 0}%
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0 flex items-center gap-2">
                                  {hasAttempt ? (
                                    <Link to={`/trainee/courses/${courseId}/assessments/${a.id}`}>
                                      <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-50">
                                        View Result ({attempt.score ?? 0}%)
                                      </Button>
                                    </Link>
                                  ) : isUnlocked ? (
                                    <Link to={`/trainee/courses/${courseId}/assessments/${a.id}`}>
                                      <Button
                                        size="sm"
                                        className={`rounded-xl text-xs font-bold text-white shadow-sm ${
                                          isFinal
                                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                                            : isPractice
                                              ? 'bg-slate-700 hover:bg-slate-800'
                                              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700'
                                        }`}
                                      >
                                        <PlayCircle className="w-3.5 h-3.5 mr-1" />
                                        {isPractice ? 'Start Practice' : isFinal ? 'Take Final Exam' : 'Start Assessment'}
                                      </Button>
                                    </Link>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled
                                      className="rounded-xl text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed gap-1.5"
                                    >
                                      <Lock className="w-3 h-3" /> Locked (100% Modules Required)
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

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
                                    ) : isFinished ? (() => {
                                      const userId = user?.id || profile?.id
                                      const tKey = `trainee_attendance_${session.id}_${userId}`
                                      let attStatus = ''
                                      let attColor = ''
                                      if (enrollment && (session.session_type === 'live' || session.session_type === 'hybrid')) {
                                        try {
                                          const tData = JSON.parse(localStorage.getItem(tKey) || '{"entered":0, "generated":0}')
                                          if (tData.override === 'P') {
                                            attStatus = 'Present'
                                            attColor = 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                          } else if (tData.override === 'F') {
                                            attStatus = 'Absent'
                                            attColor = 'text-rose-700 bg-rose-50 border-rose-200'
                                          } else if (tData.generated > 0) {
                                            if (tData.entered === tData.generated) {
                                              attStatus = 'Present'
                                              attColor = 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                            } else if (tData.entered > 0) {
                                              attStatus = 'Partial'
                                              attColor = 'text-amber-700 bg-amber-50 border-amber-200'
                                            } else {
                                              attStatus = 'Absent'
                                              attColor = 'text-rose-700 bg-rose-50 border-rose-200'
                                            }
                                          }
                                        } catch(e) {}
                                      }

                                      return (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-slate-400" /> Completed
                                          </span>
                                          {attStatus && (
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${attColor}`}>
                                              {attStatus}
                                            </span>
                                          )}
                                        </div>
                                      )
                                    })() : session.session_type ? (
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

                                      {/* LIVE ATTENDANCE OTP PANEL */}
                                      {enrollment && (
                                        <div className="mb-4">
                                          <LiveAttendanceTraineePanel session={session} userId={profile!.id} />
                                        </div>
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

                  {/* Announcements */}
                  <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
                    <CourseAnnouncements courseId={courseId!} isTrainer={false} />
                  </div>

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
                    <div className="flex items-start gap-3.5 mb-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white font-black text-base shadow-md shadow-cyan-600/20 shrink-0 overflow-hidden border border-cyan-100">
                        {course.trainer?.avatar_path ? (
                          <img src={course.trainer.avatar_path} alt={course.trainer.full_name || 'Trainer'} className="w-full h-full object-cover" />
                        ) : (
                          course.trainer?.full_name?.charAt(0) || 'T'
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 leading-tight">{course.trainer?.full_name || 'Assigned Instructor'}</p>
                        {course.trainer?.years_of_experience && (
                          <p className="text-xs text-slate-500 font-medium mt-0.5">{course.trainer.years_of_experience} yrs experience</p>
                        )}

                        {/* Trainer Social Links below name */}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <a
                            href={
                              course.trainer?.linkedin_url
                                ? (course.trainer.linkedin_url.startsWith('http') ? course.trainer.linkedin_url : `https://${course.trainer.linkedin_url}`)
                                : `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(course.trainer?.full_name || 'MoES Trainer')}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold transition-all shadow-2xs hover:scale-105"
                            title={course.trainer?.linkedin_url ? "LinkedIn Profile" : "Search LinkedIn Profile"}
                          >
                            <LinkedinIcon className="w-3.5 h-3.5" />
                            <span>LinkedIn</span>
                          </a>

                          <a
                            href={
                              course.trainer?.github_url
                                ? (course.trainer.github_url.startsWith('http') ? course.trainer.github_url : `https://${course.trainer.github_url}`)
                                : `https://github.com/search?q=${encodeURIComponent(course.trainer?.full_name || 'MoES')}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-[11px] font-bold transition-all shadow-2xs hover:scale-105"
                            title={course.trainer?.github_url ? "GitHub / Research Profile" : "Search GitHub Profile"}
                          >
                            <GithubIcon className="w-3.5 h-3.5" />
                            <span>GitHub</span>
                          </a>

                          <a
                            href={
                              course.trainer?.website_url
                                ? (course.trainer.website_url.startsWith('http') ? course.trainer.website_url : `https://${course.trainer.website_url}`)
                                : 'https://moes.gov.in'
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-all shadow-2xs hover:scale-105"
                            title="Official Website / Portal"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>Website</span>
                          </a>

                          <a
                            href={`mailto:${course.trainer?.email || 'trainer@capacityconnect.in'}?subject=Regarding: ${encodeURIComponent(course.title || 'Course')}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 text-[11px] font-bold transition-all shadow-2xs hover:scale-105"
                            title="Email Instructor"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>Email</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Professional Summary / Biography */}
                    {course.trainer?.bio && (
                      <div className="mb-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                        <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <User className="w-3 h-3 text-cyan-600" />
                          Professional Summary / Biography
                        </p>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                          {course.trainer.bio}
                        </p>
                      </div>
                    )}

                    {/* Academic & Professional Qualifications */}
                    {course.trainer?.qualifications && (
                      <div className="mb-3.5 p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100">
                        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                          Academic & Professional Qualifications
                        </p>
                        <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                          {course.trainer.qualifications}
                        </p>
                      </div>
                    )}

                    {/* Expertise Areas */}
                    {course.trainer?.expertise_areas && course.trainer.expertise_areas.length > 0 && (
                      <div className="mt-3.5">
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

                  {/* Overall Live Attendance */}
                  {(() => {
                    if (!enrollment || !course?.sessions || !profile?.id) return null
                    
                    let totalTracked = 0
                    let presentCount = 0
                    let partialCount = 0
                    let absentCount = 0
                    const trackedSessions: any[] = []
                    
                    const userId = profile.id
                    
                    course.sessions.forEach((session: any) => {
                      if (session.session_type !== 'live' && session.session_type !== 'hybrid') return
                      
                      let tData = sessionAttendance[session.id]
                      
                      // Fallback to localStorage for legacy local testing data if DB has no data
                      if (!tData || tData.generated === 0) {
                        try {
                          const localStr = localStorage.getItem(`trainee_attendance_${session.id}_${profile.id}`)
                          if (localStr) {
                            const localData = JSON.parse(localStr)
                            if (localData.generated > 0 || localData.override) {
                              tData = localData
                            }
                          }
                        } catch(e) {}
                      }

                      if (!tData) return
                      
                      let isTracked = false
                      let sStatus = ''
                      let sColor = ''
                      
                      if (tData.override === 'P' || tData.override === 'present') {
                        presentCount++
                        isTracked = true
                        sStatus = 'Present (Override)'
                        sColor = 'text-emerald-700 bg-emerald-50 border-emerald-200'
                      } else if (tData.override === 'F' || tData.override === 'absent') {
                        absentCount++
                        isTracked = true
                        sStatus = 'Absent (Override)'
                        sColor = 'text-rose-700 bg-rose-50 border-rose-200'
                      } else if (tData.override === 'late') {
                        partialCount++
                        isTracked = true
                        sStatus = 'Partial (Override)'
                        sColor = 'text-amber-700 bg-amber-50 border-amber-200'
                      } else if (tData.generated > 0) {
                        isTracked = true
                        if (tData.entered >= tData.generated * 0.5) {
                          presentCount++
                          sStatus = 'Present'
                          sColor = 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        } else if (tData.entered > 0) {
                          partialCount++
                          sStatus = 'Partial'
                          sColor = 'text-amber-700 bg-amber-50 border-amber-200'
                        } else {
                          absentCount++
                          sStatus = 'Absent'
                          sColor = 'text-rose-700 bg-rose-50 border-rose-200'
                        }
                      }
                      
                      if (isTracked) {
                        totalTracked++
                        trackedSessions.push({
                          session,
                          status: sStatus,
                          color: sColor,
                          score: tData.override ? null : `${tData.entered}/${tData.generated}`
                        })
                      }
                    })

                    return (
                      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
                        <h2 className="text-sm font-bold text-slate-900 flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-cyan-600" /> Overall Attendance
                          </div>
                          <button
                            onClick={() => setShowAttendanceDetails(!showAttendanceDetails)}
                            className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                          >
                            {showAttendanceDetails ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                          </button>
                        </h2>
                        
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500">Live Sessions Tracked</span>
                            <span className="text-sm font-black text-slate-900">{totalTracked}</span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
                              <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Present</p>
                              <p className="text-base font-black text-emerald-600">{presentCount}</p>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center">
                              <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Partial</p>
                              <p className="text-base font-black text-amber-600">{partialCount}</p>
                            </div>
                            <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-center">
                              <p className="text-[10px] font-bold text-rose-700 uppercase mb-1">Absent</p>
                              <p className="text-base font-black text-rose-600">{absentCount}</p>
                            </div>
                          </div>
                          
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 flex overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{ width: `${(presentCount / totalTracked) * 100}%` }} />
                            <div className="bg-amber-500 h-full" style={{ width: `${(partialCount / totalTracked) * 100}%` }} />
                            <div className="bg-rose-500 h-full" style={{ width: `${(absentCount / totalTracked) * 100}%` }} />
                          </div>

                          <AnimatePresence>
                            {showAttendanceDetails && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                                  {trackedSessions.map((ts, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-800 truncate">{ts.session.title}</p>
                                        {ts.score && (
                                          <p className="text-[10px] font-medium text-slate-500 mt-0.5">Score: {ts.score}</p>
                                        )}
                                      </div>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ts.color} whitespace-nowrap ml-2`}>
                                        {ts.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    )
                  })()}

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
                    Instructor: {course?.trainer?.full_name || 'Assigned Instructor'} &bull; {course?.duration_minutes ? `${Math.floor(course.duration_minutes / 60)}h` : 'Self-Paced'} &bull; Pass Gate: {course?.passing_score || 80}%
                  </p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 pt-4">
                <button
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
                    {course?.description || 'Comprehensive competency-based training designed for operational excellence across MoES divisions.'}
                  </p>
                </div>

                {/* Objectives */}
                {(objectives.length > 0 || course?.learning_objectives) && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-cyan-600" /> Key Learning Objectives
                    </h4>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                      {objectives.length > 0 ? (
                        <ul className="space-y-2">
                          {objectives.map((obj, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                              <CheckCircle2 className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                              <span>{obj}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line">
                          {typeof course?.learning_objectives === 'string'
                            ? course.learning_objectives
                            : JSON.stringify(course?.learning_objectives)}
                        </p>
                      )}
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
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Curriculum Gate</span>
                    <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">≥80% Module Quiz</span>
                  </div>
                </div>

                {/* Instructor Information */}
                {course?.trainer && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white font-extrabold text-base flex items-center justify-center shrink-0 shadow-xs">
                      {course.trainer.full_name?.charAt(0) || 'T'}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider block">Assigned Instructor</span>
                      <h5 className="text-sm font-bold text-slate-900 truncate">{course.trainer.full_name}</h5>
                      <p className="text-xs text-slate-500 truncate">{course.trainer.email || 'MoES Certified Trainer'}</p>
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
                              {quizCount > 0 && <span className="text-purple-600 font-semibold">{quizCount} Quiz Qs (≥80% gate)</span>}
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

        <Dialog open={otpDialogType !== null} onOpenChange={(open) => !open && handleCloseOtpDialog()}>
          <DialogContent className="max-w-sm rounded-3xl p-6 bg-white border border-slate-200 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-900 text-center mb-1">
                {otpDialogType === 'enroll' ? 'Confirm Enrollment' : 'Confirm Drop Course'}
              </DialogTitle>
              <DialogDescription className="text-center text-slate-600 text-sm">
                {otpSent 
                  ? <>We've sent a verification code to <strong>{profile?.email}</strong>. Enter it below to confirm.</>
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
                      placeholder="Enter verification OTP"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                      className="text-center text-lg tracking-[0.25em] font-bold h-12 rounded-xl border-slate-200 focus-visible:ring-cyan-500 bg-slate-50 text-slate-900"
                      maxLength={8}
                    />
                  </div>
                </div>

                <DialogFooter className="flex-col sm:flex-col gap-2">
                  <Button
                    onClick={handleVerifyOtp}
                    disabled={isVerifyingOtp || otpInput.trim().length < 6 || otpInput.trim().length > 8}
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
