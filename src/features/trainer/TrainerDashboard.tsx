import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Database } from '@/integrations/supabase/types'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Users, Target, PlusCircle, ArrowUpRight, TrendingUp, CheckCircle, Clock, FileText, Star, Loader2 } from 'lucide-react'

type Course = Database['public']['Tables']['courses']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']
type AssessmentAttempt = Database['public']['Tables']['assessment_attempts']['Row']
type ActivityLog = Database['public']['Tables']['audit_logs']['Row']

const statusColors: Record<string, string> = {
  draft: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  pending_review: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  published: 'bg-green-500/20 text-green-300 border border-green-500/30',
  archived: 'bg-red-500/20 text-red-300 border border-red-500/30',
}

export function TrainerDashboard() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([])
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: c } = await supabase
        .from('courses')
        .select('*')
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false })
      if (c) setCourses(c)

      const courseIds = (c ?? []).map(co => co.id)
      if (courseIds.length > 0) {
        const { data: e } = await supabase
          .from('enrollments')
          .select('*')
          .in('course_id', courseIds)
        if (e) setEnrollments(e)

        const { data: assessments } = await supabase
          .from('assessments')
          .select('id')
          .in('course_id', courseIds)
          .eq('created_by', user.id)

        const assessmentIds = (assessments ?? []).map(a => a.id)
        if (assessmentIds.length > 0) {
          const { data: a } = await supabase
            .from('assessment_attempts')
            .select('*')
            .in('assessment_id', assessmentIds)
          if (a) setAttempts(a)
        }
      }

      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      if (logs) setActivities(logs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  const totalCourses = courses.length
  const publishedCourses = courses.filter(c => c.status === 'published').length
  const pendingReview = courses.filter(c => c.status === 'pending_review').length
  const draftCourses = courses.filter(c => c.status === 'draft').length
  const totalEnrollments = enrollments.length
  const completedEnrollments = enrollments.filter(e => e.status === 'completed').length
  const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0

  const scoresFiltered = attempts.filter(a => a.score !== null)
  const avgScore = scoresFiltered.length > 0
    ? Math.round(scoresFiltered.reduce((sum, a) => sum + (a.score ?? 0), 0) / scoresFiltered.length)
    : 0

  const stats = [
    { label: 'Total Courses', value: totalCourses, icon: BookOpen, color: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20' },
    { label: 'Published', value: publishedCourses, icon: CheckCircle, color: 'from-green-500/10 to-green-500/5 border-green-500/20' },
    { label: 'Pending Review', value: pendingReview, icon: Clock, color: 'from-yellow-500/10 to-yellow-500/5 border-yellow-500/20' },
    { label: 'Drafts', value: draftCourses, icon: FileText, color: 'from-slate-500/10 to-slate-500/5 border-slate-500/20' },
    { label: 'Enrolled Trainees', value: totalEnrollments, icon: Users, color: 'from-blue-500/10 to-blue-500/5 border-blue-500/20' },
    { label: 'Avg. Score', value: `${avgScore}%`, icon: TrendingUp, color: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: Target, color: 'from-violet-500/10 to-violet-500/5 border-violet-500/20' },
    { label: 'Certificates', value: completedEnrollments, icon: Star, color: 'from-amber-500/10 to-amber-500/5 border-amber-500/20' },
  ]

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 max-w-6xl">
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Trainer Dashboard</h2>
            <p className="text-slate-400 text-sm mt-1">Welcome back, {user?.email?.split('@')[0]}</p>
          </div>
          <Link to="/trainer/courses/new">
            <Button className="bg-cyan-500 hover:bg-cyan-400 text-white">
              <PlusCircle className="w-4 h-4 mr-2" /> Create Course
            </Button>
          </Link>
        </motion.div>

        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => (
            <div key={s.label} className={`p-4 rounded-2xl border bg-gradient-to-br ${s.color} backdrop-blur-sm`}>
              <s.icon className="w-4 h-4 text-slate-400 mb-2" />
              <div className="text-xl font-bold text-white">{s.value}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={fadeUp} className="lg:col-span-2 bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Recent Courses</h3>
              <Link to="/trainer/courses" className="text-xs text-cyan-400 hover:text-cyan-300">View all</Link>
            </div>
            {courses.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-slate-500 mb-3">No courses yet.</p>
                <Link to="/trainer/courses/new"><Button className="bg-cyan-500 hover:bg-cyan-400 text-white"><PlusCircle className="w-4 h-4 mr-2" /> Create First Course</Button></Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['Course', 'Status', 'Enrollments', 'Type', 'Created'].map(h => (
                        <th key={h} className="text-left text-xs text-slate-500 font-medium px-6 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {courses.slice(0, 5).map(course => {
                      const enrollCount = enrollments.filter(e => e.course_id === course.id).length
                      return (
                        <tr key={course.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-3">
                            <Link to={`/trainer/courses/${course.id}/edit`} className="text-sm text-white hover:text-cyan-400 transition-colors font-medium">
                              {course.title}
                            </Link>
                          </td>
                          <td className="px-6 py-3">
                            <Badge className={`${statusColors[course.status]} text-[10px]`}>{course.status.replace('_', ' ')}</Badge>
                          </td>
                          <td className="px-6 py-3 text-xs text-slate-400">{enrollCount}</td>
                          <td className="px-6 py-3 text-xs text-slate-400 capitalize">{course.course_type}</td>
                          <td className="px-6 py-3 text-xs text-slate-500">{new Date(course.created_at).toLocaleDateString()}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeUp} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06]">
              <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
            </div>
            {activities.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-500 text-sm">No recent activity.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {activities.slice(0, 8).map(a => (
                  <div key={a.id} className="px-6 py-3">
                    <p className="text-xs text-white">{a.action}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </TrainerLayout>
  )
}
