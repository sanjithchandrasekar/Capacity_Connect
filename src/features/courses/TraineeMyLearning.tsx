import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShell } from '@/pages/Dashboards'
import { BookOpen, Compass, BookMarked, PlayCircle, CheckCircle2, Clock } from 'lucide-react'
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-700 bg-green-50 border-green-200'
      case 'in_progress': return 'text-ink bg-ink/5 border-ink/10'
      case 'withdrawn': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-ink/60 bg-ink/5 border-ink/10'
    }
  }

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
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-ink mb-1">My Learning Journey</h2>
            <p className="text-ink/60 text-sm">Track your progress and continue where you left off.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-ink/5 border border-ink/10 rounded-xl">
              <span className="text-sm text-ink/60">In Progress: </span>
              <span className="text-ink font-bold">{inProgressCount}</span>
            </div>
            <div className="px-4 py-2 bg-ink/5 border border-ink/10 rounded-xl">
              <span className="text-sm text-ink/60">Completed: </span>
              <span className="text-ink font-bold">{completedCount}</span>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-ink/5 animate-pulse rounded-2xl border border-ink/10" />
            ))}
          </div>
        ) : enrollments?.length === 0 ? (
          <div className="p-12 text-center bg-cream border border-ink/10 rounded-2xl">
            <div className="w-16 h-16 bg-ink/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-ink/40" />
            </div>
            <h3 className="text-lg font-medium text-ink mb-2">Not enrolled in any courses yet</h3>
            <p className="text-ink/60 text-sm mb-6">Explore the catalog to find a course and start learning.</p>
            <Link to="/trainee/courses">
              <button className="px-6 py-2.5 rounded-xl bg-ink hover:bg-ink/90 text-cream font-medium transition-all">
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
                className="group bg-cream hover:bg-ink/5 border border-ink/10 hover:border-ink/20 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-6 transition-all duration-300"
              >
                {/* Thumbnail */}
                <div className="w-full md:w-48 h-32 md:h-24 rounded-xl bg-ink/10 border border-ink/10 relative overflow-hidden shrink-0">
                  <Thumbnail path={enrollment.course?.thumbnail_path || null} alt="Course" className="opacity-80" fallbackIcon={<PlayCircle className="w-8 h-8 text-ink/30" />} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusColor(enrollment.status)}`}>
                      {enrollment.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-ink/50 uppercase tracking-wider">{enrollment.course?.course_type}</span>
                  </div>
                  <h3 className="text-lg font-bold text-ink mb-2 truncate group-hover:text-ink transition-colors">
                    {enrollment.course?.title}
                  </h3>
                  
                  {/* Progress Bar */}
                  <div className="w-full max-w-md">
                    <div className="flex justify-between text-xs text-ink/60 mb-1">
                      <span>Progress</span>
                      <span className="text-ink">{enrollment.progress_percent}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-ink/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-ink rounded-full transition-all duration-500"
                        style={{ width: `${enrollment.progress_percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="shrink-0 flex items-center gap-3 pt-4 md:pt-0 md:pl-4 md:border-l border-ink/10">
                  {enrollment.status === 'completed' ? (
                    <Link to={`/trainee/courses/${enrollment.course?.id}`}>
                      <button className="px-5 py-2 rounded-xl bg-ink/5 hover:bg-ink/10 border border-ink/10 text-sm font-medium text-ink transition-all flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" /> Review
                      </button>
                    </Link>
                  ) : (
                    <Link to={`/trainee/courses/${enrollment.course?.id}`}>
                      <button className="px-5 py-2 rounded-xl bg-ink hover:bg-ink/90 text-cream font-medium text-sm transition-all flex items-center gap-2">
                        <PlayCircle className="w-4 h-4" /> Continue
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
