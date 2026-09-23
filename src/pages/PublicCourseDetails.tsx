import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { Clock, User, ArrowLeft, Loader2, Layers, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export function PublicCourseDetails() {
  const { courseId } = useParams<{ courseId: string }>()

  const { data: course, isLoading } = useQuery({
    queryKey: ['public_course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          trainer:trainers!courses_trainer_id_fkey(full_name, department)
        `)
        .eq('id', courseId!)
        .eq('status', 'published')
        .single() as any

      if (error) throw error
      return data
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
          <Link to="/login" className="text-sm font-semibold text-cyan-400 hover:text-white transition-colors flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-1.5 rounded-xl">
            <LogIn className="w-4 h-4" /> Login
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 flex-1 w-full">
        <Link to="/courses" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-cyan-700 transition-colors mb-6 font-semibold">
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
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6">
            
            {/* Header Card (Midnight Dark Aesthetic) */}
            <div className="bg-gradient-to-r from-[#040814] via-[#07132a] to-[#0a1e3f] text-white border border-cyan-500/30 rounded-3xl overflow-hidden shadow-xl relative p-8 md:p-12">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10">
                <div className="inline-block bg-white/10 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold text-amber-300 uppercase tracking-wider border border-white/15 mb-6">
                  {course.course_type} Program
                </div>
                
                <h1 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">{course.title}</h1>
                
                <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300 mb-8 font-medium">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-400" />
                    <span>{course.trainer?.full_name || 'Assigned Instructor'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>{course.duration_minutes ? `${course.duration_minutes} minutes` : 'Self-paced'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-400" />
                    <span>Passing Score: {course.passing_score}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Link to="/login">
                    <Button 
                      className="bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-extrabold text-base rounded-2xl px-8 py-6 shadow-xl shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all"
                    >
                      Login to Enroll
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Description & Details in Elevated White Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-8 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-4">About this course</h2>
                <div className="text-slate-700 leading-relaxed space-y-4 whitespace-pre-wrap text-sm">
                  {course.description || 'No detailed description provided for this course.'}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Trainer Details</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-cyan-600/20">
                      {course.trainer?.full_name?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{course.trainer?.full_name || 'Assigned Instructor'}</p>
                      <p className="text-xs text-slate-500 font-medium">{course.trainer?.department || 'Trainer'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </main>
    </div>
  )
}
