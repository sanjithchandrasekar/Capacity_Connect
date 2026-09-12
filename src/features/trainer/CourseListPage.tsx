import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Database } from '@/integrations/supabase/types'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Loader2, Edit3, Target, BarChart3 } from 'lucide-react'
import { Link } from 'react-router-dom'

type Course = Database['public']['Tables']['courses']['Row']

const statusColors: Record<string, string> = {
  draft: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  pending_review: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  published: 'bg-green-500/20 text-green-300 border border-green-500/30',
  rejected: 'bg-red-500/20 text-red-300 border border-red-500/30',
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  published: 'Published',
  rejected: 'Rejected',
}

export function CourseListPage() {
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCourses = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setCourses(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchCourses() }, [fetchCourses])

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-5xl mx-auto space-y-6">
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">My Courses</h2>
            <p className="text-slate-400 text-sm mt-1">{courses.length} course{courses.length !== 1 ? 's' : ''} total</p>
          </div>
          <Link to="/trainer/create">
            <Button className="bg-cyan-500 hover:bg-cyan-400 text-white">
              <Plus className="w-4 h-4 mr-2" /> New Course
            </Button>
          </Link>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>
        ) : courses.length === 0 ? (
          <motion.div variants={fadeUp}>
            <Card className="bg-white/[0.02] border-white/[0.06]">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-slate-400 mb-4">No courses yet.</p>
                <Link to="/trainer/create">
                  <Button className="bg-cyan-500 hover:bg-cyan-400 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Create Your First Course
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="space-y-3">
            {courses.map(course => (
              <div key={course.id} className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-white truncate">{course.title}</h3>
                      <Badge className={`shrink-0 text-[10px] ${statusColors[course.status]}`}>
                        {statusLabels[course.status]}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-2 mb-3">{course.description}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>{course.duration_minutes ?? 0}min</span>
                      <span>{course.course_type}</span>
                      <span>{new Date(course.created_at).toLocaleDateString()}</span>
                      {course.department && <span>{course.department}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link to={`/trainer/courses/${course.id}/edit`}>
                      <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/5">
                        <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                    </Link>
                    <Link to={`/trainer/courses/${course.id}/assessments`}>
                      <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/5">
                        <Target className="w-3.5 h-3.5 mr-1" /> Assess
                      </Button>
                    </Link>
                    <Link to={`/trainer/courses/${course.id}/performance`}>
                      <Button size="sm" variant="outline" className="border-white/10 text-white hover:bg-white/5">
                        <BarChart3 className="w-3.5 h-3.5 mr-1" /> Stats
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </TrainerLayout>
  )
}
