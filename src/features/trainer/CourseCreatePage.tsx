import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Database } from '@/integrations/supabase/types'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
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
  Sparkles, AlignLeft, HelpCircle, CheckSquare, Award, ArrowUp, ArrowDown, Edit3, GripVertical, Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { ImageCropperModal } from '@/components/ui/ImageCropperModal'
import { CourseCertificateStep } from '@/features/courses/CourseCertificateStep'

type Skill = Database['public']['Tables']['skills']['Row']

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

type DetailsData = z.infer<typeof detailsSchema>
type SettingsData = z.infer<typeof settingsSchema>
type ObjectivesData = z.infer<typeof objectivesSchema>
type SessionFlowData = z.infer<typeof sessionFlowSchema>

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
  { id: 7, label: 'Certificate', icon: Award },
  { id: 8, label: 'Review & Submit', icon: Eye },
]

export function CourseCreatePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [hasCertificate, setHasCertificate] = useState(true)
  const [certificateTemplateUrl, setCertificateTemplateUrl] = useState<string | null>(null)
  const [certificateTemplateName, setCertificateTemplateName] = useState<string | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [customSkillName, setCustomSkillName] = useState('')
  const [addingSkill, setAddingSkill] = useState(false)
  const [isCustomType, setIsCustomType] = useState(false)
  const [isCropperOpen, setIsCropperOpen] = useState(false)
  const [rawImageFile, setRawImageFile] = useState<File | null>(null)
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
    supabase.from('skills').select('*').order('name').then(({ data, error }) => {
      if (data && data.length > 0) {
        setSkills(data)
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
    })
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

  const handleCropComplete = (croppedFile: File) => {
    setThumbnail(croppedFile)
    setThumbnailPreview(URL.createObjectURL(croppedFile))
    setIsCropperOpen(false)
    setRawImageFile(null)
  }

  // Modules helpers
  const addModule = () => {
    const newMod: CourseModule = {
      id: crypto.randomUUID(),
      title: `Module ${modules.length + 1}: New Topic`,
      description: '',
      items: [],
      quiz_questions: [],
    }
    setModules(prev => [...prev, newMod])
    toast.success('New module added')
  }

  const removeModule = (id: string) => {
    if (modules.length <= 1) {
      toast.error('You must keep at least one module')
      return
    }
    setModules(prev => prev.filter(m => m.id !== id))
    toast.info('Module removed')
  }

  const updateModule = (id: string, updates: Partial<CourseModule>) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m))
  }

  const moveModuleItem = (moduleId: string, fromIndex: number, toIndex: number) => {
    setModules(prev => prev.map(m => {
      if (m.id !== moduleId) return m
      if (toIndex < 0 || toIndex >= m.items.length) return m
      const newItems = [...m.items]
      const [moved] = newItems.splice(fromIndex, 1)
      newItems.splice(toIndex, 0, moved)
      return { ...m, items: newItems }
    }))
  }

  const openAddItem = (moduleId: string, type: 'photo' | 'video' | 'link' | 'text') => {
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

  const openEditItem = (moduleId: string, item: ModuleItem) => {
    if (item.type === 'quiz') {
      const qData = item.quiz_data || {
        id: item.id,
        question: item.title.replace(/^Quiz:\s*/, '') || '',
        options: ['', '', '', ''],
        correct_option: 0,
        explanation: item.content || '',
      }
      openEditQuizQuestion(moduleId, qData)
      return
    }

    setActiveModuleId(moduleId)
    setEditingItemId(item.id)
    setAddingItemType(item.type)
    setItemTitle(item.title)
    setItemContent(item.content || '')
    setItemUrl(item.url || '')
    setItemDurationMinutes(
      item.duration_minutes
        ? String(item.duration_minutes)
        : item.duration_seconds
        ? String(Math.round(item.duration_seconds / 60))
        : '5'
    )
    setItemFile(item.file || null)
    setItemPreview(item.previewUrl || null)
  }

  const handleModuleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 100 * 1024 * 1024) {
      toast.error('File exceeds 100MB limit')
      return
    }
    setItemFile(file)
    if (!itemTitle) {
      setItemTitle(file.name.replace(/\.[^/.]+$/, ""))
    }
    if (file.type.startsWith('image/')) {
      setItemPreview(URL.createObjectURL(file))
    }
  }

  const saveModuleItem = () => {
    if (!activeModuleId || !addingItemType) return
    if (!itemTitle.trim() && !itemFile?.name && !itemUrl.trim()) {
      toast.error('Please enter a title or URL')
      return
    }

    const durationMin = addingItemType === 'video' ? Math.max(0.5, parseFloat(itemDurationMinutes) || 5) : undefined
    const durationSec = durationMin ? Math.round(durationMin * 60) : undefined

    setModules(prev => prev.map(m => {
      if (m.id !== activeModuleId) return m

      if (editingItemId) {
        return {
          ...m,
          items: m.items.map(item => item.id === editingItemId ? {
            ...item,
            type: addingItemType,
            title: itemTitle.trim() || itemFile?.name || (addingItemType === 'link' ? itemUrl : 'Untitled Item'),
            content: itemContent.trim() || undefined,
            url: itemUrl.trim() || undefined,
            duration_minutes: durationMin,
            duration_seconds: durationSec,
            file: itemFile || item.file || undefined,
            previewUrl: itemPreview || item.previewUrl || (itemFile && itemFile.type.startsWith('image/') ? URL.createObjectURL(itemFile) : undefined),
            fileName: itemFile?.name || item.fileName,
            fileSize: itemFile?.size || item.fileSize,
          } : item)
        }
      }

      const newItem: ModuleItem = {
        id: crypto.randomUUID(),
        type: addingItemType,
        title: itemTitle.trim() || itemFile?.name || (addingItemType === 'link' ? itemUrl : 'Untitled Item'),
        content: itemContent.trim() || undefined,
        url: itemUrl.trim() || undefined,
        duration_minutes: durationMin,
        duration_seconds: durationSec,
        file: itemFile || undefined,
        previewUrl: itemPreview || (itemFile && itemFile.type.startsWith('image/') ? URL.createObjectURL(itemFile) : undefined),
        fileName: itemFile?.name,
        fileSize: itemFile?.size,
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
          question: `What minimum passing score is required to unlock subsequent modules in Capacity Connect?`,
          options: [
            '80% passing threshold in module checkpoint verification',
            '50% general participation threshold',
            '60% optional assessment threshold',
            'No benchmark requirement'
          ],
          correct_option: 0,
          explanation: 'Capacity Connect requires an 80% passing score on module quizzes before proceeding.'
        },
        {
          id: crypto.randomUUID(),
          question: `How should abnormal telemetry flags or critical discrepancies in ${topic} be handled?`,
          options: [
            'Log anomaly immediately and escalate to emergency response command',
            'Suppress the alert to prevent alarm fatigue',
            'Recalibrate sensor data without logging',
            'Wait for end-of-day reconciliation before taking action'
          ],
          correct_option: 0,
          explanation: 'Immediate escalation ensures rapid risk mitigation and disaster preparedness.'
        }
      ]

      const aiQuizItems: ModuleItem[] = aiQuestions.map(q => ({
        id: q.id,
        type: 'quiz',
        title: `Quiz: ${q.question.slice(0, 50)}...`,
        content: q.explanation,
        quiz_data: q
      }))

      setModules(prev => prev.map(m => m.id === moduleId ? {
        ...m,
        items: [...m.items, ...aiQuizItems],
        quiz_questions: [...(m.quiz_questions || []), ...aiQuestions],
        passing_score: 80,
      } : m))
      setIsGeneratingAiQuiz(false)
      toast.success('Generated 3 AI quiz questions and added to module sequence!')
    }, 500)
  }

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
      default: return true
    }
  }

  const handleNext = async () => {
    const valid = await validateStep()
    if (!valid) return
    setStep(s => Math.min(s + 1, 8))
  }

  const handleBack = () => {
    setStep(s => Math.max(s - 1, 1))
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

  // Submit
  const handleSubmit = async (status: 'draft' | 'pending_review') => {
    if (status === 'pending_review' && pendingMaterials.length === 0) {
      toast.error('Add at least one material before submitting for review')
      return
    }
    if (selectedSkills.length === 0) {
      toast.error('Select at least one skill for the course')
      return
    }
    setSaving(true)
    try {
      const d = detailsForm.getValues()
      const s = settingsForm.getValues()
      const f = sessionFlowForm.getValues()
      const o = objectivesForm.getValues()

      // Create course first (without thumbnail or session doc path)
      const { data: course, error } = await supabase
        .from('courses')
        .insert({
          title: d.title,
          description: d.description,
          course_type: d.course_type,
          department: d.department || null,
          duration_minutes: s.duration_hours ? s.duration_hours * 60 : null,
          passing_score: s.passing_score ?? 60,
          trainer_id: user!.id,
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
          delivery_mode: s.delivery_mode,
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

      // Upload thumbnail & session doc after course is created (needs course_id for storage RLS)
      let sessionDocPath = null
      if (sessionFlowDoc && user && course) {
        const ext = sessionFlowDoc.name.split('.').pop()
        const storagePath = `${course.id}/session_flow_${crypto.randomUUID()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('materials')
          .upload(storagePath, sessionFlowDoc)
        if (!uploadErr) {
          sessionDocPath = storagePath
        }
      }

      if (thumbnail && user && course) {
        const ext = thumbnail.name.split('.').pop()
        const thumbnailStoragePath = `${course.id}/thumbnail.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('materials')
          .upload(thumbnailStoragePath, thumbnail)
        if (uploadErr) {
          console.error('Thumbnail upload error:', uploadErr)
        } else {
          // Update course with paths
          await supabase
            .from('courses')
            .update({ 
              thumbnail_path: thumbnailStoragePath,
              session_flow_document_path: sessionDocPath 
            })
            .eq('id', course.id)
        }
      } else if (sessionDocPath && course) {
         await supabase
          .from('courses')
          .update({ 
            session_flow_document_path: sessionDocPath 
          })
          .eq('id', course.id)
      }

      // Process and upload Modules to 'Course modules' bucket
      const uploadedModules = []
      for (let mIdx = 0; mIdx < modules.length; mIdx++) {
        const mod = modules[mIdx]
        const uploadedItems: any[] = []
        for (let iIdx = 0; iIdx < mod.items.length; iIdx++) {
          const item = mod.items[iIdx]
          if (item.file) {
            const ext = item.file.name.split('.').pop() || 'dat'
            const storagePath = `${course.id}/module_${mIdx + 1}/${crypto.randomUUID()}.${ext}`
            
            // Try uploading to 'Course modules' bucket
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

      // Insert skills
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
                    skill_id: createdSkill.id,
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
            await supabase.from('course_skills').insert(skillInserts)
          }
        } catch (sErr) {
          console.warn('Could not insert course_skills:', sErr)
        }
      }

      // Upload materials
      if (course && pendingMaterials.length > 0) {
        for (const mat of pendingMaterials) {
          if (mat.materialType === 'link' || mat.materialType === 'video') {
            // Link/video - just insert record
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
            // File - upload to storage then insert record
            const fileExt = mat.file.name.split('.').pop()
            const materialId = mat.id
            const storagePath = `${course.id}/${materialId}.${fileExt}`

            const { error: uploadError } = await supabase.storage
              .from('materials')
              .upload(storagePath, mat.file)
            if (uploadError) throw uploadError

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

      toast.success(status === 'draft' ? 'Course saved as draft' : 'Course submitted for review')
      if (course) {
        navigate(`/trainer/courses/${course.id}/materials`)
      } else {
        navigate('/trainer/courses')
      }
    } catch (err) {
      console.error('Course creation error:', err)
      toast.error(err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Failed to create course')
    } finally {
      setSaving(false)
    }
  }

  const toggleSkill = (id: string) => {
    setSelectedSkills(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const addCustomSkill = async () => {
    const name = customSkillName.trim()
    if (!name) return
    const existing = skills.find(s => s.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      if (!selectedSkills.includes(existing.id)) {
        setSelectedSkills(prev => [...prev, existing.id])
        setCustomSkillName('')
        toast.success(`Selected skill: "${existing.name}"`)
        return
      }
      toast.info('Skill already selected')
      setCustomSkillName('')
      return
    }

    setAddingSkill(true)
    try {
      const { data, error } = await supabase.from('skills').insert({ name } as any).select().single()
      if (error || !data) {
        // Local custom skill fallback so trainer is never blocked
        const localSkill: Skill = {
          id: `custom-${crypto.randomUUID()}`,
          name: name,
          category: 'Custom Outcome',
          created_at: new Date().toISOString()
        } as any
        setSkills(prev => [...prev, localSkill].sort((a, b) => a.name.localeCompare(b.name)))
        setSelectedSkills(prev => [...prev, localSkill.id])
        setCustomSkillName('')
        toast.success(`Added outcome: "${name}"`)
      } else {
        setSkills(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        setSelectedSkills(prev => [...prev, data.id])
        setCustomSkillName('')
        toast.success(`Skill "${name}" added`)
      }
    } catch (err) {
      const localSkill: Skill = {
        id: `custom-${crypto.randomUUID()}`,
        name: name,
        category: 'Custom Outcome',
        created_at: new Date().toISOString()
      } as any
      setSkills(prev => [...prev, localSkill].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedSkills(prev => [...prev, localSkill.id])
      setCustomSkillName('')
      toast.success(`Added outcome: "${name}"`)
    } finally {
      setAddingSkill(false)
    }
  }

  const watchedValues = {
    title: detailsForm.watch('title'),
    description: detailsForm.watch('description'),
    course_type: detailsForm.watch('course_type'),
    department: detailsForm.watch('department'),
    session_flow_text: sessionFlowForm.watch('session_flow_text'),
    duration_hours: settingsForm.watch('duration_hours'),
    passing_score: settingsForm.watch('passing_score'),
    learning_objectives: objectivesForm.watch('learning_objectives'),
  }

  const totalMaterialSize = pendingMaterials.reduce((sum, m) => sum + m.fileSize, 0)

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <motion.div variants={fadeUp}>
          <button onClick={() => navigate('/trainer/courses')} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Courses
          </button>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Create Course</h2>
          <p className="text-sm text-slate-500 mt-1">Fill in the details, add materials, and submit for review.</p>
        </motion.div>

        {/* Progress Steps */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => { if (s.id < step) setStep(s.id) }}
                  className={`flex items-center gap-1.5 transition-all ${s.id <= step ? 'text-slate-900 font-bold' : 'text-slate-400'} ${s.id < step ? 'cursor-pointer hover:text-cyan-700' : 'cursor-default'}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all ${
                    step > s.id ? 'bg-emerald-50 border-emerald-300 text-emerald-700' :
                    step === s.id ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-transparent shadow-xs' :
                    'border-slate-300 text-slate-400 bg-white'
                  }`}>
                    {step > s.id ? <CheckCircle className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-[10px] hidden md:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px ${step > s.id ? 'bg-cyan-500' : 'bg-slate-200'}`} />}
              </React.Fragment>
            ))}
          </div>
        </motion.div>

        {/* Step Content */}
        <motion.div variants={fadeUp}>
          {/* Step 1: Course Details */}
          {step === 1 && (
            <Card className="bg-white border border-slate-200/90 shadow-xs rounded-2xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-cyan-600" />
                  <h3 className="text-sm font-bold text-slate-900">Course Details</h3>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-xs font-semibold">Course Title *</Label>
                  <Input {...detailsForm.register('title')} placeholder="e.g. Cyclone Response and Warning Communication" className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl" />
                  {detailsForm.formState.errors.title && <p className="text-xs text-rose-600 font-medium">{detailsForm.formState.errors.title.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-xs font-semibold">Description *</Label>
                  <Textarea {...detailsForm.register('description')} rows={4} placeholder="Describe what this course covers, its target audience, and key topics..." className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white rounded-xl resize-none" />
                  {detailsForm.formState.errors.description && <p className="text-xs text-rose-600 font-medium">{detailsForm.formState.errors.description.message}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-xs font-semibold">Course Type</Label>
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
                      <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 h-10 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard Training</SelectItem>
                        <SelectItem value="scenario">Scenario-Based Training</SelectItem>
                        <SelectItem value="technical">Technical Training</SelectItem>
                        <SelectItem value="custom">+ Add Custom Course Type...</SelectItem>
                      </SelectContent>
                    </Select>
                    {isCustomType && (
                      <Input 
                        {...detailsForm.register('course_type')} 
                        placeholder="Enter custom course type" 
                        className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 mt-2 rounded-xl" 
                      />
                    )}
                    {detailsForm.formState.errors.course_type && <p className="text-xs text-rose-600 font-medium">{detailsForm.formState.errors.course_type.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-xs font-semibold">Department</Label>
                    <Input {...detailsForm.register('department')} placeholder="e.g. IMD, CWC, NIOT" className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Course Configuration */}
          {step === 2 && (
            <Card className="bg-white border border-slate-200/90 shadow-xs rounded-2xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-4 h-4 text-cyan-600" />
                  <h3 className="text-sm font-bold text-slate-900">Course Configuration</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <Label className="text-slate-700 text-xs font-semibold">Duration (hours)</Label>
                    <Input type="number" {...settingsForm.register('duration_hours')} placeholder="e.g. 20" className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl max-w-sm" />
                    <p className="text-[10px] text-slate-400 font-medium">Leave empty for self-paced</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-xs font-semibold">Start Date</Label>
                    <Input type="date" {...settingsForm.register('start_date')} className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl" />
                    {settingsForm.formState.errors.start_date && (
                      <p className="text-[10px] text-rose-600 font-medium">{settingsForm.formState.errors.start_date.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-xs font-semibold">End Date</Label>
                    <Input type="date" {...settingsForm.register('end_date')} className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl" />
                    {settingsForm.formState.errors.end_date && (
                      <p className="text-[10px] text-rose-600 font-medium">{settingsForm.formState.errors.end_date.message}</p>
                    )}
                  </div>
                  {isUrgent && settingsForm.watch('start_date') && !settingsForm.formState.errors.start_date && (
                    <div className="col-span-1 sm:col-span-2 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                      <span className="text-lg">⚠️</span> Course starts in less than 30 days! This will be flagged as <strong className="font-bold">URGENT</strong> for fast-track Admin approval.
                    </div>
                  )}
                  
                  {/* Capacity */}
                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <Label className="text-slate-700 text-xs font-semibold">Trainee Capacity Limit</Label>
                    <Input type="number" {...settingsForm.register('max_trainees')} placeholder="e.g. 50" className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl" />
                    <p className="text-[10px] text-slate-400 font-medium">Must be between 50 and 250</p>
                  </div>
                  
                  {/* Trainer Suggestion / Notice */}
                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <Label className="text-slate-700 text-xs font-semibold flex items-center gap-2">Notice to Admin <Badge variant="secondary" className="text-[9px] h-4 bg-slate-100 text-slate-600">Optional</Badge></Label>
                    <Textarea {...settingsForm.register('trainer_suggestion')} placeholder="Add any notes or suggestions for the admin approving this course..." className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white min-h-[60px] rounded-xl resize-none" />
                  </div>
                  
                  {/* Test Planning */}
                  <div className="space-y-1.5 col-span-1 sm:col-span-2 mt-2 pt-4 border-t border-slate-100">
                    <Label className="text-slate-900 font-bold text-sm">Test & Assessment Plan</Label>
                  </div>
                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <Label className="text-slate-700 text-xs font-bold mt-1">Final Exam Details</Label>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-xs font-semibold">Date</Label>
                    <Input type="date" {...settingsForm.register('final_test_date')} className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 col-span-1">
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-semibold">Start Time</Label>
                      <Input type="time" {...settingsForm.register('final_test_start_time')} className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-semibold">End Time</Label>
                      <Input type="time" {...settingsForm.register('final_test_end_time')} className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl" />
                    </div>
                  </div>
                  {examDuration && (
                    <div className="col-span-1 sm:col-span-2 text-xs font-semibold text-slate-700">
                      Duration: <span className="text-cyan-600 font-bold">{examDuration}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 pt-4 border-t border-slate-100">
                  <Label className="text-slate-700 text-xs font-semibold">Course Thumbnail</Label>
                  <input ref={thumbRef} type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
                  {thumbnailPreview ? (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                      <img src={thumbnailPreview} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => { setThumbnail(null); setThumbnailPreview(null) }} className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => thumbRef.current?.click()} className="w-full h-32 border-2 border-dashed border-slate-200 hover:border-cyan-500 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-cyan-600 bg-slate-50/50 hover:bg-cyan-50/20 transition-all">
                      <Upload className="w-6 h-6" />
                      <span className="text-xs font-semibold">Click to upload thumbnail</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG up to 5MB (16:5 ratio, e.g. 1600x500px)</span>
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Course Outline */}
          {step === 3 && (
            <Card className="bg-white border border-slate-200/90 shadow-xs rounded-2xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-cyan-600" />
                  <h3 className="text-sm font-bold text-slate-900">Course Outline</h3>
                </div>
                <p className="text-xs text-slate-500">Outline the structure, modules, and topics covered in this course.</p>
                
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-xs font-semibold">Course Outline Details</Label>
                  <Textarea {...sessionFlowForm.register('session_flow_text')} rows={6} placeholder="Describe the course outline, topics covered, and learning plan..." className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white rounded-xl resize-none" />
                </div>

                <div className="space-y-1.5 mt-4">
                  <Label className="text-slate-700 text-xs font-semibold">Course Outline Document (Optional)</Label>
                  {sessionFlowDoc ? (
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-2 text-sm text-slate-900 font-medium truncate">
                        <FileText className="w-4 h-4 shrink-0 text-cyan-600" />
                        <span className="truncate">{sessionFlowDoc.name}</span>
                      </div>
                      <button onClick={() => setSessionFlowDoc(null)} className="p-1.5 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        className="bg-slate-50 border-slate-200 text-slate-900 cursor-pointer rounded-xl h-10"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            if (file.size > 20 * 1024 * 1024) {
                              toast.error('File size must be less than 20MB')
                              return
                            }
                            setSessionFlowDoc(file)
                          }
                        }}
                      />
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400">Upload a PDF or Word document outlining the flow (max 20MB).</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Learning Objectives & Skills */}
          {step === 4 && (
            <div className="space-y-4">
              <Card className="bg-white border border-slate-200/90 shadow-xs rounded-2xl">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-cyan-600" />
                    <h3 className="text-sm font-bold text-slate-900">Learning Objectives</h3>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-xs font-semibold">Course Learning Objectives *</Label>
                    <Textarea 
                      {...objectivesForm.register('learning_objectives')} 
                      rows={5} 
                      placeholder="e.g. Describe the core knowledge, skills, and practical competencies learners will acquire upon completing this course..." 
                      className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white rounded-xl resize-none" 
                    />
                    {objectivesForm.formState.errors.learning_objectives && (
                      <p className="text-xs text-rose-600 font-medium">{objectivesForm.formState.errors.learning_objectives.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-slate-200/90 shadow-xs rounded-2xl">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-cyan-600" />
                    <h3 className="text-sm font-bold text-slate-900">Outcomes of Learning (Skills Developed)</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Add custom learning outcomes or select standard competencies trainees will master upon completing this course.
                  </p>

                  {/* Add Custom Outcome / Skill */}
                  <div className="flex gap-2">
                    <Input 
                      value={customSkillName} 
                      onChange={e => setCustomSkillName(e.target.value)} 
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill() } }} 
                      placeholder="Type custom skill or outcome (e.g. Cyclone Track Prediction, Database Normalization)..." 
                      className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:text-slate-900 h-10 text-xs rounded-xl font-medium" 
                      disabled={addingSkill} 
                    />
                    <Button 
                      type="button" 
                      onClick={addCustomSkill} 
                      disabled={!customSkillName.trim() || addingSkill} 
                      className="bg-cyan-600 hover:bg-cyan-700 text-white h-10 px-4 shrink-0 rounded-xl font-bold text-xs shadow-xs"
                    >
                      {addingSkill ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                      Add Outcome
                    </Button>
                  </div>

                  {/* Selected Skills Summary */}
                  {selectedSkills.length > 0 && (
                    <div className="p-3 bg-cyan-50/60 border border-cyan-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-cyan-950 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-cyan-700" />
                          Selected Course Outcomes ({selectedSkills.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedSkills([])}
                          className="text-[11px] text-slate-500 hover:text-rose-600 font-medium"
                        >
                          Clear all
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSkills.map(id => {
                          const skill = skills.find(s => s.id === id)
                          if (!skill) return null
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-600 text-white shadow-xs"
                            >
                              <span>{skill.name}</span>
                              <button
                                type="button"
                                onClick={() => toggleSkill(id)}
                                className="hover:bg-cyan-700 rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Available Suggested Competencies */}
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs font-bold text-slate-700">Click to select suggested competencies:</Label>
                    {skills.length === 0 ? (
                      <p className="text-sm text-slate-400 py-4 text-center">No skills available yet. Type an outcome above to add.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                        {skills.map(s => {
                          const isSelected = selectedSkills.includes(s.id)
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleSkill(s.id)}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                              <span>{s.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''} selected</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 5: Modules */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-cyan-500/10 via-sky-500/10 to-blue-500/10 p-5 rounded-2xl border border-cyan-200/80">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-cyan-700" />
                    <h3 className="text-base font-bold text-slate-900">Course Modules</h3>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Structure the learning content into sequential modules. Add photos, video lessons, links, and content descriptions.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={addModule}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-xs shrink-0 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Module
                </Button>
              </div>

              {/* Module Cards List */}
              <div className="space-y-6">
                {modules.map((mod, mIndex) => {
                  return (
                    <Card
                      key={mod.id}
                      className="transition-all rounded-2xl overflow-hidden border border-slate-200/90 bg-white shadow-xs"
                    >
                      <CardContent className="p-6 space-y-5">
                        {/* Module Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <Badge
                              className="text-xs font-bold px-3 py-1 rounded-xl bg-cyan-50 text-cyan-800 border border-cyan-200"
                            >
                              Module {mIndex + 1}
                            </Badge>
                          </div>
                          {modules.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeModule(mod.id)}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold h-8"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove Module
                            </Button>
                          )}
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-slate-700 text-xs font-semibold">Module Title *</Label>
                            <Input
                              value={mod.title}
                              onChange={e => updateModule(mod.id, { title: e.target.value })}
                              placeholder={`e.g. Module ${mIndex + 1}: Core Disaster Response`}
                              className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl text-sm font-semibold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-slate-700 text-xs font-semibold">Module Description / Overview</Label>
                            <Textarea
                              value={mod.description}
                              onChange={e => updateModule(mod.id, { description: e.target.value })}
                              placeholder="Describe what trainees will learn and review in this module..."
                              rows={2}
                              className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white rounded-xl text-xs resize-none"
                            />
                          </div>
                        </div>

                        {/* Unified Module Content & Assessment Sequence */}
                        <div className="space-y-4 pt-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                            <div>
                              <div className="flex items-center gap-2">
                                <Label className="text-slate-900 text-xs font-bold flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-cyan-600" />
                                  Module Content & Assessment Sequence ({mod.items.length})
                                </Label>
                                {(mod.items.some(i => i.type === 'quiz') || (mod.quiz_questions || []).length > 0) && (
                                  <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold px-2 py-0.5">
                                    80% Quiz Pass Gate Active
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Add and sequence videos, diagrams, notes, and quiz questions in the exact order trainees will experience them.
                              </p>
                            </div>

                            {/* Toolbar Buttons */}
                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openAddItem(mod.id, 'text')}
                                className="h-7 px-2 text-[11px] border-purple-200 text-purple-800 bg-purple-50/50 hover:bg-purple-100 rounded-lg font-semibold"
                              >
                                <AlignLeft className="w-3 h-3 mr-1 text-purple-600" /> + Text
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openAddItem(mod.id, 'video')}
                                className="h-7 px-2 text-[11px] border-blue-200 text-blue-800 bg-blue-50/50 hover:bg-blue-100 rounded-lg font-semibold"
                              >
                                <Film className="w-3 h-3 mr-1 text-blue-600" /> + Video
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openAddItem(mod.id, 'photo')}
                                className="h-7 px-2 text-[11px] border-cyan-200 text-cyan-800 bg-cyan-50/50 hover:bg-cyan-100 rounded-lg font-semibold"
                              >
                                <Camera className="w-3 h-3 mr-1 text-cyan-600" /> + Photo
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openAddItem(mod.id, 'link')}
                                className="h-7 px-2 text-[11px] border-emerald-200 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100 rounded-lg font-semibold"
                              >
                                <Link2 className="w-3 h-3 mr-1 text-emerald-600" /> + Link
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => openAddQuizQuestion(mod.id)}
                                className="h-7 px-2.5 text-[11px] bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg font-bold shadow-xs"
                              >
                                <HelpCircle className="w-3 h-3 mr-1" /> + Quiz Qn
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isGeneratingAiQuiz}
                                onClick={() => handleGenerateAiQuiz(mod.id)}
                                className="h-7 px-2 text-[11px] border-amber-300 bg-amber-50/70 text-amber-900 hover:bg-amber-100 rounded-lg font-bold"
                              >
                                <Sparkles className="w-3 h-3 mr-1 text-amber-600" />
                                {isGeneratingAiQuiz ? '...' : 'AI Quiz'}
                              </Button>
                            </div>
                          </div>

                          {/* Unified Sequential List of Items */}
                          {mod.items.length > 0 ? (
                            <div className="space-y-2.5 pt-1">
                              {mod.items.map((item, itemIdx) => {
                                const isFirst = itemIdx === 0
                                const isLast = itemIdx === mod.items.length - 1
                                const isQuiz = item.type === 'quiz'

                                return (
                                  <div
                                    key={item.id || itemIdx}
                                    className={`p-3.5 rounded-xl border transition-all flex items-start gap-3 relative group ${
                                      isQuiz
                                        ? 'bg-amber-50/40 border-amber-200/90 hover:border-amber-300'
                                        : 'bg-slate-50 border-slate-200/90 hover:border-cyan-300'
                                    }`}
                                  >
                                    {/* Sequential Step Badge */}
                                    <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-xs ${
                                        isQuiz
                                          ? 'bg-amber-600 text-white'
                                          : 'bg-slate-900 text-white'
                                      }`}>
                                        {itemIdx + 1}
                                      </span>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase">Step</span>
                                    </div>

                                    {/* Icon & Type Badge */}
                                    <div className="flex-1 min-w-0 pr-24">
                                      <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <Badge className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                          item.type === 'photo' ? 'bg-cyan-50 text-cyan-800 border-cyan-200' :
                                          item.type === 'video' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                          item.type === 'link' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                          item.type === 'text' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                                          'bg-amber-100 text-amber-900 border-amber-300'
                                        }`}>
                                          {item.type === 'photo' && <Camera className="w-3 h-3" />}
                                          {item.type === 'video' && <Film className="w-3 h-3" />}
                                          {item.type === 'link' && <Link2 className="w-3 h-3" />}
                                          {item.type === 'text' && <AlignLeft className="w-3 h-3" />}
                                          {item.type === 'quiz' && <HelpCircle className="w-3 h-3 text-amber-700" />}
                                          <span className="capitalize">{item.type === 'quiz' ? 'Quiz Question' : item.type === 'text' ? 'Text / Notes' : item.type}</span>
                                        </Badge>

                                        {item.type === 'video' && (
                                          <Badge className="bg-blue-100/80 text-blue-800 border-blue-300 text-[10px] font-bold flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" />
                                            {item.duration_minutes || (item.duration_seconds ? Math.round(item.duration_seconds / 60) : 5)} min (90% required)
                                          </Badge>
                                        )}

                                        <p className="text-xs font-bold text-slate-900 truncate">
                                          {item.title}
                                        </p>
                                      </div>

                                      {/* Quiz Details */}
                                      {isQuiz && item.quiz_data && (
                                        <div className="space-y-1.5 mt-1.5 pl-1">
                                          <p className="text-xs text-slate-800 font-semibold">{item.quiz_data.question}</p>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                            {item.quiz_data.options.map((opt, oIdx) => {
                                              const isCorrect = oIdx === item.quiz_data?.correct_option
                                              return (
                                                <div
                                                  key={oIdx}
                                                  className={`p-1.5 px-2 rounded-lg text-[11px] flex items-center gap-1.5 border ${
                                                    isCorrect
                                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                                      : 'bg-white border-slate-200 text-slate-600'
                                                  }`}
                                                >
                                                  <span className={`w-3.5 h-3.5 rounded-full text-[9px] font-black flex items-center justify-center shrink-0 ${
                                                    isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                                                  }`}>
                                                    {String.fromCharCode(65 + oIdx)}
                                                  </span>
                                                  <span className="truncate">{opt}</span>
                                                  {isCorrect && (
                                                    <span className="text-[9px] font-bold text-emerald-700 ml-auto bg-emerald-100 px-1 rounded">
                                                      Correct
                                                    </span>
                                                  )}
                                                </div>
                                              )
                                            })}
                                          </div>
                                          {item.quiz_data.explanation && (
                                            <p className="text-[10px] text-slate-500 italic mt-1">💡 {item.quiz_data.explanation}</p>
                                          )}
                                        </div>
                                      )}

                                      {/* Media & Content Details */}
                                      {!isQuiz && (
                                        <div className="space-y-1 mt-0.5">
                                          {item.url && (
                                            <p className="text-[11px] text-cyan-700 font-medium truncate flex items-center gap-1">
                                              <ExternalLink className="w-3 h-3" /> {item.url}
                                            </p>
                                          )}
                                          {item.content && (
                                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-white/70 p-2 rounded-lg border border-slate-100">
                                              {item.content}
                                            </p>
                                          )}
                                          {item.previewUrl && (
                                            <div className="mt-1.5 w-40 h-24 rounded-lg overflow-hidden border border-slate-200 bg-white">
                                              <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                                            </div>
                                          )}
                                          {item.fileSize && (
                                            <span className="text-[10px] text-slate-400 font-medium">
                                              File: {item.fileName || 'Uploaded media'} ({formatFileSize(item.fileSize)})
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Action Controls: Move Up, Move Down, Edit, Delete */}
                                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 p-1 rounded-lg border border-slate-200/90 shadow-xs">
                                      <button
                                        type="button"
                                        disabled={isFirst}
                                        onClick={() => moveModuleItem(mod.id, itemIdx, itemIdx - 1)}
                                        className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                                        title="Move Up in sequence"
                                      >
                                        <ArrowUp className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isLast}
                                        onClick={() => moveModuleItem(mod.id, itemIdx, itemIdx + 1)}
                                        className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                                        title="Move Down in sequence"
                                      >
                                        <ArrowDown className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openEditItem(mod.id, item)}
                                        className="p-1 rounded text-slate-500 hover:text-cyan-600 hover:bg-cyan-50"
                                        title="Edit item"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeModuleItem(mod.id, item.id)}
                                        className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                        title="Delete item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="p-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 text-center space-y-2">
                              <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                              <div>
                                <p className="text-xs font-bold text-slate-700">No items added to this module yet.</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Use the toolbar buttons (+ Text, + Video, + Photo, + Link, + Quiz Qn) to build this module's curriculum.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Module Quiz Question Addition / Edit Modal */}
          {activeQuizModuleId && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-lg w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900">
                      {editingQuestionId ? 'Edit Quiz Question' : 'Add Quiz Question to Module'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveQuizModuleId(null)
                      setEditingQuestionId(null)
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
                  <Badge className="bg-amber-600 text-white text-[10px] font-bold">Rule</Badge>
                  <p className="text-xs text-amber-900 font-medium">
                    Trainees must score <strong>≥80%</strong> on this module quiz to unlock the next module.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Question Prompt *</Label>
                    <Textarea
                      value={quizQuestionText}
                      onChange={e => setQuizQuestionText(e.target.value)}
                      placeholder="e.g. What is the standard protocol for classifying cyclone landfall zones?"
                      rows={2}
                      className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:text-slate-900 rounded-xl text-xs resize-none font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Answer Choices (Select the correct answer) *</span>
                      <span className="text-[10px] text-slate-400 font-normal">Click letter circle to set correct</span>
                    </Label>
                    <div className="space-y-2">
                      {quizOptions.map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQuizCorrectOption(idx)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 transition-all ${
                              quizCorrectOption === idx
                                ? 'bg-emerald-600 text-white shadow-xs scale-105'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                            title="Set as correct answer"
                          >
                            {String.fromCharCode(65 + idx)}
                          </button>
                          <Input
                            value={opt}
                            onChange={e => {
                              const newOpts = [...quizOptions]
                              newOpts[idx] = e.target.value
                              setQuizOptions(newOpts)
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + idx)}...`}
                            className={`h-9 rounded-xl text-xs font-medium placeholder:text-slate-400 ${
                              quizCorrectOption === idx
                                ? 'bg-emerald-50/70 border-emerald-300 text-slate-900 focus:bg-white focus:text-slate-900'
                                : 'bg-white border-slate-300 text-slate-900 focus:bg-white focus:text-slate-900'
                            }`}
                          />
                          {quizCorrectOption === idx && (
                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                              Correct
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Explanation / Feedback (Optional)</Label>
                    <Input
                      value={quizExplanation}
                      onChange={e => setQuizExplanation(e.target.value)}
                      placeholder="Why is this the correct answer?"
                      className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:text-slate-900 h-9 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActiveQuizModuleId(null)
                      setEditingQuestionId(null)
                    }}
                    className="text-xs text-slate-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveQuizQuestion}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl"
                  >
                    {editingQuestionId ? 'Save Changes' : 'Add Question'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Module Item Addition Modal */}
          {addingItemType && activeModuleId && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    {addingItemType === 'photo' && <Camera className="w-4 h-4 text-cyan-600" />}
                    {addingItemType === 'video' && <Film className="w-4 h-4 text-blue-600" />}
                    {addingItemType === 'link' && <Link2 className="w-4 h-4 text-emerald-600" />}
                    {addingItemType === 'text' && <AlignLeft className="w-4 h-4 text-purple-600" />}
                    <h3 className="text-sm font-bold text-slate-900 capitalize">Add {addingItemType} to Module</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAddingItemType(null)
                      setActiveModuleId(null)
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">Item Title *</Label>
                    <Input
                      value={itemTitle}
                      onChange={e => setItemTitle(e.target.value)}
                      placeholder={`e.g. ${addingItemType === 'video' ? 'Introductory Lecture Video' : addingItemType === 'photo' ? 'Chart Diagram' : 'Topic Overview'}`}
                      className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:text-slate-900 h-10 rounded-xl text-xs font-medium"
                    />
                  </div>

                  {addingItemType === 'photo' && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-slate-700">Upload Photo or Image</Label>
                      <input
                        ref={moduleFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleModuleFileSelect}
                      />
                      {itemPreview ? (
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 h-32 bg-slate-50">
                          <img src={itemPreview} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => { setItemFile(null); setItemPreview(null) }}
                            className="absolute top-2 right-2 p-1 rounded-full bg-slate-900/80 text-white hover:bg-rose-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => moduleFileInputRef.current?.click()}
                          className="w-full h-24 border-2 border-dashed border-slate-200 hover:border-cyan-500 rounded-xl flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-cyan-600 bg-slate-50/50"
                        >
                          <Upload className="w-5 h-5" />
                          <span className="text-xs font-semibold">Select image file (PNG, JPG, WebP)</span>
                        </button>
                      )}
                      <div className="pt-1">
                        <Label className="text-[11px] font-medium text-slate-500">Or Image URL</Label>
                        <Input
                          value={itemUrl}
                          onChange={e => setItemUrl(e.target.value)}
                          placeholder="https://..."
                          className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:text-slate-900 h-9 rounded-xl text-xs font-medium mt-1"
                        />
                      </div>
                    </div>
                  )}

                  {addingItemType === 'video' && (
                    <div className="space-y-3">
                      <div className="space-y-1.5 p-3 rounded-xl bg-blue-50/70 border border-blue-200/80">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-600" /> Video Length / Duration (Minutes) *
                          </Label>
                          <Badge className="bg-blue-600 text-white text-[10px] font-extrabold shadow-xs">90% Gate</Badge>
                        </div>
                        <div className="relative">
                          <Input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={itemDurationMinutes}
                            onChange={e => setItemDurationMinutes(e.target.value)}
                            placeholder="e.g. 5"
                            className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:text-slate-900 h-9 rounded-xl text-xs font-semibold pr-16"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">minutes</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Trainees must watch at least <strong className="text-blue-700 font-bold">90%</strong> ({itemDurationMinutes ? (parseFloat(itemDurationMinutes) * 0.9).toFixed(1) : '4.5'} min) of this video before they can finish this module and submit the quiz.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-700">Video Link (YouTube, Vimeo, MP4)</Label>
                        <Input
                          value={itemUrl}
                          onChange={e => setItemUrl(e.target.value)}
                          placeholder="e.g. https://www.youtube.com/watch?v=... or https://example.com/video.mp4"
                          className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:text-slate-900 h-9 rounded-xl text-xs font-medium"
                        />
                        <div className="text-center text-[10px] text-slate-400 font-semibold">— OR UPLOAD VIDEO FILE —</div>
                        <input
                          ref={moduleFileInputRef}
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime"
                          className="hidden"
                          onChange={handleModuleFileSelect}
                        />
                        {itemFile ? (
                          <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                            <span className="truncate">{itemFile.name} ({formatFileSize(itemFile.size)})</span>
                            <button
                              type="button"
                              onClick={() => setItemFile(null)}
                              className="p-1 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => moduleFileInputRef.current?.click()}
                            className="w-full h-16 border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:text-blue-600 bg-slate-50/50"
                          >
                            <Upload className="w-4 h-4" />
                            <span className="text-xs font-semibold">Upload MP4/WebM file (max 100MB)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {addingItemType === 'link' && (
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700">External URL *</Label>
                      <Input
                        value={itemUrl}
                        onChange={e => setItemUrl(e.target.value)}
                        placeholder="https://..."
                        className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:text-slate-900 h-9 rounded-xl text-xs font-medium"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-700">
                      {addingItemType === 'text' ? 'Content & Explanation *' : 'Description / Caption (Optional)'}
                    </Label>
                    <Textarea
                      value={itemContent}
                      onChange={e => setItemContent(e.target.value)}
                      rows={addingItemType === 'text' ? 5 : 2}
                      placeholder="Enter description, study notes, or reading material..."
                      className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:text-slate-900 rounded-xl text-xs resize-none font-medium leading-relaxed"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAddingItemType(null)
                      setActiveModuleId(null)
                    }}
                    className="border-slate-200 text-slate-700 rounded-xl text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveModuleItem}
                    className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-xs"
                  >
                    Save to Module
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Materials */}
          {step === 6 && (
            <div className="space-y-4">
              <Card className="bg-white border border-slate-200/90 shadow-xs rounded-2xl">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-cyan-600" />
                    <h3 className="text-sm font-bold text-slate-900">Additional Course Materials</h3>
                  </div>
                  <p className="text-xs text-slate-500">Add supplementary documents, reference guides, and links.</p>

                  {/* Tab Toggle */}
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button onClick={() => setActiveTab('files')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'files' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}>
                      <FileText className="w-3.5 h-3.5 inline mr-1.5 text-cyan-600" /> Files & Videos
                    </button>
                    <button onClick={() => setActiveTab('links')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'links' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}>
                      <Globe className="w-3.5 h-3.5 inline mr-1.5 text-cyan-600" /> Links
                    </button>
                  </div>

                  {/* Files Tab */}
                  {activeTab === 'files' && (
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${dragOver ? 'border-cyan-500 bg-cyan-50/20' : 'border-slate-200 hover:border-cyan-400 bg-slate-50/50'}`}
                    >
                      <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.pptx,.ppt,.txt,.mp4,.webm,.mov,.png,.jpg,.jpeg,.gif,.webp" className="hidden" onChange={handleFileInput} />
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-700 font-semibold mb-1">Drag & drop files here, or click to browse</p>
                      <p className="text-[10px] text-slate-400 mb-3">PDF, DOC, PPTX, MP4, images — up to 100MB each</p>
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="border-slate-200 text-slate-700 hover:bg-white font-semibold rounded-xl">
                        <Upload className="w-3.5 h-3.5 mr-1.5 text-cyan-600" /> Choose Files
                      </Button>
                    </div>
                  )}

                  {/* Links Tab */}
                  {activeTab === 'links' && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-slate-700 text-xs font-semibold">URL *</Label>
                        <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://example.com/video-or-document" className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 text-xs rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-slate-700 text-xs font-semibold">Title (optional)</Label>
                        <Input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} placeholder="Descriptive title" className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 text-xs rounded-xl" />
                      </div>
                      <Button variant="outline" size="sm" onClick={addLinkMaterial} disabled={!linkUrl.trim()} className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl">
                        <Plus className="w-3.5 h-3.5 mr-1.5 text-cyan-600" /> Add Link
                      </Button>
                    </div>
                  )}

                  {/* Material List */}
                  {pendingMaterials.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900">Added Materials ({pendingMaterials.length})</h4>
                        <span className="text-[10px] text-slate-400 font-semibold">{formatFileSize(totalMaterialSize)}</span>
                      </div>
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {pendingMaterials.map(mat => {
                          const Icon = mat.materialType === 'link' || mat.materialType === 'video'
                            ? (mat.url?.includes('youtube') || mat.url?.includes('vimeo') ? Video : Globe)
                            : getFileIcon(mat.mimeType)
                          return (
                            <div key={mat.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 group">
                              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4 text-cyan-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-900 truncate">{mat.fileName}</p>
                                <p className="text-[10px] text-slate-500">
                                  {mat.materialType === 'link' || mat.materialType === 'video' ? mat.url : formatFileSize(mat.fileSize)}
                                </p>
                              </div>
                              <Badge className="text-[9px] h-5 bg-cyan-50 text-cyan-700 border-cyan-200 font-semibold capitalize">
                                {mat.materialType}
                              </Badge>
                              <button onClick={() => removeMaterial(mat.id)} className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors shrink-0">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 7: Certificate */}
          {step === 7 && (
            <CourseCertificateStep
              hasCertificate={hasCertificate}
              setHasCertificate={setHasCertificate}
              templateUrl={certificateTemplateUrl}
              setTemplateUrl={setCertificateTemplateUrl}
              templateName={certificateTemplateName}
              setTemplateName={setCertificateTemplateName}
              courseTitle={watchedValues.title || 'Specialized Training Course'}
            />
          )}

          {/* Step 8: Review & Submit */}
          {step === 8 && (
            <div className="space-y-4">
              <Card className="bg-white border border-slate-200/90 shadow-xs rounded-2xl">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-cyan-600" />
                    <h3 className="text-sm font-bold text-slate-900">Review Course</h3>
                  </div>
                  <p className="text-xs text-slate-500">Review everything before creating the course.</p>

                  {/* Course Details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <BookOpen className="w-3 h-3 text-cyan-600" /> Course Details
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <div><span className="text-[10px] font-semibold text-slate-400">Title</span><p className="text-sm font-bold text-slate-900">{watchedValues.title || '—'}</p></div>
                      <div><span className="text-[10px] font-semibold text-slate-400">Description</span><p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{watchedValues.description || '—'}</p></div>
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div><span className="text-[10px] font-semibold text-slate-400">Type</span><p className="text-xs font-semibold text-slate-800 capitalize">{watchedValues.course_type}</p></div>
                        <div><span className="text-[10px] font-semibold text-slate-400">Department</span><p className="text-xs font-semibold text-slate-800">{watchedValues.department || '—'}</p></div>
                      </div>
                    </div>
                  </div>

                  {/* Certificate Settings Review */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <Award className="w-3 h-3 text-cyan-600" /> Certificate Configuration
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          {hasCertificate ? 'Certificate Enabled' : 'No Certificate'}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {hasCertificate 
                            ? (certificateTemplateName ? `Custom Template: ${certificateTemplateName}` : 'Using Standard MoES Capacity Connect PPTX Template')
                            : 'Trainees will not receive a certificate upon completion'}
                        </p>
                      </div>
                      {hasCertificate && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Auto-Issue on 100%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <Settings className="w-3 h-3 text-cyan-600" /> Settings
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                      <div><span className="text-[10px] font-semibold text-slate-400">Duration</span><p className="text-xs font-semibold text-slate-800">{watchedValues.duration_hours ? `${watchedValues.duration_hours} hours` : 'Self-paced'}</p></div>
                    </div>
                  </div>

                  {/* Course Outline */}
                  {(watchedValues.session_flow_text || sessionFlowDoc) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <FileText className="w-3 h-3 text-cyan-600" /> Course Outline
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                        {watchedValues.session_flow_text && (
                          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{watchedValues.session_flow_text}</p>
                        )}
                        {sessionFlowDoc && (
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                            <File className="w-3.5 h-3.5 text-cyan-600" /> {sessionFlowDoc.name}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Learning Objectives */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <Target className="w-3 h-3 text-cyan-600" /> Learning Objectives
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{watchedValues.learning_objectives || '—'}</p>
                    </div>
                  </div>

                  {/* Outcomes of Learning (Skills) */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <Target className="w-3 h-3 text-cyan-600" /> Outcomes of Learning (Skills Developed)
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                      {selectedSkills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedSkills.map(id => {
                            const skill = skills.find(s => s.id === id)
                            return skill ? <span key={id} className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 border border-cyan-200 text-cyan-800">{skill.name}</span> : null
                          })}
                        </div>
                      ) : <p className="text-xs text-slate-400">No skills selected</p>}
                    </div>
                  </div>

                  {/* Course Modules Review */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <Layers className="w-3 h-3 text-cyan-600" /> Course Modules ({modules.length})
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                      {modules.map((m) => {
                        return (
                          <div key={m.id} className="p-2.5 rounded-lg bg-white border border-slate-200/90 text-xs space-y-1.5">
                            <div className="flex items-center justify-between font-bold text-slate-900">
                              <span>{m.title}</span>
                              <div className="flex items-center gap-1.5">
                                <Badge variant="secondary" className="text-[9px] font-semibold">
                                  {m.items.length} Item{m.items.length !== 1 ? 's' : ''}
                                </Badge>
                                {(m.quiz_questions || []).length > 0 && (
                                  <Badge className="text-[9px] font-bold bg-amber-50 text-amber-800 border-amber-200">
                                    {(m.quiz_questions || []).length} Quiz Qs (≥80% Pass)
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {m.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-1">{m.description}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Materials */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <FileText className="w-3 h-3 text-cyan-600" /> Supplementary Materials ({pendingMaterials.length})
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                      {pendingMaterials.length > 0 ? (
                        <div className="space-y-1.5">
                          {pendingMaterials.slice(0, 5).map(mat => (
                            <div key={mat.id} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                              <File className="w-3.5 h-3.5 shrink-0 text-cyan-600" />
                              <span className="truncate">{mat.fileName}</span>
                            </div>
                          ))}
                          {pendingMaterials.length > 5 && <p className="text-[10px] text-slate-400 font-semibold">+{pendingMaterials.length - 5} more</p>}
                        </div>
                      ) : <p className="text-xs text-slate-400">No supplementary materials added</p>}
                    </div>
                  </div>

                  {/* Thumbnail */}
                  {thumbnailPreview && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <Upload className="w-3 h-3 text-cyan-600" /> Thumbnail
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-24 object-cover rounded-lg" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Warning */}
              <div className="flex items-start gap-2 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <p className="font-bold mb-0.5">After admin approval:</p>
                  <p>You can add more materials, generate AI assessment questions, and manage course content from the course materials and modules page.</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Navigation */}
        <motion.div variants={fadeUp} className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={handleBack} disabled={step === 1} className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-3">
            {step < 8 ? (
              <Button onClick={handleNext} className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold shadow-md shadow-cyan-600/20 rounded-xl">
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleSubmit('draft')} disabled={saving} className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save as Draft
                </Button>
                <Button onClick={() => handleSubmit('pending_review')} disabled={saving} className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold shadow-md shadow-cyan-600/20 rounded-xl">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Submit for Review
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      <ImageCropperModal
        isOpen={isCropperOpen}
        imageFile={rawImageFile}
        onClose={() => {
          setIsCropperOpen(false)
          setRawImageFile(null)
        }}
        onCropComplete={handleCropComplete}
      />
    </TrainerLayout>
  )
}
