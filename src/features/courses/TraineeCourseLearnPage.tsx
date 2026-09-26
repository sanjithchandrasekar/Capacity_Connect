import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  ChevronRight, ChevronLeft, CheckCircle2, Lock, Sparkles,
  HelpCircle, Video, Image as ImageIcon, ExternalLink,
  Award, ArrowLeft, RotateCcw, CheckSquare, AlertCircle, Check,
  X, Layers, Eye, AlignLeft, Loader2, Sun, Moon, Maximize2,
  Clock, Play, Pause
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { MaterialPreviewDialog } from '@/components/ui/MaterialPreviewDialog'
import { generateTraineeCertificate, triggerFileDownload } from '@/lib/certificateGenerator'
import { calculateCourseGradeBreakdown } from '@/lib/courseGrading'

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null
}

function parseQuizData(raw: any): any {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }
  return null
}

interface ResolvedQuizQuestion {
  id: string
  question: string
  options: string[]
  correct_option: number
  explanation: string
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = arr[i]
    arr[i] = arr[j]
    arr[j] = temp
  }
  return arr
}

function resolveQuizQuestion(
  item: any,
  itemIdx: number,
  moduleQuizQuestions: any[],
  moduleTitle: string,
  shuffleOptions: boolean = true
): ResolvedQuizQuestion {
  let qData = parseQuizData(item?.quiz_data)

  // 1. Try match by ID from module quiz_questions
  if (!qData || !Array.isArray(qData.options) || qData.options.length === 0) {
    const matchById = moduleQuizQuestions.find(
      q => (q.id && item.id && q.id === item.id) || (qData?.id && q.id === qData.id)
    )
    if (matchById) {
      qData = { ...(qData || {}), ...matchById }
    }
  }

  // 2. Try match by question text similarity
  if (!qData || !Array.isArray(qData.options) || qData.options.length === 0) {
    const rawPrompt = (item?.title || item?.question || '')
      .replace(/^Quiz:\s*/i, '')
      .replace(/\.\.\.$/, '')
      .trim()
      .toLowerCase()

    if (rawPrompt.length >= 5) {
      const matchByText = moduleQuizQuestions.find(q => {
        const targetQ = (q.question || '').toLowerCase()
        return targetQ.startsWith(rawPrompt.slice(0, 20)) || rawPrompt.startsWith(targetQ.slice(0, 20))
      })
      if (matchByText) {
        qData = { ...(qData || {}), ...matchByText }
      }
    }
  }

  // 3. Try match by sequential index in moduleQuizQuestions
  if (!qData || !Array.isArray(qData.options) || qData.options.length === 0) {
    if (moduleQuizQuestions[itemIdx]) {
      qData = { ...(qData || {}), ...moduleQuizQuestions[itemIdx] }
    }
  }

  // 4. Resolve question string
  let fullQuestion = qData?.question || item?.question
  if (!fullQuestion || fullQuestion.endsWith('...')) {
    if (qData?.question && !qData.question.endsWith('...')) {
      fullQuestion = qData.question
    } else {
      const rawPrompt = (item?.title || item?.question || '').replace(/^Quiz:\s*/i, '').trim()
      const topic = moduleTitle.replace(/^Module \d+:\s*/i, '') || 'this module'
      if (rawPrompt.toLowerCase().includes('prerequisite') || rawPrompt.toLowerCase().includes('protocol')) {
        fullQuestion = `What is the core prerequisite protocol for ${topic}?`
      } else if (rawPrompt.toLowerCase().includes('passing score') || rawPrompt.toLowerCase().includes('benchmark')) {
        fullQuestion = `What minimum passing score is required to unlock subsequent modules in Capacity Connect?`
      } else if (rawPrompt.toLowerCase().includes('abnormal') || rawPrompt.toLowerCase().includes('telemetry') || rawPrompt.toLowerCase().includes('discrepanc')) {
        fullQuestion = `How should abnormal telemetry flags or critical discrepancies in ${topic} be handled?`
      } else {
        fullQuestion = rawPrompt.replace(/\.\.\.$/, '') || `Key concept evaluation for ${topic}`
      }
    }
  }

  // 5. Resolve options array
  let options: string[] = []
  if (Array.isArray(qData?.options) && qData.options.length > 0) {
    options = qData.options.map((o: any) => (typeof o === 'string' ? o : String(o?.text || o?.title || o)))
  } else if (Array.isArray(item?.options) && item.options.length > 0) {
    options = item.options.map((o: any) => (typeof o === 'string' ? o : String(o?.text || o?.title || o)))
  } else if (typeof item?.options === 'string') {
    try {
      const parsed = JSON.parse(item.options)
      if (Array.isArray(parsed)) options = parsed
    } catch {}
  }

  // 6. If options are still empty, supply meaningful topic-aligned options
  if (!options || options.length === 0) {
    const qLower = fullQuestion.toLowerCase()
    const topic = moduleTitle.replace(/^Module \d+:\s*/i, '') || 'the subject'

    if (qLower.includes('prerequisite') || qLower.includes('protocol')) {
      options = [
        'Adhere to verified operational checklists and standard ministry guidelines',
        'Bypass preliminary verification to speed up execution',
        'Conduct unrecorded subjective assessments',
        'Defer telemetry log synchronization until post-incident review'
      ]
    } else if (qLower.includes('passing score') || qLower.includes('benchmark') || qLower.includes('threshold')) {
      options = [
        '80% passing threshold in module checkpoint verification',
        '50% general participation threshold',
        '60% optional assessment threshold',
        'No benchmark requirement'
      ]
    } else if (qLower.includes('abnormal') || qLower.includes('telemetry') || qLower.includes('discrepanc') || qLower.includes('critical')) {
      options = [
        'Log anomaly immediately and escalate to emergency response command',
        'Suppress the alert to prevent alarm fatigue',
        'Recalibrate sensor data without logging',
        'Wait for end-of-day reconciliation before taking action'
      ]
    } else {
      options = [
        `Apply standard ${topic} verification procedures and validate schema integrity`,
        `Skip baseline relational constraint validation`,
        `Perform unindexed queries without foreign key constraints`,
        `Disable transaction safety logging`
      ]
    }
  }

  const correctOpt =
    typeof qData?.correct_option === 'number'
      ? qData.correct_option
      : typeof item?.correct_option === 'number'
      ? item.correct_option
      : 0

  const explanation =
    qData?.explanation ||
    item?.explanation ||
    item?.content ||
    'Standard operational protocols ensure consistent execution, safety, and data integrity.'

  // Shuffle options for the trainee side and map correct_option accordingly
  let finalOptions = options
  let finalCorrectOpt = correctOpt

  if (shuffleOptions && Array.isArray(options) && options.length > 1) {
    const correctOptionText = options[correctOpt] ?? options[0]
    finalOptions = shuffleArray(options)
    const newIdx = finalOptions.findIndex(o => o === correctOptionText)
    finalCorrectOpt = newIdx !== -1 ? newIdx : 0
  }

  return {
    id: item?.id || qData?.id || `quiz-q-${itemIdx}`,
    question: fullQuestion,
    options: finalOptions,
    correct_option: finalCorrectOpt,
    explanation
  }
}

export function TraineeCourseLearnPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Balanced Light/Dark Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('cc_learn_theme')
    if (saved === 'dark') return true
    if (saved === 'light') return false
    return false // default to clean balanced light mode
  })

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev
      localStorage.setItem('cc_learn_theme', next ? 'dark' : 'light')
      return next
    })
  }

  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0)
  const [completedModules, setCompletedModules] = useState<string[]>([])
  const [moduleQuizAnswers, setModuleQuizAnswers] = useState<Record<string, Record<number, number>>>({})
  const [moduleQuizScores, setModuleQuizScores] = useState<Record<string, { score: number; passed: boolean; submitted: boolean }>>({})
  const [videoWatchProgress, setVideoWatchProgress] = useState<Record<string, number>>({})
  const [activePlayingVideoId, setActivePlayingVideoId] = useState<string | null>(null)
  const [retakeKey, setRetakeKey] = useState<number>(0)
  const [previewMaterial, setPreviewMaterial] = useState<any | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [downloadingCert, setDownloadingCert] = useState(false)
  const contentTopRef = useRef<HTMLDivElement>(null)

  // Fetch Course details
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course-learn', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          trainer:trainers!courses_trainer_id_fkey(full_name, bio, years_of_experience, qualifications, email, study_details)
        `)
        .eq('id', courseId!)
        .single() as any

      if (error) throw error
      return data
    },
    enabled: !!courseId,
  })

  // Fetch Enrollment details to verify approval
  const { data: enrollment, isLoading: enrollmentLoading } = useQuery({
    queryKey: ['enrollment-learn', courseId, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', courseId!)
        .eq('user_id', profile!.id)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!courseId && !!profile?.id,
  })

  // Fetch course assessments to know if a Final Assessment exists
  const { data: courseAssessments = [] } = useQuery({
    queryKey: ['learn-course-assessments', courseId],
    queryFn: async () => {
      if (!courseId) return []
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('course_id', courseId)
        .eq('status', 'published')
      if (error) return []
      return data || []
    },
    enabled: !!courseId,
  })

  // Fetch Trainee assessment attempts for grade breakdown
  const { data: traineeAttempts = [] } = useQuery({
    queryKey: ['trainee-attempts-learn', courseId, profile?.id],
    queryFn: async () => {
      if (!profile?.id || !courseId) return []
      const { data, error } = await supabase
        .from('assessment_attempts')
        .select('*, assessment:assessments!inner(course_id, assessment_type, title, passing_score)')
        .eq('user_id', profile.id)
        .eq('assessment.course_id', courseId)
      if (error) return []
      return data || []
    },
    enabled: !!courseId && !!profile?.id,
  })

  const finalAssessment = courseAssessments?.find((a: any) => a.assessment_type === 'final')

  const gradeBreakdown = calculateCourseGradeBreakdown({
    moduleProgressPercent: enrollment?.progress_percent ?? (course?.modules?.length && completedModules.length >= course.modules.length ? 100 : 0),
    courseAssessments: (courseAssessments || []) as any,
    traineeAttempts: traineeAttempts as any,
    passingScore: course?.passing_score ?? 50,
  })

  const isApproved = Boolean(enrollment && (['enrolled', 'in_progress', 'completed'] as string[]).includes((enrollment as any).status))

  const hasInitializedActiveModule = useRef(false)

  // Load and reconcile completed modules from localStorage and enrollment
  useEffect(() => {
    if (!courseId || !profile?.id) return
    let localCompleted: string[] = []
    let localScores: Record<string, any> = {}

    const stored = localStorage.getItem(`cc_mod_progress_${courseId}_${profile.id}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed.completed)) {
          localCompleted = parsed.completed
        }
        if (parsed.scores) {
          localScores = parsed.scores
        }
      } catch (e) {
        console.error('Error loading module progress:', e)
      }
    }

    // Load video watch progress from local storage
    const storedWatch = localStorage.getItem(`cc_video_watch_${courseId}_${profile.id}`)
    if (storedWatch) {
      try {
        setVideoWatchProgress(JSON.parse(storedWatch))
      } catch (e) {
        console.error('Error loading video watch progress:', e)
      }
    }

    // Reconcile from enrollment progress_percent if local storage was empty
    if (localCompleted.length === 0 && enrollment?.progress_percent && course?.modules?.length) {
      const count = Math.min(
        course.modules.length,
        Math.round((enrollment.progress_percent / 100) * course.modules.length)
      )
      localCompleted = course.modules.slice(0, count).map((m: any) => m.id)
    }

    setCompletedModules(localCompleted)
    setModuleQuizScores(localScores)
  }, [courseId, profile?.id, enrollment?.progress_percent, course?.modules])

  // Set initial active module ONLY ONCE on initial load
  useEffect(() => {
    if (hasInitializedActiveModule.current) return
    if (!course?.modules || !Array.isArray(course.modules) || course.modules.length === 0) return

    const firstIncompleteIdx = course.modules.findIndex((m: any) => !completedModules.includes(m.id))
    if (firstIncompleteIdx !== -1) {
      setActiveModuleIndex(firstIncompleteIdx)
    } else if (completedModules.length >= course.modules.length) {
      setActiveModuleIndex(course.modules.length - 1)
    }
    hasInitializedActiveModule.current = true
  }, [course?.modules, completedModules])

  // Scroll to top when active module changes
  useEffect(() => {
    contentTopRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeModuleIndex])

  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = Math.floor(totalSeconds % 60)
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`
  }

  const updateVideoWatchProgress = React.useCallback(
    (itemId: string, secondsWatched: number, totalSeconds: number) => {
      setVideoWatchProgress(prev => {
        const current = prev[itemId] || 0
        const updated = Math.min(totalSeconds, Math.max(current, Math.floor(secondsWatched)))
        if (updated === current) return prev
        const next = { ...prev, [itemId]: updated }
        if (profile?.id && courseId) {
          localStorage.setItem(`cc_video_watch_${courseId}_${profile.id}`, JSON.stringify(next))
        }
        return next
      })
    },
    [courseId, profile?.id]
  )

  const modules = Array.isArray(course?.modules) ? course.modules : []
  const currentModule = modules[activeModuleIndex] || null

  const checkModuleVideoRequirement = React.useCallback(
    (mod: any) => {
      if (!mod) return { passed: true, unmetList: [] }
      const rawItems = mod.items || mod.content_items || []
      const videoItems = rawItems.filter((i: any) => i.type === 'video')

      const unmetList: Array<{
        id: string
        title: string
        watched: number
        required: number
        total: number
        percent: number
      }> = []

      for (const v of videoItems) {
        const totalSec =
          v.duration_seconds || (v.duration_minutes ? v.duration_minutes * 60 : 300)
        const requiredSec = Math.ceil(totalSec * 0.9)
        const watchedSec = videoWatchProgress[v.id] || 0
        if (watchedSec < requiredSec) {
          unmetList.push({
            id: v.id,
            title: v.title || 'Video Lesson',
            watched: watchedSec,
            required: requiredSec,
            total: totalSec,
            percent: Math.min(100, Math.round((watchedSec / totalSec) * 100)),
          })
        }
      }

      return {
        passed: unmetList.length === 0,
        unmetList,
      }
    },
    [videoWatchProgress]
  )

  const currentVideoCheck = checkModuleVideoRequirement(currentModule)

  // Process and resolve all sequential items and quizzes for the current module (with shuffled options for trainees)
  const { sequentialItems, allQuizQuestions } = React.useMemo(() => {
    if (!currentModule) return { sequentialItems: [], allQuizQuestions: [] }
    const rawItems = currentModule.items || currentModule.content_items || []
    const legacyQuizQuestions: any[] = Array.isArray(currentModule.quiz_questions) ? currentModule.quiz_questions : []

    const seqItems: any[] = []
    const allQuiz: ResolvedQuizQuestion[] = []

    let quizCounter = 0
    rawItems.forEach((item: any) => {
      if (item.type === 'quiz') {
        const resolved = resolveQuizQuestion(item, quizCounter, legacyQuizQuestions, currentModule.title || '', true)
        allQuiz.push(resolved)
        seqItems.push({
          ...item,
          title: resolved.question,
          quiz_data: resolved,
        })
        quizCounter++
      } else {
        seqItems.push(item)
      }
    })

    legacyQuizQuestions.forEach((lq: any) => {
      const isAlreadyIncluded = allQuiz.some(
        q => q.id === lq.id || q.question.toLowerCase() === (lq.question || '').toLowerCase()
      )
      if (!isAlreadyIncluded) {
        const resolved = resolveQuizQuestion(
          { id: lq.id, type: 'quiz', quiz_data: lq },
          allQuiz.length,
          legacyQuizQuestions,
          currentModule.title || '',
          true
        )
        allQuiz.push(resolved)
        seqItems.push({
          id: resolved.id,
          type: 'quiz',
          title: resolved.question,
          quiz_data: resolved,
        })
      }
    })

    return { sequentialItems: seqItems, allQuizQuestions: allQuiz }
  }, [currentModule, retakeKey])

  // Active video watch interval ticker
  useEffect(() => {
    if (!activePlayingVideoId) return
    const currentItem = sequentialItems.find((i: any) => i.id === activePlayingVideoId)
    const totalSec =
      currentItem?.duration_seconds ||
      (currentItem?.duration_minutes ? currentItem.duration_minutes * 60 : 300)

    const interval = setInterval(() => {
      setVideoWatchProgress(prev => {
        const current = prev[activePlayingVideoId] || 0
        if (current >= totalSec) {
          setActivePlayingVideoId(null)
          return prev
        }
        const nextSec = current + 1
        const updated = { ...prev, [activePlayingVideoId]: nextSec }
        if (profile?.id && courseId) {
          localStorage.setItem(`cc_video_watch_${courseId}_${profile.id}`, JSON.stringify(updated))
        }
        return updated
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [activePlayingVideoId, sequentialItems, courseId, profile?.id])

  const handleSelectQuizAnswer = (moduleId: string, questionIdx: number, optionIdx: number) => {
    setModuleQuizAnswers(prev => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || {}),
        [questionIdx]: optionIdx,
      },
    }))
  }

  const handleSubmitModuleQuiz = async (mod: any) => {
    // 90% Video playback requirement check
    const videoCheck = checkModuleVideoRequirement(mod)
    if (!videoCheck.passed) {
      const firstUnmet = videoCheck.unmetList[0]
      toast.error(
        `⚠️ Video Requirement: Please watch at least 90% of "${firstUnmet.title}" before submitting the quiz. (Watched: ${formatDuration(firstUnmet.watched)} / Required: ${formatDuration(firstUnmet.required)})`,
        { duration: 6000 }
      )
      return
    }

    const questions = allQuizQuestions
    if (questions.length === 0) return

    const userAnswers = moduleQuizAnswers[mod.id] || {}
    const answeredCount = Object.keys(userAnswers).length
    if (answeredCount < questions.length) {
      toast.error(
        `Please answer all ${questions.length} questions before submitting. (${answeredCount}/${questions.length} answered)`
      )
      return
    }

    let correctCount = 0
    questions.forEach((q: any, idx: number) => {
      const correctOptionIndex = q.correct_option ?? 0
      if (userAnswers[idx] === correctOptionIndex) {
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
        submitted: true,
      },
    }
    setModuleQuizScores(updatedScores)

    if (passed) {
      const newCompleted = Array.from(new Set([...completedModules, mod.id]))
      setCompletedModules(newCompleted)

      if (profile?.id && courseId) {
        localStorage.setItem(
          `cc_mod_progress_${courseId}_${profile.id}`,
          JSON.stringify({
            completed: newCompleted,
            scores: updatedScores,
          })
        )
      }

      // Update enrollment progress in Supabase
      if (enrollment?.id && modules.length > 0) {
        const progress = Math.min(100, Math.round((newCompleted.length / modules.length) * 100))
        await supabase
          .from('enrollments')
          .update({
            progress_percent: progress,
            status: progress === 100 ? 'completed' : 'in_progress',
          })
          .eq('id', enrollment.id)
        queryClient.invalidateQueries({ queryKey: ['enrollment-learn'] })
        queryClient.invalidateQueries({ queryKey: ['trainee-enrollment'] })
      }

      toast.success(`🎉 Excellent! You scored ${scorePercent}% (${correctCount}/${questions.length} correct). Next module unlocked!`, {
        duration: 4500,
      })
    } else {
      toast.error(`Score: ${scorePercent}% (${correctCount}/${questions.length} correct). Please review the questions and try again.`, {
        duration: 4500,
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
    setRetakeKey(prev => prev + 1)
    toast.info('Quiz reset with refreshed options. Review the lesson and select your answers.')
  }

  const handleCompleteContentModule = async (mod: any) => {
    // 90% Video playback requirement check
    const videoCheck = checkModuleVideoRequirement(mod)
    if (!videoCheck.passed) {
      const firstUnmet = videoCheck.unmetList[0]
      toast.error(
        `⚠️ Video Requirement: Please watch at least 90% of "${firstUnmet.title}" before completing this module. (Watched: ${formatDuration(firstUnmet.watched)} / Required: ${formatDuration(firstUnmet.required)})`,
        { duration: 6000 }
      )
      return
    }

    const newCompleted = Array.from(new Set([...completedModules, mod.id]))
    setCompletedModules(newCompleted)

    if (profile?.id && courseId) {
      localStorage.setItem(
        `cc_mod_progress_${courseId}_${profile.id}`,
        JSON.stringify({
          completed: newCompleted,
          scores: moduleQuizScores,
        })
      )
    }

    if (enrollment?.id && modules.length > 0) {
      const progress = Math.min(100, Math.round((newCompleted.length / modules.length) * 100))
      await supabase
        .from('enrollments')
        .update({
          progress_percent: progress,
          status: progress === 100 ? 'completed' : 'in_progress',
        })
        .eq('id', enrollment.id)
      queryClient.invalidateQueries({ queryKey: ['enrollment-learn'] })
      queryClient.invalidateQueries({ queryKey: ['trainee-enrollment'] })
    }

    toast.success('Module completed!')
    if (activeModuleIndex < modules.length - 1) {
      setActiveModuleIndex(prev => prev + 1)
    }
  }

  const handleNextModule = () => {
    if (activeModuleIndex < modules.length - 1) {
      setActiveModuleIndex(prev => prev + 1)
    }
  }

  const handlePrevModule = () => {
    if (activeModuleIndex > 0) {
      setActiveModuleIndex(prev => prev - 1)
    }
  }

  const handleDownloadCertificate = async () => {
    if (!course || !profile) return
    if (!gradeBreakdown.isCompleted) {
      if (gradeBreakdown.hasFinalAssessment && !gradeBreakdown.finalAssessmentCompleted) {
        toast.error('You must take and pass the Final Assessment before downloading the certificate.')
      } else if (!gradeBreakdown.isPassed) {
        toast.error(`Your overall grade (${gradeBreakdown.totalScore}%) is below the passing requirement (${gradeBreakdown.passingScore}%).`)
      } else {
        toast.error('Please complete all course requirements before downloading the certificate.')
      }
      return
    }
    setDownloadingCert(true)
    try {
      const result = await generateTraineeCertificate((course as any).certificate_template_url || null, {
        traineeName: profile.full_name || 'Trainee',
        traineeEmail: profile.email || undefined,
        traineeId: profile.id,
        courseId: course.id,
        courseTitle: course.title,
        trainerName: (course as any).trainer?.full_name || 'Assigned Instructor',
        percentage: `${gradeBreakdown.totalScore}%`,
        completedAt: new Date().toISOString(),
        certificateId: 'CC-' + course.id.slice(0, 6).toUpperCase() + '-' + profile.id.slice(0, 4).toUpperCase(),
      })
      triggerFileDownload(result.blob, result.fileName)
      toast.success('Certificate downloaded successfully!')
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate certificate.')
    } finally {
      setDownloadingCert(false)
    }
  }

  if (courseLoading || enrollmentLoading) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center gap-4 ${isDarkMode ? 'bg-[#040814] text-white' : 'bg-[#FAF9F6] text-slate-800'}`}>
        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
        <p className="text-sm font-medium tracking-wide opacity-80">Loading learning experience...</p>
      </div>
    )
  }

  if (!course) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center ${isDarkMode ? 'bg-[#040814] text-white' : 'bg-[#FAF9F6] text-slate-800'}`}>
        <h2 className="text-2xl font-bold mb-2">Course Not Found</h2>
        <p className="text-sm opacity-75 mb-6">This course is not available.</p>
        <Button onClick={() => navigate('/trainee/courses')} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-md">
          Back to Catalog
        </Button>
      </div>
    )
  }

  // Access Control Guard
  if (!isApproved) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDarkMode ? 'bg-[#040814] text-white' : 'bg-[#FAF9F6] text-slate-800'}`}>
        <div className={`max-w-md w-full rounded-3xl p-8 text-center shadow-2xl space-y-5 border ${isDarkMode ? 'bg-[#0b1329] border-amber-500/30' : 'bg-white border-amber-200'}`}>
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black">Enrollment Approval Required</h2>
          <p className="text-sm opacity-80 leading-relaxed">
            {enrollment?.status === 'pending_approval'
              ? 'Your enrollment request is pending approval from the trainer. You will gain full access once your request is approved.'
              : enrollment?.status === 'rejected'
              ? 'Your enrollment request was not approved. Please contact your instructor.'
              : 'You have not enrolled in this course yet. Please enroll and wait for trainer approval to access the learning modules.'}
          </p>
          <div className="flex flex-col gap-2.5 pt-2">
            <Button
              onClick={() => navigate(`/trainee/courses/${courseId}`)}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold rounded-xl py-2.5 shadow-lg shadow-cyan-500/20"
            >
              View Course Details & Enroll
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/trainee/courses')}
              className={`w-full rounded-xl ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
            >
              Back to Catalog
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const isCurrentCompleted = currentModule
    ? completedModules.includes(currentModule.id) || activeModuleIndex < completedModules.length
    : false
  const quizResult = currentModule ? moduleQuizScores[currentModule.id] : null
  const userAnswers = currentModule ? moduleQuizAnswers[currentModule.id] || {} : {}
  const totalCompleted = completedModules.length
  const progressPercent = modules.length > 0 ? Math.round((totalCompleted / modules.length) * 100) : 0

  // The trainee can advance forward if current module is completed, passed, or next module is already unlocked
  const isNextUnlocked =
    activeModuleIndex < modules.length - 1 &&
    (isCurrentCompleted ||
      (quizResult?.passed ?? false) ||
      activeModuleIndex < completedModules.length ||
      completedModules.includes(modules[activeModuleIndex]?.id))

  const canGoNext = isNextUnlocked
  const isLastModule = activeModuleIndex === modules.length - 1

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 selection:bg-cyan-500 selection:text-white ${isDarkMode ? 'bg-[#040814] text-slate-100' : 'bg-[#FAF9F6] text-slate-800'}`}>
      {/* ── TOP NAV BAR (Capacity Connect Header) ──────────────── */}
      <header className={`sticky top-0 z-40 backdrop-blur-md px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4 border-b transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-[#071124]/90 border-cyan-500/20 shadow-lg' 
          : 'bg-white/95 border-slate-200/90 shadow-xs'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/trainee/courses/${courseId}`}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shrink-0 border ${
              isDarkMode 
                ? 'bg-slate-800/80 border-slate-700 hover:border-cyan-400 hover:bg-slate-700 text-slate-200' 
                : 'bg-slate-100/90 border-slate-200 hover:border-cyan-400 hover:bg-cyan-50 text-slate-700 hover:text-cyan-700'
            }`}
            title="Back to Course Overview"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge className={`text-[10px] font-bold uppercase tracking-wider ${
                isDarkMode 
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' 
                  : 'bg-cyan-50 text-cyan-700 border-cyan-200'
              }`}>
                Module {activeModuleIndex + 1} of {modules.length}
              </Badge>
              <h1 className={`text-xs sm:text-sm font-bold truncate max-w-xs sm:max-w-md md:max-w-lg ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                {course.title}
              </h1>
            </div>
            <p className={`text-xs font-medium truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {currentModule?.title || 'Learning Module'}
            </p>
          </div>
        </div>

        {/* Center/Right: Theme Toggle, Progress & Module Drawer Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Theme Switcher Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border flex items-center gap-1.5 transition-all text-xs font-semibold ${
              isDarkMode
                ? 'bg-slate-800/90 border-slate-700 text-amber-300 hover:bg-slate-700 hover:border-amber-400/50'
                : 'bg-slate-100/90 border-slate-200 text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-300'
            }`}
            title={isDarkMode ? 'Switch to Radiant Light Theme' : 'Switch to Midnight Dark Theme'}
          >
            {isDarkMode ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline text-[11px]">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-cyan-700" />
                <span className="hidden md:inline text-[11px]">Dark Mode</span>
              </>
            )}
          </button>

          {/* Progress Indicator */}
          <div className={`hidden sm:flex items-center gap-3 rounded-xl px-3 py-1.5 border transition-all ${
            isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="text-right">
              <p className={`text-[11px] font-bold ${isDarkMode ? 'text-cyan-300' : 'text-cyan-700'}`}>{progressPercent}% Completed</p>
              <p className={`text-[10px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {totalCompleted} / {modules.length} Modules
              </p>
            </div>
            <div className={`w-20 sm:w-24 h-2 rounded-full overflow-hidden border ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-200 border-slate-200'}`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6 }}
                className="h-full bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 rounded-full"
              />
            </div>
          </div>

          {/* Syllabus Drawer Trigger */}
          <Button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`text-xs font-bold rounded-xl px-3.5 py-2 flex items-center gap-2 shadow-xs border transition-all ${
              isDarkMode
                ? 'bg-cyan-950/60 hover:bg-cyan-900/80 border-cyan-500/40 text-cyan-300'
                : 'bg-cyan-50 hover:bg-cyan-100/80 border-cyan-200 text-cyan-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Syllabus</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${
              isDarkMode ? 'bg-cyan-500/30 text-cyan-200' : 'bg-cyan-200/80 text-cyan-900'
            }`}>
              {modules.length}
            </span>
          </Button>
        </div>
      </header>

      {/* ── MAIN LEARNING STAGE ─────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Module Content Area */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-12 py-8 max-w-4xl mx-auto w-full space-y-6">
          <div ref={contentTopRef} />

          {/* Interactive Module Step Tracker Bar */}
          {modules.length > 1 && (
            <div className={`p-2.5 sm:p-3 rounded-2xl border transition-all ${
              isDarkMode ? 'bg-[#071124]/90 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
            }`}>
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                {modules.map((m: any, mIdx: number) => {
                  const isModCompleted = completedModules.includes(m.id) || mIdx < completedModules.length
                  const isModUnlocked = mIdx === 0 || completedModules.includes(modules[mIdx - 1]?.id) || mIdx <= completedModules.length
                  const isModActive = mIdx === activeModuleIndex

                  return (
                    <button
                      key={m.id || mIdx}
                      disabled={!isModUnlocked}
                      onClick={() => setActiveModuleIndex(mIdx)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                        isModActive
                          ? isDarkMode
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/25 ring-2 ring-cyan-400/50'
                            : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/25 ring-2 ring-cyan-400/50'
                          : isModCompleted
                          ? isDarkMode
                            ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                            : 'bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                          : isModUnlocked
                          ? isDarkMode
                            ? 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700'
                            : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                          : isDarkMode
                          ? 'bg-slate-900/40 border border-slate-800/40 text-slate-600 cursor-not-allowed opacity-60'
                          : 'bg-slate-100/50 border border-slate-200/50 text-slate-400 cursor-not-allowed opacity-60'
                      }`}
                      title={m.title}
                    >
                      <span className={`w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                        isModActive
                          ? 'bg-white text-cyan-700'
                          : isModCompleted
                          ? isDarkMode ? 'bg-emerald-500 text-black' : 'bg-emerald-600 text-white'
                          : 'bg-slate-400/20 text-current'
                      }`}>
                        {isModCompleted ? '✓' : !isModUnlocked ? '🔒' : mIdx + 1}
                      </span>
                      <span className="truncate max-w-[120px] sm:max-w-[160px]">
                        Module {mIdx + 1}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Signature Capacity Connect Module Banner Card */}
          <div className="bg-gradient-to-r from-[#040814] via-[#07132a] to-[#0a1e3f] text-white p-6 sm:p-8 rounded-3xl border border-cyan-500/30 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-600/15 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-amber-300 uppercase tracking-wider border border-white/15">
                  Module {activeModuleIndex + 1}
                </span>
                {isCurrentCompleted ? (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-bold px-3 py-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Completed {quizResult?.score !== undefined ? `(${quizResult.score}%)` : ''}
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs font-bold px-3 py-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> In Progress
                  </Badge>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight tracking-tight">
                {currentModule?.title || 'Learning Module'}
              </h2>

              {currentModule?.description && (
                <p className="text-sm text-slate-300 leading-relaxed font-normal pt-1">
                  {currentModule.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  {sequentialItems.length} sequential learning step{sequentialItems.length !== 1 ? 's' : ''}
                </span>
                {allQuizQuestions.length > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    {allQuizQuestions.length} Quiz Checkpoint{allQuizQuestions.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sequential Step Items */}
          {sequentialItems.length > 0 ? (
            <div className="space-y-5">
              {sequentialItems.map((item: any, sIdx: number) => {
                const isQuiz = item.type === 'quiz'
                const quizData: ResolvedQuizQuestion | null = isQuiz ? (item.quiz_data || null) : null

                const qIdx = isQuiz
                  ? allQuizQuestions.findIndex(q => q.id === quizData?.id || q.question === quizData?.question)
                  : -1

                const quizQuestionIndex = qIdx !== -1 ? qIdx : 0

                return (
                  <motion.div
                    key={item.id || sIdx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: sIdx * 0.05 }}
                    className="space-y-3"
                  >
                    {/* TEXT CONTENT STEP */}
                    {item.type === 'text' && (
                      <div className={`rounded-2xl p-5 sm:p-6 space-y-3 border transition-all ${
                        isDarkMode
                          ? 'bg-[#0d1527] border-slate-800 text-slate-200 shadow-md'
                          : 'bg-white border-slate-200/90 text-slate-800 shadow-xs hover:border-cyan-300'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                            {sIdx + 1}
                          </span>
                          <Badge className={`text-xs font-bold flex items-center gap-1 ${
                            isDarkMode
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                              : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                          }`}>
                            <AlignLeft className="w-3.5 h-3.5" /> Lesson Notes
                          </Badge>
                          <h3 className={`text-sm sm:text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                            {item.title}
                          </h3>
                        </div>
                        <div className={`pl-8 text-sm leading-relaxed whitespace-pre-wrap font-normal ${
                          isDarkMode ? 'text-slate-300' : 'text-slate-600'
                        }`}>
                          {item.content || 'Read and study the material carefully.'}
                        </div>
                      </div>
                    )}

                    {/* VIDEO LESSON STEP */}
                    {item.type === 'video' && (() => {
                      const totalSec = item.duration_seconds || (item.duration_minutes ? item.duration_minutes * 60 : 300)
                      const requiredSec = Math.ceil(totalSec * 0.9)
                      const watchedSec = videoWatchProgress[item.id] || 0
                      const pctWatched = Math.min(100, Math.round((watchedSec / totalSec) * 100))
                      const isRequirementMet = watchedSec >= requiredSec
                      const isPlaying = activePlayingVideoId === item.id

                      return (
                        <div className={`rounded-2xl p-5 sm:p-6 space-y-4 border transition-all ${
                          isDarkMode
                            ? 'bg-[#0d1527] border-blue-500/30 shadow-md'
                            : 'bg-white border-slate-200/90 shadow-xs hover:border-blue-300'
                        }`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                                {sIdx + 1}
                              </span>
                              <Badge className={`text-xs font-bold flex items-center gap-1 ${
                                isDarkMode
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                <Video className="w-3.5 h-3.5" /> Video Lesson
                              </Badge>
                              <Badge className={`text-xs font-bold flex items-center gap-1 ${
                                isDarkMode
                                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                <Clock className="w-3 h-3 text-blue-500" /> {formatDuration(totalSec)}
                              </Badge>
                              <h3 className={`text-sm sm:text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {item.title}
                              </h3>
                            </div>

                            <div className="flex items-center gap-2">
                              {isRequirementMet ? (
                                <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 text-xs font-extrabold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 90% Watched (Complete)
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 text-xs font-extrabold flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-amber-500" /> {pctWatched}% / 90% Required
                                </Badge>
                              )}

                              {item.url && (
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`text-xs font-bold flex items-center gap-1 px-3 py-1 rounded-xl border transition-all ${
                                    isDarkMode
                                      ? 'text-blue-300 bg-blue-950/60 border-blue-500/40 hover:bg-blue-900'
                                      : 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100'
                                  }`}
                                >
                                  <ExternalLink className="w-3 h-3" /> Tab
                                </a>
                              )}
                            </div>
                          </div>

                          {/* 90% Watch Progress Bar */}
                          <div className={`p-3 rounded-xl border space-y-2 ${
                            isRequirementMet
                              ? isDarkMode ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50/70 border-emerald-200'
                              : isDarkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                              <span className={`font-semibold flex items-center gap-1.5 ${
                                isDarkMode ? 'text-slate-300' : 'text-slate-700'
                              }`}>
                                <Clock className="w-3.5 h-3.5 text-blue-500" />
                                Watch Progress: <strong className={isRequirementMet ? 'text-emerald-500' : 'text-blue-600'}>{formatDuration(watchedSec)}</strong> / {formatDuration(totalSec)}
                              </span>
                              <span className={`text-[11px] font-bold ${
                                isRequirementMet
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-slate-500'
                              }`}>
                                {isRequirementMet ? '✓ 90% Requirement Met' : `Need ${formatDuration(requiredSec)} (90%) to unlock completion`}
                              </span>
                            </div>

                            <div className="relative w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isRequirementMet
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                    : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                                }`}
                                style={{ width: `${pctWatched}%` }}
                              />
                              {/* 90% Marker */}
                              <div
                                className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10"
                                style={{ left: '90%' }}
                                title="90% Completion Threshold"
                              />
                            </div>

                            {/* External / YouTube Video Watch Session Toggle */}
                            <div className="flex items-center justify-between pt-1">
                              <p className="text-[11px] text-slate-500">
                                {isRequirementMet
                                  ? 'Module unlock requirement satisfied.'
                                  : 'Keep video playing or use the active watch tracker.'}
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                variant={isPlaying ? 'destructive' : 'outline'}
                                onClick={() => setActivePlayingVideoId(isPlaying ? null : item.id)}
                                className={`h-7 px-3 text-[11px] font-bold rounded-lg gap-1.5 transition-all ${
                                  !isPlaying
                                    ? isDarkMode
                                      ? 'border-blue-500/40 text-blue-300 hover:bg-blue-950/60'
                                      : 'border-blue-300 text-blue-700 hover:bg-blue-50'
                                    : ''
                                }`}
                              >
                                {isPlaying ? (
                                  <>
                                    <Pause className="w-3 h-3" /> Tracking Active... (Pause)
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-3 h-3" /> {watchedSec > 0 ? 'Resume Watch Tracker' : 'Start Watch Tracker'}
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Video Player */}
                          {item.url && getYouTubeEmbedUrl(item.url) ? (
                            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-black shadow-lg">
                              <iframe
                                src={getYouTubeEmbedUrl(item.url)!}
                                title={item.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="w-full h-full"
                              />
                            </div>
                          ) : item.url?.match(/\.(mp4|webm|mov)$/i) || item.previewUrl ? (
                            <video
                              controls
                              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-black shadow-lg"
                              onPlay={() => setActivePlayingVideoId(item.id)}
                              onPause={() => {
                                if (activePlayingVideoId === item.id) setActivePlayingVideoId(null)
                              }}
                              onTimeUpdate={e => {
                                updateVideoWatchProgress(item.id, e.currentTarget.currentTime, totalSec)
                              }}
                              onEnded={() => {
                                updateVideoWatchProgress(item.id, totalSec, totalSec)
                                if (activePlayingVideoId === item.id) setActivePlayingVideoId(null)
                              }}
                            >
                              <source src={item.url || item.previewUrl} />
                              Your browser does not support HTML5 video playback.
                            </video>
                          ) : null}

                          {item.content && (
                            <p className={`text-xs pl-8 leading-relaxed font-medium ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-600'
                            }`}>
                              {item.content}
                            </p>
                          )}
                        </div>
                      )
                    })()}

                    {/* PHOTO / DIAGRAM STEP */}
                    {item.type === 'photo' && (
                      <div className={`rounded-2xl p-5 sm:p-6 space-y-4 border transition-all ${
                        isDarkMode
                          ? 'bg-[#0d1527] border-slate-800 text-slate-200 shadow-md'
                          : 'bg-white border-slate-200/90 text-slate-800 shadow-xs hover:border-cyan-300'
                      }`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                              {sIdx + 1}
                            </span>
                            <Badge className={`text-xs font-bold flex items-center gap-1 ${
                              isDarkMode
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                            }`}>
                              <ImageIcon className="w-3.5 h-3.5" /> Diagram & Visual
                            </Badge>
                            <h3 className={`text-sm sm:text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              {item.title}
                            </h3>
                          </div>
                          {(item.previewUrl || item.url) && (
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewMaterial({ file_name: item.title, material_type: 'image' })
                                setPreviewUrl(item.previewUrl || item.url)
                              }}
                              className={`text-xs font-semibold px-3 py-1 rounded-xl border flex items-center gap-1.5 transition-all ${
                                isDarkMode
                                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
                                  : 'bg-slate-100 text-slate-700 hover:bg-cyan-50 hover:text-cyan-700 border-slate-200'
                              }`}
                            >
                              <Maximize2 className="w-3.5 h-3.5" /> Expand
                            </button>
                          )}
                        </div>

                        {(item.previewUrl || item.url) && (
                          <div
                            onClick={() => {
                              setPreviewMaterial({ file_name: item.title, material_type: 'image' })
                              setPreviewUrl(item.previewUrl || item.url)
                            }}
                            className={`relative rounded-2xl overflow-hidden border p-4 sm:p-6 flex flex-col items-center justify-center cursor-pointer group transition-all ${
                              isDarkMode
                                ? 'bg-[#070D1A] border-slate-800 hover:border-cyan-500/50'
                                : 'bg-gradient-to-b from-slate-50 to-slate-100/70 border-slate-200 hover:border-cyan-400'
                            }`}
                          >
                            {/* Inner white presentation matte for crisp diagram legibility */}
                            <div className="bg-white rounded-xl p-2.5 sm:p-3 shadow-md border border-slate-200/80 max-w-full flex items-center justify-center">
                              <img
                                src={item.previewUrl || item.url}
                                alt={item.title}
                                className="w-auto max-h-80 sm:max-h-96 object-contain rounded-lg group-hover:scale-[1.01] transition-transform duration-200"
                              />
                            </div>
                            
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5 backdrop-blur-xs rounded-2xl">
                              <Eye className="w-4 h-4 text-cyan-300" /> Click to Expand High-Res Image
                            </div>
                          </div>
                        )}

                        {item.content && (
                          <p className={`text-xs pl-8 leading-relaxed font-medium ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-600'
                          }`}>
                            {item.content}
                          </p>
                        )}
                      </div>
                    )}

                    {/* EXTERNAL LINK STEP */}
                    {item.type === 'link' && (
                      <div className={`rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 border transition-all ${
                        isDarkMode
                          ? 'bg-[#0d1527] border-emerald-500/30 shadow-md'
                          : 'bg-white border-slate-200/90 shadow-xs hover:border-emerald-300'
                      }`}>
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                            {sIdx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge className={`text-xs font-bold ${
                                isDarkMode
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                <ExternalLink className="w-3 h-3 mr-1" /> External Resource
                              </Badge>
                              <h4 className={`text-xs sm:text-sm font-bold truncate ${
                                isDarkMode ? 'text-white' : 'text-slate-900'
                              }`}>
                                {item.title}
                              </h4>
                            </div>
                            {item.content && (
                              <p className={`text-xs mt-1 truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{item.content}</p>
                            )}
                            {item.url && (
                              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 truncate font-medium mt-0.5">
                                {item.url}
                              </p>
                            )}
                          </div>
                        </div>
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`h-9 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all ${
                              isDarkMode
                                ? 'bg-emerald-950/80 border-emerald-500/40 hover:bg-emerald-900 text-emerald-300'
                                : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* QUIZ STEP */}
                    {isQuiz && quizData && (
                      <div className={`rounded-2xl p-5 sm:p-6 space-y-4 border-2 shadow-sm transition-all ${
                        isDarkMode
                          ? 'bg-gradient-to-br from-[#16182B] via-[#0d1527] to-[#040814] border-amber-500/40 shadow-lg'
                          : 'bg-white border-amber-300/80'
                      }`}>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-black flex items-center justify-center shrink-0">
                            {sIdx + 1}
                          </span>
                          <Badge className={`text-xs font-bold flex items-center gap-1 ${
                            isDarkMode
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            <HelpCircle className="w-3.5 h-3.5" /> Quiz Question {quizQuestionIndex + 1}
                          </Badge>
                        </div>

                        {/* Full Question Text */}
                        <p className={`text-sm sm:text-base font-bold pl-8 leading-snug ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {quizData.question}
                        </p>

                        {/* Options List (A, B, C, D) */}
                        <div className="space-y-2.5 pl-8 pt-1">
                          {quizData.options?.map((opt: string, optIdx: number) => {
                            const isSelected = userAnswers[quizQuestionIndex] === optIdx
                            const isGraded = quizResult?.submitted
                            const isOptionCorrect = optIdx === (quizData.correct_option ?? 0)
                            const isUserSelectionCorrect = isSelected && isOptionCorrect
                            const isUserSelectionWrong = isSelected && !isOptionCorrect

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={quizResult?.passed}
                                onClick={() =>
                                  handleSelectQuizAnswer(currentModule.id, quizQuestionIndex, optIdx)
                                }
                                className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl border text-xs sm:text-sm text-left transition-all ${
                                  isGraded
                                    ? isUserSelectionCorrect
                                      ? isDarkMode
                                        ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 font-bold shadow-sm'
                                        : 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold shadow-sm'
                                      : isUserSelectionWrong
                                      ? isDarkMode
                                        ? 'bg-rose-950/80 border-rose-400 text-rose-200 font-semibold shadow-sm'
                                        : 'bg-rose-50 border-rose-500 text-rose-900 font-semibold shadow-sm'
                                      : isDarkMode
                                      ? 'bg-[#080E1A]/60 border-slate-800 text-slate-500 opacity-60'
                                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                                    : isSelected
                                    ? isDarkMode
                                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold ring-2 ring-cyan-500/30'
                                      : 'bg-cyan-50/90 border-cyan-500 text-cyan-950 font-bold ring-2 ring-cyan-400/30'
                                    : isDarkMode
                                    ? 'bg-[#071124]/90 border-slate-700/80 text-slate-300 hover:border-cyan-400 hover:bg-[#0c1a36]'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-cyan-50/50 hover:border-cyan-300'
                                }`}
                              >
                                <span
                                  className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                                    isGraded && isUserSelectionCorrect
                                      ? 'bg-emerald-500 text-black'
                                      : isGraded && isUserSelectionWrong
                                      ? 'bg-rose-500 text-white'
                                      : isSelected
                                      ? isDarkMode ? 'bg-cyan-400 text-black' : 'bg-cyan-600 text-white'
                                      : isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="flex-1 font-medium">{opt}</span>
                                {isGraded && isUserSelectionCorrect && (
                                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                                    isDarkMode
                                      ? 'text-emerald-300 bg-emerald-900/60 border-emerald-500/40'
                                      : 'text-emerald-800 bg-emerald-100 border-emerald-300'
                                  }`}>
                                    ✓ Correct
                                  </span>
                                )}
                                {isGraded && isUserSelectionWrong && (
                                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                                    isDarkMode
                                      ? 'text-rose-300 bg-rose-900/60 border-rose-500/40'
                                      : 'text-rose-800 bg-rose-100 border-rose-300'
                                  }`}>
                                    ✗ Incorrect Selection
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>

                        {/* Explanation ONLY shown when answered correctly with clear visible contrast */}
                        {quizResult?.submitted &&
                          userAnswers[quizQuestionIndex] === (quizData.correct_option ?? 0) &&
                          quizData.explanation && (
                            <div className={`mt-3 ml-8 p-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed transition-all ${
                              isDarkMode
                                ? 'bg-emerald-950/40 border-emerald-500/40 text-slate-200'
                                : 'bg-emerald-50/90 border-emerald-200 text-slate-800 shadow-sm'
                            }`}>
                              <span className={`font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>
                                Explanation:{" "}
                              </span>
                              <span>{quizData.explanation}</span>
                            </div>
                          )}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className={`p-8 rounded-3xl text-center space-y-2 border ${
              isDarkMode ? 'bg-[#0d1527] border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <Layers className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>No content items in this module yet</h3>
              <p className="text-xs text-slate-500">The trainer has not added learning steps to this module yet.</p>
            </div>
          )}

          {/* ── MODULE COMPLETION & TRANSITION CONTROLS ──────── */}
          <div className={`pt-6 border-t space-y-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            {allQuizQuestions.length > 0 ? (
              <div className={`rounded-2xl p-5 sm:p-6 space-y-4 border ${
                isDarkMode ? 'bg-[#0d1527] border-cyan-500/30 shadow-lg' : 'bg-white border-slate-200/90 shadow-sm'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        Module Mastery Checkpoint ({allQuizQuestions.length} Question{allQuizQuestions.length !== 1 ? 's' : ''})
                      </h4>
                    </div>
                  </div>

                  {quizResult && (
                    <Badge
                      className={`text-xs font-extrabold px-3 py-1.5 ${
                        quizResult.passed
                          ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {quizResult.passed ? '✓ PASSED: ' : '✗ SCORE: '}
                      {quizResult.score}%
                    </Badge>
                  )}
                </div>

                {/* Failed Alert with Retake Button - Clean High Contrast in both Light & Dark modes */}
                {quizResult && !quizResult.passed && (
                  <div className={`p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border transition-all ${
                    isDarkMode
                      ? 'bg-rose-950/60 border-rose-500/50 text-rose-100 shadow-lg shadow-rose-950/40'
                      : 'bg-rose-50 border-rose-200 text-rose-950 shadow-sm'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isDarkMode ? 'bg-rose-900/70 text-rose-300' : 'bg-rose-100 text-rose-700'
                      }`}>
                        <AlertCircle className="w-5 h-5 shrink-0" />
                      </div>
                      <div>
                        <p className={`text-sm sm:text-base font-bold ${isDarkMode ? 'text-rose-100' : 'text-rose-950'}`}>
                          You scored {quizResult.score}%
                        </p>
                        <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-rose-200/90' : 'text-rose-700'}`}>
                          Review the lesson materials and retake the quiz to proceed.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleRetakeModuleQuiz(currentModule.id)}
                      className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl px-4 py-2.5 shrink-0 gap-2 shadow-md shadow-rose-600/30 transition-all"
                    >
                      <RotateCcw className="w-4 h-4" /> Retake Quiz
                    </Button>
                  </div>
                )}

                {/* Completed Module State vs In-Progress Submit Button */}
                {isCurrentCompleted || quizResult?.passed ? (
                  <div className={`p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border transition-all ${
                    isDarkMode
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100 shadow-md'
                      : 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-sm'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isDarkMode ? 'bg-emerald-900/60 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                      </div>
                      <div>
                        <p className={`text-sm sm:text-base font-bold ${isDarkMode ? 'text-emerald-200' : 'text-emerald-950'}`}>
                          Module Checkpoint Completed ✓
                        </p>
                        <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          You have verified your mastery of this module. You can review your answers or continue forward.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <Button
                        type="button"
                        onClick={() => handleRetakeModuleQuiz(currentModule.id)}
                        variant="outline"
                        className={`text-xs font-bold rounded-xl px-3.5 py-2 transition-all ${
                          isDarkMode
                            ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/60'
                            : 'border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Practice Again
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Submit Quiz Button */
                  <div className="space-y-2 pt-2">
                    {!currentVideoCheck.passed && (
                      <div className={`p-3 rounded-xl flex items-center gap-2 text-xs font-semibold ${
                        isDarkMode
                          ? 'bg-amber-950/60 text-amber-200 border border-amber-500/40'
                          : 'bg-amber-50 text-amber-900 border border-amber-200'
                      }`}>
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                        <span>
                          <strong>Video Requirement:</strong> Watch at least 90% of the video lesson before submitting this quiz.
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-end">
                      <Button
                        type="button"
                        onClick={() => handleSubmitModuleQuiz(currentModule)}
                        className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-extrabold text-sm rounded-xl px-6 py-3 shadow-lg shadow-cyan-500/25 gap-2"
                      >
                        <CheckSquare className="w-4 h-4" />
                        Submit Module Quiz
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Content-only module completion button */
              <div className={`rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
                isDarkMode ? 'bg-[#0d1527] border-cyan-500/30' : 'bg-white border-slate-200/90 shadow-xs'
              }`}>
                <div>
                  <p className={`text-xs font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    Reviewed all materials in Module {activeModuleIndex + 1}?
                  </p>
                  {!currentVideoCheck.passed && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                      ⚠️ Please watch ≥90% of the video lesson in this module before completing.
                    </p>
                  )}
                </div>
                {!isCurrentCompleted ? (
                  <Button
                    type="button"
                    onClick={() => handleCompleteContentModule(currentModule)}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl px-5 py-2.5 shadow-md shadow-cyan-500/20 gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark Module Completed →
                  </Button>
                ) : (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Module Completed
                  </span>
                )}
              </div>
            )}

            {/* Bottom Navigation Buttons (Prev / Next Module) */}
            <div className="flex items-center justify-between gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handlePrevModule}
                disabled={activeModuleIndex === 0}
                className={`rounded-xl px-4 py-2.5 font-bold text-xs gap-2 ${
                  isDarkMode
                    ? 'border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40'
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> Previous Module
              </Button>

              {isLastModule ? (
                isCurrentCompleted || quizResult?.passed ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {gradeBreakdown.hasFinalAssessment && !gradeBreakdown.finalAssessmentCompleted ? (
                      <Button
                        onClick={() => navigate(`/trainee/courses/${courseId}/assessments/${gradeBreakdown.finalAssessmentId}`)}
                        className="bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-black text-xs sm:text-sm rounded-xl px-6 py-3 shadow-xl shadow-purple-500/25 gap-2 hover:scale-105 active:scale-95 transition-all animate-pulse"
                      >
                        <Award className="w-4 h-4 text-amber-300" />
                        <span>Take Final Assessment (50% Grade) →</span>
                      </Button>
                    ) : gradeBreakdown.isCompleted ? (
                      <Button
                        onClick={handleDownloadCertificate}
                        disabled={downloadingCert}
                        className="bg-gradient-to-r from-amber-500 via-emerald-500 to-cyan-600 hover:from-amber-600 hover:to-cyan-700 text-white font-black text-xs sm:text-sm rounded-xl px-5 py-3 shadow-xl shadow-cyan-500/25 gap-2 hover:scale-105 active:scale-95 transition-all"
                      >
                        {downloadingCert ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                        {downloadingCert ? 'Generating...' : 'Download Certificate 🎓'}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => navigate(`/trainee/courses/${courseId}`)}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl px-5 py-3 shadow-md gap-2"
                      >
                        <span>View Course Assessments & Progress →</span>
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    disabled
                    className="bg-slate-300 dark:bg-slate-800 text-slate-500 rounded-xl px-6 py-2.5 text-xs font-bold"
                  >
                    Complete Final Module to Unlock Final Assessment
                  </Button>
                )
              ) : (
                <Button
                  onClick={handleNextModule}
                  disabled={!canGoNext}
                  className={`font-black text-xs sm:text-sm rounded-xl px-6 py-3 flex items-center gap-2 transition-all ${
                    canGoNext
                      ? 'bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/30 hover:scale-[1.02] active:scale-95'
                      : 'bg-slate-200 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <span>Next Module</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </main>

        {/* ── MODULES SYLLABUS DRAWER / SIDEBAR ──────────────── */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden"
              />

              {/* Drawer */}
              <motion.aside
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className={`fixed lg:static top-0 right-0 bottom-0 w-80 sm:w-96 border-l z-50 flex flex-col shadow-2xl ${
                  isDarkMode
                    ? 'bg-[#071124] border-cyan-500/20'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className={`p-4 border-b flex items-center justify-between ${
                  isDarkMode ? 'border-cyan-500/20' : 'border-slate-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <h3 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Course Syllabus</h3>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                  {modules.map((m: any, idx: number) => {
                    const isModCompleted = completedModules.includes(m.id)
                    const isModUnlocked =
                      idx === 0 || completedModules.includes(modules[idx - 1]?.id)
                    const isModActive = idx === activeModuleIndex
                    const mQuizScore = moduleQuizScores[m.id]

                    return (
                      <button
                        key={m.id || idx}
                        disabled={!isModUnlocked}
                        onClick={() => {
                          setActiveModuleIndex(idx)
                          setIsSidebarOpen(false)
                        }}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                          isModActive
                            ? isDarkMode
                              ? 'bg-cyan-950/70 border-cyan-500/80 ring-2 ring-cyan-500/20'
                              : 'bg-cyan-50 border-cyan-300 ring-2 ring-cyan-200'
                            : isModCompleted
                            ? isDarkMode
                              ? 'bg-emerald-950/20 border-emerald-500/30 hover:bg-emerald-950/40'
                              : 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-100/50'
                            : isModUnlocked
                            ? isDarkMode
                              ? 'bg-slate-800/60 border-slate-700 hover:bg-slate-800'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            : isDarkMode
                            ? 'bg-black/40 border-slate-800 text-slate-600 opacity-60 cursor-not-allowed'
                            : 'bg-slate-100/60 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 mt-0.5 ${
                            isModCompleted
                              ? 'bg-emerald-500 text-black'
                              : isModActive
                              ? 'bg-cyan-600 text-white'
                              : isModUnlocked
                              ? isDarkMode ? 'bg-slate-700 text-white' : 'bg-slate-300 text-slate-800'
                              : isDarkMode ? 'bg-slate-900 text-slate-600' : 'bg-slate-200 text-slate-400'
                          }`}
                        >
                          {isModCompleted ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : !isModUnlocked ? (
                            <Lock className="w-3 h-3" />
                          ) : (
                            idx + 1
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs font-bold truncate ${
                              isModActive
                                ? isDarkMode ? 'text-cyan-300' : 'text-cyan-950'
                                : isModCompleted
                                ? isDarkMode ? 'text-emerald-300' : 'text-emerald-900'
                                : isModUnlocked
                                ? isDarkMode ? 'text-white' : 'text-slate-800'
                                : isDarkMode ? 'text-slate-500' : 'text-slate-400'
                            }`}
                          >
                            {m.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {isModCompleted && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                ✓ Completed {mQuizScore?.score ? `(${mQuizScore.score}%)` : ''}
                              </span>
                            )}
                            {isModActive && !isModCompleted && (
                              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold animate-pulse">
                                ● In Progress
                              </span>
                            )}
                            {!isModUnlocked && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                Locked (Pass Module {idx})
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>

      <MaterialPreviewDialog
        material={previewMaterial}
        previewUrl={previewUrl}
        onClose={() => {
          setPreviewMaterial(null)
          setPreviewUrl(null)
        }}
      />
    </div>
  )
}
