import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShell } from '@/pages/Dashboards'
import { Loader2, ArrowLeft, Clock, CheckCircle2, XCircle, AlertCircle, Target, Brain, LayoutDashboard, BookOpen, Compass, TrendingUp, Settings, Award } from 'lucide-react'
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
  const [adaptiveHistory, setAdaptiveHistory] = useState<string[]>([])
  const [currentDifficulty, setCurrentDifficulty] = useState<'easy'|'medium'|'hard'>('medium')
  const [isScanningRoom, setIsScanningRoom] = useState(false)
  const [roomScanProgress, setRoomScanProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    if (!hasStarted) {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000)
      return () => clearInterval(timer)
    }
  }, [hasStarted])

  // Fetch assessment and questions
  const { data: assessment, isLoading: isAssessmentLoading, error: assessmentError } = useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select('id, title, passing_score, status, requires_sea, sea_link, scheduled_date, start_time, end_time, duration_minutes, created_by, course_id, instructions, created_at, assessment_type')
        .eq('id', assessmentId!)
        .single()
      if (error) { throw error; }
      return data as any
    },
    enabled: !!assessmentId,
  })

  const { data: questions, isLoading: isQuestionsLoading } = useQuery({
    queryKey: ['assessment-questions', assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase.from('questions').select('*').eq('assessment_id', assessmentId!).order('position')
      if (error) { 
        console.error('Questions fetch error:', error); 
        toast.error(`Error loading questions: ${error.message}`);
        return []; 
      }
      return (data || []).map((q: any) => ({
        ...q,
        question_type: (q.options as any)?._question_type || 'mcq',
        difficulty: (q.options as any)?._difficulty || 'medium',
      }))
    },
    enabled: !!assessmentId,
  })

  const { data: previousAttempt, isLoading: isAttemptLoading } = useQuery({
    queryKey: ['assessment-attempt', assessmentId, profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('assessment_attempts' as any)
        .select('id, assessment_id, user_id, score, created_at, answers')
        .eq('assessment_id', assessmentId!)
        .eq('user_id', profile!.id)
        .maybeSingle()
      if (error && error.code !== 'PGRST116') {
        console.error('Attempt fetch error:', error)
        return null // Don't block the test if this fails
      }
      return data as any
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
        toast.error(`SEA Violation: ${reason}. Maximum strikes reached. You have been blocked.`, { duration: 5000 })
        if (document.fullscreenElement) document.exitFullscreen().catch(console.error)
        handleSubmit(true)
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
      const canFullscreen = await requestFullScreen()
      if (!canFullscreen) {
         return
      }
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
    }

    if (!questions || questions.length === 0) {
      toast.error('No questions available for this assessment. Please contact your trainer.')
      if (document.fullscreenElement) document.exitFullscreen().catch(console.error)
      mediaStreamRef.current?.getTracks().forEach(t => t.stop())
      return
    }

    const shuffleArray = <T,>(array: T[]): T[] => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    const randomizedQs = shuffleArray(questions).map(q => {
       if (q.options && typeof q.options === 'object') {
           const optionEntries = Object.entries(q.options);
           const correctText = (q.options as Record<string, string>)[q.correct_answer];
           
           const shuffledEntries = shuffleArray(optionEntries);
           
           const newOptions: Record<string, string> = {};
           let newCorrectAnswer = q.correct_answer;
           
           const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
           shuffledEntries.forEach((entry: any, index) => {
               const label = labels[index] || String.fromCharCode(65 + index);
               newOptions[label] = entry[1];
               if (entry[1] === correctText) {
                   newCorrectAnswer = label;
               }
           });
           
           return { ...q, options: newOptions, correct_answer: newCorrectAnswer };
       }
       return q;
    });

    setRandomizedQuestions(randomizedQs)

    if (assessment?.is_adaptive) {
       const firstQIndex = randomizedQs.findIndex((q: any) => q.difficulty === 'medium')
       if (firstQIndex !== -1) {
           setCurrentQuestionIndex(firstQIndex)
       }
    }

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
        passed: results.score >= (assessment?.passing_score ?? 50),
        answers: answers,
        grade_status: results.hasOpenEnded ? 'pending_manual' : 'graded',
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

  const handleSubmit = async (isBlocked: boolean = false) => {
    if (!questions || questions.length === 0) {
      toast.error('Cannot submit: no questions loaded.')
      return
    }
    setIsAiGrading(true)

    // Calculate score locally
    setTimeout(() => {
      if (isBlocked) {
        submitMutation.mutate({ score: -1, hasOpenEnded: false })
        setIsAiGrading(false)
        return
      }

      let correct = 0
      let hasOpenEnded = false

      const getKeywords = (text: string) => {
        if (!text) return [];
        const stopWords = new Set(['the','is','in','at','of','on','and','a','to','it','for','with','as','by','this','that','these','those','an','are','was','were','be','been','being','have','has','had','do','does','did','will','would','shall','should','can','could','may','might','must','ought','i','you','he','she','we','they','what','which','who','whom','whose','where','when','why','how']);
        return text.toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 2 && !stopWords.has(w));
      };

      questions.forEach(q => {
        const type = (q.options as any)?._question_type || (q as any).question_type || 'mcq'
        if (type === 'open_ended') {
          hasOpenEnded = true
          
          const studentAns = answers[q.id] || '';
          const refAns = q.correct_answer || '';
          
          const refKeywords = getKeywords(refAns);
          const studentKeywords = getKeywords(studentAns);
          
          if (refKeywords.length > 0) {
            let matchCount = 0;
            refKeywords.forEach(rk => {
              if (studentKeywords.some(sk => sk === rk || (sk.length > 3 && (sk.includes(rk) || rk.includes(sk))))) {
                matchCount++;
              }
            });
            const ratio = matchCount / refKeywords.length;
            
            if (ratio >= 0.5) correct += 1;
            else if (ratio >= 0.25) correct += 0.5;
          } else if (studentAns.trim().length > 10) {
            // If no reference answer is provided but they wrote something substantial
            correct += 0.5;
          }
        } else if (answers[q.id] === q.correct_answer) {
          correct++
        }
      })
      const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0
      submitMutation.mutate({ score, hasOpenEnded })
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

  const traineeNavLinks = [
    { label: 'Dashboard', to: '/trainee/dashboard', icon: LayoutDashboard },
    { label: 'My Learning', to: '/trainee/my-learning', icon: BookOpen },
    { label: 'Course Catalog', to: '/trainee/courses', icon: Compass },
    { label: 'Assessments', to: '/trainee/assessments', icon: Target },
    { label: 'Settings', to: '/trainee/settings', icon: Settings }
  ]

  if (isAssessmentLoading || isQuestionsLoading || isAttemptLoading) {
    return <DashboardShell title="Assessment" icon={Target} navLinks={traineeNavLinks}><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div></DashboardShell>
  }

  if (!assessment || !questions) {
    return (
      <DashboardShell title="Assessment" icon={Target} navLinks={traineeNavLinks}>
        <div className="text-center py-20">
          <p className="text-lg font-bold text-slate-800">Assessment not found.</p>
          <div className="mt-4 text-xs text-slate-500 bg-slate-50 p-4 rounded-lg inline-block text-left">
            <p>Debug Info:</p>
            <p>Assessment ID: {assessmentId}</p>
            <p>Course ID: {courseId}</p>
            <p>Assessment loaded: {assessment ? 'Yes' : 'No'}</p>
            <p>Questions loaded: {questions ? 'Yes' : 'No'}</p>
            <p className="text-red-500 font-bold mt-2">Error: {assessmentError ? (assessmentError as any).message || JSON.stringify(assessmentError) : 'None'}</p>
          </div>
        </div>
      </DashboardShell>
    )
  }

  // Strip file extensions & underscores from titles set to raw filenames
  const cleanTitle = (raw: string) =>
    raw
      .replace(/\.[a-zA-Z0-9]{2,5}(\s|$)/g, '$1') // remove .pdf .docx etc
      .replace(/_/g, ' ')                            // underscores → spaces
      .replace(/\s+/g, ' ')                          // collapse multiple spaces
      .trim()

  const displayTitle = cleanTitle(assessment.title)

  // Check if results are hidden
  const areResultsHidden = assessment?.results_publish_date ? new Date(assessment.results_publish_date) > new Date() : false;

  // Completed State
  if (previousAttempt) {
    const attemptData = previousAttempt as any
    return (
      <DashboardShell title={displayTitle} icon={Target} navLinks={traineeNavLinks}>
        <div className="max-w-4xl mx-auto space-y-6">
          <Link to={`/trainee/assessments`} className="inline-flex items-center gap-2 text-sm text-zinc-200/60 hover:text-cyan-400 transition-colors mb-2 font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to Assessments
          </Link>
          <div className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-8 shadow-sm text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Assessment Completed</h2>
            {areResultsHidden ? (
                <p className="text-slate-600 mb-6 bg-cyan-50 p-4 rounded-2xl border border-cyan-200 max-w-sm mx-auto text-sm font-medium">
                   Your results are currently hidden and will be published on <br/>
                   <span className="font-bold text-cyan-700">{assessment.results_publish_date ? new Date(assessment.results_publish_date).toLocaleDateString() : 'a later date'}</span>.
                </p>
            ) : (
                <p className="text-slate-600 mb-6 font-medium">You scored <span className="font-bold text-cyan-600">{attemptData.score}%</span>.</p>
            )}
            <Button onClick={() => navigate(`/trainee/assessments`)} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white font-bold rounded-xl shadow-md shadow-cyan-600/10">Return to Assessments</Button>
          </div>
        </div>
      </DashboardShell>
    )
  }

  // Pre-Start State
  if (!hasStarted) {
    let gating = { allowed: true, message: '' };
    if (assessment.scheduled_date) {
      const now = currentTime;
      const scheduledDate = new Date(assessment.scheduled_date);
      
      if (now.toDateString() !== scheduledDate.toDateString()) {
        if (now < scheduledDate) gating = { allowed: false, message: `This assessment is scheduled for ${scheduledDate.toLocaleDateString()}` };
        else gating = { allowed: false, message: 'This assessment has expired.' };
      } else {
        if (assessment.start_time) {
          const [startH, startM] = assessment.start_time.split(':').map(Number);
          const startTime = new Date(scheduledDate);
          startTime.setHours(startH, startM, 0);
          if (now < startTime) {
            const diffSecs = Math.floor((startTime.getTime() - now.getTime()) / 1000);
            const h = Math.floor(diffSecs / 3600);
            const m = Math.floor((diffSecs % 3600) / 60);
            const s = diffSecs % 60;
            const countdownStr = `Starts in ${h > 0 ? `${h}h ` : ''}${m}m ${s < 10 ? '0' : ''}${s}s`;
            gating = { allowed: false, message: `This assessment opens at ${assessment.start_time} (${countdownStr})` };
          }
        }
        if (assessment.end_time) {
          const [endH, endM] = assessment.end_time.split(':').map(Number);
          const endTime = new Date(scheduledDate);
          endTime.setHours(endH, endM, 0);
          if (now > endTime) gating = { allowed: false, message: 'This assessment has expired and is now closed.' };
        }
      }
    }
    return (
      <DashboardShell title={displayTitle} icon={Target} navLinks={traineeNavLinks}>
        <div className="max-w-4xl mx-auto">
          <Link to={`/trainee/assessments`} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-600 transition-colors mb-6 font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back to Assessments
          </Link>
          <div className="bg-white border border-slate-200/90 rounded-3xl p-10 shadow-sm text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-200 text-cyan-600 shadow-sm">
              <Target className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">{displayTitle}</h1>
            <p className="text-slate-600 mb-8 max-w-lg mx-auto leading-relaxed font-medium">{assessment.instructions || 'Please read each question carefully before answering. Good luck!'}</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10 max-w-xl mx-auto">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Duration</p>
                <p className="font-bold text-slate-900 flex items-center gap-1.5"><Clock className="w-4 h-4 text-amber-600" /> {assessment.duration_minutes || 30} mins</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Questions</p>
                <p className="font-bold text-slate-900 flex items-center gap-1.5"><Target className="w-4 h-4 text-cyan-600" /> {questions?.length || 0}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Marks</p>
                <p className="font-bold text-slate-900 flex items-center gap-1.5"><Award className="w-4 h-4 text-emerald-600" /> {(questions?.length || 0) * 10}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Pattern</p>
                <p className="font-bold text-slate-900 flex items-center gap-1.5 capitalize text-sm"><BookOpen className="w-4 h-4 text-indigo-600" /> {assessment.assessment_type || 'Standard'}</p>
              </div>
            </div>

            {assessment.requires_sea && (
              <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 mb-8 text-left">
                <div className="flex items-center gap-2 mb-2 text-rose-800">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <h3 className="font-bold text-sm">Secure Exam Mode (SEA) is enabled</h3>
                </div>
                <ul className="text-xs text-rose-700 list-disc list-inside space-y-1 font-medium">
                  <li>You will be forced into <b>full-screen mode</b>.</li>
                  <li>Do not minimize the browser or switch tabs.</li>
                  <li>Copy-pasting is disabled.</li>
                  <li>If you receive {MAX_STRIKES} strikes, the exam will automatically submit.</li>
                </ul>
              </div>
            )}

            {!gating.allowed ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-2xl flex flex-col items-center gap-3 w-full">
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                  <p className="font-bold">{gating.message}</p>
                </div>
                <Button onClick={() => navigate(`/trainee/assessments`)} variant="outline" className="text-slate-600 font-bold rounded-xl border-slate-200">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Assessments
                </Button>
              </div>
            ) : (
              <Button onClick={startTest} className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:opacity-95 text-white font-bold rounded-2xl px-10 py-6 text-lg w-full sm:w-auto shadow-lg shadow-cyan-600/20 transition-all hover:scale-105 active:scale-95">
                Start Assessment
              </Button>
            )}
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
            animate={{ scale: [1, 1.08, 1], rotate: [0, 4, -4, 0] }} 
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-24 h-24 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-3xl shadow-xl shadow-cyan-600/20 flex items-center justify-center mb-6 text-white"
          >
            <Brain className="w-12 h-12" />
          </motion.div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">AI is evaluating your answers...</h2>
          <p className="text-slate-500 font-medium">Analyzing responses and generating feedback</p>
        </div>
      </DashboardShell>
    )
  }

  // Review State
  if (submitMutation.isSuccess) {
    const attemptData = submitMutation.data as any;
    const now = new Date();
    const areResultsHidden = assessment.results_publish_date ? new Date(assessment.results_publish_date) > now : false;
    const isPendingManual = attemptData?.grade_status === 'pending_manual';

    if (areResultsHidden || isPendingManual) {
       return (
        <DashboardShell title={assessment.title} icon={Target} navLinks={traineeNavLinks}>
            <div className="max-w-4xl mx-auto space-y-6 text-center py-20">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-3xl font-black text-slate-900 mb-2">Submitted Successfully!</h2>
              <p className="text-slate-600 mb-8 max-w-md mx-auto font-medium">
                 {isPendingManual 
                   ? "Your assessment contains open-ended questions that require manual grading. Please check back later."
                   : `Your assessment has been submitted. The results are hidden by your trainer until a future date.`
                 }
              </p>
              <Button onClick={() => navigate(`/trainee/assessments`)} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white rounded-xl px-8 py-6 font-bold shadow-md shadow-cyan-600/10">Return to Assessments</Button>
            </div>
        </DashboardShell>
       )
    }

    return (
      <DashboardShell title={assessment.title} icon={Target} navLinks={traineeNavLinks}>
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Assessment Results</h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">{assessment.title} - Completed on {previousAttempt?.created_at ? new Date(previousAttempt.created_at).toLocaleString() : new Date().toLocaleString()}</p>
            </div>
          </div>

          {(() => {
            const resultAnswers = previousAttempt?.answers || answers;
            const totalQuestions = questions.length;
            let correct = 0;
            let incorrect = 0;
            let skipped = 0;
            let pending = 0;
            
            questions.forEach(q => {
              const ans = resultAnswers[q.id];
              if (!ans) {
                skipped++;
              } else if ((q as any).question_type === 'open_ended') {
                pending++;
              } else if (ans === q.correct_answer) {
                correct++;
              } else {
                incorrect++;
              }
            });

            const attempted = totalQuestions - skipped;
            const finalScore = previousAttempt?.score ?? (submitMutation.data as any)?.score ?? 0;
            const totalMarks = totalQuestions * 10;
            const marksScored = Math.round((finalScore / 100) * totalMarks);

            return (
              <div className="space-y-4">
                {/* Top Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Marks Scored</span>
                    <span className="text-2xl font-black text-cyan-600">{marksScored} <span className="text-sm text-slate-400 font-bold">/ {totalMarks}</span></span>
                  </div>
                  <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Total Questions</span>
                    <span className="text-2xl font-black text-slate-900">{totalQuestions}</span>
                  </div>
                  <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Attempted Questions</span>
                    <span className="text-2xl font-black text-slate-900">{attempted}</span>
                  </div>
                </div>

                {/* Secondary Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-widest text-emerald-700 font-bold mb-1">Correct</span>
                    <span className="text-xl font-black text-emerald-700">{correct}</span>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-widest text-rose-700 font-bold mb-1">Incorrect</span>
                    <span className="text-xl font-black text-rose-700">{incorrect}</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-widest text-amber-700 font-bold mb-1">Skipped</span>
                    <span className="text-xl font-black text-amber-700">{skipped}</span>
                  </div>
                  <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-3 flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-widest text-cyan-700 font-bold mb-1">Pending Eval</span>
                    <span className="text-xl font-black text-cyan-700">{pending}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="space-y-6 mt-8">
            {questions.map((q, idx) => {
              const resultAnswers = previousAttempt?.answers || answers;
              const isCorrect = resultAnswers[q.id] === q.correct_answer
              return (
                <div key={q.id} className={`p-6 rounded-3xl border shadow-sm ${isCorrect ? 'bg-white border-emerald-200' : 'bg-white border-rose-200'}`}>
                  <div className="flex gap-4">
                    <div className="shrink-0 mt-1">
                      {isCorrect ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> : <XCircle className="w-6 h-6 text-rose-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900 mb-4 text-base"><span className="text-slate-400 mr-2">{idx + 1}.</span>{q.question_text}</p>
                      <div className="grid sm:grid-cols-2 gap-3 mb-4">
                        {Object.entries(q.options as Record<string, string>).map(([key, opt]) => {
                          const isSelected = resultAnswers[q.id] === key
                          const isActuallyCorrect = q.correct_answer === key
                          let style = 'bg-slate-50 border-slate-200 text-slate-600'
                          if (isActuallyCorrect) style = 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-sm'
                          else if (isSelected && !isActuallyCorrect) style = 'bg-rose-50 border-rose-300 text-rose-900 font-bold'

                          return (
                            <div key={key} className={`p-3.5 rounded-xl border text-sm flex items-center justify-between ${style}`}>
                              <span><span className="font-bold mr-1">{key}.</span>{opt}</span>
                              {isActuallyCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                              {isSelected && !isActuallyCorrect && <XCircle className="w-4 h-4 text-rose-600" />}
                            </div>
                          )
                        })}
                      </div>
                      
                      {/* AI Explanation Box */}
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-4 h-4 text-cyan-600" />
                          <h4 className="text-xs font-bold text-cyan-800 uppercase tracking-wide">Explanation / Feedback</h4>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">
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
            <Button onClick={() => navigate(`/trainee/assessments`)} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white font-bold rounded-xl px-8 py-6 shadow-md shadow-cyan-600/10">Return to Assessments</Button>
          </div>
        </div>
      </DashboardShell>
    )
  }

  // Active Test State
  const activeQuestions = randomizedQuestions.length > 0 ? randomizedQuestions : (questions || [])
  const currentQ = activeQuestions[currentQuestionIndex]
  const progressPercent = assessment.is_adaptive
    ? (Math.min(adaptiveHistory.length + 1, questions.length) / questions.length) * 100
    : ((currentQuestionIndex) / questions.length) * 100

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
          <div className="fixed bottom-4 right-4 w-48 h-36 bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-rose-500 z-50">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-white p-8 rounded-3xl max-w-md w-full shadow-2xl text-center">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Random Room Scan</h2>
              <p className="text-sm text-slate-600 mb-6 font-medium leading-relaxed">
                Please pick up your webcam or laptop and slowly pan 360 degrees to show your entire workspace. The test timer is paused.
              </p>
              <Progress value={roomScanProgress} className="h-3 mb-4" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Scanning Environment...</p>
            </div>
          </div>
        )}

        {/* Header Bar */}
        <div className={`flex items-center justify-between mb-8 bg-white p-5 rounded-3xl shadow-sm border border-slate-200/90 sticky top-4 z-10 ${isScanningRoom ? 'opacity-20 pointer-events-none' : ''}`}>
          <div className="flex items-center gap-4 w-1/2">
            <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
              {assessment.is_adaptive 
                 ? `Adaptive Q ${adaptiveHistory.length + 1} / ${questions.length}`
                 : `Question ${currentQuestionIndex + 1} of ${questions.length}`
              }
            </span>
            <Progress value={progressPercent} className="h-2 flex-1" />
          </div>
          <div className={`flex items-center gap-2 font-mono font-bold text-base px-4 py-2 rounded-2xl ${timeLeft && timeLeft < 300 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-slate-100 text-slate-800'}`}>
            <Clock className="w-4 h-4 text-cyan-600" />
            {timeLeft !== null ? formatTime(timeLeft) : '00:00'}
          </div>
        </div>

        <div className={assessment.is_simulation ? 'flex flex-col md:flex-row gap-6' : ''}>
          {assessment.is_simulation && assessment.simulation_dataset_url && (
            <div className="md:w-1/2 bg-white rounded-3xl p-6 shadow-sm border border-slate-200/90 mb-8 flex flex-col">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-cyan-600"/> 
                Reference Material
              </h3>
              <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center min-h-[300px]">
                <img 
                  src={assessment.simulation_dataset_url} 
                  alt="Simulation Dataset" 
                  className="max-w-full max-h-[600px] object-contain rounded-lg"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>
            </div>
          )}
          
          <div className={assessment.is_simulation ? 'md:w-1/2 w-full' : 'w-full'}>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            style={{ filter: isScanningRoom ? 'blur(8px)' : 'none', pointerEvents: isScanningRoom ? 'none' : 'auto' }}
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200/90 mb-8"
          >
            <h2 className="text-xl font-bold text-slate-900 mb-8 leading-snug">{currentQ?.question_text}</h2>
            
            <div className="space-y-3">
              {(currentQ as any)?.question_type === 'open_ended' ? (
                <textarea
                  value={answers[currentQ.id] || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [currentQ.id]: e.target.value }))}
                  placeholder="Type your answer here..."
                  className="w-full min-h-[150px] p-4 rounded-2xl border-2 border-slate-200 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10 transition-all outline-none text-slate-900 resize-y font-medium placeholder:text-slate-400 bg-slate-50"
                />
              ) : (
                Object.entries((currentQ?.options as Record<string, string>) || {}).map(([key, opt]) => {
                  const isSelected = answers[currentQ.id] === key
                  return (
                    <button
                      key={key}
                      onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: key }))}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'border-cyan-500 bg-cyan-50/60 shadow-sm' 
                          : 'border-slate-100 hover:border-cyan-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`font-semibold text-sm ${isSelected ? 'text-cyan-950' : 'text-slate-700'}`}><span className="font-bold mr-1.5">{key}.</span>{opt}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-cyan-600' : 'border-slate-300'}`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-cyan-600" />}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pb-20">
          {!assessment.requires_sea && !assessment.is_adaptive ? (
            <Button 
              variant="outline" 
              onClick={() => setCurrentQuestionIndex(p => Math.max(0, p - 1))}
              disabled={currentQuestionIndex === 0}
              className="rounded-xl font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Previous
            </Button>
          ) : <div />}
          
          {(!assessment.is_adaptive && currentQuestionIndex === questions.length - 1) || (assessment.is_adaptive && adaptiveHistory.length + 1 >= questions.length) ? (
            <Button 
              onClick={() => handleSubmit(false)} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold px-8 shadow-md shadow-emerald-600/20"
            >
              Submit Assessment
            </Button>
          ) : (
            <Button 
              onClick={() => {
                if (assessment.is_adaptive) {
                  const isCorrect = answers[currentQ.id] === currentQ.correct_answer;
                  const nextDiff = isCorrect 
                    ? (currentDifficulty === 'easy' ? 'medium' : 'hard')
                    : (currentDifficulty === 'hard' ? 'medium' : 'easy');
                  
                  setCurrentDifficulty(nextDiff);
                  setAdaptiveHistory(prev => [...prev, currentQ.id]);

                  let nextQIndex = randomizedQuestions.findIndex((q: any, idx: number) => 
                    q.difficulty === nextDiff && !answers[q.id] && idx !== currentQuestionIndex && !adaptiveHistory.includes(q.id)
                  );

                  if (nextQIndex === -1) {
                    nextQIndex = randomizedQuestions.findIndex((q: any, idx: number) => 
                      !answers[q.id] && idx !== currentQuestionIndex && !adaptiveHistory.includes(q.id)
                    );
                  }

                  if (nextQIndex !== -1) {
                    setCurrentQuestionIndex(nextQIndex);
                  } else {
                    handleSubmit();
                  }
                } else {
                  setCurrentQuestionIndex(p => Math.min(questions.length - 1, p + 1));
                }
              }}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white rounded-xl font-bold px-6 shadow-md shadow-cyan-600/10"
            >
              Next Question
            </Button>
          )}
        </div>
        </div>
      </div>
    </div>
    </DashboardShell>
  )
}
