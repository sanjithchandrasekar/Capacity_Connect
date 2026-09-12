import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Database } from '@/integrations/supabase/types'
import { TrainerLayout } from '@/features/trainer/TrainerLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, FileText, Trash2, Loader2, File, AlertCircle, Download } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

type Course = Database['public']['Tables']['courses']['Row']
type Material = Database['public']['Tables']['materials']['Row']

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.pptx,.txt,.mp4,.png,.jpg,.jpeg,.gif,.webp'

function mimeToIcon(mime: string | null) {
  if (!mime) return File
  if (mime.startsWith('video/')) return File
  if (mime.includes('pdf')) return FileText
  return File
}

export function CourseMaterials() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [course, setCourse] = useState<Course | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    if (!user || !courseId) return
    setLoading(true)
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('trainer_id', user.id)
        .single()
      if (courseError) throw courseError
      setCourse(courseData)

      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
      if (materialsError) throw materialsError
      setMaterials(materialsData ?? [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load materials'
      toast.error(message)
      if (err instanceof Error && err.message.includes('JSON object requested')) {
        navigate('/trainer/courses')
      }
    } finally {
      setLoading(false)
    }
  }, [user, courseId, navigate])

  useEffect(() => { fetchData() }, [fetchData])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user || !courseId) return

    setUploading(true)
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
        })
      if (dbError) throw dbError

      toast.success('Material uploaded successfully')
      fetchData()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload material'
      toast.error(message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
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
    } catch (err) {
      toast.error('Failed to generate download link')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDelete = async (materialId: string, storagePath: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return
    setDeletingId(materialId)
    try {
      const { error: storageError } = await supabase.storage
        .from('materials')
        .remove([storagePath])
      if (storageError) console.error('Storage deletion error:', storageError)

      const { error: dbError } = await supabase
        .from('materials')
        .delete()
        .eq('id', materialId)
      if (dbError) throw dbError

      toast.success('Material deleted')
      setMaterials(prev => prev.filter(m => m.id !== materialId))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete material'
      toast.error(message)
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <TrainerLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        </div>
      </TrainerLayout>
    )
  }

  if (!course) return null

  return (
    <TrainerLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link to={`/trainer/courses/${courseId}/edit`} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Course
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-white">Course Materials</h2>
          <p className="text-slate-400 text-sm mt-1">Manage documents and resources for "{course.title}"</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 bg-white/[0.02] border-white/[0.06] h-fit">
            <CardHeader>
              <h3 className="text-sm font-semibold text-white">Upload Material</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Select File</Label>
                <Input
                  id="file"
                  type="file"
                  ref={fileInputRef}
                  disabled={uploading}
                  onChange={handleFileUpload}
                  accept={ACCEPTED_TYPES}
                  className="bg-white/5 border-white/10 text-white file:text-cyan-400"
                />
              </div>
              <p className="text-xs text-slate-500">PDF, DOCX, PPTX, TXT, MP4, Images</p>
              <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-300">Text extraction is queued automatically. Once extracted, content will be available for AI features.</p>
              </div>
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading to secure storage...
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2 bg-white/[0.02] border-white/[0.06]">
            <CardHeader>
              <h3 className="text-sm font-semibold text-white">Uploaded Files ({materials.length})</h3>
            </CardHeader>
            <CardContent>
              {materials.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-white/[0.1] rounded-xl">
                  <FileText className="h-10 w-10 text-slate-600 mb-3" />
                  <h3 className="font-semibold text-slate-300 mb-1">No materials yet</h3>
                  <p className="text-slate-500 text-sm">Upload a file to see it listed here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {materials.map(material => {
                    const Icon = mimeToIcon(material.mime_type)
                    return (
                      <div key={material.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-sky-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-white font-medium truncate">{material.file_name}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                              <span>{material.file_size ? `${(material.file_size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size'}</span>
                              <span>{formatDistanceToNow(new Date(material.created_at), { addSuffix: true })}</span>
                              <Badge className={
                                material.extraction_status === 'completed' ? 'bg-green-500/20 text-green-300 border border-green-500/30 text-[10px] h-4' :
                                material.extraction_status === 'failed' ? 'bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] h-4' :
                                'bg-slate-500/20 text-slate-300 border border-slate-500/30 text-[10px] h-4'
                              }>
                                {material.extraction_status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0 ml-3">
                          <button
                            onClick={() => handleDownload(material)}
                            disabled={downloadingId === material.id}
                            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-cyan-400 transition-all"
                            title="Download"
                          >
                            {downloadingId === material.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(material.id, material.storage_path)}
                            disabled={deletingId === material.id}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-all"
                            title="Delete"
                          >
                            {deletingId === material.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TrainerLayout>
  )
}
