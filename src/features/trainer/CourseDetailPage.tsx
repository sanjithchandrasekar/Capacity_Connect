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
import { ArrowLeft, Edit3, Target, BarChart3, FileText, Clock, Users, Loader2, Calendar, Video, BookOpen, CheckCircle2, XCircle, UserCheck, Layers, Trophy, Globe, Image as ImageIcon, ExternalLink } from 'lucide-react'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { MaterialPreviewDialog } from '@/components/ui/MaterialPreviewDialog'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { CourseAnnouncements } from '../courses/CourseAnnouncements'
import { CourseChat } from '../courses/CourseChat'
import { CourseFeedback } from '../courses/CourseFeedback'

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
  const [assessmentCount, setAssessmentCount] = useState(0)
  const [enrollmentCount, setEnrollmentCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [allEnrollments, setAllEnrollments] = useState<any[]>([])
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null)

  // Attendance Modal state
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false)
  const [attendanceSession, setAttendanceSession] = useState<Session | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, 'present' | 'absent' | 'late'>>({})

  const pendingEnrollments = allEnrollments.filter(e => e.status === 'pending_approval')
  const waitlistedEnrollments = allEnrollments.filter(e => e.status === 'waitlisted')
  const activeEnrollments = allEnrollments.filter(e => ['enrolled', 'in_progress', 'completed'].includes(e.status))
  const historyEnrollments = allEnrollments.filter(e => e.status !== 'pending_approval')

  const isSessionFinished = (session: Session) => {
    if (!session.end_time && !session.start_time) return false
    const sessionEndTime = session.end_time ? new Date(session.end_time) : new Date(session.start_time!)
    return sessionEndTime < new Date()
  }

  const activeSessions = sessions.filter(s => !isSessionFinished(s))
  const pastSessions = sessions.filter(s => isSessionFinished(s))
  const activeUpcomingLiveSession = sessions.find(s => s.meet_link && !isSessionFinished(s))

  const handleOpenAttendance = (session: Session) => {
    setAttendanceSession(session)
    // Default all active trainees to 'present'
    const initial: Record<string, 'present' | 'absent' | 'late'> = {}
    activeEnrollments.forEach(e => {
      initial[e.user_id] = 'present'
    })
    setAttendanceRecords(initial)
    setAttendanceDialogOpen(true)
  }

  const handleSaveAttendance = () => {
    toast.success(`Attendance saved for "${attendanceSession?.title || 'Session'}"!`)
    setAttendanceDialogOpen(false)
  }

  const fetchData = useCallback(async () => {
    if (!user || !courseId) return
    setLoading(true)
    try {
      const [cRes, csRes, mRes, aRes, eRes, sRes, enrollmentsRes] = await Promise.all([
        supabase.from('courses').select('*').eq('id', courseId).eq('trainer_id', user.id).single(),
        supabase.from('course_skills').select('*, skills(name)').eq('course_id', courseId),
        supabase.from('materials').select('*').eq('course_id', courseId),
        supabase.from('assessments').select('id', { count: 'exact', head: true }).eq('course_id', courseId).eq('created_by', user.id),
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
      if (aRes.count !== null) setAssessmentCount(aRes.count)
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
              <Card className="bg-gradient-to-br from-[#0c1322] via-[#090e1a] to-[#040814] text-white border border-slate-800/90 rounded-3xl shadow-xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-400" /> Enrollment History & Stats
                    </h3>
                    {course?.max_trainees && (
                      <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800/80 text-cyan-300 rounded-full border border-slate-700">
                        {activeEnrollments.length} / {course.max_trainees} Enrolled
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3.5 text-center shadow-[0_0_12px_rgba(16,185,129,0.08)]">
                      <span className="block text-2xl font-black text-emerald-400">{activeEnrollments.length}</span>
                      <span className="text-[10px] uppercase font-bold text-emerald-300/80 tracking-wider">Accepted</span>
                    </div>
                    <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3.5 text-center shadow-[0_0_12px_rgba(245,158,11,0.08)]">
                      <span className="block text-2xl font-black text-amber-400">{waitlistedEnrollments.length}</span>
                      <span className="text-[10px] uppercase font-bold text-amber-300/80 tracking-wider">Waitlisted</span>
                    </div>
                    <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-3.5 text-center shadow-[0_0_12px_rgba(244,63,94,0.08)]">
                      <span className="block text-2xl font-black text-rose-400">{allEnrollments.filter(e => e.status === 'rejected').length}</span>
                      <span className="text-[10px] uppercase font-bold text-rose-300/80 tracking-wider">Rejected</span>
                    </div>
                    <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-3.5 text-center">
                      <span className="block text-2xl font-black text-slate-300">{allEnrollments.filter(e => e.status === 'withdrawn').length}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Withdrawn</span>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {historyEnrollments.length > 0 ? (
                      historyEnrollments.map((enrollment) => (
                        <div key={enrollment.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between transition-all hover:border-slate-700">
                          <div>
                            <h4 className="text-xs font-bold text-slate-200">{enrollment.trainee?.full_name || 'Unknown Trainee'}</h4>
                            <p className="text-[10px] text-slate-400">{enrollment.trainee?.email}</p>
                          </div>
                          <div>
                            <Badge variant="outline" className={`text-[10px] font-semibold capitalize ${['enrolled', 'in_progress', 'completed'].includes(enrollment.status) ? 'border-emerald-500/30 text-emerald-300 bg-emerald-950/50' :
                                enrollment.status === 'waitlisted' ? 'border-amber-500/30 text-amber-300 bg-amber-950/50' :
                                  enrollment.status === 'rejected' ? 'border-rose-500/30 text-rose-300 bg-rose-950/50' :
                                    'border-slate-700 text-slate-300 bg-slate-800'
                              }`}>
                              {enrollment.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 text-center py-4 font-medium">No historical enrollments yet.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {(course.start_date || course.end_date || activeUpcomingLiveSession?.meet_link || course.live_class_timing || course.mock_test_timing || course.final_exam_timing) && (
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
                {activeUpcomingLiveSession?.meet_link && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/70">
                    <div className="flex items-center gap-2 text-xs text-slate-600 min-w-0">
                      <span className="font-semibold text-slate-800 w-24 shrink-0">Meeting Link:</span>
                      <a href={activeUpcomingLiveSession.meet_link} target="_blank" rel="noreferrer" className="text-cyan-600 hover:underline break-all font-medium">
                        {activeUpcomingLiveSession.meet_link}
                      </a>
                    </div>
                    <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80">
                        Note: Ensure meeting is started
                      </span>
                      <Button
                        size="sm"
                        onClick={() => handleOpenAttendance(activeUpcomingLiveSession)}
                        className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-xs h-8"
                      >
                        <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Monitor Attendance
                      </Button>
                    </div>
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
                              {course.final_test_start_time ? new Date(`2000-01-01T${course.final_test_start_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              {course.final_test_end_time ? ` - ${new Date(`2000-01-01T${course.final_test_end_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
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

        {/* Course Outline */}
        {(course.session_flow_text || course.session_flow_document_path) && (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-cyan-600" /> Course Outline
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
                          setPreviewMaterial({ file_name: 'Course Outline Document', material_type: 'file', storage_path: course.session_flow_document_path } as any)
                        }
                      } catch (err) {
                        toast.error('Failed to open document')
                      }
                    }}>
                      <FileText className="w-4 h-4 mr-2 text-cyan-600" />
                      View Course Outline Document
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {objectives && (
          <motion.div variants={fadeUp}>
            <Card className="bg-gradient-to-br from-[#0c1322] via-[#090e1a] to-[#040814] text-white border border-slate-800/90 rounded-3xl shadow-xl overflow-hidden">
              <CardContent className="p-6 md:p-8 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
                  <Target className="w-5 h-5 text-cyan-400" /> Learning Objectives
                </h3>
                {typeof objectives === 'string' ? (
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-900/60 p-4 rounded-2xl border border-slate-800">{objectives}</p>
                ) : (objectives as any).description ? (
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-900/60 p-4 rounded-2xl border border-slate-800">{(objectives as any).description}</p>
                ) : !(objectives as any).able_to_do && !(objectives as any).competencies_built && (objectives as any).understand ? (
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-900/60 p-4 rounded-2xl border border-slate-800">{(objectives as any).understand}</p>
                ) : (
                  <div className="space-y-3">
                    {(objectives as any).understand && (
                      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
                        <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Understand</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{(objectives as any).understand}</p>
                      </div>
                    )}
                    {(objectives as any).able_to_do && (
                      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
                        <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Able to Do</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{(objectives as any).able_to_do}</p>
                      </div>
                    )}
                    {(objectives as any).competencies_built && (
                      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
                        <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Competencies Built</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{(objectives as any).competencies_built}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {courseSkills.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs">
              <CardContent className="p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-cyan-600" /> Outcomes of Learning this Course
                </h3>
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

        {(course as any).modules && Array.isArray((course as any).modules) && (course as any).modules.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-600" /> Course Modules ({(course as any).modules.length})
                </h3>
                <div className="space-y-3">
                  {(course as any).modules.map((m: any, idx: number) => {
                    const items = m.items || m.content_items || []
                    return (
                      <div
                        key={m.id || idx}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{m.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {items.length} item{items.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {m.description && (
                          <p className="text-xs text-slate-600 mb-3 leading-relaxed">{m.description}</p>
                        )}
                        {items.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                            {items.map((item: any, iIdx: number) => (
                              <div key={item.id || iIdx} className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center gap-2 text-xs">
                                {item.type === 'photo' && <ImageIcon className="w-3.5 h-3.5 text-cyan-600 shrink-0" />}
                                {item.type === 'video' && <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                                {item.type === 'link' && <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                {item.type === 'text' && <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                                <span className="truncate font-medium text-slate-800">{item.title}</span>
                                {item.url && (
                                  <a href={item.url} target="_blank" rel="noreferrer" className="ml-auto text-cyan-600 hover:text-cyan-700">
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}



        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div variants={fadeUp}>
            <RouterLink to={`/trainer/courses/${courseId}/sessions`}>
              <Card className="bg-gradient-to-br from-[#0c1322] via-[#090e1a] to-[#040814] border border-slate-800/90 hover:border-cyan-500/70 hover:shadow-[0_0_20px_rgba(6,182,212,0.18)] hover:-translate-y-0.5 transition-all cursor-pointer h-full rounded-2xl shadow-lg group">
                <CardContent className="p-5 flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500/20 group-hover:scale-105 transition-all shadow-[0_0_12px_rgba(6,182,212,0.1)]">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">Sessions</p>
                    <p className="text-xs text-slate-400 font-medium">{sessions.length} sessions</p>
                  </div>
                </CardContent>
              </Card>
            </RouterLink>
          </motion.div>
          <motion.div variants={fadeUp}>
            <RouterLink to={`/trainer/courses/${courseId}/materials`}>
              <Card className="bg-gradient-to-br from-[#0c1322] via-[#090e1a] to-[#040814] border border-slate-800/90 hover:border-blue-500/70 hover:shadow-[0_0_20px_rgba(59,130,246,0.18)] hover:-translate-y-0.5 transition-all cursor-pointer h-full rounded-2xl shadow-lg group">
                <CardContent className="p-5 flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-blue-950/70 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-105 transition-all shadow-[0_0_12px_rgba(59,130,246,0.1)]">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">Materials</p>
                    <p className="text-xs text-slate-400 font-medium">{materials.length} files</p>
                  </div>
                </CardContent>
              </Card>
            </RouterLink>
          </motion.div>
          <motion.div variants={fadeUp}>
            <RouterLink to={`/trainer/courses/${courseId}/assessments`}>
              <Card className="bg-gradient-to-br from-[#0c1322] via-[#090e1a] to-[#040814] border border-slate-800/90 hover:border-emerald-500/70 hover:shadow-[0_0_20px_rgba(16,185,129,0.18)] hover:-translate-y-0.5 transition-all cursor-pointer h-full rounded-2xl shadow-lg group">
                <CardContent className="p-5 flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-950/70 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 group-hover:scale-105 transition-all shadow-[0_0_12px_rgba(16,185,129,0.1)]">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">Assessments</p>
                    <p className="text-xs text-slate-400 font-medium">{assessmentCount > 0 ? `${assessmentCount} tests` : 'Not created'}</p>
                  </div>
                </CardContent>
              </Card>
            </RouterLink>
          </motion.div>
          <motion.div variants={fadeUp}>
            <RouterLink to={`/trainer/courses/${courseId}/performance`}>
              <Card className="bg-gradient-to-br from-[#0c1322] via-[#090e1a] to-[#040814] border border-slate-800/90 hover:border-purple-500/70 hover:shadow-[0_0_20px_rgba(168,85,247,0.18)] hover:-translate-y-0.5 transition-all cursor-pointer h-full rounded-2xl shadow-lg group">
                <CardContent className="p-5 flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-purple-950/70 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 group-hover:scale-105 transition-all shadow-[0_0_12px_rgba(168,85,247,0.1)]">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">Performance</p>
                    <p className="text-xs text-slate-400 font-medium">{enrollmentCount} trainees</p>
                  </div>
                </CardContent>
              </Card>
            </RouterLink>
          </motion.div>
        </div>

        {/* Course Announcements, Chat & Feedback */}
        <motion.div variants={fadeUp} className="space-y-6">
          <CourseAnnouncements courseId={courseId!} isTrainer={true} />
          <CourseChat courseId={courseId!} isTrainer={true} />
          <CourseFeedback courseId={courseId!} isTrainer={true} />
        </motion.div>
      </motion.div>

      {/* Attendance Modal Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 text-slate-900">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-cyan-600" /> Attendance: {attendanceSession?.title || 'Session'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
              <span>{activeEnrollments.length} Enrolled Trainees</span>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-cyan-700 font-semibold" onClick={() => {
                const allP: Record<string, 'present' | 'absent' | 'late'> = {}
                activeEnrollments.forEach(e => { allP[e.user_id] = 'present' })
                setAttendanceRecords(allP)
              }}>
                Mark All Present
              </Button>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {activeEnrollments.length > 0 ? (
                activeEnrollments.map((enr) => {
                  const status = attendanceRecords[enr.user_id] || 'present'
                  return (
                    <div key={enr.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div>
                        <p className="text-xs font-bold text-slate-900">{enr.trainee?.full_name || 'Unknown'}</p>
                        <p className="text-[10px] text-slate-500">{enr.trainee?.email}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setAttendanceRecords(p => ({ ...p, [enr.user_id]: 'present' }))}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${status === 'present' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttendanceRecords(p => ({ ...p, [enr.user_id]: 'late' }))}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${status === 'late' ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                        >
                          Late
                        </button>
                        <button
                          type="button"
                          onClick={() => setAttendanceRecords(p => ({ ...p, [enr.user_id]: 'absent' }))}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${status === 'absent' ? 'bg-rose-500 text-white shadow-xs' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                        >
                          Absent
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No enrolled trainees in this course.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-slate-200 text-slate-700 rounded-xl" onClick={() => setAttendanceDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl shadow-sm" onClick={handleSaveAttendance}>
              Save Attendance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Material Preview Dialog */}
      {previewMaterial && (
        <MaterialPreviewDialog
          material={previewMaterial}
          previewUrl={previewUrl}
          onClose={() => {
            setPreviewMaterial(null)
            setPreviewUrl(null)
          }}
        />
      )}
    </TrainerLayout>
  )
}


