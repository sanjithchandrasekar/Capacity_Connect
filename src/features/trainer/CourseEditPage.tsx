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
  ArrowLeft, Upload, Target, CheckCircle2, Video, 
  Trash2, Send, Save, AlertCircle, Play, FileText, LayoutDashboard, Settings, Loader2, Calendar,
  BarChart3, Award, Users, BookOpen, Plus
} from 'lucide-react'
import { toast } from 'sonner'
import { CourseMaterials } from '@/features/courses/CourseMaterials'

type Course = Database['public']['Tables']['courses']['Row']
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

  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const thumbRef = useRef<HTMLInputElement>(null)

  const [sessionFlowDoc, setSessionFlowDoc] = useState<File | null>(null)
  const [sessionFlowDocPath, setSessionFlowDocPath] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, reset, trigger, formState: { errors } } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
  })

  const courseDays = useMemo(() => {
    const start = watch('start_date')
    const end = watch('end_date')
    if (start && end) {
      const diff = new Date(end).getTime() - new Date(start).getTime()
      return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    }
    return null
  }, [watch('start_date'), watch('end_date')])

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
        // user clicked trash to remove it
        sessionDocPathToSave = null
      }

      const data = watch()
      const { duration_hours, ...rest } = data
      const updateData = {
        ...rest,
        status,
        duration_minutes: duration_hours ? duration_hours * 60 : null,
        start_date: data.start_date ? new Date(data.start_date).toISOString() : null,
        end_date: data.end_date ? new Date(data.end_date).toISOString() : null,
        thumbnail_path: thumbnailPath,
        session_flow_document_path: sessionDocPathToSave,
      }
      const { error } = await supabase
        .from('courses')
        .update(updateData)
        .eq('id', course.id)
      if (error) throw error

      await supabase.from('course_skills').delete().eq('course_id', course.id)
      if (selectedSkills.length > 0) {
        await supabase.from('course_skills').insert(
          selectedSkills.map(skill_id => ({ course_id: course.id, skill_id, required_level: 3 }))
        )
      }

      toast.success(status === 'draft' ? 'Course saved' : 'Course submitted for review')
      navigate('/trainer/courses')
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
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-zinc-200" /></div>
      </TrainerLayout>
    )
  }

  if (!course) return null

  const canEdit = course.status === 'draft' || course.status === 'pending_review'

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-3xl mx-auto space-y-6">
        <motion.div variants={fadeUp}>
          <button onClick={() => navigate('/trainer/courses')} className="flex items-center gap-2 text-sm text-zinc-200/60 hover:text-zinc-200 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Courses
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-200">{course.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={
                  course.status === 'draft' ? 'bg-ink/10 text-zinc-200/80 border border-cyan-500/30' :
                  course.status === 'pending_review' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                  course.status === 'published' ? 'bg-ink/10 text-zinc-200/70 border border-cyan-500/30' :
                  'bg-red-50 text-red-600 border border-red-200'
                }>
                  {course.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>
        </motion.div>

        {canEdit ? (
          <motion.div variants={fadeUp}>
            <Card className="bg-[#070E20]/90 border-cyan-500/30">
              <CardHeader><CardTitle className="text-zinc-200">Course Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-200/80">Title *</Label>
                  <Input {...register('title')} className="bg-ink/5 border-cyan-500/30 text-zinc-200" />
                  {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-200/80">Description *</Label>
                  <Textarea {...register('description')} rows={4} className="bg-ink/5 border-cyan-500/30 text-zinc-200" />
                  {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-200/80">Type</Label>
                    <Select value={watch('course_type')} onValueChange={(v) => setValue('course_type', v as 'standard' | 'scenario')}>
                      <SelectTrigger className="bg-ink/5 border-cyan-500/30 text-zinc-200"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="scenario">Scenario</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-200/80">Department</Label>
                    <Input {...register('department')} className="bg-ink/5 border-cyan-500/30 text-zinc-200" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-200/80 text-xs">Duration (hours)</Label>
                    <Input type="number" {...register('duration_hours')} placeholder="e.g. 20" className="bg-ink/5 border-cyan-500/30 text-zinc-200 h-10" />
                    <p className="text-[10px] text-zinc-200/40">Leave empty for self-paced</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-200/80">Passing Score (%)</Label>
                    <Input type="number" {...register('passing_score')} className="bg-ink/5 border-cyan-500/30 text-zinc-200" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-zinc-200/80">Live Meeting Link</Label>
                    <Input type="url" {...register('meet_link')} placeholder="e.g. https://meet.google.com/..." className="bg-ink/5 border-cyan-500/30 text-zinc-200" />
                    {errors.meet_link && <p className="text-xs text-red-600">{errors.meet_link.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-200/80">Start Date</Label>
                    <Input type="datetime-local" {...register('start_date')} className="bg-ink/5 border-cyan-500/30 text-zinc-200" />
                    {errors.start_date && (
                      <p className="text-[10px] text-red-500">{errors.start_date.message as string}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-zinc-200/80">End Date</Label>
                    <Input type="datetime-local" {...register('end_date')} className="bg-ink/5 border-cyan-500/30 text-zinc-200" />
                    {errors.end_date && (
                      <p className="text-[10px] text-red-500">{errors.end_date.message as string}</p>
                    )}
                  </div>
                  {isUrgent && watch('start_date') && !errors.start_date && (
                    <div className="col-span-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-medium flex items-center gap-2">
                      <span className="text-lg">⚠️</span> Course starts in less than 30 days! This will be flagged as <strong className="font-bold">URGENT</strong> for fast-track Admin approval.
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 pt-4 border-t border-cyan-500/30">
                  <Label className="text-zinc-200/80">Course Thumbnail</Label>
                  <input ref={thumbRef} type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
                  {thumbnailPreview ? (
                    <div className="relative w-full max-w-sm h-40 rounded-lg overflow-hidden border border-cyan-500/30 bg-ink/5">
                      <img src={thumbnailPreview} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => { setThumbnail(null); setThumbnailPreview(null) }} className="absolute top-2 right-2 p-1.5 rounded-full bg-ink/80 text-cream hover:bg-red-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => thumbRef.current?.click()} className="w-full max-w-sm h-32 border-2 border-dashed border-cyan-500/30 rounded-lg flex flex-col items-center justify-center gap-2 text-zinc-200/40 hover:text-zinc-200 hover:border-cyan-500/30 transition-all bg-ink/5">
                      <Upload className="w-6 h-6" />
                      <span className="text-xs">Click to upload thumbnail</span>
                      <span className="text-[10px] text-zinc-200/30">PNG, JPG up to 5MB (16:5 ratio, e.g. 1600x500px)</span>
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#070E20]/90 border-cyan-500/30 mt-4">
              <CardHeader><CardTitle className="text-zinc-200">Session Flow</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-zinc-200/80">Session Flow Details</Label>
                  <Textarea {...register('session_flow_text')} rows={6} className="bg-ink/5 border-cyan-500/30 text-zinc-200" placeholder="Describe the session flow, topics covered, and engagement plan..." />
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-zinc-200/80">Session Flow Document</Label>
                  {sessionFlowDocPath || sessionFlowDoc ? (
                    <div className="flex items-center justify-between p-3 bg-ink/5 border border-cyan-500/30 rounded-lg max-w-sm">
                      <div className="flex items-center gap-2 text-sm text-zinc-200 truncate">
                        <FileText className="w-4 h-4 shrink-0 text-zinc-200/60" />
                        <span className="truncate">{sessionFlowDoc ? sessionFlowDoc.name : sessionFlowDocPath?.split('/').pop()}</span>
                      </div>
                      <button type="button" onClick={() => { setSessionFlowDoc(null); setSessionFlowDocPath(null) }} className="p-1.5 rounded-full hover:bg-red-50 text-zinc-200/40 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt"
                        className="bg-ink/5 border-cyan-500/30 text-zinc-200 cursor-pointer max-w-sm"
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

            <Card className="bg-[#070E20]/90 border-cyan-500/30 mt-4">
              <CardHeader><CardTitle className="text-zinc-200">Required Skills</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-zinc-200/50">Select existing skills or add your own.</p>
                <div className="flex gap-2">
                  <Input
                    value={customSkillName}
                    onChange={e => setCustomSkillName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill() } }}
                    placeholder="Add a custom skill..."
                    className="bg-ink/5 border-cyan-500/30 text-zinc-200 h-9 text-xs"
                    disabled={addingSkill}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCustomSkill}
                    disabled={!customSkillName.trim() || addingSkill}
                    className="border-cyan-500/30 text-zinc-200 h-9 px-3 shrink-0"
                  >
                    {addingSkill ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map(skill => (
                    <button key={skill.id} onClick={() => toggleSkill(skill.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                        selectedSkills.includes(skill.id)
                          ? 'bg-ink/20 text-zinc-200 border-cyan-500/30'
                          : 'bg-ink/5 text-zinc-200/60 border-cyan-500/30 hover:border-cyan-500/30'
                      }`}>
                      {skill.name}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp}>
            <Card className="bg-[#070E20]/90 border-cyan-500/30">
              <CardContent className="py-8 text-center">
                <p className="text-zinc-200/60">This course is <strong>{course.status}</strong> and cannot be edited.</p>
                {course.status === 'pending_review' && <p className="text-sm text-zinc-200/50 mt-1">Wait for admin review or contact an admin.</p>}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {canEdit && (
          <motion.div variants={fadeUp} className="flex items-center justify-between">
            <Button variant="outline" onClick={() => navigate('/trainer/courses')} className="border-cyan-500/30 text-zinc-200">
              <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <div className="flex items-center gap-3">
              {materialCount === 0 && (
                <span className="text-xs text-yellow-700 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  No materials added
                </span>
              )}
              {materialCount > 0 && (
                <span className="text-xs text-zinc-200/50">
                  {materialCount} material{materialCount !== 1 ? 's' : ''}
                </span>
              )}
              <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving} className="border-cyan-500/30 text-zinc-200">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Draft
              </Button>
              <Button onClick={() => handleSave('pending_review')} disabled={saving} className="bg-ink hover:bg-ink/90 text-cream">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Submit for Review
              </Button>
            </div>
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          <Card className="bg-[#070E20]/90 border-cyan-500/30">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-zinc-200 mb-4">Course Materials</h3>
              <CourseMaterials embedded onMaterialCountChange={setMaterialCount} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Link to={`/trainer/courses/${courseId}/sessions`} className="p-4 rounded-xl bg-ink/5 border border-cyan-500/30 hover:border-cyan-500/30 transition-all text-center group">
            <Calendar className="w-5 h-5 text-zinc-200 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs text-zinc-200 font-medium">Sessions</span>
          </Link>
          <Link to={`/trainer/courses/${courseId}/materials`} className="p-4 rounded-xl bg-ink/5 border border-cyan-500/30 hover:border-cyan-500/30 transition-all text-center group">
            <FileText className="w-5 h-5 text-zinc-200 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs text-zinc-200 font-medium">Materials</span>
          </Link>
          <Link to={`/trainer/courses/${courseId}/assessments`} className="p-4 rounded-xl bg-ink/5 border border-cyan-500/30 hover:border-cyan-500/30 transition-all text-center group">
            <Target className="w-5 h-5 text-zinc-200 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs text-zinc-200 font-medium">Assessments</span>
          </Link>
          <Link to={`/trainer/courses/${courseId}/performance`} className="p-4 rounded-xl bg-ink/5 border border-cyan-500/30 hover:border-cyan-500/30 transition-all text-center group">
            <BarChart3 className="w-5 h-5 text-zinc-200 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs text-zinc-200 font-medium">Performance</span>
          </Link>
          <div className="p-4 rounded-xl bg-ink/5 border border-cyan-500/30 text-center">
            <Award className="w-5 h-5 text-zinc-200/50 mx-auto mb-2" />
            <span className="text-xs text-zinc-200/50">Preview</span>
          </div>
        </motion.div>
      </motion.div>
    </TrainerLayout>
  )
}





