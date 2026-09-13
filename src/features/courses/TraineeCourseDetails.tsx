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
        <Link to="/trainee/courses" className="inline-flex items-center gap-2 text-sm text-ink/50 hover:text-ink transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-ink animate-spin" />
          </div>
        ) : !course ? (
          <div className="text-center p-12 bg-cream border border-ink/10 rounded-2xl">
            <h3 className="text-xl font-bold text-ink">Course Not Found</h3>
            <p className="text-ink/50 mt-2">The course you are looking for does not exist or has been removed.</p>
          </div>
        ) : (
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6">
            
            {/* Header Card */}
            <div className="bg-cream border border-ink/10 rounded-2xl overflow-hidden shadow-sm relative">
              <div className="p-8 md:p-12 relative z-10">
                <div className="inline-block bg-ink/5 px-3 py-1 rounded-full text-xs font-semibold text-ink uppercase tracking-wider border border-ink/10 mb-6">
                  {course.course_type} Course
                </div>
                
                <h1 className="text-3xl md:text-4xl font-black text-ink mb-4 leading-tight">{course.title}</h1>
                
                <div className="flex flex-wrap items-center gap-6 text-sm text-ink/60 mb-8">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-ink/40" />
                    <span>{course.trainer?.full_name || 'Unknown Trainer'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-ink/40" />
                    <span>{course.duration_minutes ? `${course.duration_minutes} minutes` : 'Self-paced'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-ink/40" />
                    <span>Passing Score: {course.passing_score}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {enrollment ? (
                    <div className="flex items-center gap-4">
                      <Button className="bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 cursor-default">
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Enrolled
                      </Button>
                      <Button onClick={() => navigate('/trainee/my-learning')} className="bg-ink hover:bg-ink/90 text-cream border-0">
                        Go to My Learning
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => enrollMutation.mutate()} 
                      disabled={enrollMutation.isPending}
                      className="bg-ink hover:bg-ink/90 text-cream border-0 transition-all px-8 py-6 text-base"
                    >
                      {enrollMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                      Enroll Now
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Description & Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-cream border border-ink/10 rounded-2xl p-8">
                <h2 className="text-xl font-bold text-ink mb-4">About this course</h2>
                <div className="text-ink/60 leading-relaxed space-y-4 whitespace-pre-wrap">
                  {course.description || 'No detailed description provided for this course.'}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-cream border border-ink/10 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-ink/50 uppercase tracking-wider mb-4">Trainer Details</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center text-cream font-bold">
                      {course.trainer?.full_name?.charAt(0) || 'T'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{course.trainer?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-ink/40">{course.trainer?.department || 'Trainer'}</p>
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
