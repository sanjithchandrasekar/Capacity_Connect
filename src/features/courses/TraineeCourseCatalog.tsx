import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { DashboardShell } from '@/pages/Dashboards'
import { Compass, BookOpen, Clock, Search, BookMarked, User } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }

export function TraineeCourseCatalog() {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['published_courses'],
    queryFn: async () => {
      // Using inner join on profiles to get trainer name
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
            <h2 className="text-xl font-bold text-wheat mb-1">Available Courses</h2>
            <p className="text-wheat/70 text-sm">Discover and enroll in new training programs.</p>
          </div>
          
          {/* Simple search placeholder */}
          <div className="relative w-64">
            <Search className="w-4 h-4 text-wheat0 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search courses..." 
              className="w-full bg-wheat/5 border border-wheat/10 rounded-xl pl-9 pr-4 py-2 text-sm text-wheat placeholder-slate-500 focus:outline-none focus:border-wheat/20 transition-colors"
            />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-[300px] bg-wheat/5 animate-pulse rounded-2xl border border-wheat/10" />
            ))}
          </div>
        ) : courses?.length === 0 ? (
          <div className="p-12 text-center bg-white/3 border border-white/8 rounded-2xl">
            <div className="w-16 h-16 bg-wheat/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Compass className="w-8 h-8 text-wheat0" />
            </div>
            <h3 className="text-lg font-medium text-wheat mb-2">No Courses Available</h3>
            <p className="text-wheat/70 text-sm">Check back later for new published courses.</p>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses?.map((course: any) => (
              <motion.div key={course.id} variants={fadeUp} className="group flex flex-col bg-white/3 hover:bg-wheat/10 border border-wheat/10 hover:border-wheat/20 rounded-2xl overflow-hidden transition-all duration-300">
                {/* Thumbnail placeholder with gradient */}
                <div className={`h-40 bg-gradient-to-br from-feldgrau-dark to-feldgrau border-b border-wheat/10 relative overflow-hidden flex flex-col items-center justify-center`}>
                  {course.thumbnail_path ? (
                    <img src={course.thumbnail_path} alt={course.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:250px_250px] opacity-20" />
                      <BookOpen className="w-12 h-12 text-slate-600 mb-2" />
                    </>
                  )}
                  <div className="absolute top-3 left-3 bg-feldgrau backdrop-blur-md px-2 py-1 rounded text-[10px] font-semibold text-wheat uppercase tracking-wider border border-wheat/10">
                    {course.course_type}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-wheat mb-2 group-hover:text-wheat transition-colors line-clamp-1">{course.title}</h3>
                  <p className="text-sm text-wheat/70 mb-4 line-clamp-2 flex-1">{course.description || 'No description provided.'}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-wheat0 mb-5">
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
                    <button className="w-full py-2.5 rounded-xl bg-wheat/5 hover:bg-gradient-to-r hover:from-cyan-500 hover:to-blue-600 border border-wheat/10 hover:border-transparent text-sm font-medium text-wheat transition-all">
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
