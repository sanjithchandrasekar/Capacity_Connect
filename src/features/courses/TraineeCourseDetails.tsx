import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShell } from '@/pages/Dashboards'
import { Compass, BookOpen, Clock, User, ArrowLeft, CheckCircle2, Loader2, BookMarked, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Calendar, Video, FileText, Lock, Target } from 'lucide-react'
import { MaterialPreviewDialog } from '@/components/ui/MaterialPreviewDialog'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

export function TraineeCourseDetails() {
  const { courseId } = useParams<{ courseId: string }>()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [previewMaterial, setPreviewMaterial] = useState<any | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const { data: course, isLoading: isCourseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data: courseData, error } = await supabase
        .from('courses')
        .select(`
          *,
          trainer:trainers!courses_trainer_id_fkey(full_name)
        `)
        .eq('id', courseId!)
        .single() as any

      if (error) throw error

      const { data: sessionsData } = await supabase
        .from('course_sessions')
        .select('*')
        .eq('course_id', courseId!)
        .order('order_index')

      const { data: materialsData } = await supabase
        .from('materials')
        .select('*')
        .eq('course_id', courseId!)
        .order('created_at')

      return {
        ...courseData,
        sessions: sessionsData || [],
        materials: materialsData || []
      }
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

  const { data: enrollmentCount } = useQuery({
    queryKey: ['enrollments-count', courseId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId!)

      if (error) throw error
      return count || 0
    },
    enabled: !!courseId
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

  const handleDownload = async (material: any) => {
    setDownloadingId(material.id)
    try {
      const { data, error } = await supabase.storage
        .from('materials')
        .createSignedUrl(material.storage_path, 3600)
      if (error) throw error

      const link = document.createElement('a')
      link.href = data.signedUrl
      link.download = material.file_name
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch {
      toast.error('Failed to generate download link')
    } finally {
      setDownloadingId(null)
    }
  }

  const handlePreview = async (material: any) => {
    if (!enrollment) {
      toast.error('Please enroll to access materials')
      return
    }
    if (material.material_type === 'link') {
      window.open(material.url!, '_blank')
      return
    }
    setPreviewMaterial(material)
    setPreviewUrl(null)
    try {
      const { data, error } = await supabase.storage
        .from('materials')
        .createSignedUrl(material.storage_path, 3600)
      if (error) throw error
      setPreviewUrl(data.signedUrl)
    } catch {
      toast.error('Failed to load preview')
      setPreviewMaterial(null)
    }
  }

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
                    <span>{course.sessions?.length || 0} Modules</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-purple-300" />
                    <span className="capitalize">{course.delivery_mode || 'recorded'} Delivery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-400" />
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

                  ) : course.max_trainees && (enrollmentCount ?? 0) >= course.max_trainees ? (
                    <div>
                      <Button disabled className="bg-slate-200 text-slate-500 font-bold rounded-2xl px-6 py-3 cursor-not-allowed">
                        Course Full
                      </Button>
                      <div className="mt-2 text-sm text-rose-500 font-medium">This course has reached its capacity limit of {course.max_trainees} trainees.</div>
                    </div>
                  ) : (
                    <div>
                      <Button 
                        onClick={() => enrollMutation.mutate()} 
                        disabled={enrollMutation.isPending}
                        className="bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-extrabold text-base rounded-2xl px-8 py-6 shadow-xl shadow-pink-500/30 hover:scale-105 active:scale-95 transition-all"
                      >
                        {enrollMutation.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                        Enroll in Course
                      </Button>
                      {course.status !== 'published' && (
                        <div className="mt-2 text-sm text-yellow-200">This course is currently not published.</div>
                      )}
                      {course.max_trainees && (
                        <div className="mt-2 text-sm text-pink-300 font-medium">
                          {course.max_trainees - (enrollmentCount ?? 0)} spots remaining!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Schedule & Important Dates Section */}
            {(course.start_date || course.end_date || course.live_class_timing || course.mock_test_timing || course.final_exam_timing) && (
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-purple-500/10 shadow-sm">
                <h2 className="text-xl font-bold text-midnight flex items-center gap-2 mb-6">
                  <Calendar className="w-5 h-5 text-purple-600" /> Schedule & Important Dates
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(course.start_date || course.end_date) && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-xs font-semibold text-slate-500 mb-1">Course Duration</div>
                      <div className="text-sm font-medium text-midnight">
                        {course.start_date && new Date(course.start_date).toLocaleDateString()}
                        {course.start_date && course.end_date && ' - '}
                        {course.end_date && new Date(course.end_date).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                  {course.live_class_timing && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-xs font-semibold text-slate-500 mb-1">Live Class Timings</div>
                      <div className="text-sm font-medium text-midnight">{course.live_class_timing}</div>
                    </div>
                  )}
                  {course.mock_test_timing && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-xs font-semibold text-slate-500 mb-1">Mock Test</div>
                      <div className="text-sm font-medium text-midnight">{new Date(course.mock_test_timing).toLocaleString()}</div>
                    </div>
                  )}
                  {course.final_exam_timing && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-xs font-semibold text-slate-500 mb-1">Final Exam</div>
                      <div className="text-sm font-medium text-midnight">{new Date(course.final_exam_timing).toLocaleString()}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

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

            {/* Session Flow */}
            {(course.session_flow_text || course.session_flow_document_path) && (
              <div className="bg-white border border-purple-500/15 rounded-3xl p-8 shadow-sm">
                <h2 className="text-lg font-bold text-midnight flex items-center gap-2 mb-4">
                  <BookOpen className="w-5 h-5 text-purple-600" /> Session Flow
                </h2>
                <div className="space-y-4">
                  {course.session_flow_text && (
                    <div className="text-midnight/70 leading-relaxed whitespace-pre-wrap text-sm">
                      {course.session_flow_text}
                    </div>
                  )}
                  {course.session_flow_document_path && (
                    <Button variant="outline" onClick={async () => {
                      try {
                        const { data, error } = await supabase.storage.from('materials').createSignedUrl(course.session_flow_document_path!, 3600)
                        if (error) throw error
                        if (data?.signedUrl) {
                          setPreviewUrl(data.signedUrl)
                          setPreviewMaterial({ file_name: 'Session Flow Document', material_type: 'file', storage_path: course.session_flow_document_path } as any)
                        }
                      } catch (err) {
                        toast.error('Failed to open document')
                      }
                    }}>
                      <FileText className="w-4 h-4 mr-2" />
                      View Session Flow Document
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Course Content / Sessions */}
            {course.sessions && course.sessions.length > 0 && (
              <div className="bg-white border border-purple-500/15 rounded-3xl p-8 shadow-sm">
                <h2 className="text-lg font-bold text-midnight mb-6">Course Content</h2>
                <div className="space-y-4">
                  {course.sessions.map((session: any, index: number) => {
                    const sessionMaterials = course.materials?.filter((m: any) => m.session_id === session.id) || []
                    return (
                      <div key={session.id} className="border border-purple-500/10 rounded-2xl overflow-hidden group">
                        <div className="p-4 bg-purple-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-500/10">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Module {index + 1}</span>
                              <h4 className="text-base font-bold text-midnight">{session.title}</h4>
                            </div>
                            {session.description && <p className="text-xs text-midnight/60">{session.description}</p>}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold shrink-0">
                            {session.session_type && (
                              <span className={`px-2 py-1 rounded-lg border ${session.session_type === 'live' ? 'bg-orange-50 text-orange-700 border-orange-200' : session.session_type === 'recorded' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-pink-50 text-pink-700 border-pink-200'} capitalize`}>
                                {session.session_type === 'recorded' ? 'Video' : session.session_type} Class
                              </span>
                            )}
                            {session.start_time && (
                              <span className="flex items-center gap-1.5 text-midnight/60 bg-white px-2 py-1 rounded-lg border border-purple-500/10">
                                <Calendar className="w-3.5 h-3.5 text-purple-500" />
                                {new Date(session.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </span>
                            )}
                            {session.meet_link && enrollment && (session.session_type === 'live' || session.session_type === 'hybrid') && (
                              <a href={session.meet_link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                                <Video className="w-3.5 h-3.5" /> Join Live
                              </a>
                            )}
                          </div>
                        </div>
                        
                        <div className="p-4 bg-white">
                          {sessionMaterials.length === 0 ? (
                            <p className="text-xs text-midnight/40 italic">No materials available yet.</p>
                          ) : (
                            <ul className="space-y-2 text-sm text-midnight/70">
                              {sessionMaterials.map((m: any) => (
                                <li 
                                  key={m.id} 
                                  onClick={() => handlePreview(m)}
                                  className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${enrollment ? 'cursor-pointer hover:bg-purple-50/50 hover:text-purple-700' : 'opacity-70'}`}
                                >
                                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                                    <FileText className="w-4 h-4 text-purple-600" />
                                  </div>
                                  <span className="truncate flex-1 font-medium">{m.file_name}</span>
                                  {!enrollment && <Lock className="w-3.5 h-3.5 text-midnight/30 shrink-0" />}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          </motion.div>
        )}
      </div>
      
      <MaterialPreviewDialog 
        material={previewMaterial}
        previewUrl={previewUrl}
        onClose={() => setPreviewMaterial(null)}
        onDownload={() => previewMaterial && handleDownload(previewMaterial)}
      />
    </DashboardShell>
  )
}
