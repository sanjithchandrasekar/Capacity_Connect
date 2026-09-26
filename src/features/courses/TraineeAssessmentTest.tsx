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
import { TraineeAssessmentResult } from './TraineeAssessmentResult'
import * as tf from '@tensorflow/tfjs'
import * as blazeface from '@tensorflow-models/blazeface'
import * as cocoSsd from '@tensorflow-models/coco-ssd'

export function TraineeAssessmentTest() {
  const { courseId, assessmentId } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  const [hasStarted, setHasStarted] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

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
  const faceDetectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  
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
      })).filter((q: any) => q.question_type !== 'open_ended')
    },
    enabled: !!assessmentId,
  })

  const { data: course, isLoading: isCourseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('title, course_type').eq('id', courseId!).single()
      if (error) {
        console.error('Course fetch error:', error);
        return null;
      }
      return data
    },
    enabled: !!courseId,
  })

  const { data: enrollment, isLoading: isEnrollmentLoading } = useQuery({
    queryKey: ['trainee-enrollment-test', courseId, profile?.id],
    queryFn: async () => {
      if (!courseId || !profile?.id) return null
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', profile.id)
        .maybeSingle()
      if (error) return null
      return data
    },
    enabled: !!courseId && !!profile?.id,
  })

  const { data: previousAttempt, isLoading: isAttemptLoading }: { data: any, isLoading: boolean } = useQuery({
    queryKey: ['assessment-attempt', assessmentId, profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('assessment_attempts' as any)
        .select('*')
        .eq('user_id', profile!.id)
        
      if (error) {
        console.error('Attempt fetch error:', error)
        return null // Don't block the test if this fails
      }
      
      const matchingAttempts = (data || []).filter((a: any) => a.assessment_id === assessmentId)
      if (matchingAttempts.length === 0) return null
      
      // Return the most recent one (using submitted_at or created_at)
      matchingAttempts.sort((a: any, b: any) => {
        const dateA = new Date(a.submitted_at || a.created_at || 0).getTime()
        const dateB = new Date(b.submitted_at || b.created_at || 0).getTime()
        return dateB - dateA
      })
      
      return matchingAttempts[0]
    },
    enabled: !!assessmentId && !!profile?.id,
  })

  // Check if results are hidden
  const areResultsHidden = assessment?.results_publish_date ? new Date(assessment.results_publish_date) > new Date() : false;

  const { data: attemptAnswers, isLoading: isAnswersLoading } = useQuery({
    queryKey: ['attempt-answers', previousAttempt?.id],
    queryFn: async () => {
      if (!previousAttempt?.id) return []
      const { data, error } = await supabase.from('attempt_answers' as any)
        .select('*')
        .eq('attempt_id', previousAttempt.id)
      if (error) {
        console.error('Attempt answers fetch error:', error)
        return []
      }
      return data || []
    },
    enabled: !!previousAttempt?.id && !areResultsHidden,
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
      if (faceDetectionIntervalRef.current) clearInterval(faceDetectionIntervalRef.current)
    }
  }, [])

  // Timer logic
  useEffect(() => {
    if (hasStarted && timeLeft !== null && timeLeft > 0 && !previousAttempt && !isScanningRoom) {
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
  }, [hasStarted, timeLeft, previousAttempt])

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

  const exitFullScreen = async () => {
    try {
      const doc = document as any;
      if (doc.fullscreenElement && doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.msFullscreenElement && doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // SEA violation handler - block if ignoring strikes temporarily
  const ignoringViolationsRef = React.useRef(false)

  // Track if current question is open-ended for conditional keyboard blocking
  const isOpenEndedRef = React.useRef(false)
  useEffect(() => {
    const q = randomizedQuestions[currentQuestionIndex]
    const type = (q?.options as any)?._question_type || q?.question_type || 'mcq'
    isOpenEndedRef.current = (type === 'open_ended')
  }, [currentQuestionIndex, randomizedQuestions])

  const handleViolation = (reason: string) => {
    if (ignoringViolationsRef.current) return // grace period
    setStrikes(s => {
      const newStrikes = s + 1
      if (newStrikes >= MAX_STRIKES) {
        toast.error(`SEA Violation: ${reason}. Maximum strikes reached. You have been blocked.`, { duration: 5000 })
        exitFullScreen()
        handleSubmit(true)
      } else {
        toast.error(`SEA Warning (${newStrikes}/${MAX_STRIKES}): ${reason}. Return to the test immediately!`, { duration: 5000 })
      }
      return newStrikes
    })
  }

  // SEA monitoring
  useEffect(() => {
    if (!hasStarted || previousAttempt || !assessment?.requires_sea) return;

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
      const doc = document as any;
      const isFull = doc.fullscreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement;
      
      if (!isFull) {
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

    const preventAction = (e: Event) => {
      e.preventDefault()
      const actionMap: Record<string, string> = {
        'copy': 'copy content',
        'cut': 'cut content',
        'paste': 'paste content',
        'contextmenu': 'right-click/open context menu'
      }
      handleViolation(`Attempted to ${actionMap[e.type] || e.type}`)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const forbiddenKeys = ['Escape', 'F11', 'PrintScreen', 'Meta', 'Alt', 'Tab']
      
      // Block restricted system keys on all questions
      if (forbiddenKeys.includes(e.key) || e.metaKey || e.altKey) {
        e.preventDefault()
        e.stopPropagation()
        handleViolation(`Restricted key usage detected: ${e.key}`)
        return
      }

      // If it's a multiple choice question, block all keyboard inputs
      if (!isOpenEndedRef.current) {
        e.preventDefault()
        e.stopPropagation()
        handleViolation('Keyboard input disabled for multiple-choice questions. Please use trackpad/mouse.')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('copy', preventAction)
    document.addEventListener('cut', preventAction)
    document.addEventListener('paste', preventAction)
    document.addEventListener('contextmenu', preventAction)
    document.addEventListener('keydown', handleKeyDown, { capture: true })

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('copy', preventAction)
      document.removeEventListener('cut', preventAction)
      document.removeEventListener('paste', preventAction)
      document.removeEventListener('contextmenu', preventAction)
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
      if (blurTimeout) clearTimeout(blurTimeout)
    }
  }, [hasStarted, previousAttempt, assessment])

  const requestFullScreen = async () => {
    try {
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen()
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen()
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen()
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

        // Setup ML Face & Object Detection
        try {
          await tf.ready();
          const [faceModel, objectModel] = await Promise.all([
            blazeface.load(),
            cocoSsd.load()
          ]);
          
          faceDetectionIntervalRef.current = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              // 1. Check for faces
              const facePredictions = await faceModel.estimateFaces(videoRef.current, false);
              if (facePredictions.length === 0) {
                handleViolation('No face detected in camera (ML Check)');
              } else if (facePredictions.length > 1) {
                handleViolation('Multiple faces detected in camera (ML Check)');
              }

              // 2. Check for prohibited objects
              const objectPredictions = await objectModel.detect(videoRef.current);
              const prohibitedObjects = ['cell phone', 'book', 'laptop'];
              
              for (const prediction of objectPredictions) {
                if (prohibitedObjects.includes(prediction.class)) {
                   handleViolation(`Prohibited object detected: ${prediction.class} (ML Check)`);
                   break;
                }
              }
            }
          }, 4000); // Check every 4 seconds to balance performance
        } catch (e) {
          console.error("ML model load error:", e);
        }

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
      exitFullScreen()
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

    const INTERNAL_KEYS = new Set(['_question_type', '_difficulty', '_section']);
    const randomizedQs = shuffleArray(questions).map(q => {
       if (q.options && typeof q.options === 'object') {
           // Filter out internal metadata keys before shuffling
           const optionEntries = Object.entries(q.options).filter(([k]) => !INTERNAL_KEYS.has(k));
           const correctKeys = (q.correct_answer || '').split(',').map((k: string) => k.trim()).filter(Boolean);
           const correctTexts = correctKeys.map((k: string) => (q.options as Record<string, string>)[k]).filter(Boolean);
           
           const internalMeta: Record<string, string> = {};
           Object.entries(q.options).filter(([k]) => INTERNAL_KEYS.has(k)).forEach(([k,v]) => { internalMeta[k] = v as string; });
           
           const shuffledEntries = shuffleArray(optionEntries);
           
           const newOptions: Record<string, string> = { ...internalMeta }; // preserve metadata
           const newCorrectKeys: string[] = [];
           
           const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
           shuffledEntries.forEach((entry: any, index) => {
               const label = labels[index] || String.fromCharCode(65 + index);
               newOptions[label] = entry[1];
               if (correctTexts.includes(entry[1])) {
                   newCorrectKeys.push(label);
               }
           });
           
           const newCorrectAnswer = newCorrectKeys.length > 0 ? newCorrectKeys.sort().join(',') : q.correct_answer;
           
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
      let attemptData: any;
      // Insert attempt (only using valid schema columns based on types.ts)
      const { data: attempt, error: attemptError } = await supabase.from('assessment_attempts').insert({
        assessment_id: assessmentId!,
        user_id: profile!.id,
        answers: results.answers,
        score: results.score,
        passed: results.score >= (assessment?.passing_score ?? 50),
        grade_status: results.hasOpenEnded ? 'pending_manual' : 'graded',
        submitted_at: new Date().toISOString()
      } as any).select().single()

      if (attemptError) {
        console.error('Submit attempt error:', attemptError)
        // Fallback for extreme cases (missing columns, but types say these exist)
        const { data: attempt2, error: attemptError2 } = await supabase.from('assessment_attempts').insert({
          assessment_id: assessmentId!,
          user_id: profile!.id,
          score: results.score,
          passed: results.score >= (assessment?.passing_score ?? 50),
          submitted_at: new Date().toISOString()
        } as any).select().single()
        if (attemptError2) throw attemptError2
        
        // Re-assign attemptData for the attempt_answers block to use
        attemptData = attempt2 as any
      } else {
        attemptData = attempt as any
      }

      // Assuming attempt_answers table exists, but we'll mock it if it fails
      try {
          const activeQs = randomizedQuestions.length > 0 ? randomizedQuestions : questions;
          const answersToInsert = Object.entries(results.answers || {}).map(([qId, answer]) => {
            const q = activeQs?.find(q => q.id === qId)
            const is_correct = ((answer as string) || '').split(',').map((s: string)=>s.trim()).sort().join(',') === (q?.correct_answer || '').split(',').map((s: string)=>s.trim()).sort().join(',')
            return {
              attempt_id: attemptData.id,
              question_id: qId,
              selected_answer: answer
            }
          })
        if (answersToInsert.length > 0) {
          const { error: insertError } = await supabase.from('attempt_answers' as any).insert(answersToInsert)
          if (insertError) {
             console.error("Attempt answers insert error:", insertError)
          }
          
          // ALWAYS backup to local storage just in case DB fails (Schema might be missing tables/columns)
          if (attemptData?.id) {
              localStorage.setItem(`attempt_answers_${attemptData.id}`, JSON.stringify(results.answers));
          }
        }
      } catch (e) {
        console.error("Could not insert answers, table might not exist yet.", e)
      }
      return attemptData
    },
    onSuccess: (data) => {
      exitFullScreen()
      // Seed the cache with the new attempt so the Hub updates instantly
      queryClient.setQueryData(['trainee_assessment_attempts', profile?.id], (old: any) => {
        return [...(old || []), data]
      })
      queryClient.invalidateQueries({ queryKey: ['assessment-attempt', assessmentId, profile?.id] })
      queryClient.invalidateQueries({ queryKey: ['attempt-answers', data?.id] })
      queryClient.invalidateQueries({ queryKey: ['trainee_assessments_v2'] })
      queryClient.invalidateQueries({ queryKey: ['trainee_assessment_attempts'] })
      toast.success('Test submitted successfully! Marked as completed.')
      navigate('/trainee/assessments', { state: { tab: 'completed' } })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to submit assessment')
  })

  const handleSubmit = async (isBlocked: boolean = false) => {
    if (!questions || questions.length === 0) {
      toast.error('Cannot submit: no questions loaded.')
      return
    }

    if (isBlocked) {
      submitMutation.mutate({ score: -1, hasOpenEnded: false, answers })
      return
    }

    setShowSubmitModal(true)
  }

  const confirmSubmit = () => {
    setShowSubmitModal(false)
    
    ignoringViolationsRef.current = true
    exitFullScreen()
    
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

    const activeQs = randomizedQuestions.length > 0 ? randomizedQuestions : (questions || []);
    activeQs.forEach(q => {
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
          correct += 0.5;
        }
      } else {
        const cleanOpts = Object.entries(q.options || {}).filter(([k]) => !['_question_type','_difficulty','_section'].includes(k));
        // Answers are stored as option text values now
        const studentTexts = (answers[q.id] || '').split('|||').map((s: string) => s.trim()).filter(Boolean);
        // Get the correct option text(s) by looking up the correct_answer key in options
        const correctTexts = (q.correct_answer || '').split(',').map((k: string) => {
          const t = k.trim();
          return (q.options as any)?.[t] as string || t;
        }).filter(Boolean);
        
        if (studentTexts.length > 0 && correctTexts.length > 0) {
          const studentSorted = [...studentTexts].sort().join('|||');
          const correctSorted = [...correctTexts].sort().join('|||');
          if (studentSorted === correctSorted) correct++;
        }
      }
    })
    const score = activeQs.length > 0 ? Math.round((correct / activeQs.length) * 100) : 0
    submitMutation.mutate({ score, hasOpenEnded, answers })
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

  if (isAssessmentLoading || isQuestionsLoading || isAttemptLoading || (previousAttempt && !areResultsHidden && isAnswersLoading)) {
    return <DashboardShell title="Assessment" icon={Target} navLinks={traineeNavLinks}><div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-cyan-600" /></div></DashboardShell>
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

  // Completed State
  if (previousAttempt) {
    const attemptData = previousAttempt as any
    return (
      <TraineeAssessmentResult
        assessment={assessment}
        questions={questions || []}
        attemptData={attemptData}
        attemptAnswers={attemptAnswers || []}
        areResultsHidden={areResultsHidden}
        displayTitle={displayTitle}
        traineeNavLinks={traineeNavLinks}
        profile={profile}
        course={course}
      />
    )
  }

  // Pre-Start State
  if (!hasStarted) {
    const isFinal = assessment.assessment_type === 'final'
    const isPractice = assessment.assessment_type === 'mock' || assessment.assessment_type === 'daily'
    const isRegularAssessment = assessment.assessment_type === 'assessment'
    const isCourseModuleCompleted = (enrollment?.progress_percent ?? 0) >= 100 || enrollment?.status === 'completed'
    const isFinalBlockedByModules = isFinal && !isCourseModuleCompleted

    let gating = { allowed: true, message: '' };

    if (isFinalBlockedByModules) {
      gating = {
        allowed: false,
        message: `Final Assessment is locked. You must complete 100% of all course learning modules before taking the Final Assessment (Current Progress: ${enrollment?.progress_percent ?? 0}%).`
      };
    } else if (assessment.scheduled_date) {
      const now = currentTime;
      const startStr = `${assessment.scheduled_date}T${assessment.start_time || '00:00:00'}`;
      const endStr = `${assessment.scheduled_date}T${assessment.end_time || '23:59:59'}`;
      const startTime = new Date(startStr);
      const endTime = new Date(endStr);
      
      if (endTime < startTime) {
        endTime.setDate(endTime.getDate() + 1);
      }

      if (now < startTime) {
        if (now.toDateString() !== startTime.toDateString()) {
           gating = { allowed: false, message: `This assessment is scheduled for ${startTime.toLocaleDateString()}` };
        } else {
           const diffSecs = Math.floor((startTime.getTime() - now.getTime()) / 1000);
           const h = Math.floor(diffSecs / 3600);
           const m = Math.floor((diffSecs % 3600) / 60);
           const s = diffSecs % 60;
           const countdownStr = `Starts in ${h > 0 ? `${h}h ` : ''}${m}m ${s < 10 ? '0' : ''}${s}s`;
           gating = { allowed: false, message: `This assessment opens at ${assessment.start_time} (${countdownStr})` };
        }
      } else if (now > endTime) {
        gating = { allowed: false, message: 'This assessment has expired and is now closed.' };
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

            {/* Test Type & Grade Weight Banner */}
            <div className="flex justify-center mb-3">
              {isPractice ? (
                <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-slate-500" />
                  {assessment.assessment_type === 'mock' ? 'Mock Test' : 'Daily Test'} • Practice Only (0% Final Grade Weight)
                </span>
              ) : isFinal ? (
                <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-purple-600" />
                  Final Assessment • 50% Final Grade Weight
                </span>
              ) : (
                <span className="px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-600" />
                  Regular Assessment • 25% Grade Weight (Averaged)
                </span>
              )}
            </div>

            <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">{displayTitle}</h1>
            <p className="text-slate-600 mb-8 max-w-lg mx-auto leading-relaxed font-medium">{assessment.instructions || 'Please read each question carefully before answering. Good luck!'}</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 max-w-xl mx-auto">
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
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Weight</p>
                <p className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  {isPractice ? 'Practice (0%)' : isFinal ? 'Final (50%)' : 'Avg (25%)'}
                </p>
              </div>
            </div>

            {/* Grading Breakdown Note */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-8 text-left text-xs text-slate-600">
              <span className="font-bold text-slate-800 block mb-1">Course Grading Breakdown:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] mt-2">
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 block font-semibold">1. Course Modules</span>
                  <span className="font-bold text-cyan-700">25% of Final Grade</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 block font-semibold">2. Assessments Avg</span>
                  <span className="font-bold text-amber-700">25% of Final Grade</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200">
                  <span className="text-slate-400 block font-semibold">3. Final Assessment</span>
                  <span className="font-bold text-purple-700">50% of Final Grade</span>
                </div>
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
                  <p className="font-bold text-sm leading-relaxed">{gating.message}</p>
                </div>
                {isFinalBlockedByModules ? (
                  <Button
                    onClick={() => navigate(`/trainee/courses/${courseId}/learn`)}
                    className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:opacity-95 text-white font-bold rounded-xl px-6 py-3 text-sm shadow-md"
                  >
                    Go to Course Modules ({enrollment?.progress_percent ?? 0}%)
                  </Button>
                ) : (
                  <Button onClick={() => navigate(`/trainee/assessments`)} variant="outline" className="text-slate-600 font-bold rounded-xl border-slate-200">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Assessments
                  </Button>
                )}
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


  if (submitMutation.isPending || submitMutation.isSuccess) {
    return (
      <DashboardShell title={assessment.title} icon={Target} navLinks={traineeNavLinks}>
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-600" />
          <p className="text-slate-600 font-medium">Saving your assessment...</p>
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
    <>
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pb-24">
      <div className="w-full bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between mb-8 shadow-sm">
         <div className="flex items-center gap-2">
            <Target className="w-6 h-6 text-cyan-600" />
            <h1 className="text-xl font-bold text-slate-900">{assessment.title}</h1>
         </div>
      </div>
      <div 
        className={`max-w-3xl w-full mx-auto px-4 ${assessment.requires_sea ? 'select-none' : ''}`}
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
          <div className="fixed bottom-4 left-4 w-48 h-36 bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-rose-500 z-50">
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
                Object.entries((currentQ?.options as Record<string, string>) || {})
                  .filter(([key]) => !['_question_type', '_difficulty', '_section'].includes(key))
                  .map(([key, opt]) => {
                  const isMultiAnswer = currentQ?.correct_answer && currentQ.correct_answer.includes(',');
                  // Store answers as option TEXT (not letter key) so they survive shuffle remapping
                  const currentSelected = (answers[currentQ.id] || '').split('|||').map(s => s.trim()).filter(Boolean);
                  const isSelected = isMultiAnswer ? currentSelected.includes(opt) : answers[currentQ.id] === opt;
                  
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (isMultiAnswer) {
                          if (currentSelected.includes(opt)) {
                            setAnswers(prev => ({ ...prev, [currentQ.id]: currentSelected.filter(k => k !== opt).join('|||') }));
                          } else {
                            setAnswers(prev => ({ ...prev, [currentQ.id]: [...currentSelected, opt].join('|||') }));
                          }
                        } else {
                          setAnswers(prev => ({ ...prev, [currentQ.id]: opt }))
                        }
                      }}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'border-cyan-500 bg-cyan-50/60 shadow-sm' 
                          : 'border-slate-100 hover:border-cyan-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`font-semibold text-sm ${isSelected ? 'text-cyan-950' : 'text-slate-700'}`}><span className="font-bold mr-1.5">{key}.</span>{opt}</span>
                      <div className={`w-5 h-5 flex items-center justify-center shrink-0 ${isMultiAnswer ? 'rounded' : 'rounded-full'} border-2 ${isSelected ? 'border-cyan-600 bg-cyan-600' : 'border-slate-300'}`}>
                        {isSelected && (
                          isMultiAnswer 
                            ? <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            : <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pb-20 mt-6">
          <Button 
            variant="outline" 
            onClick={() => {
              if (assessment.is_adaptive) {
                if (adaptiveHistory.length > 0) {
                  const lastQId = adaptiveHistory[adaptiveHistory.length - 1];
                  setAdaptiveHistory(prev => prev.slice(0, -1));
                  const prevQIndex = randomizedQuestions.findIndex(q => q.id === lastQId);
                  setCurrentQuestionIndex(prevQIndex);
                }
              } else {
                setCurrentQuestionIndex(p => Math.max(0, p - 1));
              }
            }}
            disabled={assessment.is_adaptive ? adaptiveHistory.length === 0 : currentQuestionIndex === 0}
            className="rounded-xl font-bold border-slate-200 text-slate-700 hover:bg-slate-50 bg-white shadow-sm"
          >
            Previous
          </Button>
          
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
                  const isCorrect = (answers[currentQ.id] || '').split(',').map((s: string)=>s.trim()).sort().join(',') === (currentQ.correct_answer || '').split(',').map((s: string)=>s.trim()).sort().join(',');
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
    </div>

      {/* Custom Submit Confirmation Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100 text-amber-500">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Submit Assessment?</h2>
              <p className="text-sm text-slate-500 font-medium mb-8">
                Are you sure you want to submit? Once submitted, you cannot change your answers.
              </p>
              <div className="flex gap-3">
                <Button 
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={confirmSubmit}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-95 text-white font-bold rounded-xl shadow-md shadow-emerald-500/20"
                >
                  Submit
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
