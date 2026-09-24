import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Database } from '@/integrations/supabase/types'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit3, Target, BarChart3, FileText, Clock, Users, Loader2, Calendar, Video, BookOpen, CheckCircle2, XCircle } from 'lucide-react'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { MaterialPreviewDialog } from '@/components/ui/MaterialPreviewDialog'
import { toast } from 'sonner'
import { CourseAnnouncements } from '../courses/CourseAnnouncements'
import { CourseChat } from '../courses/CourseChat'

type Course = Database['public']['Tables']['courses']['Row']
type CourseSkill = Database['public']['Tables']['course_skills']['Row'] & { skills: { name: string } | null }
type Session = Database['public']['Tables']['course_sessions']['Row']
type Material = Database['public']['Tables']['materials']['Row']
type Assessment = Database['public']['Tables']['assessments']['Row']

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border border-slate-200',
  pending_review: 'bg-amber-50 text-amber-700 border border-amber-200',
  published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  archived: 'bg-rose-50 text-rose-700 border border-rose-200',
}

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [courseSkills, setCourseSkills] = useState<CourseSkill[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [enrollmentCount, setEnrollmentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [allEnrollments, setAllEnrollments] = useState<any[]>([])
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null)

  const pendingEnrollments = allEnrollments.filter(e => e.status === 'pending_approval')
  const waitlistedEnrollments = allEnrollments.filter(e => e.status === 'waitlisted')
  const activeEnrollments = allEnrollments.filter(e => ['enrolled', 'in_progress', 'completed'].includes(e.status))
  const historyEnrollments = allEnrollments.filter(e => e.status !== 'pending_approval')

  const fetchData = useCallback(async () => {
    if (!user || !courseId) return
    setLoading(true)
    try {
      const [cRes, csRes, mRes, aRes, eRes, sRes, enrollmentsRes] = await Promise.all([
        supabase.from('courses').select('*').eq('id', courseId).eq('trainer_id', user.id).single(),
        supabase.from('course_skills').select('*, skills(name)').eq('course_id', courseId),
        supabase.from('materials').select('*').eq('course_id', courseId),
        supabase.from('assessments').select('*').eq('course_id', courseId).eq('created_by', user.id).single(),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('course_id', courseId).in('status', ['enrolled', 'in_progress', 'completed']),
        supabase.from('course_sessions').select('*').eq('course_id', courseId).order('order_index'),
        supabase.from('enrollments').select('*').eq('course_id', courseId).order('enrolled_at', { ascending: false }),
      ])
      
      let mergedEnrollments: any[] = []
      if (enrollmentsRes.error) {
        console.error('Error fetching enrollments:', enrollmentsRes.error)
      } else if (enrollmentsRes.data && enrollmentsRes.data.length > 0) {
        const userIds = enrollmentsRes.data.map(e => e.user_id)
        const { data: traineesData, error: traineesError } = await supabase.from('trainees').select('id, full_name, email').in('id', userIds)
        if (traineesError) console.error('Error fetching trainees:', traineesError)
        
        mergedEnrollments = enrollmentsRes.data.map(e => ({
          ...e,
          trainee: traineesData?.find(t => t.id === e.user_id) || { full_name: 'Unknown Trainee', email: '' }
        }))
      }

      if (cRes.data) setCourse(cRes.data)
      if (csRes.data) setCourseSkills(csRes.data as any)
      if (mRes.data) setMaterials(mRes.data)
      if (aRes.data) setAssessment(aRes.data)
      setEnrollmentCount(eRes.count ?? 0)
      if (sRes.data) setSessions(sRes.data)
      setAllEnrollments(mergedEnrollments)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user, courseId])

  useEffect(() => { fetchData() }, [fetchData])

  const handleApproval = async (enrollmentId: string, action: 'approve' | 'reject', trainee: any) => {
    setIsProcessingId(enrollmentId)
    try {
      const newStatus = action === 'approve' ? 'enrolled' : 'rejected'
      
      const { error: updateError } = await supabase
        .from('enrollments')
        .update({ status: newStatus })
        .eq('id', enrollmentId)

      if (updateError) throw updateError

      if (trainee?.email) {
        supabase.functions.invoke('send-enrollment-email', {
          body: {
            email: trainee.email,
            name: trainee.full_name || 'Trainee',
            courseTitle: course?.title || 'Course',
            action: action,
            origin: window.location.origin
          }
        }).catch(console.error)
      }

      const { error: notificationError } = await supabase.from('notifications').insert({
        user_id: trainee.id,
        type: `enrollment_status:${course?.id}`,
        title: `Enrollment ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        message: `Your request to enroll in ${course?.title} was ${action === 'approve' ? 'approved' : 'rejected'}.`,
      })
      if (notificationError) console.error(notificationError)

      toast.success(`Enrollment ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
      fetchData()
    } catch (e: any) {
      toast.error(e.message || 'Failed to process enrollment')
      console.error(e)
    } finally {
      setIsProcessingId(null)
    }
  }

  const objectives = (course?.learning_objectives as Record<string, string> | null) ?? null

  if (loading) {
    return (
      <TrainerLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
        </div>
      </TrainerLayout>
    )
  }

  if (!course) {
    return (
      <TrainerLayout>
        <div className="max-w-3xl mx-auto py-20 text-center">
          <p className="text-slate-500 mb-4">Course not found or you don't have access.</p>
          <RouterLink to="/trainer/courses"><Button variant="outline" className="border-slate-200 text-slate-700">Back to Courses</Button></RouterLink>
        </div>
      </TrainerLayout>
    )
  }

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-4xl mx-auto space-y-6">
        <motion.div variants={fadeUp}>
          <RouterLink to="/trainer/courses" className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Courses
          </RouterLink>
        </motion.div>

        <motion.div variants={fadeUp} className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-4">
              {/* Thumbnail */}
              {course.thumbnail_path && (
                <div className="w-full sm:w-32 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                  <Thumbnail path={course.thumbnail_path} alt={course.title} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                  <div>
                    <Badge className={`${statusColors[course.status]} text-[10px] font-semibold mb-2`}>{course.status.replace('_', ' ')}</Badge>
                    <h1 className="text-2xl font-black text-slate-900 leading-tight">{course.title}</h1>
                  </div>
                  <RouterLink to={`/trainer/courses/${courseId}/edit`}>
                    <Button size="sm" className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-xs">
                      <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit
                    </Button>
                  </RouterLink>
                </div>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">{course.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-cyan-600" /> {course.duration_minutes ? Math.floor(course.duration_minutes / 60) : 0} hours</span>
                  <span>&bull;</span>
                  <span>{course.course_type === 'standard' ? 'Standard' : 'Scenario'} Training</span>
                  <span>&bull;</span>
                  <span>{course.department || 'General'}</span>
                  <span>&bull;</span>
                  <span className="capitalize flex items-center gap-1"><Video className="w-3.5 h-3.5 text-cyan-600" /> {course.delivery_mode || 'recorded'}</span>
                  <span>&bull;</span>
                  <span>Pass: {course.passing_score}%</span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-cyan-600" /> {enrollmentCount} {course.max_trainees ? `/ ${course.max_trainees}` : ''} enrolled</span>
                </div>
              </div>
            </div>

            {/* Pending Enrollments Section */}
            <div className="mb-4">
              <Card className="bg-amber-50/50 border border-amber-200 rounded-2xl">
                <CardContent className="p-5">
                  <h3 className="text-sm font-bold text-amber-900 mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" /> Pending Enrollment Requests
                    <Badge className="bg-amber-100 text-amber-800 ml-2 font-bold">{pendingEnrollments.length}</Badge>
                  </h3>
                  <div className="space-y-2.5">
                    {pendingEnrollments.length > 0 ? (
                      pendingEnrollments.map((enrollment) => (
                        <div key={enrollment.id} className="p-3.5 rounded-xl bg-white border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{enrollment.trainee?.full_name || 'Unknown Trainee'}</h4>
                            <p className="text-xs text-slate-500">{enrollment.trainee?.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 h-8 font-semibold rounded-lg"
                              disabled={isProcessingId === enrollment.id}
                              onClick={() => handleApproval(enrollment.id, 'approve', enrollment.trainee)}
                            >
                              {isProcessingId === enrollment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-rose-300 text-rose-700 hover:bg-rose-50 h-8 font-semibold rounded-lg"
                              disabled={isProcessingId === enrollment.id}
                              onClick={() => handleApproval(enrollment.id, 'reject', enrollment.trainee)}
                            >
                              {isProcessingId === enrollment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-amber-800/80 font-medium">No pending enrollment requests at this time.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Enrollment History & Stats Section */}
            <div className="mb-4">
              <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-600" /> Enrollment History & Stats
                    </h3>
                    {course?.max_trainees && (
                      <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                        {activeEnrollments.length} / {course.max_trainees} Enrolled
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                      <span className="block text-2xl font-black text-emerald-600">{activeEnrollments.length}</span>
                      <span className="text-[10px] uppercase font-bold text-emerald-800/70 tracking-wider">Accepted</span>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                      <span className="block text-2xl font-black text-amber-600">{waitlistedEnrollments.length}</span>
                      <span className="text-[10px] uppercase font-bold text-amber-800/70 tracking-wider">Waitlisted</span>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-center">
                      <span className="block text-2xl font-black text-rose-600">{allEnrollments.filter(e => e.status === 'rejected').length}</span>
                      <span className="text-[10px] uppercase font-bold text-rose-800/70 tracking-wider">Rejected</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                      <span className="block text-2xl font-black text-slate-700">{allEnrollments.filter(e => e.status === 'withdrawn').length}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Withdrawn</span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {historyEnrollments.length > 0 ? (
                      historyEnrollments.map((enrollment) => (
                        <div key={enrollment.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{enrollment.trainee?.full_name || 'Unknown Trainee'}</h4>
                            <p className="text-[10px] text-slate-400">{enrollment.trainee?.email}</p>
                          </div>
                          <div>
                            <Badge variant="outline" className={`text-[10px] font-semibold capitalize ${
                              ['enrolled', 'in_progress', 'completed'].includes(enrollment.status) ? 'border-emerald-200 text-emerald-700 bg-emerald-50' :
                              enrollment.status === 'waitlisted' ? 'border-amber-200 text-amber-700 bg-amber-50' :
                              enrollment.status === 'rejected' ? 'border-rose-200 text-rose-700 bg-rose-50' :
                              'border-slate-200 text-slate-600 bg-slate-100'
                            }`}>
                              {enrollment.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-4 font-medium">No historical enrollments yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {(course.start_date || course.end_date || course.meet_link || course.live_class_timing || course.mock_test_timing || course.final_exam_timing) && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3 mt-4">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2"><Calendar className="w-4 h-4 text-cyan-600" /> Schedule & Dates</h4>
                {(course.start_date || course.end_date) && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800 w-24">Course Span:</span> 
                    {course.start_date ? new Date(course.start_date).toLocaleDateString() : 'TBD'} 
                    {' - '} 
                    {course.end_date ? new Date(course.end_date).toLocaleDateString() : 'TBD'}
                    {course.start_date && course.end_date && (
                      <span className="ml-2 text-cyan-700 font-bold">
                        ({Math.max(1, Math.ceil((new Date(course.end_date).getTime() - new Date(course.start_date).getTime()) / (1000 * 60 * 60 * 24)))} days)
                      </span>
                    )}
                  </div>
                )}
                {course.meet_link && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="font-semibold text-slate-800 w-24">Meeting Link:</span> 
                    <a href={course.meet_link} target="_blank" rel="noreferrer" className="text-cyan-600 hover:underline break-all font-medium">
                      {course.meet_link}
                    </a>
                  </div>
                )}
              </div>
            )}

            {((course.planned_assessments_count || 0) > 0 || (course.planned_mock_tests_count || 0) > 0 || course.final_test_date) && (
              <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs mt-4">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Target className="w-4 h-4 text-cyan-600" /> Test & Assessment Plan
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    {(course.planned_assessments_count || 0) > 0 && (
                      <div>
                        <span className="text-slate-400 block text-xs font-semibold">Daily Assessments</span>
                        <span className="text-slate-900 font-bold">{course.planned_assessments_count} Planned</span>
                      </div>
                    )}

                    {(course.planned_mock_tests_count || 0) > 0 && (
                      <div>
                        <span className="text-slate-400 block text-xs font-semibold">Mock Tests</span>
                        <span className="text-slate-900 font-bold">{course.planned_mock_tests_count} Planned</span>
                      </div>
                    )}
                    {course.final_test_date && (
                      <div className="col-span-1 sm:col-span-2">
                        <span className="text-slate-400 block text-xs font-semibold">Final Exam</span>
                        <div className="flex flex-col text-slate-900 font-bold mt-0.5">
                          <span>{new Date(course.final_test_date).toLocaleDateString()}</span>
                          {(course.final_test_start_time || course.final_test_end_time) && (
                            <span className="text-xs text-slate-500 font-semibold">
                              {course.final_test_start_time ? new Date(`2000-01-01T${course.final_test_start_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''} 
                              {course.final_test_end_time ? ` - ${new Date(`2000-01-01T${course.final_test_end_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>

        {/* Session Flow */}
        {(course.session_flow_text || course.session_flow_document_path) && (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-600" /> Session Flow
                </h3>
                <div className="space-y-3">
                  {course.session_flow_text && (
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{course.session_flow_text}</p>
                  )}
                  {course.session_flow_document_path && (
                    <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold" onClick={async () => {
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
                      <FileText className="w-4 h-4 mr-2 text-cyan-600" />
                      View Session Flow Document
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {objectives && (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs">
              <CardContent className="p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Learning Objectives</h3>
                {objectives.understand && <div><p className="text-xs font-semibold text-slate-500">Understand</p><p className="text-sm text-slate-700 leading-relaxed">{objectives.understand}</p></div>}
                {objectives.able_to_do && <div><p className="text-xs font-semibold text-slate-500">Able to Do</p><p className="text-sm text-slate-700 leading-relaxed">{objectives.able_to_do}</p></div>}
                {objectives.competencies_built && <div><p className="text-xs font-semibold text-slate-500">Competencies Built</p><p className="text-sm text-slate-700 leading-relaxed">{objectives.competencies_built}</p></div>}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {courseSkills.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs">
              <CardContent className="p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {courseSkills.map(cs => (
                    <span key={cs.skill_id} className="px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-semibold">
                      {cs.skills?.name ?? 'Unknown'}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {sessions.length > 0 ? (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs">
              <CardContent className="p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Course Sessions</h3>
                <div className="space-y-3">
                  {sessions.map((session, index) => (
                    <div key={session.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] font-semibold border-slate-300 text-slate-700 bg-white">Session {index + 1}</Badge>
                        <h4 className="text-sm font-bold text-slate-900">{session.title}</h4>
                      </div>
                      {session.description && <p className="text-xs text-slate-600 mt-1 leading-relaxed">{session.description}</p>}
                      <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-slate-500 font-semibold">
                        {session.start_time && (
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-cyan-600" /> {new Date(session.start_time).toLocaleString()}</span>
                        )}
                        {session.meet_link && (
                          <a href={session.meet_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-cyan-600 hover:underline">
                            <Video className="w-3 h-3" /> Live Class
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border border-slate-200/90 border-dashed rounded-2xl shadow-xs">
              <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                <Calendar className="w-10 h-10 text-slate-300 mb-3" />
                <h3 className="text-sm font-bold text-slate-900 mb-1">No Course Sessions</h3>
                <p className="text-xs text-slate-500 mb-4 max-w-xs">Break your course down into topics or schedule live classes.</p>
                <RouterLink to={`/trainer/courses/${courseId}/sessions`}>
                  <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl">
                    Create First Session
                  </Button>
                </RouterLink>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div variants={fadeUp}>
            <RouterLink to={`/trainer/courses/${courseId}/sessions`}>
              <Card className="bg-white border border-slate-200/90 hover:border-cyan-500 transition-all cursor-pointer h-full rounded-2xl shadow-xs">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600"><Calendar className="w-5 h-5" /></div>
                  <div><p className="text-sm font-bold text-slate-900">Sessions</p><p className="text-xs text-slate-500 font-medium">{sessions.length} sessions</p></div>
                </CardContent>
              </Card>
            </RouterLink>
          </motion.div>
          <motion.div variants={fadeUp}>
            <RouterLink to={`/trainer/courses/${courseId}/materials`}>
              <Card className="bg-white border border-slate-200/90 hover:border-cyan-500 transition-all cursor-pointer h-full rounded-2xl shadow-xs">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600"><FileText className="w-5 h-5" /></div>
                  <div><p className="text-sm font-bold text-slate-900">Materials</p><p className="text-xs text-slate-500 font-medium">{materials.length} files</p></div>
                </CardContent>
              </Card>
            </RouterLink>
          </motion.div>
          <motion.div variants={fadeUp}>
            <RouterLink to={`/trainer/courses/${courseId}/assessments`}>
              <Card className="bg-white border border-slate-200/90 hover:border-cyan-500 transition-all cursor-pointer h-full rounded-2xl shadow-xs">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600"><Target className="w-5 h-5" /></div>
                  <div><p className="text-sm font-bold text-slate-900">Assessment</p><p className="text-xs text-slate-500 font-medium">{assessment ? 'Created' : 'Not created'}</p></div>
                </CardContent>
              </Card>
            </RouterLink>
          </motion.div>
          <motion.div variants={fadeUp}>
            <RouterLink to={`/trainer/courses/${courseId}/performance`}>
              <Card className="bg-white border border-slate-200/90 hover:border-cyan-500 transition-all cursor-pointer h-full rounded-2xl shadow-xs">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600"><BarChart3 className="w-5 h-5" /></div>
                  <div><p className="text-sm font-bold text-slate-900">Performance</p><p className="text-xs text-slate-500 font-medium">{enrollmentCount} trainees</p></div>
                </CardContent>
              </Card>
            </RouterLink>
          </motion.div>
        </div>

        {/* Course Announcements & Chat */}
        <motion.div variants={fadeUp} className="space-y-6">
          <CourseAnnouncements courseId={courseId!} isTrainer={true} />
          <CourseChat courseId={courseId!} isTrainer={true} />
        </motion.div>
      </motion.div>
      <MaterialPreviewDialog
        material={previewMaterial}
        previewUrl={previewUrl}
        onClose={() => { setPreviewMaterial(null); setPreviewUrl(null) }}
        onDownload={async () => {
          if (!previewMaterial?.storage_path) return
          try {
            const { data, error } = await supabase.storage.from('materials').createSignedUrl(previewMaterial.storage_path, 60, { download: true })
            if (error) throw error
            if (data?.signedUrl) window.open(data.signedUrl, '_blank')
          } catch { toast.error('Failed to download') }
        }}
      />
    </TrainerLayout>
  )
}
