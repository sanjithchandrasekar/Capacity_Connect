import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  Clock, User, ArrowLeft, Loader2, Layers, LogIn, GraduationCap,
  Globe, Mail, BookOpen, CheckCircle2, Award, Video, FileText,
  Calendar, Target, ChevronDown, ChevronUp, Play, Sparkles, HelpCircle,
  Shield, Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'

function LinkedinIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  )
}

function GithubIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

function formatDurationDisplay(minutes?: number | null) {
  if (!minutes || minutes <= 0) return 'Self-paced'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m (${minutes} mins)`
  if (h > 0) return `${h} hours (${minutes} mins)`
  return `${m} minutes`
}

export function PublicCourseDetails() {
  const { courseId } = useParams<{ courseId: string }>()
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())

  const toggleModule = (id: string) => {
    setOpenModules(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const { data: course, isLoading } = useQuery({
    queryKey: ['public_course_full', courseId],
    queryFn: async () => {
      const { data: courseData, error } = await supabase
        .from('courses')
        .select(`
          *,
          trainer:trainers!courses_trainer_id_fkey(full_name, department, bio, qualifications, study_details, work_experience, years_of_experience, expertise_areas, linkedin_url, website_url, github_url, email)
        `)
        .eq('id', courseId!)
        .eq('status', 'published')
        .single() as any

      if (error) throw error

      let modulesList = (courseData.modules && Array.isArray(courseData.modules) && courseData.modules.length > 0)
        ? courseData.modules
        : []

      if (modulesList.length === 0) {
        try {
          const { data: cmData } = await (supabase as any)
            .from('course_modules')
            .select('*')
            .eq('course_id', courseId!)
            .order('order_index')
          if (cmData && cmData.length > 0) {
            modulesList = cmData.map((m: any) => ({
              id: m.id,
              title: m.title,
              description: m.description,
              items: m.content_items || [],
              quiz_questions: m.quiz_questions || [],
              passing_score: m.passing_score ?? 80,
            }))
          }
        } catch {
          // ignore
        }
      }

      const { data: sessionsData } = await supabase
        .from('course_sessions')
        .select('*')
        .eq('course_id', courseId!)
        .order('order_index')

      return {
        ...courseData,
        modules: modulesList,
        sessions: sessionsData || [],
      }
    },
    enabled: !!courseId
  })

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
          <div className="flex items-center gap-4">
            <Link to="/courses" className="text-sm text-slate-300 hover:text-white transition-colors hidden sm:block">
              All Courses
            </Link>
            <Link to="/about" className="text-sm text-slate-300 hover:text-white transition-colors hidden sm:block">
              About
            </Link>
            <Link to="/login" className="text-sm font-semibold text-cyan-400 hover:text-white transition-colors flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-1.5 rounded-xl">
              <LogIn className="w-4 h-4" /> Login
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 flex-1 w-full space-y-8">
        <Link to="/courses" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-cyan-700 transition-colors font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to Course Catalog
        </Link>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
          </div>
        ) : !course ? (
          <div className="text-center p-12 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">Course Not Found</h3>
            <p className="text-slate-500 mt-2 text-sm">The course you are looking for does not exist or is not publicly available.</p>
          </div>
        ) : (
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-8">
            
            {/* 1. Hero Banner Card */}
            <div className="bg-gradient-to-r from-[#040814] via-[#07132a] to-[#0a1e3f] text-white border border-cyan-500/30 rounded-3xl overflow-hidden shadow-xl relative p-8 md:p-12">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 max-w-4xl">
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {course.department || 'MoES'}
                  </span>
                  <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-amber-300 uppercase tracking-wider border border-white/15">
                    {course.course_type || 'Standard'} Track
                  </span>
                  {course.has_certificate !== false && (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> Official Certification
                    </span>
                  )}
                </div>
                
                <h1 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
                  {course.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-300 mb-8 font-medium">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{course.trainer?.full_name || 'Assigned Instructor'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{formatDurationDisplay(course.duration_minutes)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>{course.modules?.length || 0} Modules</span>
                  </div>
                  {course.sessions?.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{course.sessions.length} Live Sessions</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <Link to="/login">
                    <Button 
                      className="bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm sm:text-base rounded-2xl px-8 py-6 shadow-xl shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Login to Enroll & Start Learning
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button
                      variant="outline"
                      className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold text-sm sm:text-base rounded-2xl px-6 py-6 transition-all cursor-pointer"
                    >
                      New Trainee Registration
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* 2. Main 2-Column Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column (8 cols): Description, Modules, Sessions, Learning Outcomes */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* About this Course Card */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-cyan-600" /> About this Course
                  </h2>
                  <div className="text-slate-700 leading-relaxed text-sm whitespace-pre-line">
                    {course.description || 'This course offers comprehensive, competency-aligned training designed to enhance operational and scientific skills across MoES divisions.'}
                  </div>
                </div>

                {/* Course Outline & Roadmap Section */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-cyan-600" /> Course Outline & Roadmap
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Structured curriculum with video lessons, study materials, and interactive quizzes.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-cyan-800 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-200 self-start sm:self-auto">
                      {course.modules?.length || 0} Learning Modules
                    </span>
                  </div>

                  {course.modules && course.modules.length > 0 ? (
                    <div className="space-y-4">
                      {course.modules.map((mod: any, index: number) => {
                        const isOpen = openModules.has(mod.id || String(index))
                        const items = mod.items || mod.content_items || []
                        const quizQuestions = mod.quiz_questions || []
                        const videoCount = items.filter((i: any) => i.type === 'video').length
                        const notesCount = items.filter((i: any) => i.type === 'notes' || i.type === 'pdf' || i.type === 'doc').length
                        const quizCount = quizQuestions.length + items.filter((i: any) => i.type === 'quiz').length

                        return (
                          <div
                            key={mod.id || index}
                            className="border border-slate-200/90 rounded-2xl overflow-hidden hover:border-cyan-300 transition-colors bg-slate-50/40"
                          >
                            <button
                              onClick={() => toggleModule(mod.id || String(index))}
                              className="w-full p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              <div className="flex items-start gap-3.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white font-extrabold text-xs shadow-xs shrink-0 mt-0.5 sm:mt-0">
                                  {index + 1}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                                    {mod.title || `Module ${index + 1}`}
                                  </h3>
                                  {mod.description && (
                                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                                      {mod.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2 font-medium flex-wrap">
                                    {videoCount > 0 && (
                                      <span className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                                        <Video className="w-3 h-3" /> {videoCount} Video{videoCount > 1 ? 's' : ''}
                                      </span>
                                    )}
                                    {notesCount > 0 && (
                                      <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                        <FileText className="w-3 h-3" /> {notesCount} Note{notesCount > 1 ? 's' : ''}
                                      </span>
                                    )}
                                    {quizCount > 0 && (
                                      <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                                        <HelpCircle className="w-3 h-3" /> {quizCount} Quiz Question{quizCount > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 text-slate-400 p-1">
                                {isOpen ? <ChevronUp className="w-5 h-5 text-cyan-600" /> : <ChevronDown className="w-5 h-5" />}
                              </div>
                            </button>

                            <AnimatePresence>
                              {isOpen && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="border-t border-slate-200/80 bg-white p-4 sm:p-5 space-y-3"
                                >
                                  {mod.description && (
                                    <p className="text-xs text-slate-600 leading-relaxed pb-2 border-b border-slate-100">
                                      {mod.description}
                                    </p>
                                  )}

                                  <div className="space-y-2">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                                      Module Content & Activities
                                    </p>
                                    {items.length > 0 ? (
                                      items.map((it: any, itIdx: number) => (
                                        <div
                                          key={itIdx}
                                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs text-slate-700"
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            {it.type === 'video' ? (
                                              <Play className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                            ) : it.type === 'quiz' ? (
                                              <HelpCircle className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                            ) : (
                                              <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                            )}
                                            <span className="font-semibold truncate">{it.title || `Lesson ${itIdx + 1}`}</span>
                                          </div>
                                          <span className="text-[10px] text-slate-400 capitalize shrink-0 ml-2">
                                            {it.type || 'Lesson'}
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-xs text-slate-400 italic">Self-guided interactive lessons and quizzes included.</p>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                      <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-700">Course Curriculum In Progress</p>
                      <p className="text-xs text-slate-400 mt-0.5">The instructor is finalizing the interactive module items for this course.</p>
                    </div>
                  )}
                </div>

                {/* Live Sessions (if any) */}
                {course.sessions && course.sessions.length > 0 && (
                  <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-cyan-600" /> Scheduled Live Sessions
                    </h2>
                    <p className="text-xs text-slate-500 mb-5">
                      Real-time interactive webinars, radar demonstrations, and Q&A classes with the trainer.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {course.sessions.map((sess: any, sIdx: number) => (
                        <div key={sess.id || sIdx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 uppercase tracking-wide">
                              Session {sIdx + 1}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              {sess.session_date ? new Date(sess.session_date).toLocaleDateString() : 'TBA'}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{sess.title}</h4>
                          {sess.description && (
                            <p className="text-xs text-slate-500 line-clamp-2">{sess.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Right Column (4 cols): Course Summary & Trainer Details */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Course Fast Facts Card */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course Highlights</h3>
                  
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                      <span className="text-slate-500">Duration</span>
                      <span className="font-bold text-slate-900">{formatDurationDisplay(course.duration_minutes)}</span>
                    </div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                      <span className="text-slate-500">Curriculum Modules</span>
                      <span className="font-bold text-slate-900">{course.modules?.length || 0} Modules</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Digital Certificate</span>
                      <span className="font-bold text-cyan-700">Included</span>
                    </div>
                  </div>

                  <Link to="/login" className="block pt-2">
                    <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold rounded-2xl h-11 shadow-md shadow-cyan-600/20 cursor-pointer">
                      Enroll into Program
                    </Button>
                  </Link>
                </div>

                {/* Trainer Details Card */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Trainer Details</h3>
                  <div className="flex items-start gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-cyan-600/20 shrink-0">
                      {course.trainer?.full_name?.charAt(0) || 'T'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 leading-tight">{course.trainer?.full_name || 'Assigned Instructor'}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {course.trainer?.department || 'MoES Trainer'}
                        {course.trainer?.years_of_experience ? ` • ${course.trainer.years_of_experience} yrs exp` : ''}
                      </p>

                      {/* Trainer Social Links below name */}
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        <a
                          href={
                            course.trainer?.linkedin_url
                              ? (course.trainer.linkedin_url.startsWith('http') ? course.trainer.linkedin_url : `https://${course.trainer.linkedin_url}`)
                              : `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(course.trainer?.full_name || 'MoES Trainer')}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold transition-all shadow-2xs hover:scale-105"
                          title={course.trainer?.linkedin_url ? "LinkedIn Profile" : "Search LinkedIn Profile"}
                        >
                          <LinkedinIcon className="w-3.5 h-3.5" />
                          <span>LinkedIn</span>
                        </a>

                        <a
                          href={
                            course.trainer?.github_url
                              ? (course.trainer.github_url.startsWith('http') ? course.trainer.github_url : `https://${course.trainer.github_url}`)
                              : `https://github.com/search?q=${encodeURIComponent(course.trainer?.full_name || 'MoES')}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-[11px] font-bold transition-all shadow-2xs hover:scale-105"
                          title={course.trainer?.github_url ? "GitHub / Research Profile" : "Search GitHub Profile"}
                        >
                          <GithubIcon className="w-3.5 h-3.5" />
                          <span>GitHub</span>
                        </a>

                        <a
                          href={
                            course.trainer?.website_url
                              ? (course.trainer.website_url.startsWith('http') ? course.trainer.website_url : `https://${course.trainer.website_url}`)
                              : 'https://moes.gov.in'
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-all shadow-2xs hover:scale-105"
                          title="Official Website / Portal"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Website</span>
                        </a>

                        <a
                          href={`mailto:${course.trainer?.email || 'trainer@capacityconnect.in'}?subject=Regarding: ${encodeURIComponent(course.title || 'Course')}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 text-[11px] font-bold transition-all shadow-2xs hover:scale-105"
                          title="Email Instructor"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Email</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {course.trainer?.bio && (
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 mb-3">
                      <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider mb-1">
                        Professional Summary
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                        {course.trainer.bio}
                      </p>
                    </div>
                  )}

                  {course.trainer?.qualifications && (
                    <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-100">
                      <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                        Academic & Professional Qualifications
                      </p>
                      <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                        {course.trainer.qualifications}
                      </p>
                    </div>
                  )}

                  {course.trainer?.expertise_areas && course.trainer.expertise_areas.length > 0 && (
                    <div className="mt-3.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Expertise</p>
                      <div className="flex flex-wrap gap-1.5">
                        {course.trainer.expertise_areas.map((skill: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-[10px] font-semibold text-emerald-700">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>

          </motion.div>
        )}
      </main>
    </div>
  )
}
