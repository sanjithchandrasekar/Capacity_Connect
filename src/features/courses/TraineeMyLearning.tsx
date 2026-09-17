import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShell } from '@/pages/Dashboards'
import { BookOpen, Compass, BookMarked, PlayCircle, CheckCircle2, Clock, Sparkles, ArrowRight } from 'lucide-react'
import { Thumbnail } from '@/components/ui/Thumbnail'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }

export function TraineeMyLearning() {
  const { profile } = useAuth()

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['my_learning', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          status,
          progress_percent,
          enrolled_at,
          course:courses!enrollments_course_id_fkey(
            id,
            title,
            course_type,
            thumbnail_path,
            duration_minutes,
            passing_score
          )
        `)
        .eq('user_id', profile!.id)
        .order('enrolled_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!profile?.id
  })

  const inProgressCount = enrollments?.filter(e => e.status === 'in_progress' || e.status === 'enrolled').length || 0
  const completedCount = enrollments?.filter(e => e.status === 'completed').length || 0

  return (
    <DashboardShell
      title="My Learning"
      icon={BookOpen}
      navLinks={[
        { to: '/trainee', label: 'Overview', icon: BookMarked },
        { to: '/trainee/courses', label: 'Course Catalog', icon: Compass },
        { to: '/trainee/my-learning', label: 'My Learning', icon: BookOpen },
      ]}
    >
      <div className="max-w-6xl space-y-6">
        {/* Header */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-purple-500/15 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-pink-500" /> Learning Roadmap
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-midnight tracking-tight">My Learning Journey</h2>
            <p className="text-midnight/60 text-sm">Track your progress and continue where you left off.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-purple-50/70 border border-purple-200/60 rounded-2xl">
              <span className="text-xs text-midnight/60 font-medium">In Progress: </span>
              <span className="text-sm font-extrabold text-purple-700">{inProgressCount}</span>
            </div>
            <div className="px-4 py-2 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl">
              <span className="text-xs text-emerald-800 font-medium">Completed: </span>
              <span className="text-sm font-extrabold text-emerald-700">{completedCount}</span>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-purple-500/5 animate-pulse rounded-3xl border border-purple-500/10" />
            ))}
          </div>
        ) : enrollments?.length === 0 ? (
          <div className="p-16 text-center bg-white border border-purple-500/15 rounded-3xl shadow-sm">
            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-100">
              <BookOpen className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-midnight mb-1">Not enrolled in any courses yet</h3>
            <p className="text-midnight/60 text-sm mb-6 max-w-sm mx-auto">Explore the catalog to find a course and kickstart your learning journey.</p>
            <Link to="/trainee/courses">
              <button className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white font-bold text-sm shadow-md shadow-pink-500/25 hover:scale-105 transition-all">
                Browse Courses
              </button>
            </Link>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
            {enrollments?.map((enrollment: any) => (
              <motion.div 
                key={enrollment.id} 
                variants={fadeUp} 
                className="group bg-white hover:bg-purple-50/30 border border-purple-500/15 hover:border-pink-500/30 rounded-3xl p-5 flex flex-col md:flex-row md:items-center gap-6 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-0.5"
              >
                {/* Thumbnail */}
                <div className="w-full md:w-48 h-32 md:h-28 rounded-2xl bg-purple-100 border border-purple-200/60 relative overflow-hidden shrink-0">
                  <Thumbnail path={enrollment.course?.thumbnail_path || null} alt={enrollment.course?.title || 'Course'} type={enrollment.course?.course_type} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      enrollment.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}>
                      {enrollment.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-midnight/50 font-semibold uppercase tracking-wider">{enrollment.course?.course_type || 'Standard'}</span>
                    {enrollment.course?.duration_minutes && (
                      <span className="text-xs text-midnight/40 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-orange-400" /> {enrollment.course.duration_minutes}m
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-midnight mb-3 truncate group-hover:text-purple-700 transition-colors">
                    {enrollment.course?.title}
                  </h3>
                  
                  {/* Progress Bar */}
                  <div className="w-full max-w-md">
                    <div className="flex justify-between text-xs font-semibold text-midnight/60 mb-1.5">
                      <span>Progress</span>
                      <span className="text-purple-700 font-bold">{enrollment.progress_percent}%</span>
                    </div>
                    <div className="h-2 w-full bg-purple-100/60 rounded-full overflow-hidden p-0.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${
                          enrollment.status === 'completed'
                            ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                            : 'bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500'
                        }`}
                        style={{ width: `${enrollment.progress_percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-3 pt-4 md:pt-0 md:pl-4 md:border-l border-purple-500/10">
                  {enrollment.status === 'completed' ? (
                    <Link to={`/trainee/courses/${enrollment.course?.id}`}>
                      <button className="px-5 py-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-bold text-purple-900 transition-all flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Review Course
                      </button>
                    </Link>
                  ) : (
                    <Link to={`/trainee/courses/${enrollment.course?.id}`}>
                      <button className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 hover:opacity-95 text-white font-bold text-xs shadow-md shadow-pink-500/25 hover:shadow-lg hover:shadow-pink-500/40 hover:scale-105 transition-all flex items-center gap-2">
                        <PlayCircle className="w-4 h-4" /> Continue Lesson
                      </button>
                    </Link>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </DashboardShell>
  )
}
