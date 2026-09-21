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
import { ArrowLeft, Edit3, Target, BarChart3, FileText, Clock, Users, Loader2, Calendar, Video, BookOpen, GraduationCap, Award, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { MaterialPreviewDialog } from '@/components/ui/MaterialPreviewDialog'
import { toast } from 'sonner'

type Course = Database['public']['Tables']['courses']['Row']
type CourseSkill = Database['public']['Tables']['course_skills']['Row'] & { skills: { name: string } | null }
type Session = Database['public']['Tables']['course_sessions']['Row']
type Material = Database['public']['Tables']['materials']['Row']
type Assessment = Database['public']['Tables']['assessments']['Row']

const statusColors: Record<string, string> = {
  draft: 'bg-ink/10 text-ink/80 border border-ink/20',
  pending_review: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  published: 'bg-ink/10 text-ink/70 border border-ink/20',
  archived: 'bg-red-50 text-red-600 border border-red-200',
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
  const [pendingEnrollments, setPendingEnrollments] = useState<any[]>([])
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!user || !courseId) return
    setLoading(true)
    try {
      const [cRes, csRes, mRes, aRes, eRes, sRes, pendingRes] = await Promise.all([
        supabase.from('courses').select('*').eq('id', courseId).eq('trainer_id', user.id).single(),
        supabase.from('course_skills').select('*, skills(name)').eq('course_id', courseId),
        supabase.from('materials').select('*').eq('course_id', courseId),
        supabase.from('assessments').select('*').eq('course_id', courseId).eq('created_by', user.id).single(),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('course_id', courseId).neq('status', 'pending_approval'),
        supabase.from('course_sessions').select('*').eq('course_id', courseId).order('order_index'),
        supabase.from('enrollments').select('*, trainee:profiles(id, full_name, email)').eq('course_id', courseId).eq('status', 'pending_approval'),
      ])
      if (cRes.data) setCourse(cRes.data)
      if (csRes.data) setCourseSkills(csRes.data as any)
      if (mRes.data) setMaterials(mRes.data)
      if (aRes.data) setAssessment(aRes.data)
      setEnrollmentCount(eRes.count ?? 0)
      if (sRes.data) setSessions(sRes.data)
      if (pendingRes.data) setPendingEnrollments(pendingRes.data)
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

      // Call edge function to send email (don't block UI on it failing)
      if (trainee?.email) {
        supabase.functions.invoke('send-enrollment-email', {
          body: {
            email: trainee.email,
            name: trainee.full_name || 'Trainee',
            courseTitle: course?.title || 'Course',
            action: action
          }
        }).catch(console.error)
      }

      // Add a notification for the trainee
      const { error: notificationError } = await supabase.from('notifications').insert({
        user_id: trainee.id,
        type: 'enrollment_status',
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
    return <TrainerLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-ink" /></div></TrainerLayout>
  }

  if (!course) {
    return (
      <TrainerLayout>
        <div className="max-w-3xl mx-auto py-20 text-center">
          <p className="text-ink/60 mb-4">Course not found or you don't have access.</p>
          <RouterLink to="/trainer/courses"><Button variant="outline" className="border-ink/20 text-ink">Back to Courses</Button></RouterLink>
        </div>
      </TrainerLayout>
    )
  }

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-4xl mx-auto space-y-6">
        <motion.div variants={fadeUp}>
          <RouterLink to="/trainer/courses" className="flex items-center gap-2 text-sm text-ink/60 hover:text-ink transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Courses
          </RouterLink>
        </motion.div>

        <motion.div variants={fadeUp} className="p-6 rounded-2xl bg-cream border border-ink/10 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-start gap-4 mb-4">
              {/* Thumbnail */}
              {course.thumbnail_path && (
                <div className="w-24 h-18 rounded-lg bg-ink/10 border border-ink/10 overflow-hidden shrink-0">
                  <Thumbnail path={course.thumbnail_path} alt={course.title} />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <Badge className={`${statusColors[course.status]} text-[10px] mb-2`}>{course.status.replace('_', ' ')}</Badge>
                    <h1 className="text-2xl font-bold text-ink">{course.title}</h1>
                  </div>
                  <RouterLink to={`/trainer/courses/${courseId}/edit`}>
                    <Button size="sm" className="bg-ink hover:bg-ink/90 text-cream"><Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit</Button>
                  </RouterLink>
                </div>
                <p className="text-sm text-ink/60 mb-4">{course.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-ink/50 mb-4">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {course.duration_minutes ? Math.floor(course.duration_minutes / 60) : 0} hours</span>
                  <span>{course.course_type === 'standard' ? 'Standard' : 'Scenario'} Training</span>
                  <span>{course.department || 'General'}</span>
                  <span className="capitalize flex items-center gap-1"><Video className="w-3.5 h-3.5" /> {course.delivery_mode || 'recorded'}</span>
                  <span>Pass: {course.passing_score}%</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {enrollmentCount} {course.max_trainees ? `/ ${course.max_trainees}` : ''} enrolled</span>
                </div>

                {/* Pending Enrollments Section */}
                <div className="mb-4">
                  <Card className="bg-orange-50/30 border-orange-200">
                    <CardContent className="p-6">
                      <h3 className="text-sm font-semibold text-orange-900 mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-600" /> Pending Enrollment Requests
                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 ml-2">{pendingEnrollments.length}</Badge>
                      </h3>
                      <div className="space-y-3">
                        {pendingEnrollments.length > 0 ? (
                          pendingEnrollments.map((enrollment) => (
                            <div key={enrollment.id} className="p-4 rounded-xl bg-white border border-orange-100 flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-semibold text-midnight">{enrollment.trainee?.full_name || 'Unknown Trainee'}</h4>
                                <p className="text-xs text-midnight/60">{enrollment.trainee?.email}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-8"
                                  disabled={isProcessingId === enrollment.id}
                                  onClick={() => handleApproval(enrollment.id, 'approve', enrollment.trainee)}
                                >
                                  {isProcessingId === enrollment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-rose-200 text-rose-700 hover:bg-rose-50 h-8"
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
                          <p className="text-xs text-orange-800/60">No pending enrollment requests at this time.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {(course.start_date || course.end_date || course.meet_link || course.live_class_timing || course.mock_test_timing || course.final_exam_timing) && (
                  <div className="bg-ink/5 p-4 rounded-lg space-y-3 mt-4">
                    <h4 className="text-xs font-bold text-ink flex items-center gap-2"><Calendar className="w-4 h-4" /> Schedule & Dates</h4>
                    {(course.start_date || course.end_date) && (
                      <div className="flex items-center gap-2 text-xs text-ink/70">
                        <span className="font-medium text-ink w-24">Course Span:</span> 
                        {course.start_date ? new Date(course.start_date).toLocaleDateString() : 'TBD'} 
                        {' - '} 
                        {course.end_date ? new Date(course.end_date).toLocaleDateString() : 'TBD'}
                        {course.start_date && course.end_date && (
                          <span className="ml-2 text-brand font-medium">
                            ({Math.max(1, Math.ceil((new Date(course.end_date).getTime() - new Date(course.start_date).getTime()) / (1000 * 60 * 60 * 24)))} days)
                          </span>
                        )}
                      </div>
                    )}
                    {course.meet_link && (
                      <div className="flex items-center gap-2 text-xs text-ink/70">
                        <span className="font-medium text-ink w-24">Meeting Link:</span> 
                        <a href={course.meet_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                          {course.meet_link}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {((course.planned_assessments_count || 0) > 0 || (course.planned_mock_tests_count || 0) > 0 || course.final_test_date) && (
                  <Card className="bg-white border-ink/10 mt-4">
                    <CardContent className="p-6 space-y-4">
                      <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                        <Target className="w-4 h-4 text-ink/60" /> Test & Assessment Plan
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {(course.planned_assessments_count || 0) > 0 && (
                          <div>
                            <span className="text-ink/60 block text-xs">Daily Assessments</span>
                            <span className="text-ink font-medium">{course.planned_assessments_count} Planned</span>
                          </div>
                        )}

                        {(course.planned_mock_tests_count || 0) > 0 && (
                          <div>
                            <span className="text-ink/60 block text-xs">Mock Tests</span>
                            <span className="text-ink font-medium">{course.planned_mock_tests_count} Planned</span>
                          </div>
                        )}
                        {course.final_test_date && (
                          <div className="col-span-2">
                            <span className="text-ink/60 block text-xs">Final Exam</span>
                            <div className="flex flex-col text-ink font-medium mt-1">
                              <span>{new Date(course.final_test_date).toLocaleDateString()}</span>
                              {(course.final_test_start_time || course.final_test_end_time) && (
                                <span className="text-xs text-ink/70">
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
            </div>
          </div>
        </motion.div>

        {/* Session Flow */}
        {(course.session_flow_text || course.session_flow_document_path) && (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border-ink/10">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-ink/60" /> Session Flow
                </h3>
                <div className="space-y-3">
                  {course.session_flow_text && (
                    <p className="text-xs text-ink/80 whitespace-pre-wrap">{course.session_flow_text}</p>
                  )}
                  {course.session_flow_document_path && (
                    <Button variant="outline" size="sm" onClick={async () => {
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
              </CardContent>
            </Card>
          </motion.div>
        )}

        {objectives && (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border-ink/10">
              <CardContent className="p-6 space-y-3">
                <h3 className="text-sm font-semibold text-ink">Learning Objectives</h3>
                {objectives.understand && <div><p className="text-xs text-ink font-medium">Understand</p><p className="text-sm text-ink/80">{objectives.understand}</p></div>}
                {objectives.able_to_do && <div><p className="text-xs text-ink font-medium">Able to Do</p><p className="text-sm text-ink/80">{objectives.able_to_do}</p></div>}
                {objectives.competencies_built && <div><p className="text-xs text-ink font-medium">Competencies Built</p><p className="text-sm text-ink/80">{objectives.competencies_built}</p></div>}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {courseSkills.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border-ink/10">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-ink mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {courseSkills.map(cs => (
                    <span key={cs.skill_id} className="px-3 py-1 rounded-full bg-ink/10 border border-ink/20 text-ink text-xs">
                      {cs.skills?.name ?? 'Unknown'}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {sessions.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border-ink/10">
              <CardContent className="p-6">
                <h3 className="text-sm font-semibold text-ink mb-4">Course Sessions</h3>
                <div className="space-y-3">
                  {sessions.map((session, index) => (
                    <div key={session.id} className="p-3 rounded-xl bg-ink/5 border border-ink/10">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">Session {index + 1}</Badge>
                        <h4 className="text-sm font-semibold text-ink">{session.title}</h4>
                      </div>
                      {session.description && <p className="text-xs text-ink/70 mt-1">{session.description}</p>}
                      <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-ink/60">
                        {session.start_time && (
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(session.start_time).toLocaleString()}</span>
                        )}
                        {session.meet_link && (
                          <a href={session.meet_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
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
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div variants={fadeUp}>
            <RouterLink to={`/trainer/courses/${courseId}/sessions`}>
              <Card className="bg-white border-ink/10 hover:border-ink/20 transition-all cursor-pointer h-full">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-ink/10 flex items-center justify-center"><Calendar className="w-5 h-5 text-ink" /></div>
                  <div><p className="text-sm font-medium text-ink">Sessions</p><p className="text-xs text-ink/50">{sessions.length} sessions</p></div>
                </CardContent>
              </Card>
            </RouterLink>
          </motion.div>
          <motion.div variants={fadeUp}>
            <RouterLink to={`/trainer/courses/${courseId}/materials`}>
              <Card className="bg-white border-ink/10 hover:border-ink/20 transition-all cursor-pointer h-full">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-ink/10 flex items-center justify-center"><FileText className="w-5 h-5 text-ink" /></div>
                  <div><p className="text-sm font-medium text-ink">Materials</p><p className="text-xs text-ink/50">{materials.length} files</p></div>
                </CardContent>
              </Card>
            </RouterLink>
          </motion.div>
          <motion.div variants={fadeUp}>
            <RouterLink to={`/trainer/courses/${courseId}/assessments`}>
              <Card className="bg-white border-ink/10 hover:border-ink/20 transition-all cursor-pointer h-full">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-ink/10 flex items-center justify-center"><Target className="w-5 h-5 text-ink" /></div>
                  <div><p className="text-sm font-medium text-ink">Assessment</p><p className="text-xs text-ink/50">{assessment ? 'Created' : 'Not created'}</p></div>
                </CardContent>
              </Card>
            </RouterLink>
          </motion.div>
          <motion.div variants={fadeUp}>
            <RouterLink to={`/trainer/courses/${courseId}/performance`}>
              <Card className="bg-white border-ink/10 hover:border-ink/20 transition-all cursor-pointer h-full">
                <CardContent className="p-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-ink/10 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-ink" /></div>
                  <div><p className="text-sm font-medium text-ink">Performance</p><p className="text-xs text-ink/50">{enrollmentCount} trainees</p></div>
                </CardContent>
              </Card>
            </RouterLink>
          </motion.div>
        </div>
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
