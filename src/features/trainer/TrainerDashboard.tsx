import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Database } from '@/integrations/supabase/types'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Users, Target, PlusCircle, TrendingUp, CheckCircle, Clock, FileText, Star } from 'lucide-react'

type Course = Database['public']['Tables']['courses']['Row']
type Enrollment = Database['public']['Tables']['enrollments']['Row']
type AssessmentAttempt = Database['public']['Tables']['assessment_attempts']['Row']
type ActivityLog = Database['public']['Tables']['audit_logs']['Row']

const statusColors: Record<string, string> = {
  draft: 'bg-ink/10 text-zinc-200/80 border border-cyan-500/30',
  pending_review: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  published: 'bg-green-50 text-green-700 border border-green-200',
  archived: 'bg-red-50 text-red-600 border border-red-200',
}

export function TrainerDashboard() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([])
  const [activities, setActivities] = useState<ActivityLog[]>([])

  const fetchData = useCallback(async () => {
    if (!user) return
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
        .eq('actor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      if (logs) setActivities(logs)
    } catch (err) {
      console.error(err)
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
    { label: 'Total Courses', value: totalCourses, icon: BookOpen, color: 'from-ink/10 to-ink/5 border-cyan-500/30' },
    { label: 'Published', value: publishedCourses, icon: CheckCircle, color: 'from-ink/10 to-ink/5 border-cyan-500/30' },
    { label: 'Pending Review', value: pendingReview, icon: Clock, color: 'from-yellow-50 to-yellow-50 border-yellow-200' },
    { label: 'Drafts', value: draftCourses, icon: FileText, color: 'from-ink/10 to-ink/5 border-cyan-500/30' },
    { label: 'Enrolled Trainees', value: totalEnrollments, icon: Users, color: 'from-ink/10 to-ink/5 border-cyan-500/30' },
    { label: 'Avg. Score', value: `${avgScore}%`, icon: TrendingUp, color: 'from-ink/10 to-ink/5 border-cyan-500/30' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: Target, color: 'from-ink/10 to-ink/5 border-cyan-500/30' },
    { label: 'Certificates', value: completedEnrollments, icon: Star, color: 'from-yellow-50 to-yellow-50 border-yellow-200' },
  ]

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4 md:space-y-6 max-w-6xl">
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-200">Trainer Dashboard</h2>
            <p className="text-zinc-200/60 text-sm mt-1">Welcome back, {user?.email?.split('@')[0]}</p>
          </div>
          <Link to="/trainer/courses/new">
            <Button className="bg-ink hover:bg-ink/90 text-cream w-full sm:w-auto">
              <PlusCircle className="w-4 h-4 mr-2" /> Create Course
            </Button>
          </Link>
        </motion.div>

        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {stats.map(s => (
            <div key={s.label} className={`p-3 md:p-4 rounded-2xl border bg-gradient-to-br ${s.color} backdrop-blur-sm`}>
              <s.icon className="w-4 h-4 text-zinc-200/60 mb-1.5" />
              <div className="text-lg md:text-xl font-bold text-zinc-200">{s.value}</div>
              <div className="text-[10px] md:text-[11px] text-zinc-200/60 mt-0.5">{s.label}</div>
            </div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <motion.div variants={fadeUp} className="lg:col-span-2 bg-[#070E20]/90 border border-cyan-500/30 rounded-2xl overflow-hidden">
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-cyan-500/30 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-200">Recent Courses</h3>
              <Link to="/trainer/courses" className="text-xs text-zinc-200 hover:text-zinc-200">View all</Link>
            </div>
            {courses.length === 0 ? (
              <div className="p-8 md:p-12 text-center">
                <p className="text-zinc-200/50 mb-3">No courses yet.</p>
                <Link to="/trainer/courses/new"><Button className="bg-ink hover:bg-ink/90 text-cream"><PlusCircle className="w-4 h-4 mr-2" /> Create First Course</Button></Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[450px]">
                  <thead>
                    <tr className="border-b border-cyan-500/30">
                      {['Course', 'Status', 'Enrollments', 'Type', 'Created'].map(h => (
                        <th key={h} className="text-left text-xs text-zinc-200/50 font-medium px-3 md:px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {courses.slice(0, 5).map(course => {
                      const enrollCount = enrollments.filter(e => e.course_id === course.id).length
                      return (
                        <tr key={course.id} className="hover:bg-ink/5 transition-colors">
                          <td className="px-3 md:px-4 py-2.5">
                            <Link to={`/trainer/courses/${course.id}`} className="text-xs md:text-sm text-zinc-200 hover:text-zinc-200 transition-colors font-medium truncate max-w-[150px] block">
                              {course.title}
                            </Link>
                          </td>
                          <td className="px-3 md:px-4 py-2.5">
                            <Badge className={`${statusColors[course.status]} text-[9px] md:text-[10px]`}>{course.status.replace('_', ' ')}</Badge>
                          </td>
                          <td className="px-3 md:px-4 py-2.5 text-xs text-zinc-200/60">{enrollCount}</td>
                          <td className="px-3 md:px-4 py-2.5 text-xs text-zinc-200/60 capitalize">{course.course_type}</td>
                          <td className="px-3 md:px-4 py-2.5 text-[10px] md:text-xs text-zinc-200/50">{new Date(course.created_at).toLocaleDateString()}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeUp} className="bg-[#070E20]/90 border border-cyan-500/30 rounded-2xl overflow-hidden">
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-cyan-500/30">
              <h3 className="text-sm font-semibold text-zinc-200">Recent Activity</h3>
            </div>
            {activities.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-zinc-200/50 text-sm">No recent activity.</p>
              </div>
            ) : (
              <div className="divide-y divide-ink/10">
                {activities.slice(0, 8).map(a => (
                  <div key={a.id} className="px-4 md:px-6 py-2.5 md:py-3">
                    <p className="text-xs text-zinc-200 truncate">{a.action}</p>
                    <p className="text-[10px] text-zinc-200/40 mt-0.5">{new Date(a.created_at).toLocaleString()}</p>
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
