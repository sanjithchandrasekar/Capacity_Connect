import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { DashboardShell } from '@/pages/Dashboards'
import { Compass, BookOpen, Clock, Search, BookMarked, User } from 'lucide-react'
import { Thumbnail } from '@/components/ui/Thumbnail'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }

export function TraineeCourseCatalog() {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['published_courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          trainer:profiles!courses_trainer_id_fkey(full_name)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }
  })

  return (
    <DashboardShell
      title="Course Catalog"
      icon={Compass}
      navLinks={[
        { to: '/trainee', label: 'Overview', icon: BookMarked },
        { to: '/trainee/courses', label: 'Course Catalog', icon: Compass },
        { to: '/trainee/my-learning', label: 'My Learning', icon: BookOpen },
      ]}
    >
      <div className="max-w-6xl space-y-6">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink mb-1">Available Courses</h2>
            <p className="text-ink/60 text-sm">Discover and enroll in new training programs.</p>
          </div>
          
          <div className="relative w-64">
            <Search className="w-4 h-4 text-ink/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search courses..." 
              className="w-full bg-ink/5 border border-ink/10 rounded-xl pl-9 pr-4 py-2 text-sm text-ink placeholder-ink/40 focus:outline-none focus:border-ink/20 transition-colors"
            />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-[300px] bg-ink/5 animate-pulse rounded-2xl border border-ink/10" />
            ))}
          </div>
        ) : courses?.length === 0 ? (
          <div className="p-12 text-center bg-cream border border-ink/10 rounded-2xl">
            <div className="w-16 h-16 bg-ink/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Compass className="w-8 h-8 text-ink/40" />
            </div>
            <h3 className="text-lg font-medium text-ink mb-2">No Courses Available</h3>
            <p className="text-ink/60 text-sm">Check back later for new published courses.</p>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses?.map((course: any) => (
              <motion.div key={course.id} variants={fadeUp} className="group flex flex-col bg-cream hover:bg-ink/5 border border-ink/10 hover:border-ink/20 rounded-2xl overflow-hidden transition-all duration-300">
                {/* Thumbnail */}
                <div className="h-40 bg-ink/10 border-b border-ink/10 relative overflow-hidden">
                  <Thumbnail path={course.thumbnail_path} alt={course.title} className="opacity-80 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-3 left-3 bg-ink backdrop-blur-md px-2 py-1 rounded text-[10px] font-semibold text-cream uppercase tracking-wider border border-ink/10">
                    {course.course_type}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-ink mb-2 group-hover:text-ink transition-colors line-clamp-1">{course.title}</h3>
                  <p className="text-sm text-ink/60 mb-4 line-clamp-2 flex-1">{course.description || 'No description provided.'}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-ink/50 mb-5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{course.duration_minutes ? `${course.duration_minutes}m` : 'Self-paced'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[100px]">{course.trainer?.full_name || 'Unknown'}</span>
                    </div>
                  </div>

                  <Link to={`/trainee/courses/${course.id}`} className="w-full">
                    <button className="w-full py-2.5 rounded-xl bg-ink/5 hover:bg-ink border border-ink/10 hover:border-transparent text-sm font-medium text-ink hover:text-cream transition-all">
                      View Details
                    </button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </DashboardShell>
  )
}
