import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Database } from '@/integrations/supabase/types'
import { getSignedUrl } from '@/lib/storage'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft, Upload, Target, Video, 
  Trash2, Send, Save, AlertCircle, FileText, Loader2, Calendar,
  BarChart3, Award, Plus, Clock, Edit3, CheckCircle2, Lock, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import { CourseMaterials } from '@/features/courses/CourseMaterials'
import { CourseCertificateStep } from '@/features/courses/CourseCertificateStep'

type Course = Database['public']['Tables']['courses']['Row'] & {
  edit_request_status?: string | null
  edit_request_reason?: string | null
  edit_request_at?: string | null
  edit_window_expires_at?: string | null
  edit_window_duration_hours?: number | null
  admin_edit_notes?: string | null
}
type Skill = Database['public']['Tables']['skills']['Row']
type CourseSkill = Database['public']['Tables']['course_skills']['Row']

const courseSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  course_type: z.enum(['standard', 'scenario']),
  department: z.string().optional(),
  duration_hours: z.coerce.number().positive('Duration must be positive').optional(),
  passing_score: z.coerce.number().min(1).max(100).optional(),
  meet_link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  session_flow_text: z.string().optional(),
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

type CourseFormData = z.infer<typeof courseSchema>

export function CourseEditPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [course, setCourse] = useState<Course | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [_courseSkills, setCourseSkills] = useState<CourseSkill[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customSkillName, setCustomSkillName] = useState('')
  const [addingSkill, setAddingSkill] = useState(false)
  const [materialCount, setMaterialCount] = useState(0)

  // Edit Request State
  const [editReason, setEditReason] = useState('')
  const [submittingEditRequest, setSubmittingEditRequest] = useState(false)

  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const thumbRef = useRef<HTMLInputElement>(null)

  const [sessionFlowDoc, setSessionFlowDoc] = useState<File | null>(null)
  const [sessionFlowDocPath, setSessionFlowDocPath] = useState<string | null>(null)

  const [hasCertificate, setHasCertificate] = useState(true)
  const [certificateTemplateUrl, setCertificateTemplateUrl] = useState<string | null>(null)
  const [certificateTemplateName, setCertificateTemplateName] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, reset, trigger, formState: { errors } } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
  })

  const isUrgent = useMemo(() => {
    const start = watch('start_date')
    if (start) {
      const diff = new Date(start).getTime() - new Date().getTime()
      const diffDays = diff / (1000 * 60 * 60 * 24)
      return diffDays >= 0 && diffDays < 30
    }
    return false
  }, [watch('start_date')])

  const fetchData = useCallback(async () => {
    if (!user || !courseId) return
    setLoading(true)
    try {
      const [courseRes, skillsRes, csRes, matRes] = await Promise.all([
        supabase.from('courses').select('*').eq('id', courseId).eq('trainer_id', user.id).single(),
        supabase.from('skills').select('*'),
        supabase.from('course_skills').select('*').eq('course_id', courseId),
        supabase.from('materials').select('*', { count: 'exact', head: true }).eq('course_id', courseId),
      ])
      if (courseRes.error) throw courseRes.error
      setCourse(courseRes.data)
      setHasCertificate((courseRes.data as any).has_certificate ?? true)
      setCertificateTemplateUrl((courseRes.data as any).certificate_template_url ?? null)
      setCertificateTemplateName((courseRes.data as any).certificate_template_name ?? null)
      if (courseRes.data.thumbnail_path) {
        const signedUrl = await getSignedUrl('materials', courseRes.data.thumbnail_path)
        setThumbnailPreview(signedUrl)
      }
      reset({
        title: courseRes.data.title,
        description: courseRes.data.description ?? '',
        course_type: courseRes.data.course_type as 'standard' | 'scenario',
        department: courseRes.data.department ?? '',
        duration_hours: courseRes.data.duration_minutes ? Math.floor(courseRes.data.duration_minutes / 60) : undefined,
        passing_score: courseRes.data.passing_score ?? undefined,
        meet_link: courseRes.data.meet_link ?? '',
        start_date: courseRes.data.start_date ? new Date(courseRes.data.start_date).toISOString().slice(0, 16) : '',
        end_date: courseRes.data.end_date ? new Date(courseRes.data.end_date).toISOString().slice(0, 16) : '',
        session_flow_text: courseRes.data.session_flow_text ?? '',
      })
      if (courseRes.data.session_flow_document_path) {
        setSessionFlowDocPath(courseRes.data.session_flow_document_path)
      }
      if (skillsRes.data) setSkills(skillsRes.data)
      if (csRes.data) {
        setCourseSkills(csRes.data)
        setSelectedSkills(csRes.data.map(cs => cs.skill_id))
      }
      if (matRes.count !== null && matRes.count !== undefined) setMaterialCount(matRes.count)
    } catch (err) {
      toast.error('Failed to load course')
      navigate('/trainer/courses')
    } finally {
      setLoading(false)
    }
  }, [user, courseId, navigate, reset])

  useEffect(() => { fetchData() }, [fetchData])

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Thumbnail must be under 5MB')
      return
    }
    setThumbnail(file)
    setThumbnailPreview(URL.createObjectURL(file))
  }

  // Active Edit Window Check
  const isEditWindowActive = Boolean(
    course?.edit_request_status === 'approved' &&
    course?.edit_window_expires_at &&
    new Date(course.edit_window_expires_at).getTime() > Date.now()
  )

  const canEdit = course?.status === 'draft' || course?.status === 'pending_review' || isEditWindowActive

  const getRemainingTimeStr = () => {
    if (!course?.edit_window_expires_at) return ''
    const diff = new Date(course.edit_window_expires_at).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${mins}m remaining`
  }

  // Request Edit Permission from Admin
  const handleRequestEditPermission = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editReason.trim() || editReason.trim().length < 10) {
      toast.error('Please enter a valid description (at least 10 characters) explaining why edits are needed.')
      return
    }
    if (!course || !user) return

    setSubmittingEditRequest(true)
    try {
      await (supabase as any).from('course_edit_requests').insert({
        course_id: course.id,
        trainer_id: user.id,
        reason: editReason.trim(),
        status: 'pending',
        created_at: new Date().toISOString()
      })

      const { error: courseErr } = await supabase
        .from('courses')
        .update({
          edit_request_status: 'pending',
          edit_request_reason: editReason.trim(),
          edit_request_at: new Date().toISOString(),
          admin_edit_notes: null
        } as any)
        .eq('id', course.id)

      if (courseErr) throw courseErr

      try {
        const { data: admins } = await supabase.from('admins').select('id')
        if (admins && admins.length > 0) {
          await supabase.from('notifications').insert(
            admins.map(adm => ({
              user_id: adm.id,
              type: `course_edit_request:${course.id}`,
              title: `Course Edit Permission Requested: ${course.title}`,
              message: `Trainer requested permission to edit "${course.title}". Reason: ${editReason.trim().slice(0, 100)}...`,
            }))
          )
        }
      } catch (err) {
        console.warn('Could not notify admins', err)
      }

      toast.success('Edit permission request submitted to Admin! You will be notified once a time limit is granted.')
      setEditReason('')
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit edit request')
    } finally {
      setSubmittingEditRequest(false)
    }
  }

  const handleSave = async (status: 'draft' | 'pending_review') => {
    if (!course) return
    const valid = await trigger()
    if (!valid) return

    if (status === 'pending_review') {
      const { count } = await supabase
        .from('materials')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course.id)
      if (!count || count === 0) {
        toast.error('Add at least one material (file or link) before submitting for review')
        return
      }
    }

    setSaving(true)
    try {
      let thumbnailPath = course.thumbnail_path

      if (thumbnail) {
        const ext = thumbnail.name.split('.').pop()
        thumbnailPath = `${course.id}/thumbnail.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('materials')
          .upload(thumbnailPath, thumbnail, { upsert: true })
        if (uploadErr) {
          toast.error('Failed to upload thumbnail')
          console.error(uploadErr)
        }
      }
      
      let sessionDocPathToSave = course.session_flow_document_path
      if (sessionFlowDoc) {
        const ext = sessionFlowDoc.name.split('.').pop()
        sessionDocPathToSave = `${course.id}/session_flow_${crypto.randomUUID()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('materials')
          .upload(sessionDocPathToSave, sessionFlowDoc, { upsert: true })
        if (uploadErr) {
          toast.error('Failed to upload session flow document')
        }
      } else if (sessionFlowDocPath === null) {
        sessionDocPathToSave = null
      }

      const data = watch()
      const { duration_hours, ...rest } = data
      const updateData: any = {
        ...rest,
        status: isEditWindowActive && status === 'pending_review' ? 'pending_review' : status,
        duration_minutes: duration_hours ? duration_hours * 60 : null,
        start_date: data.start_date ? new Date(data.start_date).toISOString() : null,
        end_date: data.end_date ? new Date(data.end_date).toISOString() : null,
        thumbnail_path: thumbnailPath,
        session_flow_document_path: sessionDocPathToSave,
        has_certificate: hasCertificate,
        certificate_template_url: certificateTemplateUrl,
        certificate_template_name: certificateTemplateName,
      }

      // If submitting after edit window, set edit_request_status to submitted
      if (isEditWindowActive && status === 'pending_review') {
        updateData.edit_request_status = 'submitted'
      }

      const { error } = await supabase
        .from('courses')
        .update(updateData as any)
        .eq('id', course.id)
      if (error) throw error

      await supabase.from('course_skills').delete().eq('course_id', course.id)
      if (selectedSkills.length > 0) {
        await supabase.from('course_skills').insert(
          selectedSkills.map(skill_id => ({ course_id: course.id, skill_id, required_level: 3 }))
        )
      }

      toast.success(
        isEditWindowActive && status === 'pending_review'
          ? 'Course updates submitted to Admin for re-approval!'
          : status === 'draft'
            ? 'Course saved as draft'
            : 'Course submitted for review'
      )
      navigate(`/trainer/courses/${courseId}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
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

  if (loading) {
    return (
      <TrainerLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
        </div>
      </TrainerLayout>
    )
  }

  if (!course) return null

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-3xl mx-auto space-y-6">
        <motion.div variants={fadeUp}>
          <button onClick={() => navigate(`/trainer/courses/${courseId}`)} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Course Details
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">{course.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={
                  course.status === 'draft' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                  course.status === 'pending_review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  course.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  'bg-rose-50 text-rose-700 border-rose-200'
                }>
                  {course.status.replace('_', ' ')}
                </Badge>
                {isEditWindowActive && (
                  <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300 font-bold flex items-center gap-1 animate-pulse">
                    <Clock className="w-3 h-3" /> Edit Window Active ({getRemainingTimeStr()})
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Active Edit Window Countdown Banner */}
        {isEditWindowActive && (
          <motion.div variants={fadeUp} className="p-4 rounded-2xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 text-white shadow-md flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-200" /> Admin Authorized Edit Window
              </p>
              <p className="text-[11px] text-cyan-100">
                Time remaining: <strong>{getRemainingTimeStr()}</strong> (Expires: {new Date(course.edit_window_expires_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </p>
            </div>
            <span className="text-[10px] font-bold bg-white/20 text-white px-2.5 py-1 rounded-lg">
              Re-Approval Required on Submit
            </span>
          </motion.div>
        )}

        {/* 1. Main Course Details Form (Active when canEdit) */}
        {canEdit ? (
          <motion.div variants={fadeUp} className="space-y-4">
            <Card className="bg-white border border-slate-200/90 shadow-xs rounded-2xl">
              <CardHeader className="border-b border-slate-100"><CardTitle className="text-slate-900 text-base font-bold">Course Details</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-xs font-semibold">Title *</Label>
                  <Input {...register('title')} className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl" />
                  {errors.title && <p className="text-xs text-rose-600 font-medium">{errors.title.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-xs font-semibold">Description *</Label>
                  <Textarea {...register('description')} rows={4} className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white rounded-xl resize-none" />
                  {errors.description && <p className="text-xs text-rose-600 font-medium">{errors.description.message}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-xs font-semibold">Type</Label>
                    <Select value={watch('course_type')} onValueChange={(v) => setValue('course_type', v as 'standard' | 'scenario')}>
                      <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 h-10 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="scenario">Scenario</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-xs font-semibold">Department</Label>
                    <Input {...register('department')} className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-slate-700 text-xs font-semibold">Duration (hours)</Label>
                    <Input type="number" {...register('duration_hours')} placeholder="e.g. 20" className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl max-w-sm" />
                    <p className="text-[10px] text-slate-400 font-medium">Leave empty for self-paced</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-xs font-semibold">Start Date</Label>
                    <Input type="datetime-local" {...register('start_date')} className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl" />
                    {errors.start_date && (
                      <p className="text-[10px] text-rose-600 font-medium">{errors.start_date.message as string}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-xs font-semibold">End Date</Label>
                    <Input type="datetime-local" {...register('end_date')} className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-xs font-semibold">Passing Score (%)</Label>
                  <Input type="number" {...register('passing_score')} placeholder="e.g. 60" className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl max-w-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-xs font-semibold">Meeting Link (Live online classes)</Label>
                  <Input {...register('meet_link')} placeholder="https://meet.google.com/..." className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 rounded-xl" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200/90 shadow-xs rounded-2xl">
              <CardHeader className="border-b border-slate-100"><CardTitle className="text-slate-900 text-base font-bold">Course Thumbnail</CardTitle></CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <input ref={thumbRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleThumbnailChange} />
                  {thumbnailPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 h-40 bg-slate-100 max-w-md">
                      <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => { setThumbnail(null); setThumbnailPreview(null) }} className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => thumbRef.current?.click()} className="w-full max-w-md h-32 border-2 border-dashed border-slate-200 hover:border-cyan-500 rounded-xl flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-cyan-600 bg-slate-50/50 transition-colors">
                      <Upload className="w-6 h-6" />
                      <span className="text-xs font-semibold">Click to upload thumbnail</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG up to 5MB (16:5 ratio, e.g. 1600x500px)</span>
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200/90 shadow-xs rounded-2xl mt-4">
              <CardHeader className="border-b border-slate-100"><CardTitle className="text-slate-900 text-base font-bold">Course Outline</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-xs font-semibold">Course Outline Details</Label>
                  <Textarea {...register('session_flow_text')} rows={6} className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white rounded-xl resize-none" placeholder="Describe the course outline, modules/topics covered, and learning plan..." />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-slate-700 text-xs font-semibold">Course Outline Document</Label>
                  {sessionFlowDocPath || sessionFlowDoc ? (
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl max-w-sm">
                      <div className="flex items-center gap-2 text-sm text-slate-900 font-medium truncate">
                        <FileText className="w-4 h-4 shrink-0 text-cyan-600" />
                        <span className="truncate">{sessionFlowDoc ? sessionFlowDoc.name : sessionFlowDocPath?.split('/').pop()}</span>
                      </div>
                      <button type="button" onClick={() => { setSessionFlowDoc(null); setSessionFlowDocPath(null) }} className="p-1.5 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        className="bg-slate-50 border-slate-200 text-slate-900 cursor-pointer max-w-sm rounded-xl h-10"
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
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200/90 shadow-xs rounded-2xl mt-4">
              <CardHeader className="border-b border-slate-100"><CardTitle className="text-slate-900 text-base font-bold">Outcomes of Learning (Skills Developed)</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-3">
                <p className="text-xs text-slate-500">Select the skills this course builds or add custom skills.</p>
                <div className="flex gap-2">
                  <Input
                    value={customSkillName}
                    onChange={e => setCustomSkillName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill() } }}
                    placeholder="Add a custom skill..."
                    className="bg-slate-50 border-slate-200 text-slate-900 focus:bg-white h-10 text-xs rounded-xl"
                    disabled={addingSkill}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCustomSkill}
                    disabled={!customSkillName.trim() || addingSkill}
                    className="border-slate-200 text-slate-700 hover:bg-slate-50 h-10 px-3.5 shrink-0 rounded-xl font-semibold"
                  >
                    {addingSkill ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {skills.map(skill => (
                    <button key={skill.id} onClick={() => toggleSkill(skill.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        selectedSkills.includes(skill.id)
                          ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}>
                      {skill.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <CourseCertificateStep
              hasCertificate={hasCertificate}
              setHasCertificate={setHasCertificate}
              templateUrl={certificateTemplateUrl}
              setTemplateUrl={setCertificateTemplateUrl}
              templateName={certificateTemplateName}
              setTemplateName={setCertificateTemplateName}
              courseTitle={watch('title') || course.title}
            />
          </motion.div>
        ) : (
          /* 2. Published & Locked State -> Edit Permission Request Workflow */
          <motion.div variants={fadeUp} className="space-y-4">
            <Card className="bg-white border border-slate-200/90 shadow-sm rounded-3xl overflow-hidden">
              <CardContent className="p-6 md:p-8 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                    <Lock className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      This course is <span className="text-emerald-700 font-extrabold capitalize">{course.status}</span> and locked from direct edits.
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      To preserve ongoing enrollments and published curriculum integrity, updates to syllabus, title, or schedule require permission from the Administrator. The Admin will assign an active editing time limit.
                    </p>
                  </div>
                </div>

                {course.edit_request_status === 'pending' ? (
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-2">
                    <p className="font-bold flex items-center gap-1.5 text-amber-900">
                      <Clock className="w-4 h-4 text-amber-600" /> Edit Permission Request is Pending Admin Review
                    </p>
                    <p className="text-slate-700">
                      <strong>Your Planned Changes:</strong> "{course.edit_request_reason}"
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Submitted on: {course.edit_request_at ? new Date(course.edit_request_at).toLocaleString() : 'Recently'}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleRequestEditPermission} className="space-y-4 pt-2 border-t border-slate-100">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-800">
                        Reason / Description for Requested Edits *
                      </Label>
                      <Textarea
                        rows={4}
                        value={editReason}
                        onChange={e => setEditReason(e.target.value)}
                        placeholder="Explain the changes you plan to make (e.g., Update module 2 quiz questions, adjust duration hours, revise lecture notes)..."
                        className="bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 rounded-xl text-xs font-medium resize-none"
                        required
                      />
                      <p className="text-[11px] text-slate-400">
                        Minimum 10 characters required.
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <p className="text-xs text-slate-500 font-medium">
                        Admin will assign an active countdown window (e.g. 24 hours).
                      </p>
                      <Button
                        type="submit"
                        disabled={submittingEditRequest || editReason.trim().length < 10}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-sm gap-1.5"
                      >
                        {submittingEditRequest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Submit Edit Request to Admin
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Action Buttons when editing is active */}
        {canEdit && (
          <motion.div variants={fadeUp} className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => navigate(`/trainer/courses/${courseId}`)} className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-xs">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Cancel
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving} className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-xs">
                {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                Save Draft
              </Button>
              <Button onClick={() => handleSave('pending_review')} disabled={saving} className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold shadow-md shadow-cyan-600/20 rounded-xl text-xs">
                {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
                {isEditWindowActive ? 'Submit Updates for Admin Re-Approval' : 'Submit for Review'}
              </Button>
            </div>
          </motion.div>
        )}

        {/* 3. ALWAYS-ACTIVE COURSE MATERIALS (Fully functional without admin permission) */}
        <motion.div variants={fadeUp}>
          <Card className="bg-white border border-slate-200/90 shadow-sm rounded-2xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Course Materials & Resources</h3>
                  <p className="text-xs text-slate-500">
                    Upload documents, lecture slides, or video links. Always active and editable without admin lock.
                  </p>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shrink-0">
                  ✓ Always Uploadable
                </span>
              </div>
              <CourseMaterials embedded onMaterialCountChange={setMaterialCount} />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </TrainerLayout>
  )
}
