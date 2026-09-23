import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { DashboardShell } from '@/pages/Dashboards'
import { Compass, BookOpen, Clock, Search, BookMarked, User, ArrowRight, Sparkles, Filter, CheckCircle2 } from 'lucide-react'
import { Thumbnail } from '@/components/ui/Thumbnail'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }

const categories = ['All', 'Standard', 'Scenario']

export function TraineeCourseCatalog() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState('All')

  const { data: courses, isLoading } = useQuery({
    queryKey: ['published_courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          trainer:trainers!courses_trainer_id_fkey(full_name)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    }
  })

  const filteredCourses = React.useMemo(() => {
    if (!courses) return []
    let list = courses
    if (selectedCategory !== 'All') {
      list = list.filter((c: any) => c.course_type?.toLowerCase() === selectedCategory.toLowerCase())
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((course: any) =>
        course.title?.toLowerCase().includes(q) ||
        course.description?.toLowerCase().includes(q) ||
        course.course_type?.toLowerCase().includes(q) ||
        course.trainer?.full_name?.toLowerCase().includes(q)
      )
    }
    return list
  }, [courses, searchQuery, selectedCategory])

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
        {/* Header & Search Bar */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#070E20]/90/80 backdrop-blur-md p-6 rounded-3xl border border-cyan-500/30 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-orange-500" /> Catalog
              </span>
              <span className="text-xs text-zinc-200/50 font-medium">
                {filteredCourses.length} {filteredCourses.length === 1 ? 'Program' : 'Programs'} available
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-zinc-200 tracking-tight">Available Courses</h2>
            <p className="text-zinc-200/60 text-sm">Discover and enroll in high-impact MoES competency tracks.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-purple-600/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search courses, trainers..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-cyan-950/40 border border-cyan-500/30 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder-midnight/40 focus:outline-none focus:border-pink-500 focus:bg-[#070E20]/90 focus:ring-2 focus:ring-pink-500/20 transition-all shadow-sm"
              />
            </div>
          </div>
        </motion.div>

        {/* Category Pills */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md shadow-pink-500/25 scale-105'
                    : 'bg-[#070E20]/90 border border-cyan-500/30 text-zinc-200/70 hover:text-cyan-400 hover:bg-cyan-950/30'
                }`}
              >
                {cat === 'All' ? 'All Courses' : `${cat} Courses`}
              </button>
            )
          })}
        </motion.div>

        {/* Course Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-80 bg-purple-500/5 animate-pulse rounded-3xl border border-cyan-500/30" />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-16 text-center bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl shadow-sm">
            <div className="w-16 h-16 bg-cyan-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/30">
              <Compass className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-zinc-200 mb-1">{searchQuery ? 'No Matching Courses Found' : 'No Courses Available'}</h3>
            <p className="text-zinc-200/60 text-sm max-w-sm mx-auto">{searchQuery ? 'Try clearing your filters or searching for different keywords.' : 'Check back shortly for newly published training programs.'}</p>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course: any) => (
              <motion.div 
                key={course.id} 
                variants={fadeUp} 
                className="group flex flex-col bg-[#070E20]/90 hover:bg-gradient-to-b hover:from-white hover:to-purple-50/30 border border-cyan-500/30 hover:border-cyan-400/50 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 hover:-translate-y-1.5"
              >
                {/* Thumbnail Header */}
                <div className="h-44 relative overflow-hidden bg-purple-100">
                  <Thumbnail path={course.thumbnail_path} alt={course.title} type={course.course_type} />
                  
                  {/* Top Badges Overlay */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="bg-[#070E20]/90/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-cyan-300 uppercase tracking-wider border border-white/40 shadow-sm">
                      {course.course_type || 'Standard'}
                    </span>
                    <span className="bg-midnight/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium text-white flex items-center gap-1 shadow-sm">
                      <Clock className="w-3 h-3 text-orange-400" />
                      <span>{course.duration_minutes ? `${course.duration_minutes}m` : 'Self-paced'}</span>
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-purple-600 font-semibold mb-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-pink-500" />
                    <span>MoES Training Module</span>
                  </div>

                  <h3 className="text-lg font-bold text-zinc-200 mb-2 group-hover:text-cyan-400 transition-colors line-clamp-1">
                    {course.title}
                  </h3>
                  
                  <p className="text-xs text-zinc-200/60 mb-5 line-clamp-2 leading-relaxed flex-1">
                    {course.description || 'Comprehensive training module designed to enhance core competencies.'}
                  </p>
                  
                  {/* Instructor row */}
                  <div className="flex items-center justify-between pt-3 border-t border-cyan-500/30 text-xs text-zinc-200/70 mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {course.trainer?.full_name?.[0]?.toUpperCase() ?? 'T'}
                      </div>
                      <span className="truncate max-w-[130px] font-medium text-zinc-200/80">
                        {course.trainer?.full_name || 'Assigned Trainer'}
                      </span>
                    </div>
                    <span className="text-[11px] text-cyan-400 font-semibold bg-cyan-950/30 px-2 py-0.5 rounded-full border border-cyan-500/30">
                      Verified
                    </span>
                  </div>

                  {/* Action Button */}
                  <Link to={`/trainee/courses/${course.id}`} className="w-full">
                    <button className="w-full py-2.5 rounded-2xl bg-cyan-950/30 group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:via-pink-500 group-hover:to-orange-500 text-cyan-300 group-hover:text-white border border-cyan-500/30 group-hover:border-transparent text-sm font-semibold transition-all duration-300 shadow-none group-hover:shadow-md group-hover:shadow-cyan-500/10 flex items-center justify-center gap-1.5">
                      <span>View Details</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
