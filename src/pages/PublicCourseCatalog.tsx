import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Compass, Clock, Search, ArrowRight, Sparkles, LogIn, Play, CheckCircle2, User, BookOpen } from 'lucide-react'
import { Thumbnail } from '@/components/ui/Thumbnail'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }

const categories = ['All', 'Standard', 'Scenario']

function formatDurationDisplay(minutes?: number | null) {
  if (!minutes || minutes <= 0) return 'Self-paced'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

export function PublicCourseCatalog() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState('All')

  const { data: courses, isLoading } = useQuery({
    queryKey: ['public_published_courses'],
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

  // If user is logged in, query their enrollments to show accurate status & CTAs
  const { data: userEnrollments = [] } = useQuery({
    queryKey: ['public-catalog-user-enrollments', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data } = await supabase
        .from('enrollments')
        .select('id, course_id, status, progress_percent')
        .eq('user_id', user.id)
      return data || []
    },
    enabled: !!user?.id,
  })

  const enrollmentMap = React.useMemo(() => {
    const map = new Map<string, any>()
    userEnrollments.forEach((e: any) => {
      map.set(e.course_id, e)
    })
    return map
  }, [userEnrollments])

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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans flex flex-col">
      {/* Dark Shell Topbar */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#040814] text-white">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="Capacity Connect" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="text-white">Capacity</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-400"> Connect</span>
            </span>
          </Link>
          {user ? (
            <Link to="/trainee" className="text-sm font-semibold text-cyan-400 hover:text-white transition-colors flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-1.5 rounded-xl">
              <BookOpen className="w-4 h-4" /> Go to Dashboard
            </Link>
          ) : (
            <Link to="/login" className="text-sm font-semibold text-cyan-400 hover:text-white transition-colors flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-1.5 rounded-xl">
              <LogIn className="w-4 h-4" /> Login
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8 flex-1 w-full">
        {/* Header & Search Bar in Midnight Dark Banner */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-[#040814] via-[#07132a] to-[#0a1e3f] text-white p-8 rounded-3xl border border-cyan-500/30 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-white/15">
                <Sparkles className="w-3 h-3 text-amber-300" /> Catalog
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Explore Courses</h1>
            <p className="text-slate-300 text-sm max-w-md">Discover high-impact MoES competency tracks available on the Capacity Connect platform.</p>
          </div>
          
          <div className="relative w-full md:w-80 shrink-0 z-10">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search courses, trainers..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-slate-900 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-xs"
            />
          </div>
        </motion.div>

        {/* Category Pills */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex items-center gap-2.5 overflow-x-auto py-2 px-1 scrollbar-none">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 text-white shadow-md shadow-cyan-600/30 ring-2 ring-cyan-500/20'
                    : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-xs hover:border-slate-300'
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
            {filteredCourses.map((course: any) => {
              const enrollment = enrollmentMap.get(course.id)
              const isCompleted = enrollment?.status === 'completed' || (enrollment?.progress_percent ?? 0) === 100
              const isEnrolled = enrollment && (enrollment.status === 'enrolled' || enrollment.status === 'in_progress') && !isCompleted
              const isPending = enrollment?.status === 'pending'
              const isRejected = enrollment?.status === 'rejected'

              let targetUrl = `/courses/${course.id}`
              if (user && isEnrolled) {
                targetUrl = `/trainee/learn/${course.id}`
              } else if (user) {
                targetUrl = `/trainee/courses/${course.id}`
              }

              return (
                <motion.div 
                  key={course.id} 
                  variants={fadeUp} 
                  className={`group flex flex-col bg-white border rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 hover:-translate-y-1.5 ${
                    isCompleted
                      ? 'border-emerald-200/90 hover:border-emerald-400'
                      : isEnrolled
                      ? 'border-cyan-300 hover:border-cyan-500'
                      : isPending
                      ? 'border-amber-200/90 hover:border-amber-400'
                      : 'border-slate-200/90 hover:border-cyan-300'
                  }`}
                >
                  {/* Thumbnail Header */}
                  <div className="h-44 relative overflow-hidden bg-slate-100">
                    <Thumbnail path={course.thumbnail_path} alt={course.title} type={course.course_type} />
                    
                    {/* Top Badges Overlay */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none gap-2">
                      <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider border border-white/20 shadow-sm shrink-0">
                        {course.course_type || 'Standard'}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isCompleted ? (
                          <span className="bg-emerald-600/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-extrabold text-white flex items-center gap-1 shadow-sm">
                            <CheckCircle2 className="w-3 h-3 text-white" /> Completed
                          </span>
                        ) : isEnrolled ? (
                          <span className="bg-gradient-to-r from-cyan-600 to-blue-600 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-extrabold text-white flex items-center gap-1 shadow-sm">
                            <Play className="w-2.5 h-2.5 fill-current text-white" /> {enrollment.progress_percent ? `${enrollment.progress_percent}%` : 'Enrolled'}
                          </span>
                        ) : isPending ? (
                          <span className="bg-amber-600/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-extrabold text-white flex items-center gap-1 shadow-sm">
                            <Clock className="w-3 h-3 text-white" /> Pending
                          </span>
                        ) : isRejected ? (
                          <span className="bg-rose-600/95 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-extrabold text-white flex items-center gap-1 shadow-sm">
                            Declined
                          </span>
                        ) : (
                          <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium text-white flex items-center gap-1 shadow-sm">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>{formatDurationDisplay(course.duration_minutes)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 text-xs text-cyan-700 font-bold mb-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
                      <span className="truncate">{course.department || 'MoES'} • {course.course_type || 'Standard'} Track</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-cyan-600 transition-colors line-clamp-2 min-h-[3rem] leading-snug">
                      {course.title}
                    </h3>
                    
                    <p className="text-xs text-slate-500 mb-5 line-clamp-2 leading-relaxed flex-1">
                      {course.description || 'Comprehensive training module designed to enhance core competencies.'}
                    </p>
                    
                    {/* Instructor row */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-600 mb-5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {course.trainer?.full_name?.[0]?.toUpperCase() ?? 'T'}
                        </div>
                        <span className="truncate max-w-[140px] font-medium text-slate-700">
                          {course.trainer?.full_name || 'Assigned Trainer'}
                        </span>
                      </div>
                      <span className="text-[11px] text-cyan-700 font-bold bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200 shrink-0">
                        {isCompleted ? 'Completed' : isEnrolled ? 'In Progress' : isPending ? 'Pending' : 'Open Access'}
                      </span>
                    </div>

                    {/* Action Button */}
                    <Link to={targetUrl} className="w-full mt-auto">
                      {isCompleted ? (
                        <button className="w-full py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Review Course (Completed)</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : isEnrolled ? (
                        <button className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white text-sm font-extrabold transition-all shadow-md shadow-cyan-600/25 flex items-center justify-center gap-1.5 hover:scale-[1.01] cursor-pointer">
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{enrollment.progress_percent && enrollment.progress_percent > 0 ? `Resume Learning (${enrollment.progress_percent}%)` : 'Start Learning'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : isPending ? (
                        <button className="w-full py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>Approval Pending ⏳</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-cyan-50 to-blue-50 group-hover:from-cyan-600 group-hover:via-sky-600 group-hover:to-blue-600 text-cyan-800 group-hover:text-white border border-cyan-200 group-hover:border-transparent text-sm font-bold transition-all duration-300 shadow-xs group-hover:shadow-md group-hover:shadow-cyan-600/20 flex items-center justify-center gap-1.5 cursor-pointer">
                          <span>Enroll Now</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      )}
                    </Link>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </main>
    </div>
  )
}
