import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Database } from '@/integrations/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { MaterialPreviewDialog } from '@/components/ui/MaterialPreviewDialog'
import { MoreHorizontal, BookOpen, Eye, FileText, Target, Clock, Users, Loader2, File, Video, Globe, ExternalLink, Download, Layers, Plus, CheckCircle2, XCircle, AlertCircle, ShieldAlert, Timer, Check, Sparkles, PlayCircle, HelpCircle, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { Textarea } from '@/components/ui/textarea'

type Course = Database['public']['Tables']['courses']['Row'] & {
  edit_request_status?: string | null
  edit_request_reason?: string | null
  edit_request_at?: string | null
  edit_window_expires_at?: string | null
  edit_window_duration_hours?: number | null
  admin_edit_notes?: string | null
}
type Material = Database['public']['Tables']['materials']['Row']
type CourseSkill = Database['public']['Tables']['course_skills']['Row'] & { skills: { name: string } | null }

function StatusBadge({ status, editStatus, windowExpiresAt }: { status: Course['status']; editStatus?: string | null; windowExpiresAt?: string | null }) {
  const isWindowActive = editStatus === 'approved' && windowExpiresAt && new Date(windowExpiresAt).getTime() > Date.now()

  if (editStatus === 'pending') {
    return <Badge className="text-[10px] font-semibold bg-amber-500 text-white border-none animate-pulse">⚠️ Edit Requested</Badge>
  }
  if (editStatus === 'submitted') {
    return <Badge className="text-[10px] font-semibold bg-indigo-600 text-white border-none">🔄 Updates Submitted</Badge>
  }
  if (isWindowActive) {
    return <Badge className="text-[10px] font-semibold bg-sky-500 text-white border-none">⏱️ Edit Window Open</Badge>
  }

  const styles: Record<Course['status'], string> = {
    published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    pending_review: 'bg-amber-50 text-amber-700 border border-amber-200',
    draft: 'bg-slate-100 text-slate-700 border border-slate-200',
    archived: 'bg-rose-50 text-rose-700 border border-rose-200',
  }
  const labels: Record<Course['status'], string> = {
    draft: 'Draft',
    pending_review: 'Pending Review',
    published: 'Published',
    archived: 'Archived',
  }
  return <Badge className={`text-[10px] font-semibold ${styles[status]}`}>{labels[status]}</Badge>
}

function getMaterialIcon(mimeType: string | null) {
  if (!mimeType) return File
  if (mimeType.startsWith('video/')) return Video
  if (mimeType.includes('pdf')) return FileText
  if (mimeType === 'text/uri-list') return Globe
  return File
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AdminCourses() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'admin_created' | 'trainer_submitted' | 'edit_requests'>('all')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [skills, setSkills] = useState<CourseSkill[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [enrollmentCount, setEnrollmentCount] = useState(0)
  const [pendingEnrollments, setPendingEnrollments] = useState<any[]>([])
  const [updating, setUpdating] = useState<string | null>(null)
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null)

  // Edit Request Management Dialog State
  const [editRequestModalCourse, setEditRequestModalCourse] = useState<Course | null>(null)
  const [editRequestHours, setEditRequestHours] = useState<number>(24)
  const [customHours, setCustomHours] = useState<string>('')
  const [adminNotes, setAdminNotes] = useState<string>('')
  const [isSubmittingEditDecision, setIsSubmittingEditDecision] = useState(false)

  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [editMaxTrainees, setEditMaxTrainees] = useState(false)
  const [newMaxTrainees, setNewMaxTrainees] = useState<string>('')

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select(`
          *,
          trainer:trainers!courses_trainer_id_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false })
      if (coursesError) throw coursesError

      const { data: assignmentsData, error: assignmentsError } = await (supabase as any)
        .from('course_assignments')
        .select('id, course_id')

      const assignments = assignmentsError ? [] : (assignmentsData ?? [])

      const coursesWithAssignments = (coursesData ?? []).map(course => ({
        ...course,
        course_assignments: assignments.filter((a: any) => a.course_id === course.id)
      }))

      setCourses(coursesWithAssignments as any)
    } catch (err: any) {
      const message = err?.message || 'Failed to load courses'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCourses() }, [fetchCourses])

  const openCourseDetail = async (course: Course) => {
    setSelectedCourse(course)
    setDetailOpen(true)
    setEditMaxTrainees(false)
    setNewMaxTrainees(course.max_trainees ? String(course.max_trainees) : '')
    setDetailLoading(true)
    try {
      const [mRes, sRes, eRes, sessRes, pRes, modRes] = await Promise.all([
        supabase.from('materials').select('*').eq('course_id', course.id).order('created_at', { ascending: false }),
        supabase.from('course_skills').select('*, skills(name)').eq('course_id', course.id),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('course_id', course.id).neq('status', 'pending_approval'),
        supabase.from('course_sessions').select('*').eq('course_id', course.id).order('order_index'),
        supabase.from('enrollments').select('*').eq('course_id', course.id).eq('status', 'pending_approval'),
        (supabase as any).from('course_modules').select('*, quiz_questions:quiz_questions(*)').eq('course_id', course.id).order('order_index', { ascending: true }),
      ])

      let mergedPending: any[] = []
      if (pRes.data && pRes.data.length > 0) {
        const userIds = pRes.data.map(e => e.user_id)
        const { data: traineesData } = await supabase.from('trainees').select('id, full_name, email').in('id', userIds)
        mergedPending = pRes.data.map(e => ({
          ...e,
          trainee: traineesData?.find(t => t.id === e.user_id) || { full_name: 'Unknown Trainee', email: '' }
        }))
      }

      setMaterials(mRes.data ?? [])
      setSkills(sRes.data as any ?? [])
      setEnrollmentCount(eRes.count ?? 0)
      setSessions(sessRes.data ?? [])
      setPendingEnrollments(mergedPending)
      setModules((modRes as any)?.data ?? [])
    } catch {
      toast.error('Failed to load course details')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleGrantEditWindow = async () => {
    if (!editRequestModalCourse) return
    setIsSubmittingEditDecision(true)
    try {
      const duration = customHours ? parseInt(customHours, 10) : editRequestHours
      if (!duration || duration <= 0) {
        toast.error('Please specify a valid time limit in hours')
        return
      }
      const expiresAt = new Date(Date.now() + duration * 3600 * 1000).toISOString()

      const { error } = await supabase
        .from('courses')
        .update({
          edit_request_status: 'approved',
          edit_window_duration_hours: duration,
          edit_window_expires_at: expiresAt,
          admin_edit_notes: adminNotes.trim() || null,
        } as any)
        .eq('id', editRequestModalCourse.id)
      if (error) throw error

      if (editRequestModalCourse.trainer_id) {
        await supabase.from('notifications').insert({
          user_id: editRequestModalCourse.trainer_id,
          title: 'Course Edit Window Granted! ⏱️',
          message: `Admin granted you ${duration} hours to edit "${editRequestModalCourse.title}". Your window is active until ${new Date(expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} on ${new Date(expiresAt).toLocaleDateString()}. ${adminNotes ? `Admin notes: ${adminNotes}` : ''}`,
          type: 'course'
        })
      }

      toast.success(`Edit window of ${duration} hours granted to trainer!`)
      setEditRequestModalCourse(null)
      fetchCourses()
      if (selectedCourse?.id === editRequestModalCourse.id) {
        setSelectedCourse({
          ...selectedCourse,
          edit_request_status: 'approved',
          edit_window_duration_hours: duration,
          edit_window_expires_at: expiresAt,
          admin_edit_notes: adminNotes.trim() || null
        })
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to grant edit window')
    } finally {
      setIsSubmittingEditDecision(false)
    }
  }

  const handleRejectEditRequest = async () => {
    if (!editRequestModalCourse) return
    setIsSubmittingEditDecision(true)
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          edit_request_status: 'rejected',
          admin_edit_notes: adminNotes.trim() || 'Request declined by admin',
        } as any)
        .eq('id', editRequestModalCourse.id)
      if (error) throw error

      if (editRequestModalCourse.trainer_id) {
        await supabase.from('notifications').insert({
          user_id: editRequestModalCourse.trainer_id,
          title: 'Course Edit Request Declined',
          message: `Admin declined your request to edit "${editRequestModalCourse.title}". ${adminNotes ? `Reason: ${adminNotes}` : ''}`,
          type: 'course'
        })
      }

      toast.info('Edit request declined')
      setEditRequestModalCourse(null)
      fetchCourses()
      if (selectedCourse?.id === editRequestModalCourse.id) {
        setSelectedCourse({
          ...selectedCourse,
          edit_request_status: 'rejected',
          admin_edit_notes: adminNotes.trim() || null
        })
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to decline request')
    } finally {
      setIsSubmittingEditDecision(false)
    }
  }

  const handleReApproveCourse = async (courseId: string, trainerId?: string | null, courseTitle?: string) => {
    setUpdating(courseId)
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          status: 'published',
          edit_request_status: 'none',
          edit_window_expires_at: null,
          edit_request_reason: null,
          admin_edit_notes: null
        } as any)
        .eq('id', courseId)
      if (error) throw error

      if (trainerId) {
        await supabase.from('notifications').insert({
          user_id: trainerId,
          title: 'Course Updates Approved & Live! 🎉',
          message: `Your updates for "${courseTitle || 'the course'}" have been reviewed and approved by the admin. The course is now published.`,
          type: 'course'
        })
      }

      toast.success('Course updates approved and published successfully!')
      fetchCourses()
      if (selectedCourse?.id === courseId) {
        setSelectedCourse({
          ...selectedCourse,
          status: 'published',
          edit_request_status: 'none',
          edit_window_expires_at: null
        })
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve course updates')
    } finally {
      setUpdating(null)
    }
  }

  const handleApproval = async (enrollmentId: string, action: 'approve' | 'reject', trainee: any, course: Course) => {
    setIsProcessingId(enrollmentId)
    try {
      const newStatus = action === 'approve' ? 'enrolled' : 'rejected'

      const { error: updateError } = await supabase
        .from('enrollments')
        .update({ status: newStatus })
        .eq('id', enrollmentId)

      if (updateError) throw updateError

      await supabase.from('notifications').insert({
        user_id: trainee.id,
        title: action === 'approve' ? 'Enrollment Approved! 🎉' : 'Enrollment Update',
        message: action === 'approve'
          ? `Your enrollment for ${course.title} has been approved. You can now access all course materials.`
          : `Your enrollment request for ${course.title} was not approved.`,
        type: 'enrollment'
      })

      setPendingEnrollments(prev => prev.filter(e => e.id !== enrollmentId))
      if (action === 'approve') setEnrollmentCount(c => c + 1)
      toast.success(`Trainee enrollment ${action === 'approve' ? 'approved' : 'rejected'}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update enrollment')
    } finally {
      setIsProcessingId(null)
    }
  }

  const handleUpdateMaxTrainees = async () => {
    if (!selectedCourse) return
    setUpdating(selectedCourse.id)
    try {
      const parsed = newMaxTrainees === '' ? null : parseInt(newMaxTrainees, 10)
      if (newMaxTrainees !== '' && isNaN(parsed!)) {
        toast.error('Please enter a valid number')
        return
      }
      const { error } = await supabase
        .from('courses')
        .update({ max_trainees: parsed })
        .eq('id', selectedCourse.id)
      if (error) throw error
      setSelectedCourse({ ...selectedCourse, max_trainees: parsed })
      setCourses(courses.map(c => c.id === selectedCourse.id ? { ...c, max_trainees: parsed } : c))
      setEditMaxTrainees(false)
      toast.success('Course capacity updated')
    } catch {
      toast.error('Failed to update capacity')
    } finally {
      setUpdating(null)
    }
  }

  const updateCourseStatus = async (id: string, status: Course['status']) => {
    setUpdating(id)
    try {
      const { error } = await supabase
        .from('courses')
        .update({ status })
        .eq('id', id)
      if (error) throw error
      setCourses(courses.map(c => c.id === id ? { ...c, status } : c))
      if (selectedCourse?.id === id) {
        setSelectedCourse({ ...selectedCourse, status })
      }
      toast.success(`Course status updated to ${status}`)
    } catch {
      toast.error('Failed to update course status')
    } finally {
      setUpdating(null)
    }
  }

  const objectives = selectedCourse?.learning_objectives as any

  return (
    <>
      <Card className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 space-y-4 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-900 text-base font-bold">
                <BookOpen className="h-5 w-5 text-cyan-600" />
                Course Management
              </CardTitle>
              <CardDescription className="text-slate-500 text-xs">Review, approve, publish or archive courses.</CardDescription>
            </div>
            <Button
              onClick={() => navigate('/admin/courses/new')}
              className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold rounded-xl px-4 py-2 h-9 text-xs shadow-md shadow-cyan-600/20 hover:scale-105 transition-all"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Course
            </Button>
          </div>

          <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit gap-1">
            {(['all', 'admin_created', 'trainer_submitted', 'edit_requests'] as const).map(f => {
              const editCount = courses.filter(c => c.edit_request_status === 'pending').length
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${filter === f ? 'bg-white text-cyan-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                >
                  {f === 'all' && 'All Courses'}
                  {f === 'admin_created' && 'Admin Created'}
                  {f === 'trainer_submitted' && 'Trainer Submitted'}
                  {f === 'edit_requests' && (
                    <>
                      <span>Edit Requests</span>
                      {editCount > 0 && (
                        <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-bold">
                          {editCount}
                        </span>
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
            </div>
          ) : courses.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-12">No courses found.</p>
          ) : (
            <div className="space-y-3.5">
              {courses
                .filter(course => {
                  const isAdminCreated = (course as any).course_assignments && (course as any).course_assignments.length > 0;
                  if (filter === 'admin_created') return isAdminCreated;
                  if (filter === 'trainer_submitted') return !isAdminCreated;
                  if (filter === 'edit_requests') return course.edit_request_status === 'pending' || course.edit_request_status === 'submitted';
                  return true;
                })
                .map(course => {
                  const isUrgent = (course.status === 'pending_review' && course.start_date && (new Date(course.start_date).getTime() < Date.now() + 30 * 24 * 60 * 60 * 1000)) || course.edit_request_status === 'pending';
                  return { ...course, isUrgent };
                })
                .sort((a, b) => {
                  if (a.edit_request_status === 'pending' && b.edit_request_status !== 'pending') return -1;
                  if (a.edit_request_status !== 'pending' && b.edit_request_status === 'pending') return 1;
                  if (a.isUrgent && !b.isUrgent) return -1;
                  if (!a.isUrgent && b.isUrgent) return 1;
                  return 0;
                })
                .map(course => {
                  const trainer = (course as any).trainer
                  return (
                    <div key={course.id} className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl ${course.edit_request_status === 'pending' ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-200' : course.isUrgent ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50/70 hover:bg-slate-50 border-slate-200'} border transition-all`}>
                      {/* Thumbnail */}
                      <div className="w-20 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                        <Thumbnail path={course.thumbnail_path} alt={course.title} fallbackIcon={<BookOpen className="w-6 h-6 text-cyan-600" />} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-sm font-bold text-slate-900 truncate">{course.title}</h3>
                          <StatusBadge status={course.status} editStatus={course.edit_request_status} windowExpiresAt={course.edit_window_expires_at} />
                          {course.edit_request_status === 'pending' && (
                            <Badge className="bg-amber-600 text-white text-[10px] font-bold">
                              Needs Review
                            </Badge>
                          )}
                          {course.isUrgent && course.edit_request_status !== 'pending' && <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px]">🚨 URGENT</Badge>}
                        </div>
                        {course.edit_request_reason && course.edit_request_status === 'pending' ? (
                          <p className="text-xs text-amber-900 font-medium line-clamp-1 mb-1.5 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-200">
                            Reason: "{course.edit_request_reason}"
                          </p>
                        ) : (
                          <p className="text-xs text-slate-500 line-clamp-1 mb-1.5">{course.description || 'No description provided.'}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-medium">
                          <span className="capitalize px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">{course.course_type}</span>
                          <span>{course.department || 'General'}</span>
                          {trainer?.full_name && <span>taught by {trainer.full_name}</span>}
                          {((course as any).course_assignments && (course as any).course_assignments.length > 0) && (
                            <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-md text-[9px] font-bold tracking-wider uppercase">Admin Created</span>
                          )}
                          <span>{course.created_at ? formatDistanceToNow(new Date(course.created_at), { addSuffix: true }) : ''}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {course.edit_request_status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setEditRequestModalCourse(course)
                              setEditRequestHours(24)
                              setCustomHours('')
                              setAdminNotes('')
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white h-8 rounded-xl text-xs font-bold shadow-xs"
                          >
                            <Timer className="w-3.5 h-3.5 mr-1" /> Review Edit Request
                          </Button>
                        )}
                        {course.edit_request_status === 'submitted' && (
                          <Button
                            size="sm"
                            onClick={() => handleReApproveCourse(course.id, course.trainer_id, course.title)}
                            disabled={updating === course.id}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 rounded-xl text-xs font-bold shadow-xs"
                          >
                            {updating === course.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                            Approve Updates
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCourseDetail(course)}
                          className="border-slate-200 text-slate-700 hover:bg-slate-100 h-8 rounded-xl text-xs font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 rounded-xl hover:bg-slate-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border-slate-200 rounded-2xl shadow-lg text-slate-800">
                            {course.edit_request_status === 'pending' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditRequestModalCourse(course)
                                  setEditRequestHours(24)
                                  setCustomHours('')
                                  setAdminNotes('')
                                }}
                                className="text-amber-700 font-bold"
                              >
                                Review Edit Request
                              </DropdownMenuItem>
                            )}
                            {course.edit_request_status === 'submitted' && (
                              <DropdownMenuItem
                                onClick={() => handleReApproveCourse(course.id, course.trainer_id, course.title)}
                                className="text-indigo-700 font-bold"
                              >
                                Re-Approve & Publish Updates
                              </DropdownMenuItem>
                            )}
                            {course.status === 'pending_review' && (
                              <DropdownMenuItem onClick={() => updateCourseStatus(course.id, 'published')} className="text-emerald-700 font-medium">
                                Approve & Publish
                              </DropdownMenuItem>
                            )}
                            {course.status === 'pending_review' && (
                              <DropdownMenuItem onClick={() => updateCourseStatus(course.id, 'draft')}>
                                Return to Draft
                              </DropdownMenuItem>
                            )}
                            {course.status === 'published' && (
                              <DropdownMenuItem onClick={() => updateCourseStatus(course.id, 'archived')} className="text-rose-600">
                                Archive
                              </DropdownMenuItem>
                            )}
                            {course.status === 'archived' && (
                              <DropdownMenuItem onClick={() => updateCourseStatus(course.id, 'published')}>
                                Re-publish
                              </DropdownMenuItem>
                            )}
                            {course.status === 'draft' && (
                              <DropdownMenuItem onClick={() => updateCourseStatus(course.id, 'published')}>
                                Publish Directly
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => navigate(`/admin/courses/${course.id}/edit`)}>
                              Edit Course (Admin)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto bg-white border-slate-200 rounded-3xl shadow-2xl">
          {selectedCourse && (
            <>
              <DialogHeader>
                <DialogTitle className="text-slate-900 flex items-center justify-between gap-2 font-bold w-full pr-6">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-cyan-600" />
                    Course Overview & Review
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-cyan-200 text-cyan-700 hover:bg-cyan-50 h-8 text-xs font-bold"
                      onClick={() => window.open(`/trainer/courses/${selectedCourse.id}/learn`, '_blank')}
                    >
                      <PlayCircle className="w-3.5 h-3.5 mr-1" /> Preview Trainee Player ↗
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs font-medium" onClick={() => navigate(`/admin/courses/${selectedCourse.id}/edit`)}>
                      Edit Course
                    </Button>
                  </div>
                </DialogTitle>
              </DialogHeader>

              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Edit Request Action Banner if pending */}
                  {selectedCourse.edit_request_status === 'pending' && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 ring-1 ring-amber-200/50 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Timer className="w-5 h-5 text-amber-600 shrink-0" />
                          <div>
                            <h4 className="text-sm font-bold text-amber-950">Trainer Requested Edit Permission</h4>
                            <p className="text-xs text-amber-700">
                              Requested {selectedCourse.edit_request_at ? formatDistanceToNow(new Date(selectedCourse.edit_request_at), { addSuffix: true }) : 'recently'}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditRequestModalCourse(selectedCourse)
                            setEditRequestHours(24)
                            setCustomHours('')
                            setAdminNotes('')
                          }}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 shadow-xs shrink-0"
                        >
                          Review & Set Time Limit
                        </Button>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-amber-200 text-xs text-slate-800">
                        <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] block mb-1">Reason Stated by Trainer:</span>
                        <p className="italic">{selectedCourse.edit_request_reason || 'No description provided.'}</p>
                      </div>
                    </div>
                  )}

                  {/* Changes submitted banner */}
                  {selectedCourse.edit_request_status === 'submitted' && (
                    <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
                        <div>
                          <h4 className="text-sm font-bold text-indigo-950">Trainer Finished Updates</h4>
                          <p className="text-xs text-indigo-700">Course changes submitted for final admin review & re-publication.</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleReApproveCourse(selectedCourse.id, selectedCourse.trainer_id, selectedCourse.title)}
                        disabled={updating === selectedCourse.id}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 shadow-xs shrink-0"
                      >
                        {updating === selectedCourse.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                        Re-Approve & Publish
                      </Button>
                    </div>
                  )}

                  {/* Thumbnail + Basic Info */}
                  <div className="flex gap-4">
                    {selectedCourse.thumbnail_path && (
                      <div className="w-32 h-24 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                        <Thumbnail path={selectedCourse.thumbnail_path} alt={selectedCourse.title} />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-slate-900">{selectedCourse.title}</h3>
                        <StatusBadge status={selectedCourse.status} editStatus={selectedCourse.edit_request_status} windowExpiresAt={selectedCourse.edit_window_expires_at} />
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{selectedCourse.description}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className="capitalize">{selectedCourse.course_type} Training</span>
                        <span>{selectedCourse.department || 'General'}</span>
                        <span>{selectedCourse.duration_minutes ? `${selectedCourse.duration_minutes} min` : 'Self-paced'}</span>
                        <span>Pass: {selectedCourse.passing_score}%</span>
                        <span>{enrollmentCount} enrolled</span>
                      </div>
                    </div>
                  </div>

                  {/* Course Modules Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        <Layers className="w-4 h-4 text-cyan-600" /> Course Modules & Content Sequence ({modules.length})
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                        Sequential Progression (≥80% quiz gate)
                      </Badge>
                    </div>
                    <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
                      {modules.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">No modules added yet.</p>
                      ) : (
                        modules.map((mod: any, mIdx: number) => {
                          const steps = (mod.content_steps && Array.isArray(mod.content_steps)) ? mod.content_steps : []
                          const quizQuestions = mod.quiz_questions || []
                          return (
                            <div key={mod.id || mIdx} className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2.5 shadow-xs">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-6 h-6 rounded-lg bg-cyan-100 text-cyan-800 font-bold text-xs flex items-center justify-center">
                                    {mIdx + 1}
                                  </div>
                                  <div>
                                    <h5 className="text-sm font-bold text-slate-900">{mod.title}</h5>
                                    {mod.description && <p className="text-xs text-slate-500 line-clamp-1">{mod.description}</p>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {steps.length > 0 && (
                                    <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200 text-slate-600">
                                      {steps.length} sequential steps
                                    </Badge>
                                  )}
                                  {quizQuestions.length > 0 && (
                                    <Badge className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-semibold">
                                      {quizQuestions.length} Quiz Qs (≥80% Pass Gate)
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Content Steps Pills */}
                              {steps.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {steps.map((st: any, sIdx: number) => (
                                    <span key={st.id || sIdx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] text-slate-700 font-medium">
                                      <span className="text-[9px] text-slate-400 font-bold">#{sIdx + 1}</span>
                                      {st.step_type === 'video' && <Video className="w-3 h-3 text-rose-500" />}
                                      {st.step_type === 'photo' && <ImageIcon className="w-3 h-3 text-cyan-600" />}
                                      {st.step_type === 'text' && <FileText className="w-3 h-3 text-emerald-600" />}
                                      <span className="truncate max-w-[150px]">{st.title || st.step_type}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Trainer Suggestion */}
                  {selectedCourse.trainer_suggestion && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
                        <AlertCircle className="w-4 h-4 text-amber-600" /> Notice / Suggestion from Trainer
                      </div>
                      <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">
                        {selectedCourse.trainer_suggestion}
                      </p>
                    </div>
                  )}

                  {/* Capacity & Limits */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <Users className="w-3.5 h-3.5" /> Capacity & Limits
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between border border-slate-200">
                      <div>
                        <span className="text-slate-500 block text-xs">Max Trainees</span>
                        {editMaxTrainees ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              type="number"
                              value={newMaxTrainees}
                              onChange={e => setNewMaxTrainees(e.target.value)}
                              className="w-24 h-8 text-sm bg-white"
                            />
                            <Button size="sm" className="h-8 bg-cyan-600 hover:bg-cyan-700 text-white" onClick={handleUpdateMaxTrainees} disabled={!!updating}>Save</Button>
                            <Button size="sm" variant="ghost" className="h-8" onClick={() => {
                              setEditMaxTrainees(false)
                              setNewMaxTrainees(selectedCourse.max_trainees ? String(selectedCourse.max_trainees) : '')
                            }}>Cancel</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-slate-900 font-medium">{selectedCourse.max_trainees ?? 'Unlimited'}</span>
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-cyan-700" onClick={() => setEditMaxTrainees(true)}>
                              Edit
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pending Enrollments */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-amber-700 uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5" /> Pending Enrollments ({pendingEnrollments.length})
                    </div>
                    <div className="bg-amber-50/50 rounded-lg p-3 border border-amber-200 space-y-2">
                      {pendingEnrollments.length > 0 ? (
                        pendingEnrollments.map((enrollment) => (
                          <div key={enrollment.id} className="p-3 rounded-lg bg-white border border-amber-200 flex items-center justify-between">
                            <div>
                              <h4 className="text-xs font-semibold text-slate-900">{enrollment.trainee?.full_name || 'Unknown Trainee'}</h4>
                              <p className="text-[10px] text-slate-500">{enrollment.trainee?.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 h-7 text-[10px] px-2"
                                disabled={isProcessingId === enrollment.id}
                                onClick={() => handleApproval(enrollment.id, 'approve', enrollment.trainee, selectedCourse!)}
                              >
                                {isProcessingId === enrollment.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-rose-200 text-rose-700 hover:bg-rose-50 h-7 text-[10px] px-2"
                                disabled={isProcessingId === enrollment.id}
                                onClick={() => handleApproval(enrollment.id, 'reject', enrollment.trainee, selectedCourse!)}
                              >
                                {isProcessingId === enrollment.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-amber-800/70 p-2 text-center">No pending enrollment requests at this time.</p>
                      )}
                    </div>
                  </div>

                  {/* Schedule & Dates */}
                  {(selectedCourse.start_date || selectedCourse.end_date || selectedCourse.meet_link) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5" /> Schedule & Dates
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
                        {(selectedCourse.start_date || selectedCourse.end_date) && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-slate-500 w-24 block">Course Span:</span>
                            <span className="text-slate-900 font-medium">
                              {selectedCourse.start_date ? new Date(selectedCourse.start_date).toLocaleDateString() : 'TBD'} -{' '}
                              {selectedCourse.end_date ? new Date(selectedCourse.end_date).toLocaleDateString() : 'TBD'}
                            </span>
                            {selectedCourse.start_date && selectedCourse.end_date && (
                              <span className="text-xs text-slate-500 ml-2">
                                ({Math.max(1, Math.ceil((new Date(selectedCourse.end_date).getTime() - new Date(selectedCourse.start_date).getTime()) / (1000 * 60 * 60 * 24)))} days)
                              </span>
                            )}
                          </div>
                        )}
                        {selectedCourse.meet_link && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 w-24 block">Meeting Link:</span>
                            <a href={selectedCourse.meet_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                              {selectedCourse.meet_link}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Course Materials */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        <FileText className="w-3.5 h-3.5" /> Course Materials ({materials.length})
                      </div>
                      <span className="text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                        Always uploadable & editable by trainer
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                      {materials.length > 0 ? (
                        <div className="space-y-2">
                          {materials.map(mat => {
                            const isLink = mat.material_type === 'link' || mat.material_type === 'video'
                            const Icon = getMaterialIcon(mat.mime_type)
                            return (
                              <div key={mat.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-slate-200">
                                <div className="w-8 h-8 rounded-md bg-cyan-50 flex items-center justify-center shrink-0">
                                  <Icon className="w-4 h-4 text-cyan-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-slate-900 truncate">{mat.file_name}</p>
                                  <p className="text-[10px] text-slate-500">
                                    {isLink ? mat.url : formatFileSize(mat.file_size)}
                                  </p>
                                </div>
                                <Badge className="text-[9px] h-4 bg-slate-100 text-slate-700 border-slate-200">
                                  {mat.material_type || 'file'}
                                </Badge>
                                {isLink && mat.url ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-slate-500 hover:text-slate-900"
                                    onClick={() => mat.url && window.open(mat.url, '_blank')}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Button>
                                ) : mat.storage_path ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-slate-500 hover:text-slate-900"
                                      onClick={async () => {
                                        try {
                                          const { data, error } = await supabase.storage.from('materials').createSignedUrl(mat.storage_path!, 3600)
                                          if (error) throw error
                                          if (data?.signedUrl) {
                                            setPreviewUrl(data.signedUrl)
                                            setPreviewMaterial(mat)
                                          }
                                        } catch {
                                          toast.error('Failed to preview file')
                                        }
                                      }}
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-slate-500 hover:text-slate-900"
                                      onClick={async () => {
                                        try {
                                          const { data, error } = await supabase.storage.from('materials').createSignedUrl(mat.storage_path!, 60, { download: true })
                                          if (error) throw error
                                          if (data?.signedUrl) window.open(data.signedUrl, '_blank')
                                        } catch {
                                          toast.error('Failed to download file')
                                        }
                                      }}
                                      title="Download"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-4">No materials uploaded yet</p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <DialogFooter className="gap-2">
                    {selectedCourse.edit_request_status === 'pending' && (
                      <Button
                        onClick={() => {
                          setEditRequestModalCourse(selectedCourse)
                          setEditRequestHours(24)
                          setCustomHours('')
                          setAdminNotes('')
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                      >
                        <Timer className="w-4 h-4 mr-2" />
                        Review Edit Request & Set Time Limit
                      </Button>
                    )}
                    {selectedCourse.edit_request_status === 'submitted' && (
                      <Button
                        onClick={() => handleReApproveCourse(selectedCourse.id, selectedCourse.trainer_id, selectedCourse.title)}
                        disabled={!!updating}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                      >
                        {updating === selectedCourse.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Re-Approve & Publish Updates
                      </Button>
                    )}
                    {selectedCourse.status === 'pending_review' && selectedCourse.edit_request_status !== 'submitted' && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => updateCourseStatus(selectedCourse.id, 'draft')}
                          disabled={!!updating}
                          className="border-slate-200 text-slate-700"
                        >
                          {updating === selectedCourse.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          Return to Draft
                        </Button>
                        <Button
                          onClick={() => updateCourseStatus(selectedCourse.id, 'published')}
                          disabled={!!updating}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          {updating === selectedCourse.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          Approve & Publish
                        </Button>
                      </>
                    )}
                    {selectedCourse.status === 'published' && (
                      <Button
                        variant="outline"
                        onClick={() => updateCourseStatus(selectedCourse.id, 'archived')}
                        disabled={!!updating}
                        className="border-rose-200 text-rose-700 hover:bg-rose-50"
                      >
                        {updating === selectedCourse.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Archive
                      </Button>
                    )}
                    {selectedCourse.status === 'draft' && (
                      <Button
                        onClick={() => updateCourseStatus(selectedCourse.id, 'published')}
                        disabled={!!updating}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
                      >
                        {updating === selectedCourse.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Publish Directly
                      </Button>
                    )}
                  </DialogFooter>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin Grant Edit Window Modal */}
      <Dialog open={!!editRequestModalCourse} onOpenChange={open => !open && setEditRequestModalCourse(null)}>
        <DialogContent className="max-w-lg bg-white border-slate-200 rounded-3xl shadow-2xl p-6">
          {editRequestModalCourse && (
            <div className="space-y-5">
              <DialogHeader>
                <DialogTitle className="text-slate-900 flex items-center gap-2 font-bold">
                  <Timer className="w-5 h-5 text-amber-600" />
                  Review Course Edit Request
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="font-bold text-slate-900 text-sm">{editRequestModalCourse.title}</div>
                  <div className="text-slate-500">
                    Trainer: <span className="font-medium text-slate-800">{(editRequestModalCourse as any).trainer?.full_name || 'Assigned Trainer'}</span>
                  </div>
                  {editRequestModalCourse.edit_request_at && (
                    <div className="text-slate-500">
                      Requested: <span className="text-slate-700">{formatDistanceToNow(new Date(editRequestModalCourse.edit_request_at), { addSuffix: true })}</span>
                    </div>
                  )}
                </div>

                {/* Trainer's Stated Reason */}
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
                    <AlertCircle className="w-4 h-4 text-amber-600" /> Stated Edit Reason / Changes:
                  </div>
                  <p className="text-sm text-amber-950 whitespace-pre-wrap leading-relaxed">
                    {editRequestModalCourse.edit_request_reason || 'No description provided.'}
                  </p>
                </div>

                {/* Time Limit Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Set Edit Window Duration (Time Limit) *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: '2 Hours', val: 2 },
                      { label: '6 Hours', val: 6 },
                      { label: '12 Hours', val: 12 },
                      { label: '24 Hours (1 Day)', val: 24 },
                      { label: '48 Hours (2 Days)', val: 48 },
                      { label: '7 Days (1 Week)', val: 168 },
                    ].map(opt => (
                      <button
                        type="button"
                        key={opt.val}
                        onClick={() => {
                          setEditRequestHours(opt.val)
                          setCustomHours('')
                        }}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center ${editRequestHours === opt.val && !customHours
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-200'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-slate-500 font-medium">Or custom hours:</span>
                    <Input
                      type="number"
                      placeholder="e.g. 36"
                      value={customHours}
                      onChange={e => {
                        setCustomHours(e.target.value)
                        if (e.target.value) {
                          setEditRequestHours(parseInt(e.target.value, 10) || 24)
                        }
                      }}
                      className="w-28 h-8 text-xs bg-white"
                      min={1}
                      max={720}
                    />
                    <span className="text-xs text-slate-500">hours</span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    The trainer will have a live countdown timer until the window expires. After editing, they will submit their updates for your re-approval.
                  </p>
                </div>

                {/* Admin Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Admin Instructions / Notes (Optional)
                  </label>
                  <Textarea
                    placeholder="e.g. Please update only the Module 3 quiz questions and syllabus notes."
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    className="text-xs min-h-[70px] bg-white"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRejectEditRequest}
                  disabled={isSubmittingEditDecision}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs"
                >
                  {isSubmittingEditDecision ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <XCircle className="w-3.5 h-3.5 mr-1" />}
                  Decline Request
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditRequestModalCourse(null)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleGrantEditWindow}
                    disabled={isSubmittingEditDecision}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20"
                  >
                    {isSubmittingEditDecision ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                    Grant {customHours || editRequestHours}h Window
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MaterialPreviewDialog
        material={previewMaterial}
        previewUrl={previewUrl}
        onClose={() => {
          setPreviewMaterial(null)
          setPreviewUrl(null)
        }}
        onDownload={async () => {
          if (!previewMaterial?.storage_path) return
          try {
            const { data, error } = await supabase.storage.from('materials').createSignedUrl(previewMaterial.storage_path, 60, { download: true })
            if (error) throw error
            if (data?.signedUrl) window.open(data.signedUrl, '_blank')
          } catch {
            toast.error('Failed to download file')
          }
        }}
      />
    </>
  )
}
