import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  BookOpen, ChevronRight, ChevronLeft, CheckCircle2, Lock, Sparkles,
  HelpCircle, Video, Image as ImageIcon, FileText, Globe, ExternalLink,
  Award, ArrowLeft, RotateCcw, CheckSquare, AlertCircle, Check, Play,
  Menu, X, Clock, Layers, GraduationCap, Eye, AlignLeft, Download, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { MaterialPreviewDialog } from '@/components/ui/MaterialPreviewDialog'
import { generateTraineeCertificate, triggerFileDownload } from '@/lib/certificateGenerator'

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null
}

export function TraineeCourseLearnPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0)
  const [completedModules, setCompletedModules] = useState<string[]>([])
  const [moduleQuizAnswers, setModuleQuizAnswers] = useState<Record<string, Record<number, number>>>({})
  const [moduleQuizScores, setModuleQuizScores] = useState<Record<string, { score: number; passed: boolean; submitted: boolean }>>({})
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

  const isApproved = Boolean(enrollment && (['enrolled', 'in_progress', 'completed'] as string[]).includes((enrollment as any).status))

  // Load completed modules from storage
  useEffect(() => {
    if (!courseId || !profile?.id) return
    const stored = localStorage.getItem(`cc_mod_progress_${courseId}_${profile.id}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed.completed)) {
          setCompletedModules(parsed.completed)
        }
        if (parsed.scores) {
          setModuleQuizScores(parsed.scores)
        }
      } catch (e) {
        console.error('Error loading module progress:', e)
      }
    }
  }, [courseId, profile?.id])

  // Set initial active module to first incomplete unlocked module
  useEffect(() => {
    if (!course?.modules || !Array.isArray(course.modules) || course.modules.length === 0) return
    const firstIncompleteIdx = course.modules.findIndex((m: any) => !completedModules.includes(m.id))
    if (firstIncompleteIdx !== -1) {
      setActiveModuleIndex(firstIncompleteIdx)
    } else if (completedModules.length >= course.modules.length) {
      setActiveModuleIndex(course.modules.length - 1)
    }
  }, [course?.modules, completedModules.length])

  // Scroll to top when active module changes
  useEffect(() => {
    contentTopRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeModuleIndex])

  const modules = Array.isArray(course?.modules) ? course.modules : []
  const currentModule = modules[activeModuleIndex] || null

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
    const rawItems = mod.items || mod.content_items || []
    const quizQuestionsFromItems = rawItems
      .filter((i: any) => i.type === 'quiz' && i.quiz_data)
      .map((i: any) => i.quiz_data)
    const legacyQuizQuestions = mod.quiz_questions || []
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
      toast.error(
        `Please answer all ${questions.length} questions before submitting. (${answeredCount}/${questions.length} answered)`
      )
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

      toast.success(`🎉 Excellent! You scored ${scorePercent}% and unlocked the next module!`, {
        duration: 4000,
      })
    } else {
      toast.error(`You scored ${scorePercent}%. 80% is required to pass and unlock the next module.`, {
        duration: 4000,
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
    toast.info('Quiz reset. Review the lesson and select your answers.')
  }

  const handleCompleteContentModule = async (mod: any) => {
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
    setDownloadingCert(true)
    try {
      const result = await generateTraineeCertificate((course as any).certificate_template_url || null, {
        traineeName: profile.full_name || 'Trainee',
        traineeEmail: profile.email || undefined,
        traineeId: profile.id,
        courseId: course.id,
        courseTitle: course.title,
        trainerName: (course as any).trainer?.full_name || 'Assigned Instructor',
        percentage: '100%',
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
      <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
        <p className="text-sm text-slate-400 font-medium tracking-wide">Loading learning experience...</p>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Course Not Found</h2>
        <p className="text-sm text-slate-400 mb-6">This course is not available.</p>
        <Button onClick={() => navigate('/trainee/courses')} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl">
          Back to Catalog
        </Button>
      </div>
    )
  }

  // Access Control Guard: Trainee must be approved to access the course player
  if (!isApproved) {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#0a1120] border border-amber-500/30 rounded-3xl p-8 text-center shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white">Enrollment Approval Required</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {enrollment?.status === 'pending_approval'
              ? 'Your enrollment request is pending approval from the trainer. You will gain full access once your request is approved.'
              : enrollment?.status === 'rejected'
              ? 'Your enrollment request was not approved. Please contact your instructor.'
              : 'You have not enrolled in this course yet. Please enroll and wait for trainer approval to access the learning modules.'}
          </p>
          <div className="flex flex-col gap-2.5 pt-2">
            <Button
              onClick={() => navigate(`/trainee/courses/${courseId}`)}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-xl py-2.5 shadow-lg shadow-cyan-500/20"
            >
              View Course Details & Enroll
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/trainee/courses')}
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 rounded-xl"
            >
              Back to Catalog
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Calculate Sequential Items & Quizzes for the active module
  const rawItems = currentModule?.items || currentModule?.content_items || []
  const quizQuestionsFromItems = rawItems
    .filter((i: any) => i.type === 'quiz' && i.quiz_data)
    .map((i: any) => i.quiz_data)
  const legacyQuizQuestions = currentModule?.quiz_questions || []
  const allQuizQuestions: any[] = [...quizQuestionsFromItems]
  legacyQuizQuestions.forEach((lq: any) => {
    if (!allQuizQuestions.some(q => q.id === lq.id || q.question === lq.question)) {
      allQuizQuestions.push(lq)
    }
  })

  const sequentialItems: any[] = [...rawItems]
  legacyQuizQuestions.forEach((lq: any) => {
    if (
      !sequentialItems.some(
        i =>
          i.type === 'quiz' &&
          (i.id === lq.id || i.quiz_data?.id === lq.id || i.quiz_data?.question === lq.question)
      )
    ) {
      sequentialItems.push({
        id: lq.id || crypto.randomUUID(),
        type: 'quiz',
        title: `Quiz: ${lq.question.slice(0, 50)}...`,
        quiz_data: lq,
      })
    }
  })

  const isCurrentCompleted = currentModule ? completedModules.includes(currentModule.id) : false
  const quizResult = currentModule ? moduleQuizScores[currentModule.id] : null
  const userAnswers = currentModule ? moduleQuizAnswers[currentModule.id] || {} : {}
  const totalCompleted = completedModules.length
  const progressPercent = modules.length > 0 ? Math.round((totalCompleted / modules.length) * 100) : 0

  const canGoNext = isCurrentCompleted || (quizResult?.passed ?? false)
  const isLastModule = activeModuleIndex === modules.length - 1

  return (
    <div className="min-h-screen bg-[#060c18] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* ── TOP NAV BAR ─────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#071124]/90 backdrop-blur-md border-b border-cyan-500/20 px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/trainee/courses/${courseId}`}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-slate-300 hover:text-cyan-300 flex items-center justify-center transition-all shrink-0"
            title="Back to Course Overview"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px] font-bold uppercase tracking-wider">
                Module {activeModuleIndex + 1} of {modules.length}
              </Badge>
              <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md md:max-w-lg">
                {course.title}
              </h1>
            </div>
            <p className="text-xs text-slate-400 font-medium truncate">
              {currentModule?.title || 'Learning Module'}
            </p>
          </div>
        </div>

        {/* Center/Right: Progress & Module Drawer Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
            <div className="text-right">
              <p className="text-[11px] font-bold text-cyan-300">{progressPercent}% Completed</p>
              <p className="text-[10px] text-slate-400">
                {totalCompleted} / {modules.length} Modules
              </p>
            </div>
            <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6 }}
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
              />
            </div>
          </div>

          <Button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-bold rounded-xl px-3 py-2 flex items-center gap-2 shadow-xs"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Modules Syllabus</span>
            <span className="text-[10px] bg-cyan-500/20 px-1.5 py-0.5 rounded-md font-extrabold">
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

          {/* Module Banner Card */}
          <div className="bg-gradient-to-r from-[#0c1933] via-[#0b1b3b] to-[#071329] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-cyan-500/20 to-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                  Module {activeModuleIndex + 1}
                </span>
                {isCurrentCompleted ? (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-bold px-3 py-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Completed {quizResult?.score !== undefined ? `(${quizResult.score}%)` : ''}
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs font-bold px-3 py-1 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> In Progress
                  </Badge>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {currentModule?.title || 'Learning Module'}
              </h2>

              {currentModule?.description && (
                <p className="text-sm text-slate-300 leading-relaxed font-normal pt-1">
                  {currentModule.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  {sequentialItems.length} sequential learning step{sequentialItems.length !== 1 ? 's' : ''}
                </span>
                {allQuizQuestions.length > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    {allQuizQuestions.length} Quiz Checkpoints (≥80% Pass Gate)
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
                const quizData =
                  item.quiz_data ||
                  (isQuiz
                    ? {
                        question: item.title,
                        options: item.options || [],
                        correct_option: item.correct_option ?? 0,
                        explanation: item.explanation || item.content,
                      }
                    : null)

                const qIdx = isQuiz
                  ? allQuizQuestions.findIndex(
                      q =>
                        q.id === item.id ||
                        q.id === quizData?.id ||
                        q.question === quizData?.question
                    )
                  : -1

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
                      <div className="bg-[#0a1426] border border-purple-500/30 rounded-2xl p-5 sm:p-6 space-y-3 shadow-md">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                            {sIdx + 1}
                          </span>
                          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs font-bold flex items-center gap-1">
                            <AlignLeft className="w-3.5 h-3.5" /> Lesson Notes
                          </Badge>
                          <h3 className="text-sm font-bold text-white">{item.title}</h3>
                        </div>
                        <div className="pl-8 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-normal">
                          {item.content || 'Read and study the material carefully.'}
                        </div>
                      </div>
                    )}

                    {/* VIDEO LESSON STEP */}
                    {item.type === 'video' && (
                      <div className="bg-[#0a1426] border border-blue-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-md">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                              {sIdx + 1}
                            </span>
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/40 text-xs font-bold flex items-center gap-1">
                              <Video className="w-3.5 h-3.5" /> Video Lesson
                            </Badge>
                            <h3 className="text-sm font-bold text-white">{item.title}</h3>
                          </div>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-blue-300 hover:text-blue-200 flex items-center gap-1 bg-blue-950/60 border border-blue-500/40 px-3 py-1 rounded-xl transition-all"
                            >
                              <ExternalLink className="w-3 h-3" /> Full Screen Tab
                            </a>
                          )}
                        </div>

                        {item.url && getYouTubeEmbedUrl(item.url) ? (
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-blue-500/30 bg-black shadow-lg">
                            <iframe
                              src={getYouTubeEmbedUrl(item.url)!}
                              title={item.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="w-full h-full"
                            />
                          </div>
                        ) : item.url?.match(/\.(mp4|webm|mov)$/i) || item.previewUrl ? (
                          <video controls className="w-full rounded-xl border border-blue-500/30 bg-black shadow-lg">
                            <source src={item.url || item.previewUrl} />
                            Your browser does not support HTML5 video playback.
                          </video>
                        ) : null}

                        {item.content && (
                          <p className="text-xs text-slate-400 pl-8 leading-relaxed font-medium">
                            {item.content}
                          </p>
                        )}
                      </div>
                    )}

                    {/* PHOTO / DIAGRAM STEP */}
                    {item.type === 'photo' && (
                      <div className="bg-[#0a1426] border border-cyan-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-md">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-cyan-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                            {sIdx + 1}
                          </span>
                          <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 text-xs font-bold flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5" /> Diagram & Visual
                          </Badge>
                          <h3 className="text-sm font-bold text-white">{item.title}</h3>
                        </div>

                        {(item.previewUrl || item.url) && (
                          <div
                            onClick={() => {
                              setPreviewMaterial({ file_name: item.title, material_type: 'image' })
                              setPreviewUrl(item.previewUrl || item.url)
                            }}
                            className="relative rounded-xl overflow-hidden border border-cyan-500/30 bg-black/40 cursor-pointer group flex items-center justify-center max-h-96"
                          >
                            <img
                              src={item.previewUrl || item.url}
                              alt={item.title}
                              className="w-full h-full object-contain max-h-96 group-hover:scale-[1.01] transition-all"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-1.5 backdrop-blur-xs">
                              <Eye className="w-4 h-4 text-cyan-400" /> Click to Expand Image
                            </div>
                          </div>
                        )}

                        {item.content && (
                          <p className="text-xs text-slate-400 pl-8 leading-relaxed font-medium">
                            {item.content}
                          </p>
                        )}
                      </div>
                    )}

                    {/* EXTERNAL LINK STEP */}
                    {item.type === 'link' && (
                      <div className="bg-[#0a1426] border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-md">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                            {sIdx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-bold">
                                <ExternalLink className="w-3 h-3 mr-1" /> External Resource
                              </Badge>
                              <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                                {item.title}
                              </h4>
                            </div>
                            {item.content && (
                              <p className="text-xs text-slate-400 mt-1 truncate">{item.content}</p>
                            )}
                            {item.url && (
                              <p className="text-[11px] text-emerald-400 truncate font-medium mt-0.5">
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
                            className="h-9 px-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 hover:bg-emerald-900 text-emerald-300 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all shadow-xs"
                          >
                            <span>Open Resource</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* QUIZ STEP */}
                    {isQuiz && quizData && (
                      <div className="bg-gradient-to-br from-[#121424] via-[#0e172a] to-[#0a1120] border-2 border-amber-500/40 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-black flex items-center justify-center shrink-0">
                            {sIdx + 1}
                          </span>
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/50 text-xs font-bold flex items-center gap-1">
                            <HelpCircle className="w-3.5 h-3.5 text-amber-400" /> Quiz Question{' '}
                            {qIdx !== -1 ? qIdx + 1 : sIdx + 1}
                          </Badge>
                          <span className="text-[11px] text-amber-200/70 font-semibold">
                            (80% Required to Unlock Next Module)
                          </span>
                        </div>

                        <p className="text-sm sm:text-base font-bold text-white pl-8 leading-snug">
                          {quizData.question}
                        </p>

                        <div className="space-y-2.5 pl-8">
                          {quizData.options?.map((opt: string, optIdx: number) => {
                            const questionKey = qIdx !== -1 ? qIdx : sIdx
                            const isSelected = userAnswers[questionKey] === optIdx
                            const isGraded = quizResult?.submitted
                            const isOptionCorrect = optIdx === (quizData.correct_option ?? 0)

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={quizResult?.passed}
                                onClick={() =>
                                  handleSelectQuizAnswer(currentModule.id, questionKey, optIdx)
                                }
                                className={`w-full flex items-center gap-3.5 p-3 rounded-xl border text-xs sm:text-sm text-left transition-all ${
                                  isGraded
                                    ? isOptionCorrect
                                      ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 font-bold'
                                      : isSelected
                                      ? 'bg-rose-950/80 border-rose-400 text-rose-200 font-semibold'
                                      : 'bg-[#080e1a]/60 border-slate-800 text-slate-500 opacity-60'
                                    : isSelected
                                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold ring-2 ring-amber-500/30'
                                    : 'bg-[#080e1a]/80 border-slate-700/80 text-slate-300 hover:border-slate-500 hover:bg-[#0c1628]'
                                }`}
                              >
                                <span
                                  className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${
                                    isGraded && isOptionCorrect
                                      ? 'bg-emerald-500 text-black'
                                      : isGraded && isSelected
                                      ? 'bg-rose-500 text-white'
                                      : isSelected
                                      ? 'bg-amber-400 text-black'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="flex-1">{opt}</span>
                                {isGraded && isOptionCorrect && (
                                  <span className="text-[11px] font-bold text-emerald-300 bg-emerald-900/60 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                                    ✓ Correct Answer
                                  </span>
                                )}
                                {isGraded && isSelected && !isOptionCorrect && (
                                  <span className="text-[11px] font-bold text-rose-300 bg-rose-900/60 border border-rose-500/40 px-2.5 py-0.5 rounded-full">
                                    ✗ Your Selection
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>

                        {quizResult?.submitted && quizData.explanation && (
                          <div className="mt-3 ml-8 p-3 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-slate-300">
                            <span className="font-bold text-cyan-300">Explanation: </span>
                            {quizData.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-[#0a1426] border border-slate-800 text-center space-y-2">
              <Layers className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-bold text-white">No content items in this module yet</h3>
              <p className="text-xs text-slate-400">The trainer has not added learning steps to this module yet.</p>
            </div>
          )}

          {/* ── MODULE COMPLETION & TRANSITION CONTROLS ──────── */}
          <div className="pt-6 border-t border-cyan-500/20 space-y-4">
            {allQuizQuestions.length > 0 ? (
              <div className="bg-[#0b162a] border border-amber-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Module Mastery Checkpoint ({allQuizQuestions.length} Questions)
                      </h4>
                      <p className="text-xs text-amber-200/80">
                        Score at least <strong>80%</strong> to complete this module and unlock the next one.
                      </p>
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

                {/* Failed Alert with Retake Button */}
                {quizResult && !quizResult.passed && (
                  <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 text-rose-200">
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold">
                          You scored {quizResult.score}% (Under 80% passing threshold)
                        </p>
                        <p className="text-[11px] text-rose-300">
                          Review the lesson materials and retake the quiz to progress.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => handleRetakeModuleQuiz(currentModule.id)}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shrink-0 gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Retake Quiz
                    </Button>
                  </div>
                )}

                {/* Submit Quiz Button */}
                {!quizResult?.passed && (
                  <div className="flex items-center justify-end pt-2">
                    <Button
                      type="button"
                      onClick={() => handleSubmitModuleQuiz(currentModule)}
                      className="bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-extrabold text-sm rounded-xl px-6 py-3 shadow-lg shadow-cyan-500/25 gap-2"
                    >
                      <CheckSquare className="w-4 h-4" />
                      Submit Module Quiz (80% Required)
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Content-only module completion button */
              <div className="bg-[#0b162a] border border-cyan-500/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-300">
                  Reviewed all materials in Module {activeModuleIndex + 1}?
                </p>
                {!isCurrentCompleted ? (
                  <Button
                    type="button"
                    onClick={() => handleCompleteContentModule(currentModule)}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-xs rounded-xl px-5 py-2.5 shadow-md shadow-cyan-500/20 gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark Module Completed →
                  </Button>
                ) : (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
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
                className="border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-40 rounded-xl px-4 py-2.5 font-bold text-xs gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Previous Module
              </Button>

              {isLastModule ? (
                isCurrentCompleted || quizResult?.passed ? (
                  <Button
                    onClick={handleDownloadCertificate}
                    disabled={downloadingCert}
                    className="bg-gradient-to-r from-amber-500 via-emerald-500 to-cyan-500 hover:from-amber-600 hover:to-cyan-600 text-black font-black text-xs sm:text-sm rounded-xl px-6 py-3 shadow-xl shadow-emerald-500/25 gap-2"
                  >
                    {downloadingCert ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4 text-black" />}
                    {downloadingCert ? 'Generating...' : 'Course Completed! Download Certificate 🎓'}
                  </Button>
                ) : (
                  <Button
                    disabled
                    className="bg-slate-800 text-slate-500 rounded-xl px-6 py-2.5 text-xs font-bold"
                  >
                    Complete Final Module to Finish Course
                  </Button>
                )
              ) : (
                <Button
                  onClick={handleNextModule}
                  disabled={!canGoNext}
                  className={`font-black text-xs sm:text-sm rounded-xl px-6 py-3 flex items-center gap-2 transition-all ${
                    canGoNext
                      ? 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95'
                      : 'bg-slate-800/80 border border-slate-700 text-slate-500 cursor-not-allowed'
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
                className="fixed lg:static top-0 right-0 bottom-0 w-80 sm:w-96 bg-[#071124] border-l border-cyan-500/20 z-50 flex flex-col shadow-2xl"
              >
                <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white">Course Syllabus</h3>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
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
                            ? 'bg-cyan-950/70 border-cyan-400/80 ring-2 ring-cyan-500/20'
                            : isModCompleted
                            ? 'bg-emerald-950/20 border-emerald-500/30 hover:bg-emerald-950/40'
                            : isModUnlocked
                            ? 'bg-white/5 border-white/10 hover:bg-white/10'
                            : 'bg-black/40 border-slate-800 text-slate-600 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 mt-0.5 ${
                            isModCompleted
                              ? 'bg-emerald-500 text-black'
                              : isModActive
                              ? 'bg-cyan-400 text-black'
                              : isModUnlocked
                              ? 'bg-slate-700 text-white'
                              : 'bg-slate-900 text-slate-600'
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
                                ? 'text-cyan-300'
                                : isModCompleted
                                ? 'text-emerald-300'
                                : isModUnlocked
                                ? 'text-white'
                                : 'text-slate-500'
                            }`}
                          >
                            {m.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {isModCompleted && (
                              <span className="text-[10px] text-emerald-400 font-semibold">
                                ✓ Completed {mQuizScore?.score ? `(${mQuizScore.score}%)` : ''}
                              </span>
                            )}
                            {isModActive && !isModCompleted && (
                              <span className="text-[10px] text-cyan-400 font-semibold animate-pulse">
                                ● In Progress
                              </span>
                            )}
                            {!isModUnlocked && (
                              <span className="text-[10px] text-slate-500 font-medium">
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
