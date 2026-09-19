import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { generateQuestionsFromMaterial, extractTextFromFile } from '@/lib/ai'
import { Database } from '@/integrations/supabase/types'
import { TrainerLayout } from '@/features/trainer/TrainerLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft, FileText, Trash2, Loader2, Download, Upload, Video, File, Image,
  AlertCircle, CheckCircle, Link2, ExternalLink, Globe, Plus, Sparkles, Brain
} from 'lucide-react'
import { toast } from 'sonner'
import { MaterialPreviewDialog } from '@/components/ui/MaterialPreviewDialog'
import { formatDistanceToNow } from 'date-fns'

type Course = Database['public']['Tables']['courses']['Row']
type Material = Database['public']['Tables']['materials']['Row']

const ACCEPTED_TYPES = [
  '.pdf', '.doc', '.docx', '.pptx', '.ppt', '.txt',
  '.mp4', '.webm', '.mov',
  '.png', '.jpg', '.jpeg', '.gif', '.webp',
].join(',')

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

function getFileIcon(mime: string | null) {
  if (!mime) return File
  if (mime.startsWith('video/')) return Video
  if (mime.startsWith('image/')) return Image
  if (mime.includes('pdf')) return FileText
  if (mime.includes('word') || mime.includes('document')) return FileText
  if (mime.includes('presentation') || mime.includes('powerpoint')) return FileText
  return File
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return 'Unknown'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface CourseMaterialsProps {
  embedded?: boolean
  onMaterialCountChange?: (count: number) => void
}

export function CourseMaterials({ embedded = false, onMaterialCountChange }: CourseMaterialsProps) {
  const { courseId } = useParams<{ courseId: string }>()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [activeTab, setActiveTab] = useState<'files' | 'links'>('files')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [addingLink, setAddingLink] = useState(false)
  const [generatingForMaterial, setGeneratingForMaterial] = useState<string | null>(null)
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([])
  const [reviewOpen, setReviewOpen] = useState(false)
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set())
  const [savingQuestions, setSavingQuestions] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    if (!user || !courseId) return
    setLoading(true)
    try {
      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('trainer_id', user.id)
        .single()
      if (courseData) setCourse(courseData)

      let query = supabase
        .from('materials')
        .select('*')
        .eq('course_id', courseId)
      if (sessionId) {
        query = query.eq('session_id', sessionId)
      }
      const { data: materialsData } = await query.order('created_at', { ascending: false })
      if (materialsData) {
        setMaterials(materialsData)
        onMaterialCountChange?.(materialsData.length)
      }
    } catch {
      if (!embedded) toast.error('Failed to load materials')
    } finally {
      setLoading(false)
    }
  }, [user, courseId, embedded, onMaterialCountChange])

  useEffect(() => { fetchData() }, [fetchData])

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) return `File too large (${formatFileSize(file.size)}). Max 100MB.`
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    const allowed = ['.pdf', '.doc', '.docx', '.pptx', '.ppt', '.txt', '.mp4', '.webm', '.mov', '.png', '.jpg', '.jpeg', '.gif', '.webp']
    if (!allowed.includes(ext)) return `File type not supported: ${ext}`
    return null
  }

  const uploadFile = async (file: File) => {
    if (!user || !courseId) return
    const error = validateFile(file)
    if (error) {
      toast.error(error)
      return
    }

    setUploading(true)
    setUploadProgress(file.name)
    try {
      const fileExt = file.name.split('.').pop()
      const materialId = crypto.randomUUID()
      const storagePath = `${courseId}/${materialId}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(storagePath, file)
      if (uploadError) throw uploadError

      const { error: dbError } = await supabase
        .from('materials')
        .insert({
          id: materialId,
          course_id: courseId,
          uploaded_by: user.id,
          file_name: file.name,
          storage_path: storagePath,
          mime_type: file.type || 'application/octet-stream',
          file_size: file.size,
          extraction_status: 'pending',
          session_id: sessionId || null
        })
      if (dbError) throw dbError

      toast.success(`Uploaded: ${file.name}`)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(uploadFile)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    Array.from(files).forEach(uploadFile)
  }

  const addLink = async () => {
    if (!user || !courseId) return
    const url = linkUrl.trim()
    if (!url) return

    try {
      new URL(url)
    } catch {
      toast.error('Please enter a valid URL')
      return
    }

    setAddingLink(true)
    try {
      const title = linkTitle.trim() || new URL(url).hostname
      const { error } = await supabase.from('materials').insert({
        course_id: courseId,
        uploaded_by: user.id,
        file_name: title,
        storage_path: `link/${crypto.randomUUID()}`,
        material_type: 'link',
        url,
        mime_type: 'text/uri-list',
        extraction_status: 'completed',
        session_id: sessionId || null
      })
      if (error) throw error
      toast.success('Link added')
      setLinkUrl('')
      setLinkTitle('')
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add link')
    } finally {
      setAddingLink(false)
    }
  }

  const handleGenerateQuestions = async (material: Material) => {
    if (!courseId) return
    setGeneratingForMaterial(material.id)
    try {
      let content = ''

      if (material.material_type === 'file' && material.mime_type) {
        // Download file and extract text
        const { data: signedUrlData } = await supabase.storage
          .from('materials')
          .createSignedUrl(material.storage_path, 3600)

        if (signedUrlData) {
          const response = await fetch(signedUrlData.signedUrl)
          const blob = await response.blob()
          const file = new window.File([blob], material.file_name, { type: material.mime_type })
          content = await extractTextFromFile(file, material.mime_type)
        }
      } else if (material.url) {
        content = `External resource: ${material.url}\nTitle: ${material.file_name}`
      }

      if (!content || content.length < 20) {
        toast.error('Not enough content to generate questions. Try uploading a text-based file.')
        return
      }

      const result = await generateQuestionsFromMaterial(
        material.id,
        courseId,
        content,
        material.file_name
      )

      if (result.questions && result.questions.length > 0) {
        setGeneratedQuestions(result.questions)
        setSelectedQuestions(new Set(result.questions.map((_: any, i: number) => i)))
        setReviewOpen(true)
        toast.success(`Generated ${result.questions.length} questions from "${material.file_name}"`)
      } else {
        toast.error('No questions could be generated from this material')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate questions')
    } finally {
      setGeneratingForMaterial(null)
    }
  }

  const handleSaveAcceptedQuestions = async () => {
    if (!courseId || generatedQuestions.length === 0) return
    setSavingQuestions(true)
    try {
      // Find or create assessment
      let { data: assessment } = await supabase
        .from('assessments')
        .select('id')
        .eq('course_id', courseId)
        .single()

      if (!assessment) {
        const { data: newAssessment } = await supabase
          .from('assessments')
          .insert({
            course_id: courseId,
            title: 'Course Assessment',
            passing_score: 60,
            created_by: user!.id,
          })
          .select('id')
          .single()
        assessment = newAssessment
      }

      if (!assessment) throw new Error('Failed to create assessment')

      // Get current max position
      const { data: existing } = await supabase
        .from('questions')
        .select('position')
        .eq('assessment_id', assessment.id)
        .order('position', { ascending: false })
        .limit(1)

      const maxPos = existing?.[0]?.position ?? 0

      // Insert only selected questions
      const toInsert = generatedQuestions
        .filter((_: any, i: number) => selectedQuestions.has(i))
        .map((q: any, i: number) => ({
          assessment_id: assessment!.id,
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          position: maxPos + i + 1,
          approved: false,
        }))

      if (toInsert.length > 0) {
        const { error } = await supabase.from('questions').insert(toInsert)
        if (error) throw error
        toast.success(`Added ${toInsert.length} questions to assessment`)
      }

      setReviewOpen(false)
      setGeneratedQuestions([])
      setSelectedQuestions(new Set())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save questions')
    } finally {
      setSavingQuestions(false)
    }
  }

  const toggleQuestionSelection = (index: number) => {
    setSelectedQuestions(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleDownload = async (material: Material) => {
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

  const handlePreview = async (material: Material) => {
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

  const handleDelete = async (material: Material) => {
    if (!confirm(`Delete "${material.file_name}"?`)) return
    setDeletingId(material.id)
    try {
      if (material.material_type === 'file') {
        await supabase.storage.from('materials').remove([material.storage_path])
      }
      const { error } = await supabase.from('materials').delete().eq('id', material.id)
      if (error) throw error
      toast.success('Material deleted')
      setMaterials(prev => prev.filter(m => m.id !== material.id))
      onMaterialCountChange?.(materials.length - 1)
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return embedded ? (
      <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-ink" /></div>
    ) : (
      <TrainerLayout>
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-ink" /></div>
      </TrainerLayout>
    )
  }

  const content = (
    <div className={embedded ? '' : 'max-w-5xl mx-auto space-y-6'}>
      {!embedded && (
        <div>
          <Link to={`/trainer/courses/${courseId}/edit`} className="flex items-center gap-2 text-sm text-ink/60 hover:text-ink transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Course
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Course Materials</h2>
          <p className="text-ink/60 text-sm mt-1">Upload documents, videos, and resources for "{course?.title}"</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-ink/5 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('files')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'files'
              ? 'bg-ink/20 text-ink'
              : 'text-ink/60 hover:text-ink'
          }`}
        >
          <FileText className="w-4 h-4 mr-1.5 inline" />
          Files
        </button>
        <button
          onClick={() => setActiveTab('links')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'links'
              ? 'bg-ink/20 text-ink'
              : 'text-ink/60 hover:text-ink'
          }`}
        >
          <Link2 className="w-4 h-4 mr-1.5 inline" />
          Links & Videos
        </button>
      </div>

      {activeTab === 'files' && (
        <div
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
                    dragOver ? 'border-ink bg-ink/10' : 'border-ink/20 hover:border-ink/30 hover:bg-ink/5'
          }`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={handleFileInput}
            disabled={uploading}
          />
          <Upload className={`w-8 h-8 mx-auto mb-3 ${dragOver ? 'text-ink' : 'text-ink/50'}`} />
          {uploading ? (
            <div>
              <p className="text-sm text-ink font-medium">Uploading: {uploadProgress}</p>
              <Loader2 className="w-4 h-4 animate-spin text-ink mx-auto mt-2" />
            </div>
          ) : (
            <div>
              <p className="text-sm text-ink font-medium mb-1">
                {dragOver ? 'Drop files here' : 'Click to upload or drag and drop'}
              </p>
              <p className="text-xs text-ink/50">
                PDF, DOCX, PPTX, TXT, MP4, Images — Max 100MB each
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'links' && (
        <Card className="bg-white border-ink/10">
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-ink/50">Add links to external resources, YouTube videos, or any online material.</p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }}
                placeholder="https://example.com/resource"
                className="bg-ink/5 border-ink/20 text-ink h-9 text-xs"
                disabled={addingLink}
              />
              <Input
                value={linkTitle}
                onChange={e => setLinkTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLink() } }}
                placeholder="Title (optional)"
                className="bg-ink/5 border-ink/20 text-ink h-9 text-xs"
                disabled={addingLink}
              />
              <Button
                type="button"
                onClick={addLink}
                disabled={!linkUrl.trim() || addingLink}
                className="bg-ink hover:bg-ink/90 text-ink h-9 px-3 shrink-0"
              >
                {addingLink ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2 p-3 rounded-lg bg-ink/5 border-ink/10">
        <Brain className="w-4 h-4 text-ink shrink-0" />
        <p className="text-xs text-ink/60">
          <span className="font-medium text-ink">AI Question Generation:</span> Click the <Sparkles className="w-3 h-3 inline" /> icon on any material to auto-generate assessment questions from its content.
        </p>
      </div>

      {materials.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink">
              Materials ({materials.length})
              {materials.some(m => m.material_type === 'file') && materials.some(m => m.material_type !== 'file') && (
                <span className="text-ink/50 font-normal ml-2">
                  — {materials.filter(m => m.material_type === 'file').length} files, {materials.filter(m => m.material_type !== 'file').length} links
                </span>
              )}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                materials.forEach(m => {
                  if (!generatingForMaterial) handleGenerateQuestions(m)
                })
              }}
              disabled={!!generatingForMaterial}
              className="border-ink/20 text-ink hover:bg-ink/5 h-8 text-xs"
            >
              {generatingForMaterial ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              )}
              Generate Questions
            </Button>
          </div>
          <div className="space-y-2">
            {materials.map(material => {
              const isLink = material.material_type === 'link' || material.material_type === 'video'
              const isVideo = material.mime_type?.startsWith('video/') || material.material_type === 'video'
              const Icon = isLink ? Globe : isVideo ? Video : getFileIcon(material.mime_type)
              return (
                <div key={material.id} className="flex items-center gap-3 p-3 rounded-xl bg-cream border border-ink/10 hover:border-ink/10 transition-all group">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isLink ? 'bg-ink/5' : isVideo ? 'bg-ink/5' : 'bg-ink/5'
                  }`}>
                    <Icon className={`w-5 h-5 ${isLink ? 'text-ink' : isVideo ? 'text-ink' : 'text-ink'}`} />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handlePreview(material)}>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-ink font-medium truncate hover:underline">{material.file_name}</p>
                      {isLink && (
                        <Badge className="bg-ink/10 text-ink border-ink/20 text-[10px] h-4">
                          <Link2 className="w-2.5 h-2.5 mr-0.5 inline" />
                          Link
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ink/50 mt-0.5">
                      {isLink ? (
                        <span className="text-ink hover:text-ink truncate max-w-xs flex items-center gap-1">
                          {material.url}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </span>
                      ) : (
                        <>
                          <span>{formatFileSize(material.file_size)}</span>
                          <span>&middot;</span>
                        </>
                      )}
                      <span>{formatDistanceToNow(new Date(material.created_at), { addSuffix: true })}</span>
                      {!isLink && (
                        <Badge className={
                          material.extraction_status === 'completed' ? 'bg-green-50 text-green-700 border border-green-200 text-[10px] h-4' :
                          material.extraction_status === 'failed' ? 'bg-red-50 text-red-600 border border-red-200 text-[10px] h-4' :
                            'bg-ink/10 text-ink/60 border border-ink/20 text-[10px] h-4'
                        }>
                          {material.extraction_status === 'completed' && <CheckCircle className="w-2.5 h-2.5 mr-0.5 inline" />}
                          {material.extraction_status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleGenerateQuestions(material)}
                      disabled={generatingForMaterial === material.id}
                      className="p-2 rounded-lg hover:bg-ink/5 text-ink/60 hover:text-ink transition-all"
                      title="Generate AI Questions"
                    >
                      {generatingForMaterial === material.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </button>
                    {!isLink && (
                      <button
                        onClick={() => handleDownload(material)}
                        disabled={downloadingId === material.id}
                        className="p-2 rounded-lg hover:bg-ink/5 text-ink/60 hover:text-ink transition-all"
                        title="Download"
                      >
                        {downloadingId === material.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(material)}
                      disabled={deletingId === material.id}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-ink/60 hover:text-red-400 transition-all"
                      title="Delete"
                    >
                      {deletingId === material.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {materials.length === 0 && !uploading && (
        <div className="text-center py-8">
          <FileText className="w-10 h-10 text-ink/30 mx-auto mb-3" />
          <p className="text-ink/60 text-sm">No materials added yet.</p>
          <p className="text-ink/40 text-xs mt-1">Upload files or add links to build your course content.</p>
        </div>
      )}
    </div>
  )

  return (
    <>
      {embedded ? content : <TrainerLayout>{content}</TrainerLayout>}

      {/* AI Question Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-cream border-ink/20">
          <DialogHeader>
            <DialogTitle className="text-ink flex items-center gap-2">
              <Brain className="w-5 h-5 text-ink" />
              AI-Generated Questions ({generatedQuestions.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-ink/50">
              Review and select questions to add to your assessment. Uncheck questions you don't want.
            </p>
            {generatedQuestions.map((q: any, i: number) => (
              <div
                key={i}
                className={`p-3 rounded-lg border transition-all ${
                  selectedQuestions.has(i)
                    ? 'bg-ink/5 border-ink/20'
                    : 'bg-cream border-ink/10 opacity-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.has(i)}
                    onChange={() => toggleQuestionSelection(i)}
                    className="mt-1 rounded border-ink/30 bg-ink/5 text-ink focus:ring-ink/50"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-ink font-medium mb-2">{q.question_text}</p>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      {['A', 'B', 'C', 'D'].map(opt => (
                        <div
                          key={opt}
                          className={`px-2 py-1 rounded border ${
                            q.correct_answer === opt
                              ? 'bg-green-50 border-green-200 text-green-700'
                              : 'bg-ink/5 border-ink/10 text-ink/60'
                          }`}
                        >
                          <span className="font-medium">{opt}.</span> {q.options?.[opt]}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <p className="text-xs text-ink/50 mt-2 italic">
                        <span className="text-ink/60">Explanation:</span> {q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewOpen(false)}
              className="border-ink/20 text-ink"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAcceptedQuestions}
              disabled={savingQuestions || selectedQuestions.size === 0}
              className="bg-ink hover:bg-ink/90 text-ink"
            >
              {savingQuestions ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Add {selectedQuestions.size} Question{selectedQuestions.size !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MaterialPreviewDialog 
        material={previewMaterial}
        previewUrl={previewUrl}
        onClose={() => setPreviewMaterial(null)}
        onDownload={() => previewMaterial && handleDownload(previewMaterial)}
      />
    </>
  )
}

function VideoPreview({ storagePath }: { storagePath: string }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    supabase.storage.from('materials').createSignedUrl(storagePath, 3600).then(({ data }) => {
      if (data) setUrl(data.signedUrl)
    })
  }, [storagePath])

  if (!url) return null

  return (
    <video controls preload="metadata" className="w-full max-w-md rounded-lg" src={url}>
      <track kind="captions" />
    </video>
  )
}
