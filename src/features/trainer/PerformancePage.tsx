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

import { calculateCourseGradeBreakdown, type CourseGradeBreakdown } from '@/lib/courseGrading'

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
  gradeBreakdown: CourseGradeBreakdown
}

export function PerformancePage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user, profile } = useAuth()
  const isTrainer = profile?.role === 'trainer'
  const baseCoursePath = isTrainer ? '/trainer/courses' : '/admin/courses'
  const [course, setCourse] = useState<Course | null>(null)
  const [traineeRows, setTraineeRows] = useState<TraineeRow[]>([])
  const [_questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user || !courseId) return
    setLoading(true)
    try {
      let query = supabase.from('courses').select('*').eq('id', courseId)
      if (profile?.role === 'trainer') {
        query = query.eq('trainer_id', user.id)
      }
      const { data: c } = await query.single()
      if (c) setCourse(c)

      // 1. Fetch all enrollments for this course
      const { data: e, error: eErr } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', courseId)
        .order('enrolled_at', { ascending: false })

      if (eErr) console.error('Error fetching enrollments:', eErr)
      const enrollments = e ?? []

      // 2. Fetch trainee profile details
      let traineesMap: Record<string, Trainee> = {}
      if (enrollments.length > 0) {
        const userIds = [...new Set(enrollments.map(item => item.user_id))]
        const { data: tData } = await supabase.from('trainees').select('*').in('id', userIds)
        if (tData) {
          traineesMap = tData.reduce((acc, curr) => {
            acc[curr.id] = curr
            return acc
          }, {} as Record<string, Trainee>)
        }
      }

      // 3. Fetch course assessments
      const { data: assessmentsList } = await supabase
        .from('assessments')
        .select('id, title, assessment_type, passing_score')
        .eq('course_id', courseId)

      const assessmentIds = assessmentsList?.map(a => a.id) || []

      // 4. Fetch all trainee attempts for these assessments
      let allAttempts: AssessmentAttempt[] = []
      if (assessmentIds.length > 0) {
        const { data: a } = await supabase.from('assessment_attempts').select('*').in('assessment_id', assessmentIds)
        if (a) allAttempts = a
      }

      // 5. Build computed trainee rows with grade breakdowns
      const rows: TraineeRow[] = enrollments.map(en => {
        const traineeInfo = traineesMap[en.user_id] || null
        const userAttempts = allAttempts.filter(at => at.user_id === en.user_id)
        const scores = userAttempts.filter(at => at.score !== null).map(at => at.score ?? 0)

        const breakdown = calculateCourseGradeBreakdown({
          moduleProgressPercent: en.progress_percent,
          courseAssessments: (assessmentsList || []) as any,
          traineeAttempts: userAttempts as any,
          passingScore: c?.passing_score ?? 50,
        })

        return {
          enrollment: en,
          trainee: traineeInfo,
          attempts: userAttempts,
          bestScore: scores.length > 0 ? Math.max(...scores) : null,
          attemptCount: userAttempts.length,
          gradeBreakdown: breakdown,
        }
      })
      setTraineeRows(rows)

      if (assessmentIds.length > 0) {
        const { data: q } = await supabase.from('questions').select('*').in('assessment_id', assessmentIds)
        if (q) setQuestions(q)
      }
    } catch (err) {
      console.error('Error fetching performance data:', err)
    } finally {
      setLoading(false)
    }
  }, [user, profile?.role, courseId])

  useEffect(() => { fetchData() }, [fetchData])

  const activeTraineeRows = traineeRows.filter(r => ['enrolled', 'in_progress', 'completed'].includes(r.enrollment.status))
  const totalEnrolled = activeTraineeRows.length
  const completed = activeTraineeRows.filter(r => r.enrollment.status === 'completed' || r.gradeBreakdown.isCompleted).length
  const completionRate = totalEnrolled > 0 ? Math.round((completed / totalEnrolled) * 100) : 0
  const avgProgress = totalEnrolled > 0 ? Math.round(activeTraineeRows.reduce((s, r) => s + (r.enrollment.progress_percent || 0), 0) / totalEnrolled) : 0
  const avgScore = totalEnrolled > 0 ? Math.round(activeTraineeRows.reduce((s, r) => s + (r.gradeBreakdown.totalScore || 0), 0) / totalEnrolled) : 0
  const passedCount = activeTraineeRows.filter(r => r.gradeBreakdown.isPassed).length
  const passRate = totalEnrolled > 0 ? Math.round((passedCount / totalEnrolled) * 100) : 0
  const avgAttempts = totalEnrolled > 0 ? Math.round((activeTraineeRows.reduce((s, r) => s + r.attemptCount, 0) / totalEnrolled) * 10) / 10 : 0
  const needsSupport = activeTraineeRows.filter(r => !r.gradeBreakdown.isPassed && r.attemptCount > 0)

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
          <Link to={`${baseCoursePath}/${courseId}`} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-4">
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
                    {['Trainee', 'Enrolled', 'Modules (25%)', 'Assessments (25%)', 'Final Exam (50%)', 'Total Grade (100%)', 'Status'].map(h => (
                      <th key={h} className="text-left text-xs text-slate-500 font-semibold px-6 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeTraineeRows.map(r => {
                    const gb = r.gradeBreakdown
                    return (
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
                          <div>
                            <span className="text-xs font-bold text-cyan-700">{gb.moduleScore} / 25 pts</span>
                            <span className="text-[10px] text-slate-400 block">({gb.moduleProgressPercent}% complete)</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <div>
                            <span className="text-xs font-bold text-amber-700">{gb.regularAssessmentScore} / 25 pts</span>
                            <span className="text-[10px] text-slate-400 block">
                              {gb.regularAssessmentsTotal > 0
                                ? `Avg: ${gb.regularAssessmentAveragePercent}% (${gb.regularAssessmentsCompleted}/${gb.regularAssessmentsTotal})`
                                : 'Module-aligned'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <div>
                            <span className="text-xs font-bold text-purple-700">{gb.finalAssessmentWeightedScore} / 50 pts</span>
                            <span className="text-[10px] text-slate-400 block">
                              {gb.finalAssessmentCompleted
                                ? `Score: ${gb.finalAssessmentScorePercent}%`
                                : gb.isFinalUnlocked
                                  ? 'Unlocked'
                                  : 'Locked'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-black text-slate-900">{gb.totalScore}%</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              gb.isPassed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {gb.isPassed ? 'Passed' : 'Pending'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge className={`text-xs font-semibold capitalize ${
                            r.enrollment.status === 'completed' || gb.isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            r.enrollment.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {(r.enrollment.status === 'completed' || gb.isCompleted) ? 'Completed' : r.enrollment.status.replace('_', ' ')}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </motion.div>
    </TrainerLayout>
  )
}
