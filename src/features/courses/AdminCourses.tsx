import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/integrations/supabase/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { MoreHorizontal, BookOpen, Eye, FileText, Target, Clock, Users, Loader2, File, Video, Globe, ExternalLink, Download } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

type Course = Database['public']['Tables']['courses']['Row']
type Material = Database['public']['Tables']['materials']['Row']
type CourseSkill = Database['public']['Tables']['course_skills']['Row'] & { skills: { name: string } | null }

function StatusBadge({ status }: { status: Course['status'] }) {
  const styles: Record<Course['status'], string> = {
    published: 'bg-green-50 text-green-700 border border-green-200',
    pending_review: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    draft: 'bg-ink/10 text-ink/70 border border-ink/20',
    archived: 'bg-red-50 text-red-600 border border-red-200',
  }
  const labels: Record<Course['status'], string> = {
    draft: 'Draft',
    pending_review: 'Pending Review',
    published: 'Published',
    archived: 'Archived',
  }
  return <Badge className={`text-[10px] ${styles[status]}`}>{labels[status]}</Badge>
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
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([])
  const [skills, setSkills] = useState<CourseSkill[]>([])
  const [enrollmentCount, setEnrollmentCount] = useState(0)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          trainer:profiles!courses_trainer_id_fkey(full_name, department)
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      setCourses(data ?? [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load courses'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCourses() }, [fetchCourses])

  const openCourseDetail = async (course: Course) => {
    setSelectedCourse(course)
    setDetailOpen(true)
    setDetailLoading(true)
    try {
      const [mRes, sRes, eRes] = await Promise.all([
        supabase.from('materials').select('*').eq('course_id', course.id).order('created_at', { ascending: false }),
        supabase.from('course_skills').select('*, skills(name)').eq('course_id', course.id),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('course_id', course.id),
      ])
      setMaterials(mRes.data ?? [])
      setSkills(sRes.data as any ?? [])
      setEnrollmentCount(eRes.count ?? 0)
    } catch {
      toast.error('Failed to load course details')
    } finally {
      setDetailLoading(false)
    }
  }

  const updateCourseStatus = async (courseId: string, newStatus: Course['status']) => {
    setUpdating(courseId)
    try {
      const { error } = await supabase.rpc('admin_update_course', {
        target_course_id: courseId,
        new_status: newStatus,
      })
      if (error) throw error
      toast.success(`Course ${newStatus === 'published' ? 'published' : newStatus === 'archived' ? 'archived' : 'updated'} successfully`)
      fetchCourses()
      setDetailOpen(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update course'
      toast.error(message)
    } finally {
      setUpdating(null)
    }
  }

  const objectives = (selectedCourse?.learning_objectives as Record<string, string> | null) ?? null

  return (
    <>
      <Card className="bg-white border-purple-500/15 rounded-3xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-purple-500/10">
          <CardTitle className="flex items-center gap-2 text-midnight text-base font-bold">
            <BookOpen className="h-5 w-5 text-purple-600" />
            Course Management
          </CardTitle>
          <CardDescription className="text-midnight/50 text-xs">Review, approve, publish or archive courses submitted by trainers.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            </div>
          ) : courses.length === 0 ? (
            <p className="text-midnight/40 text-sm text-center py-12">No courses found.</p>
          ) : (
            <div className="space-y-3.5">
              {courses.map(course => {
                const trainer = (course as any).trainer
                return (
                  <div key={course.id} className="flex items-center gap-4 p-4 rounded-2xl bg-purple-50/40 hover:bg-purple-50/80 border border-purple-500/10 hover:border-purple-500/20 transition-all">
                    {/* Thumbnail */}
                    <div className="w-20 h-16 rounded-xl bg-purple-100 border border-purple-200/60 overflow-hidden shrink-0">
                      <Thumbnail path={course.thumbnail_path} alt={course.title} fallbackIcon={<BookOpen className="w-6 h-6 text-purple-400" />} />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-bold text-midnight truncate">{course.title}</h3>
                        <StatusBadge status={course.status} />
                      </div>
                      <p className="text-xs text-midnight/60 line-clamp-1 mb-1.5">{course.description || 'No description provided.'}</p>
                      <div className="flex items-center gap-3 text-[11px] text-midnight/50 font-medium">
                        <span className="capitalize px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60">{course.course_type}</span>
                        <span>{course.department || 'General'}</span>
                        {trainer?.full_name && <span>by {trainer.full_name}</span>}
                        <span>{course.created_at ? formatDistanceToNow(new Date(course.created_at), { addSuffix: true }) : ''}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCourseDetail(course)}
                        className="border-purple-200 text-purple-900 hover:bg-purple-50 h-8 rounded-xl text-xs font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-midnight/60 rounded-xl hover:bg-purple-50">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border-purple-500/15 rounded-2xl shadow-lg">
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white border-purple-500/15 rounded-3xl shadow-2xl">
          {selectedCourse && (
            <>
              <DialogHeader>
                <DialogTitle className="text-midnight flex items-center gap-2 font-bold">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  Course Details
                </DialogTitle>
              </DialogHeader>

              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Thumbnail + Basic Info */}
                  <div className="flex gap-4">
                    {selectedCourse.thumbnail_path && (
                      <div className="w-32 h-24 rounded-2xl bg-purple-100 border border-purple-200/60 overflow-hidden shrink-0">
                        <Thumbnail path={selectedCourse.thumbnail_path} alt={selectedCourse.title} />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-ink">{selectedCourse.title}</h3>
                        <StatusBadge status={selectedCourse.status} />
                      </div>
                      <p className="text-sm text-ink/60 mb-2">{selectedCourse.description}</p>
                      <div className="flex flex-wrap gap-3 text-xs text-ink/50">
                        <span className="capitalize">{selectedCourse.course_type} Training</span>
                        <span>{selectedCourse.department || 'General'}</span>
                        <span>{selectedCourse.duration_minutes ? `${selectedCourse.duration_minutes} min` : 'Self-paced'}</span>
                        <span>Pass: {selectedCourse.passing_score}%</span>
                        <span>{enrollmentCount} enrolled</span>
                      </div>
                    </div>
                  </div>

                  {/* Learning Objectives */}
                  {objectives && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-ink/50 uppercase tracking-wider">
                        <Target className="w-3.5 h-3.5" /> Learning Objectives
                      </div>
                      <div className="bg-ink/5 rounded-lg p-4 space-y-2">
                        {objectives.understand && (
                          <div><span className="text-[10px] text-ink/40 uppercase">Understand</span><p className="text-sm text-ink/70">{objectives.understand}</p></div>
                        )}
                        {objectives.able_to_do && (
                          <div><span className="text-[10px] text-ink/40 uppercase">Able to Do</span><p className="text-sm text-ink/70">{objectives.able_to_do}</p></div>
                        )}
                        {objectives.competencies_built && (
                          <div><span className="text-[10px] text-ink/40 uppercase">Competencies</span><p className="text-sm text-ink/70">{objectives.competencies_built}</p></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {skills.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-ink/50 uppercase tracking-wider">
                        <Target className="w-3.5 h-3.5" /> Required Skills
                      </div>
                      <div className="bg-ink/5 rounded-lg p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {skills.map(cs => (
                            <span key={cs.skill_id} className="px-2 py-0.5 rounded-full text-[10px] bg-ink/10 text-ink border border-ink/20">
                              {cs.skills?.name ?? 'Unknown'}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Materials */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-ink/50 uppercase tracking-wider">
                      <FileText className="w-3.5 h-3.5" /> Materials ({materials.length})
                    </div>
                    <div className="bg-ink/5 rounded-lg p-4">
                      {materials.length > 0 ? (
                        <div className="space-y-2">
                          {materials.map(mat => {
                            const isLink = mat.material_type === 'link' || mat.material_type === 'video'
                            const Icon = getMaterialIcon(mat.mime_type)
                            return (
                              <div key={mat.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-cream border border-ink/10">
                                <div className="w-8 h-8 rounded-md bg-ink/10 flex items-center justify-center shrink-0">
                                  <Icon className="w-4 h-4 text-ink/60" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-ink truncate">{mat.file_name}</p>
                                  <p className="text-[10px] text-ink/40">
                                    {isLink ? mat.url : formatFileSize(mat.file_size)}
                                  </p>
                                </div>
                                <Badge className="text-[9px] h-4 bg-ink/10 text-ink border-ink/20">
                                  {mat.material_type || 'file'}
                                </Badge>
                                {!isLink && mat.extraction_status && (
                                  <Badge className={`text-[9px] h-4 ${
                                    mat.extraction_status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                    mat.extraction_status === 'failed' ? 'bg-red-50 text-red-600 border-red-200' :
                                    'bg-ink/10 text-ink/60 border-ink/20'
                                  }`}>
                                    {mat.extraction_status}
                                  </Badge>
                                )}
                                {isLink && mat.url ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-ink/60 hover:text-ink"
                                    onClick={() => mat.url && window.open(mat.url, '_blank')}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </Button>
                                ) : mat.storage_path ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-ink/60 hover:text-ink"
                                    onClick={async () => {
                                      try {
                                        const { data, error } = await supabase.storage.from('materials').createSignedUrl(mat.storage_path, 60)
                                        if (error) {
                                          console.error('Signed URL error:', error)
                                          toast.error(`Cannot access file: ${error.message}`)
                                          return
                                        }
                                        if (!data?.signedUrl) {
                                          toast.error('No signed URL returned')
                                          return
                                        }
                                        window.open(data.signedUrl, '_blank')
                                      } catch (err) {
                                        console.error('Download error:', err)
                                        toast.error('Failed to open file')
                                      }
                                    }}
                                    title="Download / View"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </Button>
                                ) : null}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-ink/40 text-center py-4">No materials uploaded yet</p>
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
                          className="border-ink/20 text-ink"
                        >
                          {updating === selectedCourse.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                          Return to Draft
                        </Button>
                        <Button
                          onClick={() => updateCourseStatus(selectedCourse.id, 'published')}
                          disabled={!!updating}
                          className="bg-green-600 hover:bg-green-700 text-white"
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
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        {updating === selectedCourse.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Archive
                      </Button>
                    )}
                    {selectedCourse.status === 'draft' && (
                      <Button
                        onClick={() => updateCourseStatus(selectedCourse.id, 'published')}
                        disabled={!!updating}
                        className="bg-ink hover:bg-ink/90 text-cream"
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
    </>
  )
}
