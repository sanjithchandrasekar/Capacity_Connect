import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Database } from '@/integrations/supabase/types'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Loader2, Edit3, Target, BarChart3, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Thumbnail } from '@/components/ui/Thumbnail'

type Course = Database['public']['Tables']['courses']['Row']

const statusColors: Record<string, string> = {
  draft: 'bg-ink/10 text-ink/80 border border-ink/20',
  pending_review: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  published: 'bg-ink/10 text-ink/70 border border-ink/20',
  archived: 'bg-red-50 text-red-600 border border-red-200',
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  published: 'Published',
  archived: 'Archived',
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
      toast.error('Failed to load courses')
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
            <h2 className="text-2xl font-bold tracking-tight text-ink">My Courses</h2>
            <p className="text-ink/60 text-sm mt-1">{courses.length} course{courses.length !== 1 ? 's' : ''} total</p>
          </div>
          <Link to="/trainer/courses/new">
            <Button className="bg-ink hover:bg-ink/90 text-cream">
              <Plus className="w-4 h-4 mr-2" /> New Course
            </Button>
          </Link>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-ink" /></div>
        ) : courses.length === 0 ? (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border-ink/10">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-ink/60 mb-4">No courses yet.</p>
                <Link to="/trainer/courses/new">
            <Button className="bg-ink hover:bg-ink/90 text-cream">
                    <Plus className="w-4 h-4 mr-2" /> Create Your First Course
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="space-y-3">
            {courses.map(course => (
              <div key={course.id} className="p-5 rounded-xl bg-cream border border-ink/10 hover:border-ink/20 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Thumbnail */}
                  <div className="w-full sm:w-32 h-24 rounded-lg bg-ink/10 border border-ink/10 overflow-hidden shrink-0">
                    <Thumbnail path={course.thumbnail_path} alt={course.title} fallbackIcon={<BookOpen className="w-8 h-8 text-ink/30" />} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Link to={`/trainer/courses/${course.id}`} className="hover:underline">
                        <h3 className="text-base font-semibold text-ink truncate">{course.title}</h3>
                      </Link>
                      <Badge className={`shrink-0 text-[10px] ${statusColors[course.status] ?? statusColors.draft}`}>
                        {statusLabels[course.status] ?? course.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-ink/60 line-clamp-2 mb-3">{course.description}</p>
                    <div className="flex items-center gap-4 text-xs text-ink/50">
                      <span>{course.duration_minutes ?? 0}min</span>
                      <span>{course.course_type}</span>
                      <span>{new Date(course.created_at).toLocaleDateString()}</span>
                      {course.department && <span>{course.department}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link to={`/trainer/courses/${course.id}`}>
                      <Button size="sm" variant="outline" className="border-ink/20 text-ink hover:bg-ink/5">
                        <BookOpen className="w-3.5 h-3.5 mr-1" /> Manage
                      </Button>
                    </Link>
                    <Link to={`/trainer/courses/${course.id}/edit`}>
                      <Button size="sm" variant="outline" className="border-ink/20 text-ink hover:bg-ink/5">
                        <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                    </Link>
                    <Link to={`/trainer/courses/${course.id}/assessments`}>
                      <Button size="sm" variant="outline" className="border-ink/20 text-ink hover:bg-ink/5">
                        <Target className="w-3.5 h-3.5 mr-1" /> Assess
                      </Button>
                    </Link>
                    <Link to={`/trainer/courses/${course.id}/performance`}>
                      <Button size="sm" variant="outline" className="border-ink/20 text-ink hover:bg-ink/5">
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
