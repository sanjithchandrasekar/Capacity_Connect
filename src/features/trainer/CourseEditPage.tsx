import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft, Save, Send, Loader2, FileText, Target, Award, BarChart3
} from 'lucide-react'
import { toast } from 'sonner'

type Course = Database['public']['Tables']['courses']['Row']
type Skill = Database['public']['Tables']['skills']['Row']
type CourseSkill = Database['public']['Tables']['course_skills']['Row']

const courseSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  course_type: z.enum(['standard', 'scenario']),
  department: z.string().optional(),
  duration_minutes: z.coerce.number().positive().optional(),
  passing_score: z.coerce.number().min(1).max(100).optional(),
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

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
  })

  const fetchData = useCallback(async () => {
    if (!user || !courseId) return
    setLoading(true)
    try {
      const [courseRes, skillsRes, csRes] = await Promise.all([
        supabase.from('courses').select('*').eq('id', courseId).eq('trainer_id', user.id).single(),
        supabase.from('skills').select('*'),
        supabase.from('course_skills').select('*').eq('course_id', courseId),
      ])
      if (courseRes.error) throw courseRes.error
      setCourse(courseRes.data)
      reset({
        title: courseRes.data.title,
        description: courseRes.data.description ?? '',
        course_type: courseRes.data.course_type as 'standard' | 'scenario',
        department: courseRes.data.department ?? '',
        duration_minutes: courseRes.data.duration_minutes ?? undefined,
        passing_score: courseRes.data.passing_score,
      })
      if (skillsRes.data) setSkills(skillsRes.data)
      if (csRes.data) {
        setCourseSkills(csRes.data)
        setSelectedSkills(csRes.data.map(cs => cs.skill_id))
      }
    } catch (err) {
      toast.error('Failed to load course')
      navigate('/trainer/courses')
    } finally {
      setLoading(false)
    }
  }, [user, courseId, navigate, reset])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSave = async (status: 'draft' | 'pending_review') => {
    if (!course) return
    const valid = await handleSubmit(() => true)()
    if (!valid) return
    setSaving(true)
    try {
      const data = watch()
      const { error } = await supabase
        .from('courses')
        .update({ ...data, status })
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

  if (loading) {
    return (
      <TrainerLayout>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
      </TrainerLayout>
    )
  }

  if (!course) return null

  const canEdit = course.status === 'draft' || course.status === 'pending_review'

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-3xl mx-auto space-y-6">
        <motion.div variants={fadeUp}>
          <button onClick={() => navigate('/trainer/courses')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Courses
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">{course.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={
                  course.status === 'draft' ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30' :
                  course.status === 'pending_review' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                  course.status === 'published' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                  'bg-red-500/20 text-red-300 border border-red-500/30'
                }>
                  {course.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>
        </motion.div>

        {canEdit ? (
          <motion.div variants={fadeUp}>
            <Card className="bg-white/[0.02] border-white/[0.06]">
              <CardHeader><CardTitle className="text-white">Course Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Title *</Label>
                  <Input {...register('title')} className="bg-white/5 border-white/10 text-white" />
                  {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Description *</Label>
                  <Textarea {...register('description')} rows={4} className="bg-white/5 border-white/10 text-white" />
                  {errors.description && <p className="text-xs text-red-400">{errors.description.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Type</Label>
                    <Select value={watch('course_type')} onValueChange={(v) => setValue('course_type', v as 'standard' | 'scenario')}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="scenario">Scenario</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Department</Label>
                    <Input {...register('department')} className="bg-white/5 border-white/10 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Duration (min)</Label>
                    <Input type="number" {...register('duration_minutes')} className="bg-white/5 border-white/10 text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Passing Score (%)</Label>
                    <Input type="number" {...register('passing_score')} className="bg-white/5 border-white/10 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/[0.02] border-white/[0.06] mt-4">
              <CardHeader><CardTitle className="text-white">Required Skills</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {skills.map(skill => (
                    <button key={skill.id} onClick={() => toggleSkill(skill.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                        selectedSkills.includes(skill.id)
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
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
            <Card className="bg-white/[0.02] border-white/[0.06]">
              <CardContent className="py-8 text-center">
                <p className="text-slate-400">This course is <strong>{course.status}</strong> and cannot be edited.</p>
                {course.status === 'pending_review' && <p className="text-sm text-slate-500 mt-1">Wait for admin review or contact an admin.</p>}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {canEdit && (
          <motion.div variants={fadeUp} className="flex items-center justify-between">
            <Button variant="outline" onClick={() => navigate('/trainer/courses')} className="border-white/10 text-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving} className="border-white/10 text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Draft
              </Button>
              <Button onClick={() => handleSave('pending_review')} disabled={saving} className="bg-cyan-500 hover:bg-cyan-400 text-white">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Submit for Review
              </Button>
            </div>
          </motion.div>
        )}

        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to={`/trainer/courses/${courseId}/materials`} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/30 transition-all text-center group">
            <FileText className="w-5 h-5 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs text-white font-medium">Materials</span>
          </Link>
          <Link to={`/trainer/courses/${courseId}/assessments`} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/30 transition-all text-center group">
            <Target className="w-5 h-5 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs text-white font-medium">Assessments</span>
          </Link>
          <Link to={`/trainer/courses/${courseId}/performance`} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-cyan-500/30 transition-all text-center group">
            <BarChart3 className="w-5 h-5 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <span className="text-xs text-white font-medium">Performance</span>
          </Link>
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
            <Award className="w-5 h-5 text-slate-500 mx-auto mb-2" />
            <span className="text-xs text-slate-500">Preview</span>
          </div>
        </motion.div>
      </motion.div>
    </TrainerLayout>
  )
}
