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
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Thumbnail } from '@/components/ui/Thumbnail'

type Course = Database['public']['Tables']['courses']['Row']

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border border-slate-200',
  pending_review: 'bg-amber-50 text-amber-700 border border-amber-200',
  published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  archived: 'bg-rose-50 text-rose-700 border border-rose-200',
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  published: 'Published',
  archived: 'Archived',
}

export function CourseListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
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
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">My Courses</h2>
            <p className="text-slate-500 text-sm mt-1">{courses.length} course{courses.length !== 1 ? 's' : ''} total</p>
          </div>
          <Link to="/trainer/courses/new">
            <Button className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold shadow-md shadow-cyan-600/20">
              <Plus className="w-4 h-4 mr-2" /> New Course
            </Button>
          </Link>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
          </div>
        ) : courses.length === 0 ? (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border border-slate-200/90 shadow-xs">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-slate-500 mb-4 font-medium">No courses created yet.</p>
                <Link to="/trainer/courses/new">
                  <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold">
                    <Plus className="w-4 h-4 mr-2" /> Create Your First Course
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="space-y-3.5">
            {courses.map(course => (
              <div key={course.id} className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 shadow-xs transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Thumbnail */}
                  <div className="w-full sm:w-36 h-24 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    <Thumbnail path={course.thumbnail_path} alt={course.title} fallbackIcon={<BookOpen className="w-8 h-8 text-slate-400" />} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <Link to={`/trainer/courses/${course.id}`} className="hover:text-cyan-600 min-w-0 flex-1 transition-colors">
                        <h3 className="text-base font-bold text-slate-900 truncate">{course.title}</h3>
                      </Link>
                      <Badge className={`shrink-0 text-[10px] font-semibold ${statusColors[course.status] ?? statusColors.draft}`}>
                        {statusLabels[course.status] ?? course.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">{course.description}</p>
                    <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                      <span>{course.duration_minutes ?? 0} mins</span>
                      <span>&bull;</span>
                      <span className="capitalize">{course.course_type}</span>
                      <span>&bull;</span>
                      <span>{new Date(course.created_at).toLocaleDateString()}</span>
                      {course.department && (
                        <>
                          <span>&bull;</span>
                          <span>{course.department}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0 sm:self-center">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                      disabled={course.status === 'pending_review'}
                      onClick={() => navigate(`/trainer/courses/${course.id}`)}
                    >
                      <BookOpen className="w-3.5 h-3.5 mr-1 text-cyan-600" /> Manage
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                      disabled={course.status === 'pending_review'}
                      onClick={() => navigate(`/trainer/courses/${course.id}/edit`)}
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1 text-slate-600" /> Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                      disabled={course.status === 'pending_review'}
                      onClick={() => navigate(`/trainer/courses/${course.id}/assessments`)}
                    >
                      <Target className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Assess
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                      disabled={course.status === 'pending_review'}
                      onClick={() => navigate(`/trainer/courses/${course.id}/performance`)}
                    >
                      <BarChart3 className="w-3.5 h-3.5 mr-1 text-blue-600" /> Stats
                    </Button>
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
