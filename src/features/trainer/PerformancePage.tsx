import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Database } from '@/integrations/supabase/types'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Users, BarChart3, Target, BookOpen, Loader2, TrendingUp, AlertTriangle } from 'lucide-react'

type Course = Database['public']['Tables']['courses']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']
type Trainee = Database['public']['Tables']['trainees']['Row']
type AssessmentAttempt = Database['public']['Tables']['assessment_attempts']['Row']
type Question = Database['public']['Tables']['questions']['Row']

interface TraineeRow {
  enrollment: Enrollment
  trainee: Trainee | null
  attempts: AssessmentAttempt[]
  bestScore: number | null
  attemptCount: number
}

export function PerformancePage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [traineeRows, setTraineeRows] = useState<TraineeRow[]>([])
  const [_questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user || !courseId) return
    setLoading(true)
    try {
      const { data: c } = await supabase.from('courses').select('*').eq('id', courseId).eq('trainer_id', user.id).single()
      if (c) setCourse(c)

      const { data: e } = await supabase.from('enrollments').select('*, trainees(*)').eq('course_id', courseId)
      const enrollments = (e ?? []) as any as (Enrollment & { trainees: Trainee | null })[]

      const { data: assessmentsList } = await supabase
        .from('assessments')
        .select('id')
        .eq('course_id', courseId)
        .eq('created_by', user.id)

      const assessmentIds = assessmentsList?.map(a => a.id) || []

      let allAttempts: AssessmentAttempt[] = []
      if (assessmentIds.length > 0) {
        const { data: a } = await supabase.from('assessment_attempts').select('*').in('assessment_id', assessmentIds)
        if (a) allAttempts = a
      }

      const rows: TraineeRow[] = enrollments.map(en => {
        const userAttempts = allAttempts.filter(at => at.user_id === en.user_id)
        const scores = userAttempts.filter(at => at.score !== null).map(at => at.score ?? 0)
        return {
          enrollment: en,
          trainee: en.trainees,
          attempts: userAttempts,
          bestScore: scores.length > 0 ? Math.max(...scores) : null,
          attemptCount: userAttempts.length,
        }
      })
      setTraineeRows(rows)

      if (assessmentIds.length > 0) {
        const { data: q } = await supabase.from('questions').select('*').in('assessment_id', assessmentIds)
        if (q) setQuestions(q)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user, courseId])

  useEffect(() => { fetchData() }, [fetchData])

  const activeTraineeRows = traineeRows.filter(r => ['enrolled', 'in_progress', 'completed'].includes(r.enrollment.status))
  const totalEnrolled = activeTraineeRows.length
  const completed = activeTraineeRows.filter(r => r.enrollment.status === 'completed').length
  const completionRate = totalEnrolled > 0 ? Math.round((completed / totalEnrolled) * 100) : 0
  const avgProgress = totalEnrolled > 0 ? Math.round(activeTraineeRows.reduce((s, r) => s + r.enrollment.progress_percent, 0) / totalEnrolled) : 0
  const scoresFiltered = activeTraineeRows.filter(r => r.bestScore !== null)
  const avgScore = scoresFiltered.length > 0 ? Math.round(scoresFiltered.reduce((s, r) => s + (r.bestScore ?? 0), 0) / scoresFiltered.length) : 0
  const passedCount = scoresFiltered.filter(r => (r.bestScore ?? 0) >= (course?.passing_score ?? 60)).length
  const passRate = scoresFiltered.length > 0 ? Math.round((passedCount / scoresFiltered.length) * 100) : 0
  const avgAttempts = totalEnrolled > 0 ? Math.round(activeTraineeRows.reduce((s, r) => s + r.attemptCount, 0) / totalEnrolled * 10) / 10 : 0
  const needsSupport = activeTraineeRows.filter(r => r.enrollment.status !== 'completed' && r.bestScore !== null && (r.bestScore ?? 0) < (course?.passing_score ?? 60))

  const stats = [
    { label: 'Enrolled', value: totalEnrolled, icon: Users, iconColor: 'text-cyan-600', iconBg: 'bg-cyan-50 border-cyan-200' },
    { label: 'Completed', value: completed, icon: Target, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50 border-emerald-200' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: BarChart3, iconColor: 'text-blue-600', iconBg: 'bg-blue-50 border-blue-200' },
    { label: 'Avg. Progress', value: `${avgProgress}%`, icon: TrendingUp, iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50 border-indigo-200' },
    { label: 'Avg. Score', value: `${avgScore}%`, icon: BarChart3, iconColor: 'text-purple-600', iconBg: 'bg-purple-50 border-purple-200' },
    { label: 'Pass Rate', value: `${passRate}%`, icon: Target, iconColor: 'text-teal-600', iconBg: 'bg-teal-50 border-teal-200' },
    { label: 'Avg. Attempts', value: avgAttempts.toString(), icon: BookOpen, iconColor: 'text-amber-600', iconBg: 'bg-amber-50 border-amber-200' },
  ]

  if (loading) {
    return (
      <TrainerLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
        </div>
      </TrainerLayout>
    )
  }

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-6xl mx-auto space-y-6">
        <motion.div variants={fadeUp}>
          <Link to={`/trainer/courses/${courseId}`} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Course
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Trainee Performance</h2>
          <p className="text-slate-500 text-sm mt-1">{course?.title}</p>
        </motion.div>

        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
          {stats.map(s => (
            <div key={s.label} className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
              <div className={`w-8 h-8 rounded-xl ${s.iconBg} border flex items-center justify-center mb-2`}>
                <s.icon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
              <div className="text-xl font-black text-slate-900">{s.value}</div>
              <div className="text-[11px] font-semibold text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {needsSupport.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="bg-amber-50 border border-amber-200 rounded-2xl">
              <CardContent className="p-5 flex items-start gap-3.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-900">Trainees Needing Support ({needsSupport.length})</p>
                  <div className="mt-1.5 space-y-1">
                    {needsSupport.map(r => (
                      <p key={r.enrollment.user_id} className="text-xs text-amber-800">
                        <span className="font-semibold">{r.trainee?.full_name ?? 'Unknown'}</span> — Score: <span className="font-bold">{r.bestScore}%</span> (Pass requirement: {course?.passing_score}%)
                      </p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={fadeUp} className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Enrolled Trainees</h3>
          </div>
          {activeTraineeRows.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm font-medium">No trainees enrolled yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70">
                    {['Trainee', 'Enrolled', 'Progress', 'Attempts', 'Best Score', 'Status'].map(h => (
                      <th key={h} className="text-left text-xs text-slate-500 font-semibold px-6 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeTraineeRows.map(r => (
                    <tr key={r.enrollment.user_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {r.trainee?.full_name?.charAt(0) ?? '?'}
                          </div>
                          <div>
                            <p className="text-sm text-slate-900 font-bold">{r.trainee?.full_name ?? 'Unknown'}</p>
                            <p className="text-xs text-slate-400">{r.trainee?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600 font-medium">{new Date(r.enrollment.enrolled_at).toLocaleDateString()}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div className="h-full bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full" style={{ width: `${r.enrollment.progress_percent}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-700">{r.enrollment.progress_percent}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-slate-600 font-medium">{r.attemptCount}</td>
                      <td className="px-6 py-3.5 text-xs font-bold text-slate-900">
                        {r.bestScore !== null ? `${r.bestScore}%` : '—'}
                      </td>
                      <td className="px-6 py-3.5">
                        <Badge className={`text-xs font-semibold capitalize ${
                          r.enrollment.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          r.enrollment.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {r.enrollment.status.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </motion.div>
    </TrainerLayout>
  )
}
