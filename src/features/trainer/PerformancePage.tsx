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
    { label: 'Enrolled', value: totalEnrolled, icon: Users, color: 'from-ink/10 to-ink/5 border-ink/20' },
    { label: 'Completed', value: completed, icon: Target, color: 'from-ink/10 to-ink/5 border-ink/20' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: BarChart3, color: 'from-ink/10 to-ink/5 border-ink/20' },
    { label: 'Avg. Progress', value: `${avgProgress}%`, icon: TrendingUp, color: 'from-ink/10 to-ink/5 border-ink/20' },
    { label: 'Avg. Score', value: `${avgScore}%`, icon: BarChart3, color: 'from-ink/10 to-ink/5 border-ink/20' },
    { label: 'Pass Rate', value: `${passRate}%`, icon: Target, color: 'from-yellow-50 to-yellow-50 border-yellow-200' },
    { label: 'Avg. Attempts', value: avgAttempts.toString(), icon: BookOpen, color: 'from-ink/10 to-ink/5 border-ink/20' },
  ]

  if (loading) {
    return <TrainerLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-ink" /></div></TrainerLayout>
  }

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-6xl mx-auto space-y-6">
        <motion.div variants={fadeUp}>
          <Link to={`/trainer/courses/${courseId}/edit`} className="flex items-center gap-2 text-sm text-ink/60 hover:text-ink transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Course
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Trainee Performance</h2>
          <p className="text-ink/60 text-sm mt-1">{course?.title}</p>
        </motion.div>

        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {stats.map(s => (
            <div key={s.label} className={`p-4 rounded-2xl border bg-gradient-to-br ${s.color} backdrop-blur-sm`}>
              <s.icon className="w-4 h-4 text-ink/60 mb-2" />
              <div className="text-xl font-bold text-ink">{s.value}</div>
              <div className="text-[11px] text-ink/60 mt-0.5">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {needsSupport.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-700 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-700">Trainees Needing Support ({needsSupport.length})</p>
                  <div className="mt-1 space-y-1">
                    {needsSupport.map(r => (
                      <p key={r.enrollment.user_id} className="text-xs text-yellow-700/70">
                        {r.profile?.full_name ?? 'Unknown'} — Score: {r.bestScore}% (Pass: {course?.passing_score}%)
                      </p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={fadeUp} className="bg-white border border-ink/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-ink/10">
            <h3 className="text-sm font-semibold text-ink">Enrolled Trainees</h3>
          </div>
          {traineeRows.length === 0 ? (
            <div className="p-8 text-center text-ink/50 text-sm">No trainees enrolled yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-ink/10">
                    {['Trainee', 'Enrolled', 'Progress', 'Attempts', 'Best Score', 'Status'].map(h => (
                      <th key={h} className="text-left text-xs text-ink/50 font-medium px-6 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {traineeRows.map(r => (
                    <tr key={r.enrollment.user_id} className="hover:bg-ink/5 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ink to-ink/80 flex items-center justify-center text-cream text-xs font-bold">
                            {r.profile?.full_name?.charAt(0) ?? '?'}
                          </div>
                          <div>
                            <p className="text-sm text-ink font-medium">{r.profile?.full_name ?? 'Unknown'}</p>
                            <p className="text-xs text-ink/50">{r.profile?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-xs text-ink/60">{new Date(r.enrollment.enrolled_at).toLocaleDateString()}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-ink/5 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-ink to-ink/80 rounded-full" style={{ width: `${r.enrollment.progress_percent}%` }} />
                          </div>
                          <span className="text-xs text-ink/60">{r.enrollment.progress_percent}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-xs text-ink/60">{r.attemptCount}</td>
                      <td className="px-6 py-3 text-xs text-ink/60">
                        {r.bestScore !== null ? `${r.bestScore}%` : '—'}
                      </td>
                      <td className="px-6 py-3">
                        <Badge className={
                          r.enrollment.status === 'completed' ? 'bg-ink/10 text-ink/70 border border-ink/20 text-xs' :
                          r.enrollment.status === 'in_progress' ? 'bg-ink/10 text-ink/70 border border-ink/20 text-xs' :
                          'bg-ink/10 text-ink/80 border border-ink/20 text-xs'
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
