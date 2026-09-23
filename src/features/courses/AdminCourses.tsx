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
import { MoreHorizontal, BookOpen, Eye, FileText, Target, Clock, Users, Loader2, File, Video, Globe, ExternalLink, Download, Layers, Plus, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

type Course = Database['public']['Tables']['courses']['Row']
type Material = Database['public']['Tables']['materials']['Row']
type CourseSkill = Database['public']['Tables']['course_skills']['Row'] & { skills: { name: string } | null }

function StatusBadge({ status }: { status: Course['status'] }) {
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
  const [filter, setFilter] = useState<'all' | 'admin_created' | 'trainer_submitted'>('all')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [skills, setSkills] = useState<CourseSkill[]>([])
  const [enrollmentCount, setEnrollmentCount] = useState(0)
  const [pendingEnrollments, setPendingEnrollments] = useState<any[]>([])
  const [updating, setUpdating] = useState<string | null>(null)
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null)
  
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
          trainer:trainers!courses_trainer_id_fkey(full_name)
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
      const [mRes, sRes, eRes, sessRes, pRes] = await Promise.all([
        supabase.from('materials').select('*').eq('course_id', course.id).order('created_at', { ascending: false }),
        supabase.from('course_skills').select('*, skills(name)').eq('course_id', course.id),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('course_id', course.id).neq('status', 'pending_approval'),
        supabase.from('course_sessions').select('*').eq('course_id', course.id).order('order_index'),
        supabase.from('enrollments').select('*').eq('course_id', course.id).eq('status', 'pending_approval'),
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
    } catch {
      toast.error('Failed to load course details')
    } finally {
      setDetailLoading(false)
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
          
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
            {(['all', 'admin_created', 'trainer_submitted'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === f ? 'bg-white text-cyan-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {f === 'all' ? 'All Courses' : f === 'admin_created' ? 'Admin Created' : 'Trainer Submitted'}
              </button>
            ))}
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
                  return true;
                })
                .map(course => {
                  const isUrgent = course.status === 'pending_review' && course.start_date && (new Date(course.start_date).getTime() < Date.now() + 30 * 24 * 60 * 60 * 1000);
                  return { ...course, isUrgent };
                })
                .sort((a, b) => {
                  if (a.isUrgent && !b.isUrgent) return -1;
                  if (!a.isUrgent && b.isUrgent) return 1;
                  return 0;
                })
                .map(course => {
                const trainer = (course as any).trainer
                return (
                  <div key={course.id} className={`flex items-center gap-4 p-4 rounded-2xl ${course.isUrgent ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50/70 hover:bg-slate-50 border-slate-200'} border transition-all`}>
                    {/* Thumbnail */}
                    <div className="w-20 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                      <Thumbnail path={course.thumbnail_path} alt={course.title} fallbackIcon={<BookOpen className="w-6 h-6 text-cyan-600" />} />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{course.title}</h3>
                        <StatusBadge status={course.status} />
                        {course.isUrgent && <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px]">🚨 URGENT</Badge>}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1 mb-1.5">{course.description || 'No description provided.'}</p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
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
                    <div className="flex items-center gap-2 shrink-0">
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white border-slate-200 rounded-3xl shadow-2xl">
          {selectedCourse && (
            <>
              <DialogHeader>
                <DialogTitle className="text-slate-900 flex items-center justify-between gap-2 font-bold w-full pr-6">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-cyan-600" />
                    Course Details
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/admin/courses/${selectedCourse.id}/edit`)}>
                    Edit Course
                  </Button>
                </DialogTitle>
              </DialogHeader>

              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
                </div>
              ) : (
                <div className="space-y-5">
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
                        <StatusBadge status={selectedCourse.status} />
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

                  {/* Test & Assessment Plan */}
                  {((selectedCourse.planned_assessments_count || 0) > 0 || (selectedCourse.planned_mock_tests_count || 0) > 0 || selectedCourse.final_test_date) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        <Target className="w-3.5 h-3.5" /> Test & Assessment Plan
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-2 gap-4 text-sm">
                        {(selectedCourse.planned_assessments_count || 0) > 0 && (
                          <div>
                            <span className="text-slate-500 block text-xs">Daily Assessments</span>
                            <span className="text-slate-900 font-medium">{selectedCourse.planned_assessments_count} Planned</span>
                          </div>
                        )}
                        {(selectedCourse.planned_mock_tests_count || 0) > 0 && (
                          <div>
                            <span className="text-slate-500 block text-xs">Mock Tests</span>
                            <span className="text-slate-900 font-medium">{selectedCourse.planned_mock_tests_count} Planned</span>
                          </div>
                        )}
                        {selectedCourse.final_test_date && (
                          <div className="col-span-2">
                            <span className="text-slate-500 block text-xs">Final Exam</span>
                            <div className="flex flex-col text-slate-900 font-medium mt-1">
                              <span>{new Date(selectedCourse.final_test_date).toLocaleDateString()}</span>
                              {(selectedCourse.final_test_start_time || selectedCourse.final_test_end_time) && (
                                <span className="text-xs text-slate-600">
                                  {selectedCourse.final_test_start_time ? new Date(`2000-01-01T${selectedCourse.final_test_start_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''} 
                                  {selectedCourse.final_test_end_time ? ` - ${new Date(`2000-01-01T${selectedCourse.final_test_end_time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Session Flow */}
                  {(selectedCourse.session_flow_text || selectedCourse.session_flow_document_path) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        <BookOpen className="w-3.5 h-3.5" /> Session Flow
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm space-y-3">
                        {selectedCourse.session_flow_text && (
                          <p className="text-slate-700 whitespace-pre-wrap">{selectedCourse.session_flow_text}</p>
                        )}
                        {selectedCourse.session_flow_document_path && (
                          <Button variant="outline" size="sm" onClick={async () => {
                            try {
                              const { data, error } = await supabase.storage.from('materials').createSignedUrl(selectedCourse.session_flow_document_path!, 3600)
                              if (error) throw error
                              if (data?.signedUrl) {
                                setPreviewUrl(data.signedUrl)
                                setPreviewMaterial({ file_name: 'Session Flow Document', material_type: 'file', storage_path: selectedCourse.session_flow_document_path } as any)
                              }
                            } catch {
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

                  {/* Learning Objectives */}
                  {objectives && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        <Target className="w-3.5 h-3.5" /> Learning Objectives
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                        {objectives.understand && (
                          <div><span className="text-[10px] text-slate-500 uppercase font-semibold">Understand</span><p className="text-sm text-slate-800">{objectives.understand}</p></div>
                        )}
                        {objectives.able_to_do && (
                          <div><span className="text-[10px] text-slate-500 uppercase font-semibold">Able to Do</span><p className="text-sm text-slate-800">{objectives.able_to_do}</p></div>
                        )}
                        {objectives.competencies_built && (
                          <div><span className="text-[10px] text-slate-500 uppercase font-semibold">Competencies</span><p className="text-sm text-slate-800">{objectives.competencies_built}</p></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {skills.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        <Target className="w-3.5 h-3.5" /> Required Skills
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {skills.map(cs => (
                            <span key={cs.skill_id} className="px-2.5 py-0.5 rounded-full text-[10px] bg-cyan-50 text-cyan-700 border border-cyan-200 font-semibold">
                              {cs.skills?.name ?? 'Unknown'}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Course Sessions */}
                  {sessions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                        <Layers className="w-3.5 h-3.5" /> Course Sessions ({sessions.length})
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                        {sessions.map((session, index) => (
                          <div key={session.id} className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px] h-4 bg-slate-100 text-slate-700">Session {index + 1}</Badge>
                              <h4 className="text-sm font-semibold text-slate-900">{session.title}</h4>
                            </div>
                            {session.description && <p className="text-xs text-slate-600 mt-1">{session.description}</p>}
                            <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-slate-500">
                              {session.start_time && (
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(session.start_time).toLocaleString()}</span>
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
                    </div>
                  )}

                  {/* Materials */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
                      <FileText className="w-3.5 h-3.5" /> Materials ({materials.length})
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
                                {!isLink && mat.extraction_status && (
                                  <Badge className={`text-[9px] h-4 ${
                                    mat.extraction_status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    mat.extraction_status === 'failed' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}>
                                    {mat.extraction_status}
                                  </Badge>
                                )}
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
                    {selectedCourse.status === 'pending_review' && (
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
                        Publish
                      </Button>
                    )}
                  </DialogFooter>
                </div>
              )}
            </>
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
