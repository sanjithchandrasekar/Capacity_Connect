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
  draft: 'bg-slate-100 text-slate-700 border border-slate-200',
  pending_review: 'bg-amber-50 text-amber-700 border border-amber-200',
  published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  archived: 'bg-rose-50 text-rose-700 border border-rose-200',
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
    { label: 'Total Courses', value: totalCourses, icon: BookOpen, iconColor: 'text-cyan-600', iconBg: 'bg-cyan-50 border-cyan-200' },
    { label: 'Published', value: publishedCourses, icon: CheckCircle, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50 border-emerald-200' },
    { label: 'Pending Review', value: pendingReview, icon: Clock, iconColor: 'text-amber-600', iconBg: 'bg-amber-50 border-amber-200' },
    { label: 'Drafts', value: draftCourses, icon: FileText, iconColor: 'text-slate-600', iconBg: 'bg-slate-100 border-slate-200' },
    { label: 'Enrolled Trainees', value: totalEnrollments, icon: Users, iconColor: 'text-blue-600', iconBg: 'bg-blue-50 border-blue-200' },
    { label: 'Avg. Score', value: `${avgScore}%`, icon: TrendingUp, iconColor: 'text-purple-600', iconBg: 'bg-purple-50 border-purple-200' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: Target, iconColor: 'text-teal-600', iconBg: 'bg-teal-50 border-teal-200' },
    { label: 'Certificates', value: completedEnrollments, icon: Star, iconColor: 'text-yellow-600', iconBg: 'bg-yellow-50 border-yellow-200' },
  ]

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4 md:space-y-6 max-w-6xl">
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">Trainer Dashboard</h2>
            <p className="text-slate-500 text-sm mt-1">Welcome back, {user?.email?.split('@')[0]}</p>
          </div>
          <Link to="/trainer/courses/new">
            <Button className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold shadow-md shadow-cyan-600/20 w-full sm:w-auto">
              <PlusCircle className="w-4 h-4 mr-2" /> Create Course
            </Button>
          </Link>
        </motion.div>

        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {stats.map(s => (
            <div key={s.label} className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:border-slate-300 transition-all">
              <div className={`w-8 h-8 rounded-xl ${s.iconBg} border flex items-center justify-center mb-2.5`}>
                <s.icon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
              <div className="text-xl md:text-2xl font-black text-slate-900">{s.value}</div>
              <div className="text-xs font-semibold text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <motion.div variants={fadeUp} className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-4 md:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Recent Courses</h3>
              <Link to="/trainer/courses" className="text-xs font-semibold text-cyan-600 hover:text-cyan-700">View all</Link>
            </div>
            {courses.length === 0 ? (
              <div className="p-8 md:p-12 text-center">
                <p className="text-slate-400 mb-3 text-sm">No courses yet.</p>
                <Link to="/trainer/courses/new">
                  <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold">
                    <PlusCircle className="w-4 h-4 mr-2" /> Create First Course
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[450px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70">
                      {['Course', 'Status', 'Enrollments', 'Type', 'Created'].map(h => (
                        <th key={h} className="text-left text-xs text-slate-500 font-semibold px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {courses.slice(0, 5).map(course => {
                      const enrollCount = enrollments.filter(e => e.course_id === course.id).length
                      return (
                        <tr key={course.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <Link to={`/trainer/courses/${course.id}`} className="text-xs md:text-sm text-slate-900 hover:text-cyan-600 transition-colors font-semibold truncate max-w-[180px] block">
                              {course.title}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`${statusColors[course.status]} text-[10px] font-semibold`}>{course.status.replace('_', ' ')}</Badge>
                          </td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-600">{enrollCount}</td>
                          <td className="px-4 py-3 text-xs font-medium text-slate-600 capitalize">{course.course_type}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{new Date(course.created_at).toLocaleDateString()}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          <motion.div variants={fadeUp} className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-4 md:px-6 py-3.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
            </div>
            {activities.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-400 text-sm">No recent activity.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activities.slice(0, 8).map(a => (
                  <div key={a.id} className="px-4 md:px-6 py-3">
                    <p className="text-xs font-semibold text-slate-800 truncate">{a.action}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(a.created_at).toLocaleString()}</p>
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
