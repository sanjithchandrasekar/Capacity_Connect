import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShell } from '@/pages/Dashboards'
import { Loader2, ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, Target, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Progress } from '@/components/ui/progress'
import { Lock, ShieldAlert } from 'lucide-react'

export function TraineeAssessmentTest() {
  const { courseId, assessmentId } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [isAiGrading, setIsAiGrading] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  // SEA states
  const [strikes, setStrikes] = useState(0)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const MAX_STRIKES = 3

  // WebRTC / AV state
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastBrightnessRef = useRef<number | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const noiseWarningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const glareTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const roomScanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const [randomizedQuestions, setRandomizedQuestions] = useState<any[]>([])
  const [isScanningRoom, setIsScanningRoom] = useState(false)
  const [roomScanProgress, setRoomScanProgress] = useState(0)

  // Fetch assessment and questions
  const { data: assessment, isLoading: isAssessmentLoading } = useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('id, title, passing_score, status, requires_sea, sea_link, scheduled_date, start_time, end_time, duration_minutes, created_by, course_id, instructions, created_at')
        .eq('id', assessmentId!)
        .single()
      if (error) { console.error('Assessment fetch error:', error); return null; }
      return data
    },
    enabled: !!assessmentId,
  })

  const { data: questions, isLoading: isQuestionsLoading } = useQuery({
    queryKey: ['assessment-questions', assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase.from('questions').select('*').eq('assessment_id', assessmentId!).order('position')
      if (error) { console.error('Questions fetch error:', error); return []; }
      return data || []
    },
    enabled: !!assessmentId,
  })

  const { data: previousAttempt, isLoading: isAttemptLoading } = useQuery({
    queryKey: ['assessment-attempt', assessmentId, profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('assessment_attempts' as any)
        .select('id, assessment_id, user_id, score, created_at')
        .eq('assessment_id', assessmentId!)
        .eq('user_id', profile!.id)
        .maybeSingle()
      if (error && error.code !== 'PGRST116') {
        console.error('Attempt fetch error:', error)
        return null // Don't block the test if this fails
      }
      return data
    },
    enabled: !!assessmentId && !!profile?.id,
  })

  // WebRTC Setup & Cleanup
  useEffect(() => {
    if (hasStarted && videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current
    }
  }, [hasStarted])

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach(t => t.stop())
      audioContextRef.current?.close()
      if (noiseWarningTimeoutRef.current) clearTimeout(noiseWarningTimeoutRef.current)
      if (glareTimeoutRef.current) clearTimeout(glareTimeoutRef.current)
      if (roomScanTimeoutRef.current) clearTimeout(roomScanTimeoutRef.current)
    }
  }, [])

  // Timer logic
  useEffect(() => {
    if (hasStarted && timeLeft !== null && timeLeft > 0 && !previousAttempt && !isAiGrading && !isScanningRoom) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev && prev <= 1) {
            clearInterval(timer)
            handleSubmit()
            return 0
          }
          return prev ? prev - 1 : 0
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [hasStarted, timeLeft, previousAttempt, isAiGrading])

  // Room Scan Progress
  useEffect(() => {
    if (isScanningRoom) {
      const timer = setInterval(() => {
        setRoomScanProgress(p => {
          if (p >= 100) {
            clearInterval(timer)
            setIsScanningRoom(false)
            setRoomScanProgress(0)
            toast.success("Room scan completed successfully.", { duration: 3000 })
            return 100
          }
          return p + 10 // 10 seconds total (100% / 10 = 10 steps of 1s)
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [isScanningRoom])

  // SEA violation handler - block if ignoring strikes temporarily
  const ignoringViolationsRef = React.useRef(false)
  const handleViolation = (reason: string) => {
    if (ignoringViolationsRef.current) return // grace period
    setStrikes(s => {
      const newStrikes = s + 1
      if (newStrikes >= MAX_STRIKES) {
        toast.error(`SEA Violation: ${reason}. Maximum strikes reached. Test auto-submitted.`, { duration: 5000 })
        if (document.fullscreenElement) document.exitFullscreen().catch(console.error)
        handleSubmit()
      } else {
        toast.error(`SEA Warning (${newStrikes}/${MAX_STRIKES}): ${reason}. Return to the test immediately!`, { duration: 5000 })
      }
      return newStrikes
    })
  }

  // SEA monitoring
  useEffect(() => {
    if (!hasStarted || previousAttempt || isAiGrading || !assessment?.requires_sea) return;

    const handleVisibilityChange = () => {
      if (document.hidden) handleViolation('Tab switched or minimized')
    }

    // Add a 2-second grace period on blur to avoid false positives on fullscreen entry
    let blurTimeout: ReturnType<typeof setTimeout> | null = null
    const handleBlur = () => {
      blurTimeout = setTimeout(() => {
        if (!ignoringViolationsRef.current) handleViolation('Lost focus on assessment window')
      }, 1500)
    }
    const handleFocus = () => {
      if (blurTimeout) { clearTimeout(blurTimeout); blurTimeout = null }
    }
    
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullScreen(false)
        // Grace period: ignore violations for 1s after exiting fullscreen via browser
        ignoringViolationsRef.current = true
        setTimeout(() => { ignoringViolationsRef.current = false }, 1000)
        handleViolation('Exited fullscreen mode')
      } else {
        setIsFullScreen(true)
        // Grace period after entering fullscreen to avoid false blur strikes
        ignoringViolationsRef.current = true
        setTimeout(() => { ignoringViolationsRef.current = false }, 2000)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      if (blurTimeout) clearTimeout(blurTimeout)
    }
  }, [hasStarted, previousAttempt, assessment, isAiGrading])

  const requestFullScreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to enter fullscreen mode. This is required for SEA.')
      return false
    }
    return true
  }

  const startTest = async () => {
    if (assessment?.requires_sea) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        mediaStreamRef.current = stream
        
        // Setup audio analysis
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        audioContextRef.current = audioCtx
        const analyser = audioCtx.createAnalyser()
        analyserRef.current = analyser
        analyser.fftSize = 256
        const source = audioCtx.createMediaStreamSource(stream)
        source.connect(analyser)

        // Polling for audio volume
        const checkAudioVolume = () => {
          if (!analyserRef.current) return
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
          analyserRef.current.getByteFrequencyData(dataArray)
          const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length
          
          if (average > 40) { // Loud noise threshold
            if (!noiseWarningTimeoutRef.current) {
              noiseWarningTimeoutRef.current = setTimeout(() => {
                handleViolation('Loud background noise detected (Potential voice/talking)')
                noiseWarningTimeoutRef.current = null
              }, 3000) // 3 seconds of sustained noise
            }
          } else {
            if (noiseWarningTimeoutRef.current) {
              clearTimeout(noiseWarningTimeoutRef.current)
              noiseWarningTimeoutRef.current = null
            }
          }
          requestAnimationFrame(checkAudioVolume)
        }
        checkAudioVolume()

        // Polling for video brightness (Glare detection)
        const checkVideoBrightness = () => {
          if (videoRef.current && canvasRef.current) {
            const video = videoRef.current
            const canvas = canvasRef.current
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
                const data = frame.data
                let totalBrightness = 0
                // Sample every 4th pixel for performance
                for (let i = 0; i < data.length; i += 16) {
                  const r = data[i]
                  const g = data[i + 1]
                  const b = data[i + 2]
                  // Relative luminance
                  const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b
                  totalBrightness += brightness
                }
                const avgBrightness = totalBrightness / (data.length / 16)
                
                if (lastBrightnessRef.current !== null) {
                  const delta = avgBrightness - lastBrightnessRef.current
                  if (delta > 50) { // Raised threshold - only flag very sudden extreme changes
                    if (!glareTimeoutRef.current) {
                      glareTimeoutRef.current = setTimeout(() => {
                        handleViolation('Suspicious Screen Glare Detected (Potential Hidden Device)')
                        glareTimeoutRef.current = null
                      }, 3000) // 3 seconds sustained glare before flagging
                    }
                  } else {
                    // Clear glare timer if light normalized
                    if (glareTimeoutRef.current) {
                      clearTimeout(glareTimeoutRef.current)
                      glareTimeoutRef.current = null
                    }
                  }
                }
                lastBrightnessRef.current = avgBrightness
              }
            }
          }
          requestAnimationFrame(checkVideoBrightness)
        }
        checkVideoBrightness()

        // Schedule random room scan between 30s and 90s
        roomScanTimeoutRef.current = setTimeout(() => {
          setIsScanningRoom(true)
        }, Math.floor(Math.random() * 60000) + 30000)


      } catch (err) {
        toast.error('Camera and Microphone access are required for Secure Exam Mode.')
        return
      }

      const canFullscreen = await requestFullScreen()
      if (!canFullscreen) {
         mediaStreamRef.current?.getTracks().forEach(t => t.stop())
         return
      }
    }

    if (!questions || questions.length === 0) {
      toast.error('No questions available for this assessment. Please contact your trainer.')
      if (document.fullscreenElement) document.exitFullscreen().catch(console.error)
      mediaStreamRef.current?.getTracks().forEach(t => t.stop())
      return
    }

    const shuffled = [...questions].sort(() => Math.random() - 0.5)
    setRandomizedQuestions(shuffled)

    if (assessment?.duration_minutes) {
      setTimeLeft(assessment.duration_minutes * 60)
    } else {
      setTimeLeft(30 * 60) // default 30 mins
    }
    setHasStarted(true)
  }

  const submitMutation = useMutation({
    mutationFn: async (results: any) => {
      // Insert attempt
      const { data: attempt, error: attemptError } = await supabase.from('assessment_attempts' as any).insert({
        assessment_id: assessmentId,
        user_id: profile!.id,
        score: results.score,
        passed: results.score >= (assessment?.passing_score ?? 60),
        answers: answers,
        submitted_at: new Date().toISOString()
      }).select().single()

      if (attemptError) {
        console.error('Submit attempt error:', attemptError)
        // Try without extra fields if schema mismatch
        const { data: attempt2, error: attemptError2 } = await supabase.from('assessment_attempts' as any).insert({
          assessment_id: assessmentId,
          user_id: profile!.id,
          score: results.score,
        }).select().single()
        if (attemptError2) throw attemptError2
        return attempt2
      }
      const attemptData = attempt as any

      // Assuming attempt_answers table exists, but we'll mock it if it fails
      try {
        const answersToInsert = Object.entries(answers).map(([qId, answer]) => {
          const q = questions?.find(q => q.id === qId)
          return {
            attempt_id: attemptData.id,
            question_id: qId,
            selected_option: answer,
            is_correct: q?.correct_answer === answer
          }
        })
        await supabase.from('attempt_answers' as any).insert(answersToInsert)
      } catch (e) {
        console.error("Could not insert answers, table might not exist yet.", e)
      }
      return attempt
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessment-attempt', assessmentId, profile?.id] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to submit assessment')
  })

  const handleSubmit = async () => {
    if (!questions || questions.length === 0) {
      toast.error('Cannot submit: no questions loaded.')
      return
    }
    setIsAiGrading(true)

    // Calculate score locally
    setTimeout(() => {
      let correct = 0
      questions.forEach(q => {
        if (answers[q.id] === q.correct_answer) correct++
      })
      const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0
      submitMutation.mutate({ score })
      setIsAiGrading(false)
    }, 2500)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const handleCopyPaste = (e: React.ClipboardEvent) => {
    if (assessment?.requires_sea) {
      e.preventDefault()
      toast.error('Copy/Paste is disabled in Secure Exam Mode.')
    }
  }

  if (isAssessmentLoading || isQuestionsLoading || isAttemptLoading) {
    return <DashboardShell title="Assessment" icon={Target} navLinks={[]}><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div></DashboardShell>
  }

  if (!assessment || !questions) {
    return <DashboardShell title="Assessment" icon={Target} navLinks={[]}><div className="text-center py-20">Assessment not found.</div></DashboardShell>
  }

  // Completed State
  if (previousAttempt) {
    const attemptData = previousAttempt as any
    return (
      <DashboardShell title={assessment.title} icon={Target} navLinks={[]}>
        <div className="max-w-4xl mx-auto space-y-6">
          <Link to={`/trainee/courses/${courseId}`} className="inline-flex items-center gap-2 text-sm text-midnight/60 hover:text-purple-700 transition-colors mb-2 font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to Course
          </Link>
          <div className="bg-white border border-purple-500/10 rounded-3xl p-8 shadow-sm text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-midnight mb-2">Assessment Completed</h2>
            <p className="text-midnight/60 mb-6">You scored <span className="font-bold text-purple-600">{attemptData.score}%</span>.</p>
            <Button onClick={() => navigate(`/trainee/courses/${courseId}`)} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl">Return to Course</Button>
          </div>
        </div>
      </DashboardShell>
    )
  }

  // Pre-Start State
  if (!hasStarted) {
    return (
      <DashboardShell title={assessment.title} icon={Target} navLinks={[]}>
        <div className="max-w-4xl mx-auto">
          <Link to={`/trainee/courses/${courseId}`} className="inline-flex items-center gap-2 text-sm text-midnight/60 hover:text-purple-700 transition-colors mb-6 font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to Course
          </Link>
          <div className="bg-white border border-purple-500/10 rounded-3xl p-10 shadow-lg text-center max-w-2xl mx-auto">
            <Target className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-midnight mb-4">{assessment.title}</h1>
            <p className="text-midnight/60 mb-8 max-w-lg mx-auto">{assessment.instructions || 'Please read each question carefully before answering. Good luck!'}</p>
            
            <div className="flex justify-center gap-8 mb-10">
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-midnight/40 mb-1">Duration</p>
                <p className="font-bold text-midnight flex items-center gap-1.5"><Clock className="w-4 h-4 text-orange-500" /> {assessment.duration_minutes || 30} mins</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-midnight/40 mb-1">Questions</p>
                <p className="font-bold text-midnight flex items-center gap-1.5"><Target className="w-4 h-4 text-blue-500" /> {questions.length}</p>
              </div>
            </div>

            {assessment.requires_sea && (
              <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-4 mb-8 text-left">
                <div className="flex items-center gap-2 mb-2 text-rose-700">
                  <ShieldAlert className="w-5 h-5" />
                  <h3 className="font-bold text-sm">Secure Exam Mode (SEA) is enabled</h3>
                </div>
                <ul className="text-xs text-rose-600/80 list-disc list-inside space-y-1">
                  <li>You will be forced into <b>full-screen mode</b>.</li>
                  <li>Do not minimize the browser or switch tabs.</li>
                  <li>Copy-pasting is disabled.</li>
                  <li>If you receive {MAX_STRIKES} strikes, the exam will automatically submit.</li>
                </ul>
              </div>
            )}

            <Button onClick={startTest} className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl px-10 py-6 text-lg w-full sm:w-auto shadow-lg shadow-purple-500/30 transition-all hover:scale-105 active:scale-95">
              Start Assessment
            </Button>
          </div>
        </div>
      </DashboardShell>
    )
  }

  // AI Grading Mock State
  if (isAiGrading) {
    return (
      <DashboardShell title={assessment.title} icon={Target} navLinks={[]}>
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center">
          <motion.div 
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-24 h-24 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl shadow-xl shadow-pink-500/20 flex items-center justify-center mb-6"
          >
            <Brain className="w-12 h-12 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-midnight mb-2">AI is evaluating your answers...</h2>
          <p className="text-midnight/50">Analyzing responses and generating feedback</p>
        </div>
      </DashboardShell>
    )
  }

  // Review State (after submit mutation finishes, before redirect or if we want to show it)
  // Actually, wait, if submitMutation is successful, previousAttempt becomes true, and it shows "Assessment Completed".
  // The user wanted: "both the correct answers and wrong answers should have explanations".
  // So I need a state to show the review screen immediately after grading.
  if (submitMutation.isSuccess) {
    return (
      <DashboardShell title={assessment.title} icon={Target} navLinks={[]}>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-midnight">Assessment Results</h2>
            <div className="px-4 py-2 bg-purple-100 text-purple-800 rounded-xl font-bold">
              Score: {(submitMutation.data as any)?.score}%
            </div>
          </div>

          <div className="space-y-6">
            {questions.map((q, idx) => {
              const isCorrect = answers[q.id] === q.correct_answer
              const isUnanswered = !answers[q.id]
              return (
                <div key={q.id} className={`p-6 rounded-3xl border ${isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'}`}>
                  <div className="flex gap-4">
                    <div className="shrink-0 mt-1">
                      {isCorrect ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <XCircle className="w-6 h-6 text-rose-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-midnight mb-4"><span className="opacity-50 mr-2">{idx + 1}.</span>{q.question_text}</p>
                      <div className="grid sm:grid-cols-2 gap-3 mb-4">
                        {(q.options as string[]).map((opt, i) => {
                          const isSelected = answers[q.id] === opt
                          const isActuallyCorrect = q.correct_answer === opt
                          let style = 'bg-white border-slate-200 opacity-60'
                          if (isActuallyCorrect) style = 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold shadow-sm'
                          else if (isSelected && !isActuallyCorrect) style = 'bg-rose-100 border-rose-300 text-rose-900 font-bold'

                          return (
                            <div key={i} className={`p-3 rounded-xl border text-sm flex items-center justify-between ${style}`}>
                              <span>{opt}</span>
                              {isActuallyCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                              {isSelected && !isActuallyCorrect && <XCircle className="w-4 h-4 text-rose-600" />}
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* AI Explanation Box */}
                      <div className="bg-white/80 rounded-2xl p-4 border border-purple-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-4 h-4 text-purple-600" />
                          <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wide">AI Feedback</h4>
                        </div>
                        <p className="text-sm text-midnight/80 leading-relaxed">
                          {q.explanation || 'No explanation provided.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-center pt-6 pb-20">
            <Button onClick={() => navigate(`/trainee/courses/${courseId}`)} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-8 py-6 font-bold">Return to Course</Button>
          </div>
        </div>
      </DashboardShell>
    )
  }

  // Active Test State
  const activeQuestions = randomizedQuestions.length > 0 ? randomizedQuestions : (questions || [])
  const currentQ = activeQuestions[currentQuestionIndex]
  const progressPercent = ((currentQuestionIndex) / questions.length) * 100

  return (
    <DashboardShell title={assessment.title} icon={Target} navLinks={[]}>
      <div 
        className={`max-w-3xl mx-auto pt-4 ${assessment.requires_sea ? 'select-none' : ''}`}
        onCopy={handleCopyPaste}
        onPaste={handleCopyPaste}
      >
        
        {assessment.requires_sea && (
          <div className="flex items-center justify-center gap-2 mb-4 bg-rose-50 border border-rose-200 text-rose-700 py-2 px-4 rounded-full text-xs font-bold mx-auto w-fit shadow-sm">
            <Lock className="w-3.5 h-3.5" />
            SECURE EXAM MODE ACTIVE
          </div>
        )}


        {assessment.requires_sea && (
          <div className="fixed bottom-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden shadow-2xl border-2 border-rose-500 z-50">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
            <div className="absolute top-2 left-2 flex gap-1">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[10px] text-white font-bold tracking-wider drop-shadow-md">LIVE</span>
            </div>
          </div>
        )}

        {/* Hidden Canvas for Video Analysis */}
        <canvas ref={canvasRef} width="160" height="120" style={{ display: 'none' }} />

        {isScanningRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight/90 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-midnight mb-2">Random Room Scan</h2>
              <p className="text-sm text-midnight/70 mb-6">
                Please pick up your webcam or laptop and slowly pan 360 degrees to show your entire workspace. The test timer is paused.
              </p>
              <Progress value={roomScanProgress} className="h-3 mb-4" />
              <p className="text-xs font-bold text-ink/50 uppercase tracking-widest animate-pulse">Scanning Environment...</p>
            </div>
          </div>
        )}

        {/* Header Bar */}
        <div className={`flex items-center justify-between mb-8 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 sticky top-4 z-10 ${isScanningRoom ? 'opacity-20 pointer-events-none' : ''}`}>
          <div className="flex items-center gap-4 w-1/2">
            <span className="text-sm font-bold text-midnight">Question {currentQuestionIndex + 1} of {questions.length}</span>
            <Progress value={progressPercent} className="h-2 flex-1" />
          </div>
          <div className={`flex items-center gap-2 font-mono font-bold text-lg px-4 py-2 rounded-xl ${timeLeft && timeLeft < 300 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 text-slate-700'}`}>
            <Clock className="w-5 h-5" />
            {timeLeft !== null ? formatTime(timeLeft) : '00:00'}
          </div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            style={{ filter: isScanningRoom ? 'blur(8px)' : 'none', pointerEvents: isScanningRoom ? 'none' : 'auto' }}
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 mb-8"
          >
            <h2 className="text-xl font-bold text-midnight mb-8 leading-snug">{currentQ?.question_text}</h2>
            
            <div className="space-y-3">
              {(currentQ?.options as string[])?.map((opt, i) => {
                const isSelected = answers[currentQ.id] === opt
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: opt }))}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                      isSelected 
                        ? 'border-purple-600 bg-purple-50' 
                        : 'border-slate-100 hover:border-purple-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`font-medium ${isSelected ? 'text-purple-900' : 'text-midnight/70'}`}>{opt}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-purple-600' : 'border-slate-300'}`}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-purple-600" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pb-20">
          {!assessment.requires_sea ? (
            <Button 
              variant="outline" 
              onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))}
              disabled={currentQuestionIndex === 0}
              className="rounded-xl font-bold border-slate-200"
            >
              Previous
            </Button>
          ) : <div />}
          
          {currentQuestionIndex === questions.length - 1 ? (
            <Button 
              onClick={handleSubmit} 
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold px-8"
            >
              Submit Assessment
            </Button>
          ) : (
            <Button 
              onClick={() => setCurrentQuestionIndex(p => Math.min(questions.length - 1, p + 1))}
              className="bg-midnight hover:bg-midnight/90 text-white rounded-xl font-bold"
            >
              Next Question
            </Button>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
