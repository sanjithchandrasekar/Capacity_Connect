import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowLeft, ArrowRight, CheckCircle, Loader2, BookOpen, Settings,
  Target, Eye, AlertCircle, Image, UserCheck, Megaphone, Zap, Sparkles, TrendingUp
} from 'lucide-react'
import { toast } from 'sonner'
import { ImageCropperModal } from '@/components/ui/ImageCropperModal'

type Trainer = { id: string; full_name: string; email: string; qualifications?: string | null; years_of_experience?: number | null }
type Skill = { id: string; name: string }

const trainerSchema = z.object({
  trainer_id: z.string().min(1, 'Please select a trainer'),
  assignment_message: z.string().optional(),
})
const detailsSchema = z.object({
  title: z.string().min(5, 'At least 5 characters'),
  description: z.string().min(10, 'At least 10 characters'),
  course_type: z.string().min(2, 'Course type is required'),
  department: z.string().optional(),
})
const settingsSchema = z.object({
  duration_hours: z.coerce.number().positive().optional(),
  passing_score: z.coerce.number().min(1).max(100).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  delivery_mode: z.enum(['recorded', 'live', 'hybrid']),
  max_trainees: z.coerce.number().min(50, 'Minimum capacity is 50').max(250, 'Maximum capacity is 250').optional(),
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
  understand: z.string().min(5),
  able_to_do: z.string().min(5),
  competencies_built: z.string().min(5),
})

type TrainerData = z.infer<typeof trainerSchema>
type DetailsData = z.infer<typeof detailsSchema>
type SettingsData = z.infer<typeof settingsSchema>
type ObjectivesData = z.infer<typeof objectivesSchema>

const STEPS = [
  { id: 1, label: 'Course Details', icon: BookOpen },
  { id: 2, label: 'Objectives & Skills', icon: Target },
  { id: 3, label: 'Configuration', icon: Settings },
  { id: 4, label: 'Assign Trainer', icon: UserCheck },
  { id: 5, label: 'Review', icon: Eye },
]

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

export function AdminCourseCreatePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loadingTrainers, setLoadingTrainers] = useState(true)
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [thumbnail, setThumbnail] = useState<File | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null)
  const [isCustomType, setIsCustomType] = useState(false)
  const [isCropperOpen, setIsCropperOpen] = useState(false)
  const [rawImageFile, setRawImageFile] = useState<File | null>(null)
  const thumbRef = useRef<HTMLInputElement>(null)

  const trainerForm = useForm<TrainerData>({ resolver: zodResolver(trainerSchema), defaultValues: { trainer_id: '', assignment_message: '' } })
  const detailsForm = useForm<DetailsData>({ resolver: zodResolver(detailsSchema), defaultValues: { title: '', description: '', course_type: 'standard', department: '' } })
  const settingsForm = useForm<SettingsData>({ resolver: zodResolver(settingsSchema), defaultValues: { passing_score: 60, delivery_mode: 'recorded' } })
  const objectivesForm = useForm<ObjectivesData>({ resolver: zodResolver(objectivesSchema), defaultValues: { understand: '', able_to_do: '', competencies_built: '' } })

  useEffect(() => {
    supabase.from('trainers').select('id, full_name, email, qualifications, years_of_experience').eq('approval_status', 'approved').order('full_name')
      .then(({ data }) => { if (data) setTrainers(data as any[]); setLoadingTrainers(false) })
    supabase.from('skills').select('*').order('name').then(({ data }) => { if (data) setSkills(data) })
  }, [])

  const validateStep = async () => {
    if (step === 1) return detailsForm.trigger()
    if (step === 2) return objectivesForm.trigger()
    if (step === 3) return settingsForm.trigger()
    if (step === 4) return trainerForm.trigger()
    return true
  }

  const handleNext = async () => { const ok = await validateStep(); if (ok) setStep(s => Math.min(s + 1, 5)) }
  const handleBack = () => setStep(s => Math.max(s - 1, 1))
  const toggleSkill = (id: string) => setSelectedSkills(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  const selectedTrainer = trainers.find(t => t.id === trainerForm.watch('trainer_id'))

  // Competency Mapping Engine (Heuristic matching based on skills & qualifications)
  const scoredTrainers = React.useMemo(() => {
    if (selectedSkills.length === 0) return [];
    const requiredSkillNames = skills.filter(s => selectedSkills.includes(s.id)).map(s => s.name.toLowerCase());
    
    return trainers.map(t => {
      let score = 35; // Base score
      const qual = (t.qualifications || '').toLowerCase();
      
      let matchedSkills = 0;
      requiredSkillNames.forEach(skill => {
        if (qual.includes(skill)) matchedSkills++;
      });
      
      if (requiredSkillNames.length > 0) {
         score += (matchedSkills / requiredSkillNames.length) * 45;
      }
      
      if (t.years_of_experience) {
         score += Math.min(t.years_of_experience * 3, 18);
      }
      
      const matchPercentage = Math.round(Math.min(Math.max(score, 15), 98));
      return { ...t, matchPercentage };
    }).sort((a, b) => b.matchPercentage - a.matchPercentage).slice(0, 3);
  }, [selectedSkills, trainers, skills]);

  const handlePublish = async (status: 'draft' | 'published') => {
    const t = trainerForm.getValues()
    const d = detailsForm.getValues()
    if (!t.trainer_id || !d.title) { toast.error('Trainer and title are required'); return }
    setSaving(true)
    try {
      const s = settingsForm.getValues()
      const o = objectivesForm.getValues()
      const { data: course, error } = await supabase.from('courses').insert({
        title: d.title, description: d.description, course_type: d.course_type,
        department: d.department || null, trainer_id: t.trainer_id, status,
        duration_minutes: s.duration_hours ? s.duration_hours * 60 : null,
        passing_score: s.passing_score ?? 60, delivery_mode: s.delivery_mode || 'recorded',
        max_trainees: s.max_trainees || null,
        start_date: s.start_date ? new Date(s.start_date).toISOString() : null,
        end_date: s.end_date ? new Date(s.end_date).toISOString() : null,
        learning_objectives: { understand: o.understand, able_to_do: o.able_to_do, competencies_built: o.competencies_built },
      }).select().single()
      if (error) throw error
      if (thumbnail && course) {
        const ext = thumbnail.name.split('.').pop()
        const path = course.id + '/thumbnail.' + ext
        const { error: upErr } = await supabase.storage.from('materials').upload(path, thumbnail)
        if (!upErr) await supabase.from('courses').update({ thumbnail_path: path }).eq('id', course.id)
      }
      if (selectedSkills.length > 0 && course) {
        await supabase.from('course_skills').insert(selectedSkills.map(sid => ({ course_id: course.id, skill_id: sid, required_level: 3 })))
      }
      if (course) {
        await (supabase as any).from('course_assignments').insert({
          course_id: course.id, trainer_id: t.trainer_id,
          assigned_by: user!.id, message: t.assignment_message || null,
        })
      }
      toast.success(status === 'published' ? 'Course published & trainer notified!' : 'Saved as draft & trainer notified')
      navigate('/admin')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create course')
    } finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-8">
          <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-cyan-600 mb-4 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-600/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create New Course</h1>
              <p className="text-sm text-slate-500 font-medium">Assign a trainer and publish directly</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = step === s.id
            const isDone = step > s.id
            return (
              <React.Fragment key={s.id}>
                <div className={'flex items-center gap-2 px-3.5 py-2 rounded-xl shrink-0 text-xs font-semibold transition-all ' + (isActive ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : isDone ? 'bg-slate-100 text-slate-700' : 'bg-slate-50 text-slate-400 opacity-60')}>
                  {isDone ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Icon className="w-3.5 h-3.5" />}
                  {s.label}
                </div>
                {i < STEPS.length - 1 && <div className={'w-6 h-px shrink-0 ' + (isDone ? 'bg-emerald-300' : 'bg-slate-200')} />}
              </React.Fragment>
            )
          })}
        </motion.div>

        <motion.div key={step} initial="hidden" animate="visible" variants={fadeUp}>
          <Card className="bg-white border border-slate-200/90 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-8">

              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                      Assign Course Trainer
                    </h2>
                    <p className="text-sm text-slate-500">The trainer will receive a course assignment announcement.</p>
                  </div>

                  {/* Competency Mapping Suggestions */}
                  {selectedSkills.length > 0 && scoredTrainers.length > 0 && (
                    <div className="bg-gradient-to-br from-cyan-50/50 to-blue-50/50 p-5 rounded-2xl border border-cyan-100 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-cyan-800 font-bold uppercase tracking-wider text-xs">
                          <Sparkles className="w-4 h-4 text-cyan-600" />
                          AI Competency Matcher
                        </div>
                        <span className="text-[10px] text-cyan-600 font-semibold">Based on required skills</span>
                      </div>
                      
                      <div className="grid sm:grid-cols-3 gap-3">
                        {scoredTrainers.map((t) => (
                          <div 
                            key={t.id} 
                            onClick={() => trainerForm.setValue('trainer_id', t.id, { shouldValidate: true })}
                            className={`p-3 rounded-xl border cursor-pointer transition-all ${trainerForm.watch('trainer_id') === t.id ? 'bg-cyan-600 border-cyan-600 text-white shadow-md shadow-cyan-600/20 scale-[1.02]' : 'bg-white border-slate-200 hover:border-cyan-300 hover:shadow-sm'}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${trainerForm.watch('trainer_id') === t.id ? 'bg-white/20 text-white' : 'bg-cyan-100 text-cyan-700'}`}>
                                {t.full_name.charAt(0)}
                              </div>
                              <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${trainerForm.watch('trainer_id') === t.id ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                                <TrendingUp className="w-3 h-3" /> {t.matchPercentage}% Match
                              </div>
                            </div>
                            <p className={`font-bold text-sm truncate ${trainerForm.watch('trainer_id') === t.id ? 'text-white' : 'text-slate-900'}`}>{t.full_name}</p>
                            <p className={`text-[10px] mt-0.5 truncate ${trainerForm.watch('trainer_id') === t.id ? 'text-cyan-100' : 'text-slate-500'}`}>
                              {t.years_of_experience || 0} yrs exp
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedSkills.length === 0 && (
                     <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center">
                        <p className="text-xs text-slate-500 italic">Select required skills in Step 2 to view AI Trainer Suggestions.</p>
                     </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Trainer *</Label>
                    {loadingTrainers ? <div className="flex items-center gap-2 text-slate-400 text-sm py-3"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div> : (
                      <Select value={trainerForm.watch('trainer_id')} onValueChange={v => trainerForm.setValue('trainer_id', v, { shouldValidate: true })}>
                        <SelectTrigger className="border-slate-200 focus:border-cyan-500 rounded-xl h-12 bg-slate-50"><SelectValue placeholder="Select a trainer..." /></SelectTrigger>
                        <SelectContent>
                          {trainers.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">{t.full_name.charAt(0)}</div>
                                <span className="font-medium text-slate-900">{t.full_name}</span>
                                <span className="text-xs text-slate-400">· {t.qualifications || 'Certified Trainer'}</span>
                                {t.years_of_experience && <span className="text-xs text-slate-400">· {t.years_of_experience} yrs exp</span>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {trainerForm.formState.errors.trainer_id && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{trainerForm.formState.errors.trainer_id.message}</p>}
                  </div>
                  {selectedTrainer && (
                    <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-cyan-600/20">{selectedTrainer.full_name.charAt(0)}</div>
                      <div>
                        <p className="font-bold text-slate-900">{selectedTrainer.full_name}</p>
                        <p className="text-xs text-cyan-700 font-medium">{selectedTrainer.email}</p>
                        <p className="text-[11px] font-medium text-slate-600 mt-1 bg-white inline-block px-2.5 py-0.5 rounded-full border border-slate-200">
                          {selectedTrainer.qualifications || 'Certified Trainer'}{selectedTrainer.years_of_experience ? ` • ${selectedTrainer.years_of_experience} years exp.` : ''}
                        </p>
                      </div>
                      <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200">Selected ✓</Badge>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Message to Trainer <span className="text-slate-400 font-normal">(optional)</span></Label>
                    <Textarea {...trainerForm.register('assignment_message')} placeholder="e.g. Please build this course by October. Focus on practical exercises..." className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl resize-none" rows={3} />
                    <p className="text-xs text-slate-400">This message will appear in the trainer's announcement.</p>
                  </div>
                  {selectedTrainer && (
                    <div className="p-4 rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/50 space-y-2">
                      <div className="flex items-center gap-2 text-cyan-700 text-xs font-bold uppercase tracking-wider"><Megaphone className="w-3.5 h-3.5" /> Preview: Trainer announcement</div>
                      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                        <p className="text-sm font-semibold text-slate-900">🎓 New Course Assigned to You</p>
                        <p className="text-xs text-slate-500 mt-0.5">"{detailsForm.watch('title') || 'Course Title'}" — assigned by {profile?.full_name ?? 'Admin'}</p>
                        {trainerForm.watch('assignment_message') && <p className="text-xs text-slate-600 mt-2 italic">"{trainerForm.watch('assignment_message')}"</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div><h2 className="text-xl font-bold text-slate-900 mb-1">Course Details</h2></div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Title *</Label>
                    <Input {...detailsForm.register('title')} placeholder="e.g. Advanced Data Analytics" className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl h-12" />
                    {detailsForm.formState.errors.title && <p className="text-xs text-red-500">{detailsForm.formState.errors.title.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Description *</Label>
                    <Textarea {...detailsForm.register('description')} placeholder="What will trainees learn?" className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl resize-none" rows={5} />
                    {detailsForm.formState.errors.description && <p className="text-xs text-red-500">{detailsForm.formState.errors.description.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                      <Input {...detailsForm.register('department')} placeholder="e.g. Engineering" className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl h-12" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Thumbnail <span className="text-slate-400 font-normal">(optional)</span></Label>
                    <div onClick={() => thumbRef.current?.click()} className="flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-cyan-500 cursor-pointer transition-colors bg-slate-50">
                      {thumbnailPreview ? <img src={thumbnailPreview} alt="thumb" className="w-20 h-14 object-cover rounded-xl" /> : <div className="w-20 h-14 rounded-xl bg-slate-200 flex items-center justify-center"><Image className="w-6 h-6 text-slate-400" /></div>}
                      <div><p className="text-sm font-medium text-slate-700">{thumbnail ? thumbnail.name : 'Click to upload thumbnail'}</p><p className="text-xs text-slate-400">PNG, JPG — max 5MB (16:5 ratio, e.g. 1600x500px)</p></div>
                    </div>
                    <input ref={thumbRef} type="file" accept="image/*" onChange={e => { 
                      const f = e.target.files?.[0]; 
                      if (f && f.size < 5*1024*1024) { 
                        setRawImageFile(f); 
                        setIsCropperOpen(true); 
                        if(thumbRef.current) thumbRef.current.value=''; 
                      } else if (f) toast.error('Max 5MB') 
                    }} className="hidden" />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <div><h2 className="text-xl font-bold text-slate-900 mb-1">Configuration</h2></div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Duration (hours)', field: 'duration_hours', type: 'number', placeholder: 'e.g. 40' },
                      { label: 'Passing Score (%)', field: 'passing_score', type: 'number', placeholder: '60' },
                      { label: 'Start Date', field: 'start_date', type: 'date', placeholder: '' },
                      { label: 'End Date', field: 'end_date', type: 'date', placeholder: '' },
                      { label: 'Max Trainees', field: 'max_trainees', type: 'number', placeholder: 'e.g. 50' },
                    ].map(({ label, field, type, placeholder }) => (
                      <div key={field} className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">{label}</Label>
                        <Input {...settingsForm.register(field as any)} type={type} placeholder={placeholder} className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl h-12" />
                      </div>
                    ))}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">Delivery Mode</Label>
                      <Select value={settingsForm.watch('delivery_mode')} onValueChange={v => settingsForm.setValue('delivery_mode', v as any)}>
                        <SelectTrigger className="border-slate-200 bg-slate-50 rounded-xl h-12"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recorded">Recorded</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div><h2 className="text-xl font-bold text-slate-900 mb-1">Learning Objectives & Skills</h2></div>
                  {(['understand', 'able_to_do', 'competencies_built'] as const).map((field, i) => (
                    <div key={field} className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700">{['Will Understand *', 'Will be Able to Do *', 'Competencies Built *'][i]}</Label>
                      <Textarea {...objectivesForm.register(field)} className="border-slate-200 focus:border-cyan-500 bg-slate-50 rounded-xl resize-none" rows={3} placeholder={['Core concepts, theories...', 'Practical skills, tasks...', 'Professional competencies...'][i]} />
                      {objectivesForm.formState.errors[field] && <p className="text-xs text-red-500">{objectivesForm.formState.errors[field]?.message}</p>}
                    </div>
                  ))}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Required Skills</Label>
                    <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-slate-50 border border-slate-200 min-h-[60px]">
                      {skills.map(skill => (
                        <button key={skill.id} type="button" onClick={() => toggleSkill(skill.id)} className={'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ' + (selectedSkills.includes(skill.id) ? 'bg-cyan-100 text-cyan-800 border-cyan-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100')}>{skill.name}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6">
                  <div><h2 className="text-xl font-bold text-slate-900 mb-1">Review & Publish</h2></div>
                  <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200">
                    <p className="text-xs font-bold text-cyan-800 uppercase tracking-wider mb-2">Trainer Assignment</p>
                    {selectedTrainer ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold shadow">{selectedTrainer.full_name.charAt(0)}</div>
                        <div><p className="font-bold text-slate-900">{selectedTrainer.full_name}</p><p className="text-xs text-slate-500">{selectedTrainer.email}</p></div>
                        <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200">Will be notified ✓</Badge>
                      </div>
                    ) : <p className="text-sm text-red-500">No trainer selected — go back to Step 1</p>}
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-xs text-slate-400">Title</p><p className="font-semibold text-slate-900">{detailsForm.watch('title')}</p></div>
                    <div><p className="text-xs text-slate-400">Type</p><p className="font-semibold text-slate-900 capitalize">{detailsForm.watch('course_type')}</p></div>
                    <div><p className="text-xs text-slate-400">Delivery</p><p className="font-semibold text-slate-900 capitalize">{settingsForm.watch('delivery_mode')}</p></div>
                    <div><p className="text-xs text-slate-400">Passing Score</p><p className="font-semibold text-slate-900">{settingsForm.watch('passing_score')}%</p></div>
                  </div>
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0"><Megaphone className="w-4 h-4 text-emerald-600" /></div>
                      <div>
                        <p className="text-sm font-bold text-emerald-900">What happens when you publish?</p>
                        <ul className="text-xs text-emerald-800 mt-1 space-y-0.5">
                          <li>• Course goes live immediately in the trainee catalog</li>
                          <li>• Trainer receives a big announcement: "Course assigned to you"</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => handlePublish('draft')} disabled={saving} className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl h-12 font-semibold">
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save as Draft
                    </Button>
                    <Button type="button" onClick={() => handlePublish('published')} disabled={saving} className="flex-1 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:opacity-95 text-white font-bold rounded-xl h-12 shadow-lg shadow-cyan-600/20">
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Megaphone className="w-4 h-4 mr-2" />} Publish & Assign
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {step < 5 && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex justify-between mt-6">
            <Button type="button" variant="outline" onClick={handleBack} disabled={step === 1} className="border-slate-200 text-slate-700 hover:bg-slate-50 font-medium rounded-xl px-6"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
            <Button type="button" onClick={handleNext} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white font-medium rounded-xl px-6 shadow-md shadow-cyan-600/10">Next <ArrowRight className="w-4 h-4 ml-2" /></Button>
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
