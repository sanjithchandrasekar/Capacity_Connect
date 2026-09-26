import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Database } from '@/integrations/supabase/types'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Loader2, Edit3, Target, BarChart3, BookOpen, Info, Layers, FileText, Eye } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { MaterialPreviewDialog } from '@/components/ui/MaterialPreviewDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Course = Database['public']['Tables']['courses']['Row']
type Material = Database['public']['Tables']['materials']['Row']

function getFormattedObjectives(raw: any): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw.join('\n\n')
  if (typeof raw === 'object') {
    const parts: string[] = []
    if (raw.description) parts.push(raw.description)
    if (raw.understand) parts.push(`What you'll understand: ${raw.understand}`)
    if (raw.able_to_do) parts.push(`What you'll be able to do: ${raw.able_to_do}`)
    return parts.length > 0 ? parts.join('\n\n') : JSON.stringify(raw)
  }
  return String(raw)
}

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border border-slate-200',
  pending_review: 'bg-amber-50 text-amber-700 border border-amber-200',
  published: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  archived: 'bg-rose-50 text-rose-700 border border-rose-200',
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  published: 'Published',
  archived: 'Archived',
}

export function CourseListPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [aboutModalOpen, setAboutModalOpen] = useState(false)
  const [aboutActiveTab, setAboutActiveTab] = useState<'about' | 'outline'>('about')
  const [docLoading, setDocLoading] = useState(false)
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const fetchCourses = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('trainer_id', user.id)
        .neq('status', 'archived')
        .order('created_at', { ascending: false })
      if (error) throw error
      setCourses(data || [])
    } catch (err) {
      toast.error('Failed to load courses')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchCourses() }, [fetchCourses])

  const handleOpenSessionDoc = async (docPath: string) => {
    if (!docPath) return
    setDocLoading(true)
    try {
      const { data, error } = await supabase.storage
        .from('materials')
        .createSignedUrl(docPath, 300)
      if (error) throw error
      if (data?.signedUrl) {
        setPreviewMaterial({
          id: 'syllabus-doc',
          file_name: 'Course Syllabus Document',
          storage_path: docPath,
          material_type: 'document',
          course_id: selectedCourse?.id || '',
          created_at: new Date().toISOString(),
          description: 'Uploaded Course Syllabus Document',
          duration_minutes: null,
          external_url: null,
          order_index: 0,
          thumbnail_url: null,
          title: 'Course Outline & Syllabus',
          topic_name: 'Outline',
          uploader_id: selectedCourse?.trainer_id || ''
        } as any)
        setPreviewUrl(data.signedUrl)
      }
    } catch {
      toast.error('Could not open syllabus document.')
    } finally {
      setDocLoading(false)
    }
  }

  const handleDownload = async (mat: Material) => {
    if (!mat.storage_path) return
    try {
      const { data, error } = await supabase.storage
        .from('materials')
        .download(mat.storage_path)
      if (error) throw error
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = mat.file_name || 'download'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Downloaded successfully')
    } catch {
      toast.error('Failed to download file')
    }
  }

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-5xl mx-auto space-y-6">
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">My Courses</h2>
            <p className="text-slate-500 text-sm mt-1">{courses.length} course{courses.length !== 1 ? 's' : ''} total</p>
          </div>
          <Link to="/trainer/courses/new">
            <Button className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold shadow-md shadow-cyan-600/20">
              <Plus className="w-4 h-4 mr-2" /> New Course
            </Button>
          </Link>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
          </div>
        ) : courses.length === 0 ? (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border border-slate-200/90 shadow-xs">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-slate-500 mb-4 font-medium">No courses created yet.</p>
                <Link to="/trainer/courses/new">
                  <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold">
                    <Plus className="w-4 h-4 mr-2" /> Create Your First Course
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="space-y-3.5">
            {courses.map(course => (
              <div key={course.id} className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 shadow-xs transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  {/* Thumbnail */}
                  <div className="w-full sm:w-36 h-24 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    <Thumbnail path={course.thumbnail_path} alt={course.title} fallbackIcon={<BookOpen className="w-8 h-8 text-slate-400" />} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                      <Link to={`/trainer/courses/${course.id}`} className="hover:text-cyan-600 min-w-0 transition-colors">
                        <h3 className="text-base font-bold text-slate-900 truncate">{course.title}</h3>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCourse(course)
                          setAboutActiveTab('about')
                          setAboutModalOpen(true)
                        }}
                        title="About Course & Outline"
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 text-[11px] font-bold transition-all shadow-xs cursor-pointer group shrink-0"
                      >
                        <Info className="w-3.5 h-3.5 text-cyan-600 group-hover:rotate-12 transition-transform" />
                        <span>About</span>
                      </button>
                      <Badge className={`shrink-0 text-[10px] font-semibold ${statusColors[course.status] ?? statusColors.draft}`}>
                        {statusLabels[course.status] ?? course.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">{course.description}</p>
                    <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                      <span>{course.duration_minutes ?? 0} mins</span>
                      <span>&bull;</span>
                      <span className="capitalize">{course.course_type}</span>
                      <span>&bull;</span>
                      <span>{new Date(course.created_at).toLocaleDateString()}</span>
                      {course.department && (
                        <>
                          <span>&bull;</span>
                          <span>{course.department}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0 sm:self-center">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                      disabled={course.status === 'pending_review'}
                      onClick={() => navigate(`/trainer/courses/${course.id}`)}
                    >
                      <BookOpen className="w-3.5 h-3.5 mr-1 text-cyan-600" /> Manage
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                      disabled={course.status === 'pending_review'}
                      onClick={() => navigate(`/trainer/courses/${course.id}/edit`)}
                    >
                      <Edit3 className="w-3.5 h-3.5 mr-1 text-slate-600" /> Edit
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                      disabled={course.status === 'pending_review'}
                      onClick={() => navigate(`/trainer/courses/${course.id}/assessments`)}
                    >
                      <Target className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Assess
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                      disabled={course.status === 'pending_review'}
                      onClick={() => navigate(`/trainer/courses/${course.id}/performance`)}
                    >
                      <BarChart3 className="w-3.5 h-3.5 mr-1 text-blue-600" /> Stats
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>

      <MaterialPreviewDialog
        material={previewMaterial}
        previewUrl={previewUrl}
        onClose={() => {
          setPreviewMaterial(null)
          setPreviewUrl(null)
        }}
        onDownload={() => previewMaterial && handleDownload(previewMaterial)}
      />

      {/* About Course & Course Outline Modal */}
      <Dialog open={aboutModalOpen} onOpenChange={setAboutModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 md:p-8 bg-white border border-slate-200 shadow-2xl">
          <DialogHeader className="pb-4 border-b border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 pr-6">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] font-bold uppercase text-cyan-800 bg-cyan-50 border-cyan-200">
                    {selectedCourse?.course_type || 'Standard'} Program
                  </Badge>
                  {selectedCourse?.department && (
                    <Badge variant="outline" className="text-[10px] font-semibold text-slate-600 border-slate-200">
                      {selectedCourse.department}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                  {selectedCourse?.title}
                </DialogTitle>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedCourse?.duration_minutes ? `${Math.floor(selectedCourse.duration_minutes / 60)} Hours` : 'Self-Paced'} &bull; Pass Gate: {selectedCourse?.passing_score || 80}%
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 pt-4">
              <button
                type="button"
                onClick={() => setAboutActiveTab('about')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  aboutActiveTab === 'about'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                About This Course
              </button>
              <button
                type="button"
                onClick={() => setAboutActiveTab('outline')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  aboutActiveTab === 'outline'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Course Outline & Roadmap
              </button>
            </div>
          </DialogHeader>

          {/* TAB 1: ABOUT THIS COURSE */}
          {aboutActiveTab === 'about' && (
            <div className="space-y-6 pt-2">
              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-600" /> Course Overview
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/80 whitespace-pre-line">
                  {selectedCourse?.description || 'Comprehensive competency-based training designed for operational excellence.'}
                </p>
              </div>

              {/* Objectives */}
              {selectedCourse?.learning_objectives && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-cyan-600" /> Key Learning Objectives
                  </h4>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                    {getFormattedObjectives(selectedCourse.learning_objectives)}
                  </div>
                </div>
              )}

              {/* Key Course Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-cyan-50/50 border border-cyan-200/60">
                  <span className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider block">Passing Threshold</span>
                  <span className="text-sm font-extrabold text-cyan-950 mt-0.5 block">{selectedCourse?.passing_score || 80}% Overall</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Duration</span>
                  <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">{selectedCourse?.duration_minutes ? `${Math.floor(selectedCourse.duration_minutes / 60)} Hours` : 'Flexible'}</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Max Trainees</span>
                  <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">{selectedCourse?.max_trainees || 'Unlimited'} Seats</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: COURSE OUTLINE & ROADMAP */}
          {aboutActiveTab === 'outline' && (
            <div className="space-y-6 pt-2">
              {/* Syllabus Document Download / Preview */}
              {selectedCourse?.session_flow_document_path && (
                <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-5 h-5 text-cyan-700 shrink-0" />
                    <div>
                      <h5 className="text-xs font-bold text-cyan-950">Official Syllabus Document</h5>
                      <p className="text-[11px] text-cyan-700">Detailed curriculum plan and reading materials</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleOpenSessionDoc(selectedCourse.session_flow_document_path!)}
                    disabled={docLoading}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs h-8 rounded-xl shrink-0"
                  >
                    {docLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                    View Document
                  </Button>
                </div>
              )}

              {/* Session Schedule & Timeline */}
              {selectedCourse?.session_flow_text && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-600" /> Session Schedule & Timeline
                  </h4>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-normal">
                    {selectedCourse.session_flow_text}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </TrainerLayout>
  )
}
