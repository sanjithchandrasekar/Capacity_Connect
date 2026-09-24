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
import { Label } from 

'@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft, ArrowRight, CheckCircle, Loader2, Plus, Upload, X,
  BookOpen, Settings, Target, Eye, AlertCircle, FileText, File, Image,
  Video, Link2, ExternalLink, Globe, Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { ImageCropperModal } from '@/components/ui/ImageCropperModal'

type Skill = Database['public']['Tables']['skills']['Row']

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
  delivery_mode: z.enum(['recorded', 'live', 'hybrid']),
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
  understand: z.string().min(5, 'Describe what learners will understand'),
  able_to_do: z.string().min(5, 'Describe what learners will be able to do'),
  competencies_built: z.string().min(5, 'Describe the competencies this course builds'),
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
  { id: 3, label: 'Session Flow', icon: FileText },
  { id: 4, label: 'Learning & Skills', icon: Target },
  { id: 5, label: 'Materials', icon: FileText },
  { id: 6, label: 'Review & Submit', icon: Eye },
]

export function CourseCreatePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
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
    defaultValues: { understand: '', able_to_do: '', competencies_built: '' },
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
    supabase.from('skills').select('*').order('name').then(({ data }) => {
      if (data) setSkills(data)
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

  const validateStep = async () => {
    switch (step) {
      case 1: return await detailsForm.trigger()
      case 2: return await settingsForm.trigger()
      case 3: return await sessionFlowForm.trigger()
      case 4: return await objectivesForm.trigger()
      default: return true
    }
  }

  const handleNext = async () => {
    if (step === 5 && pendingMaterials.length === 0) {
      toast.error('Add at least one material (file or link) before submitting')
      return
    }
    const valid = await validateStep()
    if (!valid) return
    setStep(s => Math.min(s + 1, 6))
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
            understand: o.understand,
            able_to_do: o.able_to_do,
            competencies_built: o.competencies_built,
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
        })
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

      // Insert skills
      if (selectedSkills.length > 0 && course) {
        const skillInserts = selectedSkills.map(skillId => ({
          course_id: course.id,
          skill_id: skillId,
          required_level: 3,
        }))
        await supabase.from('course_skills').insert(skillInserts)
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
    if (skills.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      toast.error('Skill already exists')
      return
    }
    setAddingSkill(true)
    try {
      const { data, error } = await supabase.from('skills').insert({ name }).select().single()
      if (error) throw error
      setSkills(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedSkills(prev => [...prev, data.id])
      setCustomSkillName('')
      toast.success(`Skill "${name}" created`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add skill')
    } finally {
      setAddingSkill(false)
    }
  }

  const watchedValues = {
    title: detailsForm.watch('title'),
    description: detailsForm.watch('description'),
    course_type: detailsForm.watch('course_type'),
    department: detailsForm.watch('department'),
    duration_hours: settingsForm.watch('duration_hours'),
    passing_score: settingsForm.watch('passing_score'),
    understand: objectivesForm.watch('understand'),
    able_to_do: objectivesForm.watch('able_to_do'),
    competencies_built: objectivesForm.watch('competencies_built'),
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
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-xs font-semibold">Duration (hours)</Label>
                    <Input type="number" {...settingsForm.register('duration_hours')} placeholder="e.g. 20" className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl" />
                    <p className="text-[10px] text-slate-400 font-medium">Leave empty for self-paced</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-xs font-semibold">Passing Score (%)</Label>
                    <Input type="number" {...settingsForm.register('passing_score')} placeholder="60" className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl" />
                    <p className="text-[10px] text-slate-400 font-medium">Minimum score to pass</p>
                  </div>
                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <Label className="text-slate-700 text-xs font-semibold">Live Meeting Link</Label>
                    <Input type="url" {...settingsForm.register('meet_link')} placeholder="e.g. https://meet.google.com/..." className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl" />
                    {settingsForm.formState.errors.meet_link && <p className="text-[10px] text-rose-600 font-medium">{settingsForm.formState.errors.meet_link.message}</p>}
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
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-xs font-semibold">Planned Daily Assessments</Label>
                    <Input type="number" {...settingsForm.register('planned_assessments_count')} placeholder="e.g. 10" className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-xs font-semibold">Planned Mock Tests</Label>
                    <Input type="number" {...settingsForm.register('planned_mock_tests_count')} placeholder="e.g. 2" className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl" />
                  </div>
                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <Label className="text-slate-700 text-xs font-bold mt-2">Final Exam Details</Label>
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
                  
                  {/* Delivery & Schedule Fields */}
                  <div className="space-y-1.5 col-span-1 sm:col-span-2 mt-2 pt-4 border-t border-slate-100">
                    <Label className="text-slate-900 font-bold text-sm">Delivery & Schedule</Label>
                  </div>
                  <div className="space-y-1.5 col-span-1 sm:col-span-2">
                    <Label className="text-slate-700 text-xs font-semibold">Delivery Mode</Label>
                    <Select value={settingsForm.watch('delivery_mode')} onValueChange={v => settingsForm.setValue('delivery_mode', v as any)}>
                      <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 h-10 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recorded">Pre-recorded Videos</SelectItem>
                        <SelectItem value="live">Live Online Classes</SelectItem>
                        <SelectItem value="hybrid">Hybrid (Both)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5 pt-2">
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

          {/* Step 3: Session Flow */}
          {step === 3 && (
            <Card className="bg-white border border-slate-200/90 shadow-xs rounded-2xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-cyan-600" />
                  <h3 className="text-sm font-bold text-slate-900">Session Flow</h3>
                </div>
                <p className="text-xs text-slate-500">Outline how the sessions will be engaged and what topics will be covered.</p>
                
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-xs font-semibold">Session Flow Details</Label>
                  <Textarea {...sessionFlowForm.register('session_flow_text')} rows={6} placeholder="Describe the session flow, topics covered, and engagement plan..." className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white rounded-xl resize-none" />
                </div>

                <div className="space-y-1.5 mt-4">
                  <Label className="text-slate-700 text-xs font-semibold">Session Flow Document (Optional)</Label>
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
                    <Label className="text-slate-700 text-xs font-semibold">What will learners understand? *</Label>
                    <Textarea {...objectivesForm.register('understand')} rows={3} placeholder="e.g. The principles of cyclone formation, warning systems..." className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white rounded-xl resize-none" />
                    {objectivesForm.formState.errors.understand && <p className="text-xs text-rose-600 font-medium">{objectivesForm.formState.errors.understand.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-xs font-semibold">What will learners be able to do? *</Label>
                    <Textarea {...objectivesForm.register('able_to_do')} rows={3} placeholder="e.g. Interpret cyclone warnings, coordinate emergency responses..." className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white rounded-xl resize-none" />
                    {objectivesForm.formState.errors.able_to_do && <p className="text-xs text-rose-600 font-medium">{objectivesForm.formState.errors.able_to_do.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-xs font-semibold">Competencies this course builds *</Label>
                    <Textarea {...objectivesForm.register('competencies_built')} rows={3} placeholder="e.g. Emergency coordination, public advisory preparation..." className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white rounded-xl resize-none" />
                    {objectivesForm.formState.errors.competencies_built && <p className="text-xs text-rose-600 font-medium">{objectivesForm.formState.errors.competencies_built.message}</p>}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-slate-200/90 shadow-xs rounded-2xl">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-cyan-600" />
                    <h3 className="text-sm font-bold text-slate-900">Required Skills</h3>
                  </div>
                  <p className="text-xs text-slate-500">Select the skills this course requires or develops.</p>
                  <div className="flex gap-2">
                    <Input value={customSkillName} onChange={e => setCustomSkillName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill() } }} placeholder="Add a custom skill..." className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 text-xs rounded-xl" disabled={addingSkill} />
                    <Button type="button" variant="outline" onClick={addCustomSkill} disabled={!customSkillName.trim() || addingSkill} className="border-slate-200 text-slate-700 hover:bg-slate-50 h-10 px-3.5 shrink-0 rounded-xl font-semibold">
                      {addingSkill ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                  {skills.length === 0 ? (
                    <p className="text-sm text-slate-400 py-4 text-center">No skills yet. Add one above.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {skills.map(s => (
                        <button key={s.id} onClick={() => toggleSkill(s.id)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selectedSkills.includes(s.id) ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-500 font-medium">{selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''} selected</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 5: Materials */}
          {step === 5 && (
            <div className="space-y-4">
              <Card className="bg-white border border-slate-200/90 shadow-xs rounded-2xl">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-cyan-600" />
                    <h3 className="text-sm font-bold text-slate-900">Course Materials</h3>
                  </div>
                  <p className="text-xs text-slate-500">Add documents, videos, and links. You can add more materials after the course is approved.</p>

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

          {/* Step 6: Review */}
          {step === 6 && (
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

                  {/* Settings */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <Settings className="w-3 h-3 text-cyan-600" /> Settings
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 grid grid-cols-2 gap-3">
                      <div><span className="text-[10px] font-semibold text-slate-400">Duration</span><p className="text-xs font-semibold text-slate-800">{watchedValues.duration_hours ? `${watchedValues.duration_hours} hours` : 'Self-paced'}</p></div>
                      <div><span className="text-[10px] font-semibold text-slate-400">Passing Score</span><p className="text-xs font-semibold text-slate-800">{watchedValues.passing_score || 60}%</p></div>
                    </div>
                  </div>

                  {/* Learning Objectives */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <Target className="w-3 h-3 text-cyan-600" /> Learning Objectives
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <div><span className="text-[10px] font-semibold text-slate-400">Understand</span><p className="text-xs text-slate-600 leading-relaxed">{watchedValues.understand || '—'}</p></div>
                      <div><span className="text-[10px] font-semibold text-slate-400">Able to Do</span><p className="text-xs text-slate-600 leading-relaxed">{watchedValues.able_to_do || '—'}</p></div>
                      <div><span className="text-[10px] font-semibold text-slate-400">Competencies</span><p className="text-xs text-slate-600 leading-relaxed">{watchedValues.competencies_built || '—'}</p></div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <Target className="w-3 h-3 text-cyan-600" /> Skills
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

                  {/* Materials */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <FileText className="w-3 h-3 text-cyan-600" /> Materials ({pendingMaterials.length})
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
                      ) : <p className="text-xs text-slate-400">No materials added</p>}
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
                  <p>You can add more materials, generate AI assessment questions, and manage course content from the course materials page.</p>
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
            {step < 6 ? (
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
