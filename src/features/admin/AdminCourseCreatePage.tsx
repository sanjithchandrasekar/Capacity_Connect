import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Database } from '@/integrations/supabase/types'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft, ArrowRight, CheckCircle, Check, Loader2, Plus, Upload, X,
  BookOpen, Settings, Target, Eye, AlertCircle, FileText, File, Image,
  Video, Link2, ExternalLink, Globe, Trash2, Layers, Trophy, Film, Camera,
  Sparkles, AlignLeft, HelpCircle, CheckSquare, Award, ArrowUp, ArrowDown, Edit3, GripVertical, Clock,
  UserCheck, Zap, TrendingUp, Megaphone
} from 'lucide-react'
import { toast } from 'sonner'
import { ImageCropperModal } from '@/components/ui/ImageCropperModal'
import { CourseCertificateStep } from '@/features/courses/CourseCertificateStep'

type Skill = Database['public']['Tables']['skills']['Row']

type Trainer = {
  id: string
  full_name: string
  email: string
  qualifications?: string | null
  years_of_experience?: number | null
  bio?: string | null
  expertise_areas?: string[] | null
  availability?: string | null
  skills?: string[]
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correct_option: number
  explanation?: string
}

export interface ModuleItem {
  id: string
  type: 'photo' | 'video' | 'link' | 'text' | 'quiz'
  title: string
  content?: string
  url?: string
  duration_minutes?: number
  duration_seconds?: number
  file?: File
  previewUrl?: string
  storagePath?: string
  fileName?: string
  fileSize?: number
  quiz_data?: QuizQuestion
}

export interface CourseModule {
  id: string
  title: string
  description: string
  items: ModuleItem[]
  quiz_questions?: QuizQuestion[]
  passing_score?: number
}

const detailsSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  course_type: z.string().min(2, 'Course type is required'),
  department: z.string().optional(),
})

const settingsSchema = z.object({
  duration_hours: z.coerce.number().positive('Duration must be positive').optional(),
  passing_score: z.coerce.number().min(1).max(100).optional(),
  meet_link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  planned_assessments_count: z.coerce.number().min(0).optional(),
  planned_mock_tests_count: z.coerce.number().min(0).optional(),
  final_test_date: z.string().optional(),
  final_test_start_time: z.string().optional(),
  final_test_end_time: z.string().optional(),
  delivery_mode: z.enum(['recorded', 'live', 'hybrid']).optional(),
  max_trainees: z.coerce.number().min(50, 'Minimum capacity is 50').max(250, 'Maximum capacity is 250').optional(),
  trainer_suggestion: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.start_date) {
    const start = new Date(data.start_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 30) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Course must start at least 1 month from today',
        path: ['start_date']
      })
    }
  }
})

const objectivesSchema = z.object({
  learning_objectives: z.string().min(5, 'Describe what learners will achieve from this course'),
})

const sessionFlowSchema = z.object({
  session_flow_text: z.string().optional(),
})

const trainerSchema = z.object({
  trainer_id: z.string().min(1, 'Please select a trainer to lead this course'),
  assignment_message: z.string().optional(),
})

type DetailsData = z.infer<typeof detailsSchema>
type SettingsData = z.infer<typeof settingsSchema>
type ObjectivesData = z.infer<typeof objectivesSchema>
type SessionFlowData = z.infer<typeof sessionFlowSchema>
type TrainerData = z.infer<typeof trainerSchema>

interface PendingMaterial {
  id: string
  file?: File
  fileName: string
  fileSize: number
  mimeType: string
  materialType: 'file' | 'link' | 'video'
  url?: string
  storagePath?: string
  preview?: string
}

const MAX_FILE_SIZE = 100 * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.pptx', '.ppt', '.txt', '.mp4', '.webm', '.mov', '.png', '.jpg', '.jpeg', '.gif', '.webp']

function getFileIcon(mime: string) {
  if (mime.startsWith('video/')) return Video
  if (mime.startsWith('image/')) return Image
  if (mime.includes('pdf')) return FileText
  return File
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const STEPS = [
  { id: 1, label: 'Course Details', icon: BookOpen },
  { id: 2, label: 'Course Configuration', icon: Settings },
  { id: 3, label: 'Course Outline', icon: FileText },
  { id: 4, label: 'Learning & Skills', icon: Target },
  { id: 5, label: 'Modules', icon: Layers },
  { id: 6, label: 'Materials', icon: FileText },
  { id: 7, label: 'Trainer', icon: UserCheck },
  { id: 8, label: 'Certificate', icon: Award },
  { id: 9, label: 'Review & Publish', icon: Eye },
]

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

export function AdminCourseCreatePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [hasCertificate, setHasCertificate] = useState(true)
  const [certificateTemplateUrl, setCertificateTemplateUrl] = useState<string | null>(null)
  const [certificateTemplateName, setCertificateTemplateName] = useState<string | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loadingTrainers, setLoadingTrainers] = useState(true)
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [customSkillName, setCustomSkillName] = useState('')
  const [addingSkill, setAddingSkill] = useState(false)
  const [isCustomType, setIsCustomType] = useState(false)
  const [isCropperOpen, setIsCropperOpen] = useState(false)
  const [rawImageFile, setRawImageFile] = useState<File | null>(null)
  const [isAnalyzingCompetency, setIsAnalyzingCompetency] = useState(false)
  const [trainerTab, setTrainerTab] = useState<'ai_recommended' | 'all'>('ai_recommended')
  const thumbRef = useRef<HTMLInputElement>(null)

  // Modules state
  const [modules, setModules] = useState<CourseModule[]>([
    {
      id: crypto.randomUUID(),
      title: 'Module 1: Introduction & Fundamentals',
      description: 'Foundational concepts, overview content, photos, and video resources.',
      items: [],
    },
  ])

  // Active module item adding state
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [addingItemType, setAddingItemType] = useState<'photo' | 'video' | 'link' | 'text' | null>(null)
  const [itemTitle, setItemTitle] = useState('')
  const [itemContent, setItemContent] = useState('')
  const [itemUrl, setItemUrl] = useState('')
  const [itemDurationMinutes, setItemDurationMinutes] = useState<string>('5')
  const [itemFile, setItemFile] = useState<File | null>(null)
  const [itemPreview, setItemPreview] = useState<string | null>(null)
  const moduleFileInputRef = useRef<HTMLInputElement>(null)

  // Active module quiz question state
  const [activeQuizModuleId, setActiveQuizModuleId] = useState<string | null>(null)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [quizQuestionText, setQuizQuestionText] = useState('')
  const [quizOptions, setQuizOptions] = useState<string[]>(['', '', '', ''])
  const [quizCorrectOption, setQuizCorrectOption] = useState<number>(0)
  const [quizExplanation, setQuizExplanation] = useState('')
  const [isGeneratingAiQuiz, setIsGeneratingAiQuiz] = useState(false)

  // Materials state
  const [pendingMaterials, setPendingMaterials] = useState<PendingMaterial[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [activeTab, setActiveTab] = useState<'files' | 'links'>('files')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const detailsForm = useForm<DetailsData>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { title: '', description: '', course_type: 'standard', department: '' },
  })

  const settingsForm = useForm<SettingsData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { passing_score: 60, delivery_mode: 'recorded' },
  })

  const objectivesForm = useForm<ObjectivesData>({
    resolver: zodResolver(objectivesSchema),
    defaultValues: { learning_objectives: '' },
  })

  const sessionFlowForm = useForm<SessionFlowData>({
    resolver: zodResolver(sessionFlowSchema),
    defaultValues: { session_flow_text: '' },
  })

  const trainerForm = useForm<TrainerData>({
    resolver: zodResolver(trainerSchema),
    defaultValues: { trainer_id: '', assignment_message: '' },
  })

  const [sessionFlowDoc, setSessionFlowDoc] = useState<File | null>(null)

  // Calculate course days dynamically
  const courseDays = useMemo(() => {
    const start = settingsForm.watch('start_date')
    const end = settingsForm.watch('end_date')
    if (start && end) {
      const diff = new Date(end).getTime() - new Date(start).getTime()
      return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    }
    return null
  }, [settingsForm.watch('start_date'), settingsForm.watch('end_date')])

  const isUrgent = useMemo(() => {
    const start = settingsForm.watch('start_date')
    if (start) {
      const diff = new Date(start).getTime() - new Date().getTime()
      const diffDays = diff / (1000 * 60 * 60 * 24)
      return diffDays < 30
    }
    return false
  }, [settingsForm.watch('start_date')])

  // Calculate final exam duration dynamically
  const startTime = settingsForm.watch('final_test_start_time')
  const endTime = settingsForm.watch('final_test_end_time')
  let examDuration = ''
  if (startTime && endTime) {
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    let diffMins = (endH * 60 + endM) - (startH * 60 + startM)
    if (diffMins < 0) diffMins += 24 * 60 // handle overnight
    const h = Math.floor(diffMins / 60)
    const m = diffMins % 60
    examDuration = `${h > 0 ? `${h}h ` : ''}${m > 0 ? `${m}m` : ''}` || '0m'
  }

  useEffect(() => {
    const fetchTrainersAndSkills = async () => {
      setLoadingTrainers(true)
      try {
        const [{ data: trData }, { data: skData }, { data: usData }] = await Promise.all([
          supabase.from('trainers').select('id, full_name, email, qualifications, years_of_experience, bio, expertise_areas, availability').eq('approval_status', 'approved').order('full_name'),
          supabase.from('skills').select('*').order('name'),
          supabase.from('user_skills').select('user_id, skill_id, skills(id, name)'),
        ])

        if (skData && skData.length > 0) {
          setSkills(skData)
        } else {
          const defaultSkills: Skill[] = [
            { id: 'sk-1', name: 'Cyclone Tracking & Analysis', category: 'Meteorology', created_at: '' },
            { id: 'sk-2', name: 'Emergency Warning Communication', category: 'Operations', created_at: '' },
            { id: 'sk-3', name: 'Satellite & Radar Telemetry', category: 'Technical', created_at: '' },
            { id: 'sk-4', name: 'Disaster Preparedness', category: 'Disaster Management', created_at: '' },
            { id: 'sk-5', name: 'Flood Hazard Mapping', category: 'Hydrology', created_at: '' },
            { id: 'sk-6', name: 'GIS & Spatial Modeling', category: 'GIS', created_at: '' },
            { id: 'sk-7', name: 'Ocean Sensor Calibration', category: 'Oceanography', created_at: '' },
            { id: 'sk-8', name: 'Search & Rescue Protocols', category: 'Operations', created_at: '' },
            { id: 'sk-9', name: 'Weather Data Interpretation', category: 'Meteorology', created_at: '' },
            { id: 'sk-10', name: 'Risk Assessment & Mitigation', category: 'Safety', created_at: '' },
          ] as any
          setSkills(defaultSkills)
        }

        if (trData) {
          const trainersWithSkills: Trainer[] = trData.map((t: any) => {
            const userSkillNames = (usData || [])
              .filter((us: any) => us.user_id === t.id && us.skills?.name)
              .map((us: any) => us.skills.name)
            
            const allTrainerSkills = Array.from(
              new Set([...(t.expertise_areas || []), ...userSkillNames])
            )

            return {
              ...t,
              skills: allTrainerSkills,
            }
          })
          setTrainers(trainersWithSkills)
        }
      } catch (err) {
        console.error('Failed to load trainers or skills:', err)
      } finally {
        setLoadingTrainers(false)
      }
    }

    fetchTrainersAndSkills()
  }, [])

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Thumbnail must be under 5MB')
      return
    }
    setRawImageFile(file)
    setIsCropperOpen(true)
    if (thumbRef.current) thumbRef.current.value = ''
  }

  const toggleSkill = (id: string) => {
    setSelectedSkills(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleAddCustomSkill = async () => {
    const name = customSkillName.trim()
    if (!name) return
    setAddingSkill(true)
    try {
      const { data, error } = await supabase
        .from('skills')
        .insert({ name, category: 'Custom' })
        .select()
        .single()
      if (error) throw error
      if (data) {
        setSkills(prev => [...prev, data])
        setSelectedSkills(prev => [...prev, data.id])
        setCustomSkillName('')
        toast.success(`Skill "${name}" added`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to add skill')
    } finally {
      setAddingSkill(false)
    }
  }

  // Modules helpers
  const addModule = () => {
    const num = modules.length + 1
    const newMod: CourseModule = {
      id: crypto.randomUUID(),
      title: `Module ${num}: New Topic`,
      description: 'Module objectives and resource descriptions.',
      items: [],
    }
    setModules(prev => [...prev, newMod])
    toast.success(`Module ${num} created`)
  }

  const removeModule = (id: string) => {
    if (modules.length === 1) {
      toast.error('Course must have at least one module')
      return
    }
    setModules(prev => prev.filter(m => m.id !== id))
    toast.info('Module removed')
  }

  const updateModuleField = (id: string, field: 'title' | 'description', val: string) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, [field]: val } : m))
  }

  const openAddItemModal = (moduleId: string, type: 'photo' | 'video' | 'link' | 'text') => {
    setActiveModuleId(moduleId)
    setEditingItemId(null)
    setAddingItemType(type)
    setItemTitle('')
    setItemContent('')
    setItemUrl('')
    setItemDurationMinutes('5')
    setItemFile(null)
    setItemPreview(null)
  }

  const openEditItemModal = (moduleId: string, item: ModuleItem) => {
    setActiveModuleId(moduleId)
    setEditingItemId(item.id)
    setAddingItemType(item.type === 'quiz' ? null : item.type)
    setItemTitle(item.title)
    setItemContent(item.content || '')
    setItemUrl(item.url || '')
    setItemDurationMinutes(item.duration_minutes ? String(item.duration_minutes) : '5')
    setItemFile(item.file || null)
    setItemPreview(item.previewUrl || null)
  }

  const handleModuleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large (${formatFileSize(file.size)}). Max 100MB.`)
      return
    }
    setItemFile(file)
    if (!itemTitle) {
      setItemTitle(file.name.replace(/\.[^/.]+$/, ''))
    }
    if (file.type.startsWith('image/')) {
      setItemPreview(URL.createObjectURL(file))
    }
  }

  const saveModuleItem = () => {
    if (!activeModuleId || !addingItemType) return
    if (!itemTitle.trim()) {
      toast.error('Please enter an item title')
      return
    }

    if (addingItemType === 'link' && !itemUrl.trim()) {
      toast.error('Please provide a URL link')
      return
    }

    if ((addingItemType === 'photo' || addingItemType === 'video') && !itemFile && !itemUrl && !editingItemId) {
      toast.error(`Please upload a ${addingItemType} file or provide an external URL`)
      return
    }

    const newItem: ModuleItem = {
      id: editingItemId || crypto.randomUUID(),
      type: addingItemType,
      title: itemTitle.trim(),
      content: itemContent.trim() || undefined,
      url: itemUrl.trim() || undefined,
      duration_minutes: itemDurationMinutes ? parseInt(itemDurationMinutes, 10) : undefined,
      file: itemFile || undefined,
      previewUrl: itemPreview || undefined,
      fileName: itemFile?.name,
      fileSize: itemFile?.size,
    }

    setModules(prev => prev.map(m => {
      if (m.id !== activeModuleId) return m

      if (editingItemId) {
        return {
          ...m,
          items: m.items.map(it => it.id === editingItemId ? newItem : it)
        }
      }

      return {
        ...m,
        items: [...m.items, newItem]
      }
    }))

    toast.success(editingItemId ? `Updated ${addingItemType} item` : `Added ${addingItemType} to module`)
    setAddingItemType(null)
    setActiveModuleId(null)
    setEditingItemId(null)
    setItemFile(null)
    setItemPreview(null)
    setItemTitle('')
    setItemContent('')
    setItemUrl('')
    setItemDurationMinutes('5')
  }

  const removeModuleItem = (moduleId: string, itemId: string) => {
    setModules(prev => prev.map(m => {
      if (m.id !== moduleId) return m
      return {
        ...m,
        items: m.items.filter(i => i.id !== itemId),
        quiz_questions: (m.quiz_questions || []).filter(q => q.id !== itemId)
      }
    }))
    toast.info('Item removed')
  }

  // Quiz questions helpers
  const openAddQuizQuestion = (moduleId: string) => {
    setActiveQuizModuleId(moduleId)
    setEditingQuestionId(null)
    setQuizQuestionText('')
    setQuizOptions(['', '', '', ''])
    setQuizCorrectOption(0)
    setQuizExplanation('')
  }

  const openEditQuizQuestion = (moduleId: string, q: QuizQuestion) => {
    setActiveQuizModuleId(moduleId)
    setEditingQuestionId(q.id)
    setQuizQuestionText(q.question)
    setQuizOptions(q.options && q.options.length >= 2 ? [...q.options] : ['', '', '', ''])
    setQuizCorrectOption(q.correct_option ?? 0)
    setQuizExplanation(q.explanation || '')
  }

  const saveQuizQuestion = () => {
    if (!activeQuizModuleId) return
    if (!quizQuestionText.trim()) {
      toast.error('Please enter the question text')
      return
    }
    const cleanOptions = quizOptions.map(o => o.trim())
    if (cleanOptions.filter(Boolean).length < 2) {
      toast.error('Please provide at least 2 answer choices')
      return
    }

    const questionData: QuizQuestion = {
      id: editingQuestionId || crypto.randomUUID(),
      question: quizQuestionText.trim(),
      options: cleanOptions,
      correct_option: quizCorrectOption,
      explanation: quizExplanation.trim() || undefined,
    }

    setModules(prev => prev.map(m => {
      if (m.id !== activeQuizModuleId) return m

      let updatedItems = [...m.items]
      const existingItemIdx = updatedItems.findIndex(i => i.id === editingQuestionId || i.quiz_data?.id === editingQuestionId)
      
      if (existingItemIdx !== -1) {
        updatedItems[existingItemIdx] = {
          ...updatedItems[existingItemIdx],
          type: 'quiz',
          title: `Quiz: ${quizQuestionText.trim().slice(0, 50)}${quizQuestionText.trim().length > 50 ? '...' : ''}`,
          content: quizExplanation.trim() || undefined,
          quiz_data: questionData
        }
      } else {
        const newQuizItem: ModuleItem = {
          id: questionData.id,
          type: 'quiz',
          title: `Quiz: ${quizQuestionText.trim().slice(0, 50)}${quizQuestionText.trim().length > 50 ? '...' : ''}`,
          content: quizExplanation.trim() || undefined,
          quiz_data: questionData
        }
        updatedItems.push(newQuizItem)
      }

      // Keep quiz_questions in sync
      const currentQuestions = m.quiz_questions || []
      const updatedQuestions = editingQuestionId
        ? currentQuestions.map(q => q.id === editingQuestionId ? questionData : q)
        : [...currentQuestions, questionData]

      return {
        ...m,
        items: updatedItems,
        quiz_questions: updatedQuestions,
        passing_score: m.passing_score ?? 80,
      }
    }))

    toast.success(editingQuestionId ? 'Quiz question updated' : 'Quiz question added to module sequence')
    setActiveQuizModuleId(null)
    setEditingQuestionId(null)
    setQuizQuestionText('')
    setQuizOptions(['', '', '', ''])
    setQuizCorrectOption(0)
    setQuizExplanation('')
  }

  const removeQuizQuestion = (moduleId: string, questionId: string) => {
    setModules(prev => prev.map(m => {
      if (m.id !== moduleId) return m
      return {
        ...m,
        items: m.items.filter(i => i.id !== questionId && i.quiz_data?.id !== questionId),
        quiz_questions: (m.quiz_questions || []).filter(q => q.id !== questionId),
      }
    }))
    toast.info('Quiz question removed')
  }

  const handleGenerateAiQuiz = (moduleId: string) => {
    const mod = modules.find(m => m.id === moduleId)
    if (!mod) return
    setIsGeneratingAiQuiz(true)
    setTimeout(() => {
      const topic = mod.title.replace(/^Module \d+:\s*/, '') || 'Module Topic'
      const aiQuestions: QuizQuestion[] = [
        {
          id: crypto.randomUUID(),
          question: `What is the core prerequisite protocol for ${topic}?`,
          options: [
            'Adhere to verified operational checklists and standard ministry guidelines',
            'Bypass preliminary verification to speed up execution',
            'Conduct unrecorded subjective assessments',
            'Defer telemetry log synchronization until post-incident review'
          ],
          correct_option: 0,
          explanation: 'Standard operational guidelines ensure consistent execution and data integrity.'
        },
        {
          id: crypto.randomUUID(),
          question: `In operational workflows, how should telemetry anomalies in ${topic} be handled?`,
          options: [
            'Calibrate sensors against secondary baseline references and log deviations',
            'Ignore temporary anomalies until standard quarterly servicing',
            'Disconnect the entire network immediately without notification',
            'Override automated safety cutoffs to sustain uninterrupted transmission'
          ],
          correct_option: 0,
          explanation: 'Secondary calibration verifies signal deviations accurately without compromising active safety.'
        },
        {
          id: crypto.randomUUID(),
          question: `Which criterion determines mastery in ${topic}?`,
          options: [
            'Consistent precision, adhering to standard tolerance thresholds and real-time situational awareness',
            'Execution speed regardless of diagnostic error margins',
            'Theoretical understanding without hands-on apparatus handling',
            'Sole reliance on automated algorithmic presets'
          ],
          correct_option: 0,
          explanation: 'High situational awareness coupled with precision defines MoES certified competency.'
        }
      ]

      setModules(prev => prev.map(m => {
        if (m.id !== moduleId) return m
        const newItems: ModuleItem[] = aiQuestions.map(q => ({
          id: q.id,
          type: 'quiz',
          title: `Quiz: ${q.question.slice(0, 50)}...`,
          content: q.explanation,
          quiz_data: q
        }))
        return {
          ...m,
          items: [...m.items, ...newItems],
          quiz_questions: [...(m.quiz_questions || []), ...aiQuestions],
          passing_score: m.passing_score ?? 80
        }
      }))

      setIsGeneratingAiQuiz(false)
      toast.success('Generated 3 AI quiz questions and added to module sequence!')
    }, 500)
  }

  // Materials handling
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) return `File too large (${formatFileSize(file.size)}). Max 100MB.`
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_EXTENSIONS.includes(ext)) return `File type not supported: ${ext}`
    return null
  }

  const addFileMaterial = useCallback((file: File) => {
    const error = validateFile(file)
    if (error) {
      toast.error(error)
      return
    }
    const isVideo = file.type.startsWith('video/')
    const material: PendingMaterial = {
      id: crypto.randomUUID(),
      file,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      materialType: isVideo ? 'video' : 'file',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }
    setPendingMaterials(prev => [...prev, material])
    toast.success(`Added: ${file.name}`)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(addFileMaterial)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    Array.from(files).forEach(addFileMaterial)
  }

  const addLinkMaterial = () => {
    const url = linkUrl.trim()
    if (!url) {
      toast.error('Enter a URL')
      return
    }
    try {
      new URL(url)
    } catch {
      toast.error('Please enter a valid URL')
      return
    }
    const isVideo = /youtube\.com|youtu\.be|vimeo\.com|\.mp4|\.webm/i.test(url)
    const title = linkTitle.trim() || new URL(url).hostname
    const material: PendingMaterial = {
      id: crypto.randomUUID(),
      fileName: title,
      fileSize: 0,
      mimeType: 'text/uri-list',
      materialType: isVideo ? 'video' : 'link',
      url,
    }
    setPendingMaterials(prev => [...prev, material])
    setLinkUrl('')
    setLinkTitle('')
    toast.success(`Added: ${title}`)
  }

  const removeMaterial = (id: string) => {
    setPendingMaterials(prev => prev.filter(m => m.id !== id))
  }

  // Advanced AI Competency Mapping Engine
  const scoredTrainers = React.useMemo(() => {
    if (trainers.length === 0) return []

    const requiredSkillNames = skills
      .filter(s => selectedSkills.includes(s.id))
      .map(s => s.name.toLowerCase())

    const courseTitle = (detailsForm.watch('title') || '').toLowerCase()
    const courseDesc = (detailsForm.watch('description') || '').toLowerCase()
    const courseDept = (detailsForm.watch('department') || '').toLowerCase()
    const courseObjs = (objectivesForm.watch('learning_objectives') || '').toLowerCase()

    const fullContext = `${courseTitle} ${courseDesc} ${courseDept} ${courseObjs}`

    return trainers.map(t => {
      let score = 40 // baseline
      const qual = (t.qualifications || '').toLowerCase()
      const bio = (t.bio || '').toLowerCase()
      const trainerSkills = (t.skills || []).map(s => s.toLowerCase())
      const allTrainerText = `${qual} ${bio} ${trainerSkills.join(' ')}`

      // 1. Exact Skill Overlap
      const matchedSkillsList: string[] = []
      requiredSkillNames.forEach(reqSkill => {
        const found = trainerSkills.some(ts => ts.includes(reqSkill) || reqSkill.includes(ts)) || allTrainerText.includes(reqSkill)
        if (found) {
          const originalSkill = skills.find(s => s.name.toLowerCase() === reqSkill)?.name || reqSkill
          matchedSkillsList.push(originalSkill)
        }
      })

      if (requiredSkillNames.length > 0) {
        const matchRatio = matchedSkillsList.length / requiredSkillNames.length
        score += matchRatio * 40
      } else {
        score += 15
      }

      // 2. Keyword / Context Semantic Alignment
      const keywords = ['radar', 'meteorology', 'ocean', 'climate', 'atmosphere', 'seismology', 'modelling', 'doppler', 'hydrology', 'satellite', 'python', 'gis']
      let contextMatches = 0
      keywords.forEach(kw => {
        if (fullContext.includes(kw) && allTrainerText.includes(kw)) {
          contextMatches++
        }
      })
      score += Math.min(contextMatches * 4, 15)

      // 3. Department alignment
      if (courseDept && (qual.includes(courseDept) || bio.includes(courseDept) || allTrainerText.includes(courseDept))) {
        score += 8
      }

      // 4. Experience weighting
      if (t.years_of_experience) {
        score += Math.min(t.years_of_experience * 1.5, 12)
      }

      const matchPercentage = Math.round(Math.min(Math.max(score, 25), 99))

      let reasoning = 'Strong domain background in scientific research and practical instruction.'
      if (matchedSkillsList.length > 0) {
        reasoning = `Directly matches ${matchedSkillsList.length} course skill requirement${matchedSkillsList.length > 1 ? 's' : ''}: ${matchedSkillsList.slice(0, 3).join(', ')}.`
      } else if (t.years_of_experience && t.years_of_experience >= 5) {
        reasoning = `High instructional experience (${t.years_of_experience}+ years) with strong institutional capacity.`
      }

      return {
        ...t,
        matchPercentage,
        matchedSkillsList,
        reasoning,
      }
    }).sort((a, b) => b.matchPercentage - a.matchPercentage)
  }, [trainers, skills, selectedSkills, detailsForm.watch('title'), detailsForm.watch('description'), detailsForm.watch('department'), objectivesForm.watch('learning_objectives')])

  const handleAutoFillMessage = (trainer: typeof scoredTrainers[0]) => {
    const title = detailsForm.watch('title') || 'this training course'
    const msg = `Greetings ${trainer.full_name}, you have been appointed as Lead Trainer for "${title}" based on your verified competencies in ${trainer.matchedSkillsList.length > 0 ? trainer.matchedSkillsList.join(', ') : 'this specialized domain'}. Please review the syllabus and coordinate module sessions.`
    trainerForm.setValue('assignment_message', msg)
    toast.success('Generated AI briefing message!')
  }

  const selectedTrainer = trainers.find(t => t.id === trainerForm.watch('trainer_id'))

  const validateStep = async () => {
    switch (step) {
      case 1: return await detailsForm.trigger()
      case 2: return await settingsForm.trigger()
      case 3: return await sessionFlowForm.trigger()
      case 4: return await objectivesForm.trigger()
      case 5: {
        if (modules.length === 0) {
          toast.error('Please add at least one module')
          return false
        }
        for (let i = 0; i < modules.length; i++) {
          if (!modules[i].title.trim()) {
            toast.error(`Please provide a title for Module ${i + 1}`)
            return false
          }
        }
        return true
      }
      case 7: return await trainerForm.trigger()
      default: return true
    }
  }

  const handleNext = async () => {
    const valid = await validateStep()
    if (!valid) return
    setStep(s => Math.min(s + 1, 9))
  }

  const handleBack = () => {
    setStep(s => Math.max(s - 1, 1))
  }

  // Publish / Save
  const handlePublish = async (status: 'draft' | 'published') => {
    const t = trainerForm.getValues()
    const d = detailsForm.getValues()
    const s = settingsForm.getValues()
    const f = sessionFlowForm.getValues()
    const o = objectivesForm.getValues()

    if (!t.trainer_id) {
      toast.error('Please assign a trainer in Step 7')
      setStep(7)
      return
    }
    if (!d.title) {
      toast.error('Course title is required')
      setStep(1)
      return
    }
    if (selectedSkills.length === 0) {
      toast.error('Select at least one skill for the course in Step 4')
      setStep(4)
      return
    }

    setSaving(true)
    try {
      // 1. Insert course
      const { data: course, error } = await supabase
        .from('courses')
        .insert({
          title: d.title,
          description: d.description,
          course_type: d.course_type,
          department: d.department || null,
          duration_minutes: s.duration_hours ? s.duration_hours * 60 : null,
          passing_score: s.passing_score ?? 60,
          trainer_id: t.trainer_id,
          status,
          learning_objectives: {
            description: o.learning_objectives,
            understand: o.learning_objectives,
          },
          meet_link: s.meet_link || null,
          start_date: s.start_date ? new Date(s.start_date).toISOString() : null,
          end_date: s.end_date ? new Date(s.end_date).toISOString() : null,
          planned_assessments_count: s.planned_assessments_count || 0,
          planned_mock_tests_count: s.planned_mock_tests_count || 0,
          final_test_date: s.final_test_date ? new Date(s.final_test_date).toISOString() : null,
          final_test_start_time: s.final_test_start_time || null,
          final_test_end_time: s.final_test_end_time || null,
          delivery_mode: s.delivery_mode || 'recorded',
          max_trainees: s.max_trainees || null,
          trainer_suggestion: s.trainer_suggestion || null,
          session_flow_text: f.session_flow_text || null,
          has_certificate: hasCertificate,
          certificate_template_url: certificateTemplateUrl,
          certificate_template_name: certificateTemplateName,
        } as any)
        .select()
        .single()

      if (error) throw error
      if (!course) throw new Error('No course returned after insert')

      // 2. Upload thumbnail if present
      if (thumbnail) {
        const ext = thumbnail.name.split('.').pop()
        const path = `${course.id}/thumbnail.${ext}`
        const { error: upErr } = await supabase.storage.from('materials').upload(path, thumbnail)
        if (!upErr) {
          await supabase.from('courses').update({ thumbnail_path: path }).eq('id', course.id)
        }
      }

      // 3. Upload session flow doc if present
      if (sessionFlowDoc) {
        const ext = sessionFlowDoc.name.split('.').pop()
        const path = `${course.id}/session_flow_${Date.now()}.${ext}`
        const { error: docErr } = await supabase.storage.from('materials').upload(path, sessionFlowDoc)
        if (!docErr) {
          await supabase.from('courses').update({ session_flow_doc_path: path } as any).eq('id', course.id)
        }
      }

      // 4. Save Course Skills
      if (selectedSkills.length > 0 && course) {
        try {
          const skillInserts: any[] = []
          for (const skillId of selectedSkills) {
            if (skillId.startsWith('custom-')) {
              const skillObj = skills.find(s => s.id === skillId)
              if (skillObj) {
                const { data: createdSkill } = await supabase
                  .from('skills')
                  .insert({ name: skillObj.name } as any)
                  .select()
                  .single()
                if (createdSkill) {
                  skillInserts.push({
                    course_id: course.id,
                    skill_id: (createdSkill as any).id,
                    required_level: 3,
                  })
                }
              }
            } else {
              skillInserts.push({
                course_id: course.id,
                skill_id: skillId,
                required_level: 3,
              })
            }
          }
          if (skillInserts.length > 0) {
            await (supabase as any).from('course_skills').insert(skillInserts)
          }
        } catch (sErr) {
          console.warn('Could not insert course_skills:', sErr)
        }
      }

      // 5. Upload Materials
      if (course && pendingMaterials.length > 0) {
        for (const mat of pendingMaterials) {
          if (mat.materialType === 'link' || mat.materialType === 'video') {
            await supabase.from('materials').insert({
              course_id: course.id,
              uploaded_by: user!.id,
              file_name: mat.fileName,
              storage_path: `link/${crypto.randomUUID()}`,
              material_type: mat.materialType,
              url: mat.url,
              mime_type: 'text/uri-list',
              extraction_status: 'completed',
            })
          } else if (mat.file) {
            const fileExt = mat.file.name.split('.').pop()
            const materialId = mat.id
            const storagePath = `${course.id}/${materialId}.${fileExt}`

            const { error: uploadError } = await supabase.storage
              .from('materials')
              .upload(storagePath, mat.file)
            if (uploadError) console.warn('Material upload error:', uploadError)

            await supabase.from('materials').insert({
              id: materialId,
              course_id: course.id,
              uploaded_by: user!.id,
              file_name: mat.fileName,
              storage_path: storagePath,
              mime_type: mat.mimeType,
              file_size: mat.fileSize,
              extraction_status: 'pending',
            })
          }
        }
      }

      // 6. Save Modules and Module Items
      const uploadedModules: any[] = []
      for (let mIdx = 0; mIdx < modules.length; mIdx++) {
        const mod = modules[mIdx]
        const uploadedItems: any[] = []

        for (const item of mod.items) {
          if (item.file) {
            const fileExt = item.file.name.split('.').pop()
            const fileId = item.id || crypto.randomUUID()
            const storagePath = `${course.id}/modules/${mod.id}/${fileId}.${fileExt}`

            let uploadRes = await supabase.storage
              .from('Course modules')
              .upload(storagePath, item.file)

            if (uploadRes.error) {
              console.warn('Upload to Course modules had error, trying fallback:', uploadRes.error)
              uploadRes = await supabase.storage
                .from('materials')
                .upload(storagePath, item.file)
            }

            const { data: publicUrlData } = supabase.storage
              .from('Course modules')
              .getPublicUrl(storagePath)

            uploadedItems.push({
              id: item.id,
              type: item.type,
              title: item.title,
              content: item.content || '',
              url: publicUrlData?.publicUrl || item.url || '',
              duration_minutes: item.duration_minutes,
              duration_seconds: item.duration_seconds,
              storagePath: storagePath,
              fileName: item.fileName,
              fileSize: item.fileSize,
              quiz_data: item.quiz_data,
            })
          } else {
            uploadedItems.push({
              id: item.id,
              type: item.type,
              title: item.title,
              content: item.content || '',
              url: item.url || '',
              duration_minutes: item.duration_minutes,
              duration_seconds: item.duration_seconds,
              fileName: item.fileName,
              fileSize: item.fileSize,
              quiz_data: item.quiz_data,
            })
          }
        }

        uploadedModules.push({
          id: mod.id,
          title: mod.title,
          description: mod.description,
          order_index: mIdx,
          is_final_assessment: false,
          passing_score: mod.passing_score ?? 80,
          quiz_questions: mod.quiz_questions || [],
          items: uploadedItems,
        })
      }

      // Update course with modules JSON
      try {
        await supabase
          .from('courses')
          .update({ modules: uploadedModules } as any)
          .eq('id', course.id)
      } catch (err) {
        console.warn('Could not update courses.modules directly:', err)
      }

      // Try inserting into course_modules table if present
      try {
        const moduleRows = uploadedModules.map(m => ({
          course_id: course.id,
          title: m.title,
          description: m.description,
          order_index: m.order_index,
          is_final_assessment: false,
          content_items: m.items,
        }))
        await (supabase as any).from('course_modules').insert(moduleRows)
      } catch (err) {
        console.warn('course_modules table insert optional/skipped:', err)
      }

      // 7. Insert Course Assignment record
      try {
        await (supabase as any).from('course_assignments').insert({
          course_id: course.id,
          trainer_id: t.trainer_id,
          assigned_by: user!.id,
          message: t.assignment_message || null,
        })
      } catch (aErr) {
        console.warn('course_assignments insert skipped:', aErr)
      }

      toast.success(status === 'published' ? 'Course published & lead trainer notified!' : 'Course saved as draft')
      navigate('/admin')
    } catch (err: any) {
      console.error('Failed to create course:', err)
      toast.error(err.message || 'Failed to create course')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-cyan-700 mb-4 font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-600/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create New Course</h1>
              <p className="text-sm text-slate-600 font-medium">Design curriculum, configure assessments, run AI competency mapping, and publish directly</p>
            </div>
          </div>
        </motion.div>

        {/* Step Wizard Bar */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = step === s.id
            const isDone = step > s.id
            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={'flex items-center gap-2 px-3.5 py-2 rounded-xl shrink-0 text-xs font-bold transition-all cursor-pointer ' + (isActive ? 'bg-cyan-100 text-cyan-900 border border-cyan-300 shadow-sm' : isDone ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' : 'bg-slate-100 text-slate-500 opacity-80 hover:opacity-100')}
                >
                  {isDone ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Icon className="w-3.5 h-3.5 text-cyan-700" />}
                  {s.label}
                </button>
                {i < STEPS.length - 1 && <div className={'w-5 h-px shrink-0 ' + (isDone ? 'bg-emerald-400' : 'bg-slate-300')} />}
              </React.Fragment>
            )
          })}
        </motion.div>

        {/* Form Content Cards */}
        <motion.div key={step} initial="hidden" animate="visible" variants={fadeUp}>
          <Card className="bg-white border border-slate-200/90 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6 sm:p-8">

              {/* STEP 1: Course Details */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Course Details</h2>
                    <p className="text-sm text-slate-500">Provide the foundational identity, title, description, and thumbnail image.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Course Title *</Label>
                    <Input {...detailsForm.register('title')} placeholder="e.g. Advanced Doppler Weather Radar Operations & Calibration" className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl h-12" />
                    {detailsForm.formState.errors.title && <p className="text-xs text-red-500">{detailsForm.formState.errors.title.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Description *</Label>
                    <Textarea {...detailsForm.register('description')} placeholder="What will trainees learn in this course curriculum?" className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl resize-none" rows={5} />
                    {detailsForm.formState.errors.description && <p className="text-xs text-red-500">{detailsForm.formState.errors.description.message}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Course Type *</Label>
                      <Select 
                        value={isCustomType ? 'custom' : detailsForm.watch('course_type')} 
                        onValueChange={v => {
                          if (v === 'custom') {
                            setIsCustomType(true)
                            detailsForm.setValue('course_type', '')
                          } else {
                            setIsCustomType(false)
                            detailsForm.setValue('course_type', v)
                          }
                        }}
                      >
                        <SelectTrigger className="border-slate-200 bg-slate-50 rounded-xl h-12"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard Training</SelectItem>
                          <SelectItem value="scenario">Scenario-Based Training</SelectItem>
                          <SelectItem value="technical">Technical Training</SelectItem>
                          <SelectItem value="operational">Operational & Field Training</SelectItem>
                          <SelectItem value="custom">+ Add Custom Course Type...</SelectItem>
                        </SelectContent>
                      </Select>
                      {isCustomType && (
                        <Input 
                          {...detailsForm.register('course_type')} 
                          placeholder="Enter custom course type" 
                          className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl h-12 mt-2" 
                        />
                      )}
                      {detailsForm.formState.errors.course_type && <p className="text-xs text-red-500">{detailsForm.formState.errors.course_type.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Department</Label>
                      <Input {...detailsForm.register('department')} placeholder="e.g. IMD, INCOIS, IITM, NCMRWF" className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl h-12" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Course Banner Thumbnail <span className="text-slate-400 font-normal">(optional)</span></Label>
                    <div onClick={() => thumbRef.current?.click()} className="flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-cyan-500 cursor-pointer transition-colors bg-slate-50">
                      {thumbnailPreview ? <img src={thumbnailPreview} alt="thumb" className="w-24 h-16 object-cover rounded-xl shadow-xs" /> : <div className="w-24 h-16 rounded-xl bg-slate-200 flex items-center justify-center"><Image className="w-6 h-6 text-slate-400" /></div>}
                      <div><p className="text-sm font-medium text-slate-700">{thumbnail ? thumbnail.name : 'Click to upload course banner'}</p><p className="text-xs text-slate-400">PNG, JPG — max 5MB (16:5 ratio recommended, e.g. 1600x500px)</p></div>
                    </div>
                    <input ref={thumbRef} type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
                  </div>
                </div>
              )}

              {/* STEP 2: Course Configuration */}
              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Course Configuration & Schedule</h2>
                    <p className="text-sm text-slate-500">Configure delivery format, cohort limits, schedules, and assessment parameters.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Duration (hours)</Label>
                      <Input {...settingsForm.register('duration_hours')} type="number" placeholder="e.g. 40" className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Passing Score (%)</Label>
                      <Input {...settingsForm.register('passing_score')} type="number" placeholder="60" className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Delivery Mode</Label>
                      <Select value={settingsForm.watch('delivery_mode')} onValueChange={v => settingsForm.setValue('delivery_mode', v as any)}>
                        <SelectTrigger className="border-slate-200 bg-slate-50 rounded-xl h-12"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recorded">Recorded / Self-Paced</SelectItem>
                          <SelectItem value="live">Live Interactive Sessions</SelectItem>
                          <SelectItem value="hybrid">Hybrid (Recorded + Live)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Maximum Trainee Capacity (50 - 250)</Label>
                      <Input {...settingsForm.register('max_trainees')} type="number" placeholder="e.g. 100" className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Start Date</Label>
                      <Input {...settingsForm.register('start_date')} type="date" className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl h-12" />
                      {isUrgent && <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold border border-amber-200">⚡ Starting in under 30 days</span>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">End Date</Label>
                      <Input {...settingsForm.register('end_date')} type="date" className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl h-12" />
                      {courseDays && <span className="text-[11px] text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-md font-semibold border border-cyan-200">📅 Total Duration: {courseDays} days</span>}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="text-sm font-semibold text-slate-700">Live Meeting Link <span className="text-slate-400 font-normal">(Google Meet, Zoom, Webex)</span></Label>
                      <Input {...settingsForm.register('meet_link')} placeholder="https://meet.google.com/..." className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Planned Module Assessments Count</Label>
                      <Input {...settingsForm.register('planned_assessments_count')} type="number" placeholder="e.g. 3" className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Planned Mock Tests Count</Label>
                      <Input {...settingsForm.register('planned_mock_tests_count')} type="number" placeholder="e.g. 2" className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Final Examination Date</Label>
                      <Input {...settingsForm.register('final_test_date')} type="date" className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl h-12" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Exam Start</Label>
                        <Input {...settingsForm.register('final_test_start_time')} type="time" className="border-slate-200 bg-slate-50 rounded-xl h-12" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Exam End</Label>
                        <Input {...settingsForm.register('final_test_end_time')} type="time" className="border-slate-200 bg-slate-50 rounded-xl h-12" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Course Outline & Syllabus */}
              {step === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Course Outline & Syllabus</h2>
                    <p className="text-sm text-slate-500">Provide the session flow breakdown or upload an official syllabus document.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Session Flow & Schedule Breakdown</Label>
                    <Textarea {...sessionFlowForm.register('session_flow_text')} placeholder="e.g. Day 1: Principles of Meteorological Sensors&#10;Day 2: Calibration Protocols&#10;Day 3: Practical Exercises..." className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl resize-none font-mono text-xs" rows={8} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Attach Syllabus Document <span className="text-slate-400 font-normal">(PDF, DOCX)</span></Label>
                    <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-cyan-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{sessionFlowDoc ? sessionFlowDoc.name : 'Upload detailed course syllabus'}</p>
                          <p className="text-xs text-slate-400">PDF, DOCX — max 20MB</p>
                        </div>
                      </div>
                      <input type="file" id="syllabus-doc" accept=".pdf,.docx,.doc" onChange={e => setSessionFlowDoc(e.target.files?.[0] || null)} className="hidden" />
                      <Button type="button" variant="outline" onClick={() => document.getElementById('syllabus-doc')?.click()} className="rounded-xl border-slate-300">
                        {sessionFlowDoc ? 'Replace File' : 'Browse File'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Learning Objectives & Skills */}
              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Learning Objectives & Target Skills</h2>
                    <p className="text-sm text-slate-500">Select skills and competencies that will be developed in this course.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Learning Objectives *</Label>
                    <Textarea {...objectivesForm.register('learning_objectives')} placeholder="Describe key competencies, theoretical mastery, and diagnostic capabilities trainees will acquire..." className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl resize-none" rows={4} />
                    {objectivesForm.formState.errors.learning_objectives && <p className="text-xs text-red-500">{objectivesForm.formState.errors.learning_objectives.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Competency Skills Developed (Click to select)</Label>
                    <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 min-h-[70px]">
                      {skills.map(skill => (
                        <button key={skill.id} type="button" onClick={() => toggleSkill(skill.id)} className={'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ' + (selectedSkills.includes(skill.id) ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100')}>
                          {skill.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input value={customSkillName} onChange={e => setCustomSkillName(e.target.value)} placeholder="Add custom domain competency..." className="border-slate-200 bg-slate-50 rounded-xl" />
                    <Button type="button" onClick={handleAddCustomSkill} disabled={addingSkill || !customSkillName.trim()} className="bg-slate-900 text-white rounded-xl shrink-0">
                      {addingSkill ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />} Add Skill
                    </Button>
                  </div>
                </div>
              )}

              {/* STEP 5: Interactive Module Sequence Builder */}
              {step === 5 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 mb-1">Modules & Lesson Sequences</h2>
                      <p className="text-sm text-slate-500">Organize lessons, photos, videos, links, and module quizzes.</p>
                    </div>
                    <Button type="button" onClick={addModule} className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold">
                      <Plus className="w-4 h-4 mr-1" /> Add Module
                    </Button>
                  </div>

                  <div className="space-y-6">
                    {modules.map((mod, modIdx) => (
                      <div key={mod.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="w-7 h-7 rounded-lg bg-cyan-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {modIdx + 1}
                            </span>
                            <Input
                              value={mod.title}
                              onChange={e => updateModuleField(mod.id, 'title', e.target.value)}
                              className="font-bold text-sm bg-white border-slate-200 rounded-xl"
                              placeholder="Module Title"
                            />
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeModule(mod.id)} className="text-slate-400 hover:text-red-600 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Items in Module */}
                        <div className="space-y-2 pl-9">
                          {mod.items.map((item, itIdx) => (
                            <div key={item.id} className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-xs">
                              <div className="flex items-center gap-3">
                                {item.type === 'video' && <Video className="w-4 h-4 text-blue-600" />}
                                {item.type === 'photo' && <Image className="w-4 h-4 text-emerald-600" />}
                                {item.type === 'link' && <Link2 className="w-4 h-4 text-amber-600" />}
                                {item.type === 'text' && <AlignLeft className="w-4 h-4 text-slate-600" />}
                                {item.type === 'quiz' && <HelpCircle className="w-4 h-4 text-purple-600" />}
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{item.title}</p>
                                  {item.duration_minutes && <p className="text-[10px] text-slate-400">{item.duration_minutes} mins</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button type="button" variant="ghost" size="sm" onClick={() => openEditItemModal(mod.id, item)} className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700">
                                  <Edit3 className="w-3.5 h-3.5" />
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeModuleItem(mod.id, item.id)} className="h-7 w-7 p-0 text-slate-400 hover:text-red-600">
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          {/* Quick Action buttons */}
                          <div className="flex flex-wrap gap-2 pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => openAddItemModal(mod.id, 'video')} className="text-xs rounded-xl bg-white border-slate-200 text-slate-700">
                              <Video className="w-3.5 h-3.5 mr-1 text-blue-600" /> Video
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => openAddItemModal(mod.id, 'photo')} className="text-xs rounded-xl bg-white border-slate-200 text-slate-700">
                              <Image className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Photo
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => openAddItemModal(mod.id, 'link')} className="text-xs rounded-xl bg-white border-slate-200 text-slate-700">
                              <Link2 className="w-3.5 h-3.5 mr-1 text-amber-600" /> Link
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => openAddItemModal(mod.id, 'text')} className="text-xs rounded-xl bg-white border-slate-200 text-slate-700">
                              <AlignLeft className="w-3.5 h-3.5 mr-1 text-slate-600" /> Rich Note
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => openAddQuizQuestion(mod.id)} className="text-xs rounded-xl bg-white border-purple-200 text-purple-700 hover:bg-purple-50">
                              <HelpCircle className="w-3.5 h-3.5 mr-1 text-purple-600" /> Add Quiz
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => handleGenerateAiQuiz(mod.id)} disabled={isGeneratingAiQuiz} className="text-xs rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 text-purple-800 hover:opacity-90">
                              <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600" /> AI Quiz Generator
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add/Edit Module Item Dialog */}
                  {addingItemType && (
                    <div className="p-5 rounded-2xl border border-cyan-200 bg-cyan-50/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 capitalize">
                          {editingItemId ? 'Edit' : 'Add'} {addingItemType} Lesson Resource
                        </h3>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setAddingItemType(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs font-semibold">Title *</Label>
                          <Input value={itemTitle} onChange={e => setItemTitle(e.target.value)} placeholder="e.g. Radar Echo Diagnostic Overview" className="bg-white rounded-xl h-10 text-xs" />
                        </div>
                        {(addingItemType === 'video' || addingItemType === 'link') && (
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-xs font-semibold">Resource URL / Embed Link</Label>
                            <Input value={itemUrl} onChange={e => setItemUrl(e.target.value)} placeholder="https://..." className="bg-white rounded-xl h-10 text-xs" />
                          </div>
                        )}
                        {(addingItemType === 'photo' || addingItemType === 'video') && (
                          <div className="space-y-1 sm:col-span-2">
                            <Label className="text-xs font-semibold">Upload Media File</Label>
                            <Input ref={moduleFileInputRef} type="file" accept={addingItemType === 'photo' ? 'image/*' : 'video/*'} onChange={handleModuleFileChange} className="bg-white rounded-xl h-10 text-xs" />
                          </div>
                        )}
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Estimated Duration (minutes)</Label>
                          <Input type="number" value={itemDurationMinutes} onChange={e => setItemDurationMinutes(e.target.value)} className="bg-white rounded-xl h-10 text-xs" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setAddingItemType(null)} className="rounded-xl">Cancel</Button>
                        <Button type="button" size="sm" onClick={saveModuleItem} className="bg-cyan-600 text-white rounded-xl">Save Item</Button>
                      </div>
                    </div>
                  )}

                  {/* Add/Edit Quiz Question Modal */}
                  {activeQuizModuleId && (
                    <div className="p-5 rounded-2xl border border-purple-200 bg-purple-50/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-purple-950">
                          {editingQuestionId ? 'Edit' : 'Create'} Module Quiz Question
                        </h3>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setActiveQuizModuleId(null)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Question Text *</Label>
                        <Textarea value={quizQuestionText} onChange={e => setQuizQuestionText(e.target.value)} placeholder="Enter diagnostic or theoretical question..." className="bg-white rounded-xl text-xs resize-none" rows={2} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Answer Choices (select correct choice circle)</Label>
                        {quizOptions.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <input type="radio" name="quiz-correct" checked={quizCorrectOption === oIdx} onChange={() => setQuizCorrectOption(oIdx)} className="w-4 h-4 text-purple-600 cursor-pointer" />
                            <Input value={opt} onChange={e => {
                              const next = [...quizOptions]
                              next[oIdx] = e.target.value
                              setQuizOptions(next)
                            }} placeholder={`Option ${oIdx + 1}`} className="bg-white rounded-xl h-9 text-xs flex-1" />
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Explanation (shown to trainee after answer)</Label>
                        <Input value={quizExplanation} onChange={e => setQuizExplanation(e.target.value)} placeholder="Reason why this is the correct answer..." className="bg-white rounded-xl h-9 text-xs" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setActiveQuizModuleId(null)} className="rounded-xl">Cancel</Button>
                        <Button type="button" size="sm" onClick={saveQuizQuestion} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl">Save Quiz Question</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 6: Materials Upload */}
              {step === 6 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Course Reference Materials</h2>
                    <p className="text-sm text-slate-500">Upload PDF guidebooks, slide decks, telemetry manuals, and reference URLs.</p>
                  </div>
                  <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`p-8 rounded-3xl border-2 border-dashed text-center transition-all cursor-pointer ${
                      dragOver ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-10 h-10 text-cyan-600 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-800">Drag & drop course files here, or click to browse</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, DOCX, PPTX, MP4, WebM — up to 100MB per file</p>
                    <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_EXTENSIONS.join(',')} onChange={handleFileInput} className="hidden" />
                  </div>

                  {/* Add Web Link */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <p className="text-xs font-bold text-slate-800">Or Add External Web / Video Link</p>
                    <div className="flex gap-2">
                      <Input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} placeholder="Resource Title (optional)" className="bg-white rounded-xl text-xs h-10" />
                      <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." className="bg-white rounded-xl text-xs h-10" />
                      <Button type="button" onClick={addLinkMaterial} className="bg-slate-900 text-white rounded-xl h-10 text-xs shrink-0">Add Link</Button>
                    </div>
                  </div>

                  {/* Pending Materials List */}
                  {pendingMaterials.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-700">Attached Materials ({pendingMaterials.length})</p>
                      {pendingMaterials.map(mat => {
                        const Icon = getFileIcon(mat.mimeType)
                        return (
                          <div key={mat.id} className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-center gap-3 truncate">
                              <Icon className="w-5 h-5 text-cyan-600 shrink-0" />
                              <div className="truncate">
                                <p className="text-xs font-bold text-slate-800 truncate">{mat.fileName}</p>
                                <p className="text-[10px] text-slate-400">{mat.fileSize > 0 ? formatFileSize(mat.fileSize) : mat.url}</p>
                              </div>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => removeMaterial(mat.id)} className="text-slate-400 hover:text-red-600 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 7: Trainer Assignment & AI Competency Mapping */}
              {step === 7 && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-cyan-600" />
                        Trainer Assignment & AI Competency Mapping
                      </h2>
                      <p className="text-sm text-slate-600 font-medium mt-0.5">
                        Assign an approved trainer to lead this course curriculum.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                      <button
                        type="button"
                        onClick={() => setTrainerTab('ai_recommended')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          trainerTab === 'ai_recommended'
                            ? 'bg-cyan-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ✨ AI Suggestions ({scoredTrainers.slice(0, 3).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrainerTab('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          trainerTab === 'all'
                            ? 'bg-cyan-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        All Trainers ({trainers.length})
                      </button>
                    </div>
                  </div>

                  {/* AI Competency Matcher Section */}
                  {trainerTab === 'ai_recommended' && (
                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 p-5 rounded-2xl border border-cyan-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-cyan-600 text-white shadow-xs">
                              <Sparkles className="w-4 h-4" />
                            </span>
                            <div>
                              <h3 className="text-sm font-bold text-slate-900">AI Competency Mapping Engine</h3>
                              <p className="text-xs text-slate-600">
                                Evaluates trainer qualifications, verified skills, and experience against this course's topics.
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setIsAnalyzingCompetency(true)
                              setTimeout(() => {
                                setIsAnalyzingCompetency(false)
                                toast.success('Competency mapping recalculated!')
                              }, 500)
                            }}
                            className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-cyan-800 bg-white hover:bg-cyan-100/80 px-3 py-1.5 rounded-xl border border-cyan-200 transition-colors cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            {isAnalyzingCompetency ? 'Scanning...' : 'Re-scan Trainers'}
                          </button>
                        </div>

                        {/* Trainer Cards Grid */}
                        <div className="grid sm:grid-cols-3 gap-3 pt-2">
                          {scoredTrainers.slice(0, 3).map((t, idx) => {
                            const isSelected = trainerForm.watch('trainer_id') === t.id
                            return (
                              <div
                                key={t.id}
                                onClick={() => {
                                  trainerForm.setValue('trainer_id', t.id, { shouldValidate: true })
                                  handleAutoFillMessage(t)
                                }}
                                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                  isSelected
                                    ? 'bg-[#040c1e] text-white border-cyan-400 shadow-xl shadow-cyan-950/40 ring-2 ring-cyan-400/40'
                                    : 'bg-white border-slate-200 hover:border-cyan-400 hover:shadow-md'
                                }`}
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2 mb-2.5">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                                          isSelected
                                            ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-slate-950 font-black'
                                            : 'bg-cyan-100 text-cyan-900'
                                        }`}
                                      >
                                        {t.full_name.charAt(0)}
                                      </div>
                                      <div>
                                        <p className={`font-bold text-sm line-clamp-1 ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                          {t.full_name}
                                        </p>
                                        <p className={`text-[11px] ${isSelected ? 'text-cyan-200' : 'text-slate-500'}`}>
                                          {t.years_of_experience ? `${t.years_of_experience} yrs exp` : 'Certified Trainer'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mb-2">
                                    <span
                                      className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                                        isSelected
                                          ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400/40'
                                          : idx === 0
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                                      }`}
                                    >
                                      <TrendingUp className="w-3 h-3" />
                                      {t.matchPercentage}% Competency Fit
                                    </span>
                                  </div>

                                  <p className={`text-[11px] leading-relaxed line-clamp-2 mb-3 ${isSelected ? 'text-slate-300' : 'text-slate-600'}`}>
                                    {t.reasoning}
                                  </p>

                                  {t.matchedSkillsList.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {t.matchedSkillsList.slice(0, 2).map((skillName, sIdx) => (
                                        <span
                                          key={sIdx}
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                            isSelected
                                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                                          }`}
                                        >
                                          ✓ {skillName}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <Button
                                  type="button"
                                  size="sm"
                                  className={`w-full text-xs font-bold rounded-xl mt-2 cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black'
                                      : 'bg-slate-100 hover:bg-cyan-600 hover:text-white text-slate-800'
                                  }`}
                                >
                                  {isSelected ? 'Assigned ✓' : 'Select Trainer'}
                                </Button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual Trainer Dropdown Select */}
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-900">
                      Select Trainer Directly *
                    </Label>
                    {loadingTrainers ? (
                      <div className="flex items-center gap-2 text-slate-500 text-sm py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                        Loading approved trainers...
                      </div>
                    ) : (
                      <Select
                        value={trainerForm.watch('trainer_id')}
                        onValueChange={(v) => {
                          trainerForm.setValue('trainer_id', v, { shouldValidate: true })
                          const tr = scoredTrainers.find(t => t.id === v)
                          if (tr) handleAutoFillMessage(tr)
                        }}
                      >
                        <SelectTrigger className="border-slate-300 focus:border-cyan-500 rounded-xl h-12 bg-white text-slate-900 font-medium">
                          <SelectValue placeholder="Choose a trainer from the full roster..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-80">
                          {scoredTrainers.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              <div className="flex items-center gap-2.5 py-1">
                                <div className="w-6 h-6 rounded-lg bg-cyan-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                  {t.full_name.charAt(0)}
                                </div>
                                <span className="font-bold text-slate-900">{t.full_name}</span>
                                <span className="text-xs text-slate-500">· {t.qualifications || 'Trainer'}</span>
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 ml-auto">
                                  {t.matchPercentage}% match
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {trainerForm.formState.errors.trainer_id && (
                      <p className="text-xs text-red-600 font-semibold flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {trainerForm.formState.errors.trainer_id.message}
                      </p>
                    )}
                  </div>

                  {/* Selected Trainer Detail Banner */}
                  {selectedTrainer && (
                    <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-white font-black text-xl shadow-md shadow-cyan-600/20 shrink-0">
                        {selectedTrainer.full_name.charAt(0)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-base text-slate-900">{selectedTrainer.full_name}</p>
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold border-none">
                            Assigned Lead Trainer
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 font-medium">{selectedTrainer.email}</p>
                        <p className="text-[11px] font-medium text-slate-700 mt-1">
                          {selectedTrainer.qualifications || 'Certified Trainer'}
                          {selectedTrainer.years_of_experience ? ` • ${selectedTrainer.years_of_experience} years scientific training experience` : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Assignment Announcement Briefing Message */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-bold text-slate-900">
                        Briefing Message to Trainer <span className="text-slate-400 font-normal">(optional)</span>
                      </Label>
                      {selectedTrainer && (
                        <button
                          type="button"
                          onClick={() => {
                            const tr = scoredTrainers.find(t => t.id === selectedTrainer.id)
                            if (tr) handleAutoFillMessage(tr)
                          }}
                          className="text-xs font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-cyan-600" /> Auto-compose AI Briefing
                        </button>
                      )}
                    </div>
                    <Textarea
                      {...trainerForm.register('assignment_message')}
                      placeholder="e.g. Please build this course curriculum with focus on Doppler radar calibration and numerical forecasting practical exercises..."
                      className="border-slate-300 focus:border-cyan-500 bg-white text-slate-900 rounded-xl resize-none"
                      rows={3}
                    />
                    <p className="text-xs text-slate-500">This briefing will automatically be delivered to the trainer's dashboard announcements feed upon course creation.</p>
                  </div>

                  {selectedTrainer && (
                    <div className="p-4 rounded-2xl border border-dashed border-cyan-300 bg-cyan-50/40 space-y-2">
                      <div className="flex items-center gap-2 text-cyan-800 text-xs font-bold uppercase tracking-wider">
                        <Megaphone className="w-3.5 h-3.5 text-cyan-600" /> Live Preview: Trainer Notification Card
                      </div>
                      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm">
                        <p className="text-sm font-bold text-slate-900">🎓 New Course Assignment: {detailsForm.watch('title') || 'Course Title'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Assigned by {profile?.full_name ?? 'Lead Administrator'}</p>
                        {trainerForm.watch('assignment_message') && (
                          <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 italic">
                            "{trainerForm.watch('assignment_message')}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 8: Digital Certificate Customizer */}
              {step === 8 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Official MoES Digital Certificate</h2>
                    <p className="text-sm text-slate-500">Customize the certificate template and verification badges awarded to trainees upon completion.</p>
                  </div>
                  <CourseCertificateStep
                    hasCertificate={hasCertificate}
                    setHasCertificate={setHasCertificate}
                    templateUrl={certificateTemplateUrl}
                    setTemplateUrl={setCertificateTemplateUrl}
                    templateName={certificateTemplateName}
                    setTemplateName={setCertificateTemplateName}
                    courseTitle={detailsForm.watch('title')}
                  />
                </div>
              )}

              {/* STEP 9: Review & Publish */}
              {step === 9 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Review & Publish Course</h2>
                    <p className="text-sm text-slate-500">Confirm all course parameters before publishing live or saving as draft.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200">
                    <p className="text-xs font-bold text-cyan-800 uppercase tracking-wider mb-2">Lead Trainer Assignment</p>
                    {selectedTrainer ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
                          {selectedTrainer.full_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{selectedTrainer.full_name}</p>
                          <p className="text-xs text-slate-500">{selectedTrainer.email}</p>
                        </div>
                        <Badge className="ml-auto bg-emerald-100 text-emerald-800 border-emerald-300">
                          Trainer Assigned ✓
                        </Badge>
                      </div>
                    ) : (
                      <p className="text-sm text-red-500 font-medium">⚠️ No trainer assigned. Please return to Step 7.</p>
                    )}
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Title</p>
                      <p className="font-semibold text-slate-900 truncate">{detailsForm.watch('title')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Type</p>
                      <p className="font-semibold text-slate-900 capitalize">{detailsForm.watch('course_type')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Delivery</p>
                      <p className="font-semibold text-slate-900 capitalize">{settingsForm.watch('delivery_mode') || 'Recorded'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Passing Score</p>
                      <p className="font-semibold text-slate-900">{settingsForm.watch('passing_score')}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Modules</p>
                      <p className="font-semibold text-slate-900">{modules.length} modules</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Materials</p>
                      <p className="font-semibold text-slate-900">{pendingMaterials.length} files</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Certificate</p>
                      <p className="font-semibold text-emerald-600">{hasCertificate ? 'Enabled ✓' : 'Disabled'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Max Capacity</p>
                      <p className="font-semibold text-slate-900">{settingsForm.watch('max_trainees') || 'Unlimited'}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <Megaphone className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-900">Administrator Direct Deployment</p>
                        <ul className="text-xs text-emerald-800 mt-1 space-y-0.5">
                          <li>• Publishing goes live immediately for all Ministry trainees</li>
                          <li>• The assigned trainer is instantly notified and granted lead management over this course</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handlePublish('draft')}
                      disabled={saving}
                      className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-12 font-semibold cursor-pointer"
                    >
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save as Draft
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handlePublish('published')}
                      disabled={saving}
                      className="flex-1 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:opacity-95 text-white font-bold rounded-xl h-12 shadow-lg shadow-cyan-600/20 cursor-pointer"
                    >
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Megaphone className="w-4 h-4 mr-2" />} Publish Live & Assign Trainer
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </motion.div>

        {/* Wizard Footer Navigation */}
        {step < 9 && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
              className="border-slate-200 text-slate-700 hover:bg-slate-50 font-medium rounded-xl px-6 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white font-medium rounded-xl px-6 shadow-md shadow-cyan-600/10 cursor-pointer"
            >
              Next Step <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}
      </div>

      <ImageCropperModal
        isOpen={isCropperOpen}
        imageFile={rawImageFile}
        onClose={() => {
          setIsCropperOpen(false)
          setRawImageFile(null)
        }}
        onCropComplete={(croppedFile) => {
          setThumbnail(croppedFile)
          setThumbnailPreview(URL.createObjectURL(croppedFile))
          setIsCropperOpen(false)
          setRawImageFile(null)
        }}
      />
    </div>
  )
}
