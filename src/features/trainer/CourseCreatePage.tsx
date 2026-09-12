import React, { useState, useEffect, useRef } from 'react'
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, ArrowRight, CheckCircle, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

type Skill = Database['public']['Tables']['skills']['Row']

const step1Schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  course_type: z.enum(['standard', 'scenario']),
  department: z.string().optional(),
  duration_minutes: z.coerce.number().positive('Duration must be positive').optional(),
  passing_score: z.coerce.number().min(1).max(100).optional(),
})

const step2Schema = z.object({
  understand: z.string().min(5, 'Describe what learners will understand'),
  able_to_do: z.string().min(5, 'Describe what learners will be able to do'),
  competencies_built: z.string().min(5, 'Describe the competencies this course builds'),
})

type Step1Data = z.infer<typeof step1Schema>
type Step2Data = z.infer<typeof step2Schema>

export function CourseCreatePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const thumbRef = useRef<HTMLInputElement>(null)

  const step1 = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { title: '', description: '', course_type: 'standard', department: '', passing_score: 60 },
  })

  const step2 = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: { understand: '', able_to_do: '', competencies_built: '' },
  })

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
    setThumbnail(file)
    setThumbnailPreview(URL.createObjectURL(file))
  }

  const handleNext = async () => {
    if (step === 1) {
      const valid = await step1.trigger()
      if (!valid) return
    } else if (step === 2) {
      const valid = await step2.trigger()
      if (!valid) return
    }
    setStep(s => Math.min(s + 1, 3))
  }

  const handleSubmit = async (status: 'draft' | 'pending_review') => {
    if (step === 3 && selectedSkills.length === 0) {
      toast.error('Select at least one skill for the course')
      return
    }
    setSaving(true)
    try {
      const s1 = step1.getValues()
      const s2 = step2.getValues()

      let thumbnailPath: string | null = null
      if (thumbnail && user) {
        const ext = thumbnail.name.split('.').pop()
        thumbnailPath = `${user.id}/${crypto.randomUUID()}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('materials')
          .upload(thumbnailPath, thumbnail)
        if (uploadErr) console.error('Thumbnail upload error:', uploadErr)
      }

      const { data: course, error } = await supabase
        .from('courses')
        .insert({
          title: s1.title,
          description: s1.description,
          course_type: s1.course_type,
          department: s1.department || null,
          duration_minutes: s1.duration_minutes || null,
          passing_score: s1.passing_score ?? 60,
          trainer_id: user!.id,
          status,
          thumbnail_path: thumbnailPath,
          learning_objectives: { understand: s2.understand, able_to_do: s2.able_to_do, competencies_built: s2.competencies_built },
        })
        .select()
        .single()
      if (error) throw error

      if (selectedSkills.length > 0 && course) {
        const skillInserts = selectedSkills.map(skillId => ({
          course_id: course.id,
          skill_id: skillId,
          required_level: 3,
        }))
        await supabase.from('course_skills').insert(skillInserts)
      }

      toast.success(status === 'draft' ? 'Course saved as draft' : 'Course submitted for review')
      navigate('/trainer/courses')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create course')
    } finally {
      setSaving(false)
    }
  }

  const toggleSkill = (id: string) => {
    setSelectedSkills(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-3xl mx-auto space-y-6">
        <motion.div variants={fadeUp}>
          <button onClick={() => navigate('/trainer/courses')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Courses
          </button>
          <h2 className="text-2xl font-bold tracking-tight text-white">Create Course</h2>
        </motion.div>

        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-3 mb-6">
            {[1, 2, 3].map(s => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-2 ${step >= s ? 'text-cyan-400' : 'text-slate-600'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${
                    step > s ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300' :
                    step === s ? 'border-cyan-500/50 text-cyan-400' :
                    'border-white/10 text-slate-600'
                  }`}>
                    {step > s ? <CheckCircle className="w-3.5 h-3.5" /> : s}
                  </div>
                  <span className="text-xs hidden sm:inline">{s === 1 ? 'Basics' : s === 2 ? 'Objectives' : 'Skills'}</span>
                </div>
                {s < 3 && <div className={`flex-1 h-px ${step > s ? 'bg-cyan-500/30' : 'bg-white/[0.06]'}`} />}
              </React.Fragment>
            ))}
          </div>
        </motion.div>

        {step === 1 && (
          <motion.div variants={fadeUp}>
            <Card className="bg-white/[0.02] border-white/[0.06]">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white mb-2">Course Details</h3>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">Title *</Label>
                  <Input {...step1.register('title')} placeholder="e.g. Cyclone Response and Warning Communication" className="bg-white/5 border-white/10 text-white h-10" />
                  {step1.formState.errors.title && <p className="text-xs text-red-400">{step1.formState.errors.title.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">Description *</Label>
                  <Textarea {...step1.register('description')} rows={4} placeholder="Describe what this course covers..." className="bg-white/5 border-white/10 text-white" />
                  {step1.formState.errors.description && <p className="text-xs text-red-400">{step1.formState.errors.description.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-xs">Course Type</Label>
                    <Select value={step1.watch('course_type')} onValueChange={v => step1.setValue('course_type', v as any)}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard Training</SelectItem>
                        <SelectItem value="scenario">Scenario Training</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-xs">Department</Label>
                    <Input {...step1.register('department')} placeholder="e.g. IMD" className="bg-white/5 border-white/10 text-white h-10" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-xs">Duration (minutes)</Label>
                    <Input type="number" {...step1.register('duration_minutes')} placeholder="60" className="bg-white/5 border-white/10 text-white h-10" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-xs">Passing Score (%)</Label>
                    <Input type="number" {...step1.register('passing_score')} placeholder="60" className="bg-white/5 border-white/10 text-white h-10" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">Thumbnail</Label>
                  <input ref={thumbRef} type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
                  {thumbnailPreview ? (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/10">
                      <img src={thumbnailPreview} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => { setThumbnail(null); setThumbnailPreview(null) }} className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-red-500/80">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => thumbRef.current?.click()} className="w-full h-20 border border-dashed border-white/10 rounded-lg flex items-center justify-center gap-2 text-slate-500 hover:text-white hover:border-white/20 transition-all">
                      <Upload className="w-4 h-4" /> Upload Thumbnail
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div variants={fadeUp}>
            <Card className="bg-white/[0.02] border-white/[0.06]">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white mb-2">Learning Objectives</h3>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">What will learners understand? *</Label>
                  <Textarea {...step2.register('understand')} rows={3} placeholder="e.g. The principles of cyclone formation and warning systems..." className="bg-white/5 border-white/10 text-white" />
                  {step2.formState.errors.understand && <p className="text-xs text-red-400">{step2.formState.errors.understand.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">What will learners be able to do? *</Label>
                  <Textarea {...step2.register('able_to_do')} rows={3} placeholder="e.g. Interpret cyclone warnings and coordinate emergency responses..." className="bg-white/5 border-white/10 text-white" />
                  {step2.formState.errors.able_to_do && <p className="text-xs text-red-400">{step2.formState.errors.able_to_do.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">Competencies this course builds *</Label>
                  <Textarea {...step2.register('competencies_built')} rows={3} placeholder="e.g. Emergency coordination, public advisory preparation..." className="bg-white/5 border-white/10 text-white" />
                  {step2.formState.errors.competencies_built && <p className="text-xs text-red-400">{step2.formState.errors.competencies_built.message}</p>}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div variants={fadeUp}>
            <Card className="bg-white/[0.02] border-white/[0.06]">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-white mb-2">Required Skills & Competencies</h3>
                <p className="text-xs text-slate-500">Select the skills this course requires or develops.</p>
                {skills.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">No skills available in the system.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skills.map(s => (
                      <button key={s.id} onClick={() => toggleSkill(s.id)} className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                        selectedSkills.includes(s.id)
                          ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                          : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:text-white hover:border-white/[0.12]'
                      }`}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-slate-500">{selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''} selected</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={fadeUp} className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={() => setStep(s => Math.max(s - 1, 1))} disabled={step === 1} className="border-white/10 text-white">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex gap-2">
            {step < 3 ? (
              <Button onClick={handleNext} className="bg-cyan-500 hover:bg-cyan-400 text-white">
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => handleSubmit('draft')} disabled={saving} className="border-white/10 text-white">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save Draft
                </Button>
                <Button onClick={() => handleSubmit('pending_review')} disabled={saving} className="bg-cyan-500 hover:bg-cyan-400 text-white">
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Submit for Review
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </TrainerLayout>
  )
}
