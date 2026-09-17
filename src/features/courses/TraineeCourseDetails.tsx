import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShell } from '@/pages/Dashboards'
import { Compass, BookOpen, Clock, User, ArrowLeft, CheckCircle2, Loader2, BookMarked, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export function TraineeCourseDetails() {
  const { courseId } = useParams<{ courseId: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: course, isLoading: isCourseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          trainer:profiles!courses_trainer_id_fkey(full_name, department)
        `)
        .eq('id', courseId!)
        .single() as any

      if (error) throw error
      return data
    },
    enabled: !!courseId
  })

  const { data: enrollment, isLoading: isEnrollmentLoading } = useQuery({
    queryKey: ['enrollment', courseId, profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', courseId!)
        .eq('user_id', profile!.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error
      return data
    },
    enabled: !!courseId && !!profile?.id
  })

  const enrollMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .insert({
          course_id: courseId!,
          user_id: profile!.id,
          status: 'enrolled',
          progress_percent: 0
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment', courseId, profile?.id] })
      toast.success('Successfully enrolled in course!')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to enroll')
    }
  })

  const isLoading = isCourseLoading || isEnrollmentLoading

  return (
    <DashboardShell
      title="Course Details"
      icon={Compass}
      navLinks={[
        { to: '/trainee', label: 'Overview', icon: BookMarked },
        { to: '/trainee/courses', label: 'Course Catalog', icon: Compass },
        { to: '/trainee/my-learning', label: 'My Learning', icon: BookOpen },
      ]}
    >
      <div className="max-w-4xl">
        <Link to="/trainee/courses" className="inline-flex items-center gap-2 text-sm text-midnight/60 hover:text-purple-700 transition-colors mb-6 font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to Course Catalog
        </Link>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : !course ? (
          <div className="text-center p-12 bg-white border border-purple-500/15 rounded-3xl shadow-sm">
            <h3 className="text-xl font-bold text-midnight">Course Not Found</h3>
            <p className="text-midnight/50 mt-2 text-sm">The course you are looking for does not exist or has been removed.</p>
          </div>
        ) : (
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6">
            
            {/* Header Card */}
            <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-midnight text-white border border-purple-500/20 rounded-3xl overflow-hidden shadow-xl shadow-purple-900/20 relative p-8 md:p-12">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-pink-500/20 to-orange-500/20 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10">
                <div className="inline-block bg-white/10 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-bold text-orange-300 uppercase tracking-wider border border-white/15 mb-6">
                  {course.course_type} Program
                </div>
                
                <h1 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">{course.title}</h1>
                
                <div className="flex flex-wrap items-center gap-6 text-sm text-white/80 mb-8 font-medium">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-pink-400" />
                    <span>{course.trainer?.full_name || 'Assigned Instructor'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <span>{course.duration_minutes ? `${course.duration_minutes} minutes` : 'Self-paced'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-coral-400" />
                    <span>Passing Score: {course.passing_score}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {enrollment ? (
                    <div className="flex items-center gap-4 flex-wrap">
                      <Button className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default font-bold rounded-2xl px-5 py-3">
                        <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" /> Enrolled
                      </Button>
                      <Button onClick={() => navigate('/trainee/my-learning')} className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-bold rounded-2xl px-6 py-3 shadow-lg shadow-pink-500/30">
                        Go to My Learning
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => enrollMutation.mutate()} 
                      disabled={enrollMutation.isPending}
                      className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-extrabold text-base rounded-2xl px-8 py-6 shadow-xl shadow-pink-500/30 hover:scale-105 active:scale-95 transition-all"
                    >
                      {enrollMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                      Enroll in Course
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Description & Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white border border-purple-500/15 rounded-3xl p-8 shadow-sm">
                <h2 className="text-lg font-bold text-midnight mb-4">About this course</h2>
                <div className="text-midnight/70 leading-relaxed space-y-4 whitespace-pre-wrap text-sm">
                  {course.description || 'No detailed description provided for this course.'}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white border border-purple-500/15 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-xs font-bold text-purple-900/60 uppercase tracking-wider mb-4">Trainer Details</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-pink-500/20">
                      {course.trainer?.full_name?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-midnight">{course.trainer?.full_name || 'Assigned Instructor'}</p>
                      <p className="text-xs text-midnight/50 font-medium">{course.trainer?.department || 'Trainer'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </div>
    </DashboardShell>
  )
}
