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
type Profile = Database['public']['Tables']['profiles']['Row']
type AssessmentAttempt = Database['public']['Tables']['assessment_attempts']['Row']
type Question = Database['public']['Tables']['questions']['Row']

interface TraineeRow {
  enrollment: Enrollment
  profile: Profile | null
  attempts: AssessmentAttempt[]
  bestScore: number | null
  attemptCount: number
}

export function PerformancePage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [traineeRows, setTraineeRows] = useState<TraineeRow[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user || !courseId) return
    setLoading(true)
    try {
      const { data: c } = await supabase.from('courses').select('*').eq('id', courseId).eq('trainer_id', user.id).single()
      if (c) setCourse(c)

      const { data: e } = await supabase.from('enrollments').select('*, profiles(*)').eq('course_id', courseId)
      const enrollments = (e ?? []) as any as (Enrollment & { profiles: Profile | null })[]

      const { data: assessment } = await supabase
        .from('assessments')
        .select('id')
        .eq('course_id', courseId)
        .eq('created_by', user.id)
        .single()

      let allAttempts: AssessmentAttempt[] = []
      if (assessment) {
        const { data: a } = await supabase.from('assessment_attempts').select('*').eq('assessment_id', assessment.id)
        if (a) allAttempts = a
      }

      const rows: TraineeRow[] = enrollments.map(en => {
        const userAttempts = allAttempts.filter(at => at.user_id === en.user_id)
        const scores = userAttempts.filter(at => at.score !== null).map(at => at.score ?? 0)
        return {
          enrollment: en,
          profile: en.profiles,
          attempts: userAttempts,
          bestScore: scores.length > 0 ? Math.max(...scores) : null,
          attemptCount: userAttempts.length,
        }
      })
      setTraineeRows(rows)

      if (assessment) {
        const { data: q } = await supabase.from('questions').select('*').eq('assessment_id', assessment.id)
        if (q) setQuestions(q)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user, courseId])

  useEffect(() => { fetchData() }, [fetchData])

  const totalEnrolled = traineeRows.length
  const completed = traineeRows.filter(r => r.enrollment.status === 'completed').length
  const completionRate = totalEnrolled > 0 ? Math.round((completed / totalEnrolled) * 100) : 0
  const avgProgress = totalEnrolled > 0 ? Math.round(traineeRows.reduce((s, r) => s + r.enrollment.progress_percent, 0) / totalEnrolled) : 0
  const scoresFiltered = traineeRows.filter(r => r.bestScore !== null)
  const avgScore = scoresFiltered.length > 0 ? Math.round(scoresFiltered.reduce((s, r) => s + (r.bestScore ?? 0), 0) / scoresFiltered.length) : 0
  const passedCount = scoresFiltered.filter(r => (r.bestScore ?? 0) >= (course?.passing_score ?? 60)).length
  const passRate = scoresFiltered.length > 0 ? Math.round((passedCount / scoresFiltered.length) * 100) : 0
  const avgAttempts = totalEnrolled > 0 ? Math.round(traineeRows.reduce((s, r) => s + r.attemptCount, 0) / totalEnrolled * 10) / 10 : 0
  const needsSupport = traineeRows.filter(r => r.enrollment.status !== 'completed' && r.bestScore !== null && (r.bestScore ?? 0) < (course?.passing_score ?? 60))

  const stats = [
    { label: 'Enrolled', value: totalEnrolled, icon: Users, color: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20' },
    { label: 'Completed', value: completed, icon: Target, color: 'from-green-500/10 to-green-500/5 border-green-500/20' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: BarChart3, color: 'from-blue-500/10 to-blue-500/5 border-blue-500/20' },
    { label: 'Avg. Progress', value: `${avgProgress}%`, icon: TrendingUp, color: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20' },
    { label: 'Avg. Score', value: `${avgScore}%`, icon: BarChart3, color: 'from-violet-500/10 to-violet-500/5 border-violet-500/20' },
    { label: 'Pass Rate', value: `${passRate}%`, icon: Target, color: 'from-amber-500/10 to-amber-500/5 border-amber-500/20' },
    { label: 'Avg. Attempts', value: avgAttempts.toString(), icon: BookOpen, color: 'from-pink-500/10 to-pink-500/5 border-pink-500/20' },
  ]

  if (loading) {
    return <TrainerLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div></TrainerLayout>
  }

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-6xl mx-auto space-y-6">
        <motion.div variants={fadeUp}>
          <Link to={`/trainer/courses/${courseId}/edit`} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Course
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-white">Trainee Performance</h2>
          <p className="text-slate-400 text-sm mt-1">{course?.title}</p>
        </motion.div>

        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {stats.map(s => (
            <div key={s.label} className={`p-4 rounded-2xl border bg-gradient-to-br ${s.color} backdrop-blur-sm`}>
              <s.icon className="w-4 h-4 text-slate-400 mb-2" />
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {needsSupport.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-300">Trainees Needing Support ({needsSupport.length})</p>
                  <div className="mt-1 space-y-1">
                    {needsSupport.map(r => (
                      <p key={r.enrollment.user_id} className="text-xs text-amber-200/70">
                        {r.profile?.full_name ?? 'Unknown'} — Score: {r.bestScore}% (Pass: {course?.passing_score}%)
                      </p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={fadeUp} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white">Enrolled Trainees</h3>
          </div>
          {traineeRows.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No trainees enrolled yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Trainee', 'Enrolled', 'Progress', 'Attempts', 'Best Score', 'Status'].map(h => (
                      <th key={h} className="text-left text-xs text-slate-500 font-medium px-6 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {traineeRows.map(r => (
                    <tr key={r.enrollment.user_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {r.profile?.full_name?.charAt(0) ?? '?'}
                          </div>
                          <div>
                            <p className="text-sm text-white font-medium">{r.profile?.full_name ?? 'Unknown'}</p>
                            <p className="text-xs text-slate-500">{r.profile?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-400">{new Date(r.enrollment.enrolled_at).toLocaleDateString()}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" style={{ width: `${r.enrollment.progress_percent}%` }} />
                          </div>
                          <span className="text-xs text-slate-400">{r.enrollment.progress_percent}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-400">{r.attemptCount}</td>
                      <td className="px-6 py-3 text-xs text-slate-400">
                        {r.bestScore !== null ? `${r.bestScore}%` : '—'}
                      </td>
                      <td className="px-6 py-3">
                        <Badge className={
                          r.enrollment.status === 'completed' ? 'bg-green-500/20 text-green-300 border border-green-500/30 text-xs' :
                          r.enrollment.status === 'in_progress' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs' :
                          'bg-slate-500/20 text-slate-300 border border-slate-500/30 text-xs'
                        }>
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
