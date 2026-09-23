import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { DashboardShell } from '@/pages/Dashboards'
import { Compass, BookOpen, Clock, Search, BookMarked, ArrowRight, Sparkles, FileCheck } from 'lucide-react'
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
        { to: '/trainee/assessments', label: 'Assessments', icon: FileCheck },
      ]}
    >
      <div className="max-w-6xl space-y-6">
        {/* Header & Search Bar (Midnight Dark Banner) */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#040814] via-[#07132a] to-[#0a1e3f] text-white p-6 rounded-3xl border border-cyan-500/30 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-white/15">
                <Sparkles className="w-3 h-3 text-amber-300" /> Catalog
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {filteredCourses.length} {filteredCourses.length === 1 ? 'Program' : 'Programs'} available
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Available Courses</h2>
            <p className="text-slate-300 text-sm">Discover and enroll in high-impact MoES competency tracks.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 relative z-10">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search courses, trainers..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-slate-900 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-xs"
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
                    ? 'bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 text-white shadow-md shadow-cyan-600/20 scale-105'
                    : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-xs'
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
              <div key={i} className="h-80 bg-white animate-pulse rounded-3xl border border-slate-200" />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-200 rounded-3xl shadow-sm">
            <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-200">
              <Compass className="w-8 h-8 text-cyan-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{searchQuery ? 'No Matching Courses Found' : 'No Courses Available'}</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto">{searchQuery ? 'Try clearing your filters or searching for different keywords.' : 'Check back shortly for newly published training programs.'}</p>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course: any) => (
              <motion.div 
                key={course.id} 
                variants={fadeUp} 
                className="group flex flex-col bg-white border border-slate-200/90 hover:border-cyan-300 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 hover:-translate-y-1.5"
              >
                {/* Thumbnail Header */}
                <div className="h-44 relative overflow-hidden bg-slate-100">
                  <Thumbnail path={course.thumbnail_path} alt={course.title} type={course.course_type} />
                  
                  {/* Top Badges Overlay */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider border border-white/20 shadow-sm">
                      {course.course_type || 'Standard'}
                    </span>
                    <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium text-white flex items-center gap-1 shadow-sm">
                      <Clock className="w-3 h-3 text-amber-400" />
                      <span>{course.duration_minutes ? `${course.duration_minutes}m` : 'Self-paced'}</span>
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-xs text-cyan-700 font-bold mb-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-cyan-500" />
                    <span>MoES Training Module</span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-cyan-600 transition-colors line-clamp-1">
                    {course.title}
                  </h3>
                  
                  <p className="text-xs text-slate-500 mb-5 line-clamp-2 leading-relaxed flex-1">
                    {course.description || 'Comprehensive training module designed to enhance core competencies.'}
                  </p>
                  
                  {/* Instructor row */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-600 mb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {course.trainer?.full_name?.[0]?.toUpperCase() ?? 'T'}
                      </div>
                      <span className="truncate max-w-[130px] font-medium text-slate-700">
                        {course.trainer?.full_name || 'Assigned Trainer'}
                      </span>
                    </div>
                    <span className="text-[11px] text-cyan-700 font-bold bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
                      Verified
                    </span>
                  </div>

                  {/* Action Button */}
                  <Link to={`/trainee/courses/${course.id}`} className="w-full">
                    <button className="w-full py-2.5 rounded-2xl bg-cyan-50 group-hover:bg-gradient-to-r group-hover:from-cyan-600 group-hover:via-sky-600 group-hover:to-blue-600 text-cyan-700 group-hover:text-white border border-cyan-200 group-hover:border-transparent text-sm font-bold transition-all duration-300 shadow-xs group-hover:shadow-md group-hover:shadow-cyan-600/20 flex items-center justify-center gap-1.5">
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
