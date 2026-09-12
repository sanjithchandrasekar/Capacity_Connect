import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Database } from '@/integrations/supabase/types'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit3, Target, BarChart3, FileText, Clock, Users, Award, CheckCircle, Loader2 } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'

type Course = Database['public']['Tables']['courses']['Row']
type CourseSkill = Database['public']['Tables']['course_skills']['Row'] & { skills: { name: string } | null }
type Material = Database['public']['Tables']['materials']['Row']
type Assessment = Database['public']['Tables']['assessments']['Row']

const statusColors: Record<string, string> = {
  draft: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  pending_review: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  published: 'bg-green-500/20 text-green-300 border border-green-500/30',
  archived: 'bg-red-500/20 text-red-300 border border-red-500/30',
}

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [courseSkills, setCourseSkills] = useState<CourseSkill[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [enrollmentCount, setEnrollmentCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user || !courseId) return
    setLoading(true)
    try {
      const [cRes, csRes, mRes, aRes, eRes] = await Promise.all([
        supabase.from('courses').select('*').eq('id', courseId).eq('trainer_id', user.id).single(),
        supabase.from('course_skills').select('*, skills(name)').eq('course_id', courseId),
        supabase.from('materials').select('*').eq('course_id', courseId),
        supabase.from('assessments').select('*').eq('course_id', courseId).eq('created_by', user.id).single(),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('course_id', courseId),
      ])
      if (cRes.data) setCourse(cRes.data)
      if (csRes.data) setCourseSkills(csRes.data as any)
      if (mRes.data) setMaterials(mRes.data)
      if (aRes.data) setAssessment(aRes.data)
      setEnrollmentCount(eRes.count ?? 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user, courseId])

  useEffect(() => { fetchData() }, [fetchData])

  const objectives = (course?.learning_objectives as Record<string, string> | null) ?? null

  if (loading) {
    return <TrainerLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div></TrainerLayout>
  }

  if (!course) {
    return (
      <TrainerLayout>
        <div className="max-w-3xl mx-auto py-20 text-center">
          <p className="text-slate-400 mb-4">Course not found or you don't have access.</p>
          <RouterLink to="/trainer/courses"><Button variant="outline" className="border-white/10 text-white">Back to Courses</Button></RouterLink>
        </div>
      </TrainerLayout>
    )
  }

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-4xl mx-auto space-y-6">
        <motion.div variants={fadeUp}>
          <RouterLink to="/trainer/courses" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Courses
          </RouterLink>
        </motion.div>

        <motion.div variants={fadeUp} className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-cyan-500/5 to-transparent blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <Badge className={`${statusColors[course.status]} text-[10px] mb-2`}>{course.status.replace('_', ' ')}</Badge>
                <h1 className="text-2xl font-bold text-white">{course.title}</h1>
              </div>
              <RouterLink to={`/trainer/courses/${courseId}/edit`}>
                <Button size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-white"><Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit</Button>
              </RouterLink>
            </div>
            <p className="text-sm text-slate-400 mb-4">{course.description}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {course.duration_minutes ?? 0} min</span>
              <span>{course.course_type === 'standard' ? 'Standard' : 'Scenario'} Training</span>
              <span>{course.department || 'General'}</span>
              <span>Pass: {course.passing_score}%</span>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {enrollmentCount} enrolled</span>
            </div>
          </div>
        </motion.div>

        {objectives && (
          <motion.div variants={fadeUp}>
            <Card className="bg-white/[0.02] border-white/[0.06]">
              <CardContent className="p-6 space-y-3">
                <h3 className="text-sm font-semibold text-white">Learning Objectives</h3>
                {objectives.understand && <div><p className="text-xs text-cyan-400 font-medium">Understand</p><p className="text-sm text-slate-300">{objectives.understand}</p></div>}
                {objectives.able_to_do && <div><p className="text-xs text-cyan-400 font-medium">Able to Do</p><p className="text-sm text-slate-300">{objectives.able_to_do}</p></div>}
                {objectives.competencies_built && <div><p className="text-xs text-cyan-400 font-medium">Competencies Built</p><p className="text-sm text-slate-300">{objectives.competencies_built}</p></div>}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {courseSkills.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="bg-white/[0.02] border-white/[0.06]">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-white mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {courseSkills.map(cs => (
                    <span key={cs.skill_id} className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs">
                      {cs.skills?.name ?? 'Unknown'}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div variants={fadeUp}>
            <RouterLink to={`/trainer/courses/${courseId}/materials`}>
              <Card className="bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer h-full">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center"><FileText className="w-5 h-5 text-sky-400" /></div>
                  <div><p className="text-sm font-medium text-white">Materials</p><p className="text-xs text-slate-500">{materials.length} files</p></div>
                </CardContent>
              </Card>
            </RouterLink>
          </motion.div>
          <motion.div variants={fadeUp}>
            <RouterLink to={`/trainer/courses/${courseId}/assessments`}>
              <Card className="bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer h-full">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center"><Target className="w-5 h-5 text-violet-400" /></div>
                  <div><p className="text-sm font-medium text-white">Assessment</p><p className="text-xs text-slate-500">{assessment ? 'Created' : 'Not created'}</p></div>
                </CardContent>
              </Card>
            </RouterLink>
          </motion.div>
          <motion.div variants={fadeUp}>
            <RouterLink to={`/trainer/courses/${courseId}/performance`}>
              <Card className="bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer h-full">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-emerald-400" /></div>
                  <div><p className="text-sm font-medium text-white">Performance</p><p className="text-xs text-slate-500">{enrollmentCount} trainees</p></div>
                </CardContent>
              </Card>
            </RouterLink>
          </motion.div>
        </div>
      </motion.div>
    </TrainerLayout>
  )
}
