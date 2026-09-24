import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  Award, Upload, Download, FileText, CheckCircle2, Sparkles,
  AlertCircle, Trash2, Eye, Shield, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { createDefaultPptxTemplate, triggerFileDownload } from '@/lib/certificateGenerator'

interface CourseCertificateStepProps {
  hasCertificate: boolean
  setHasCertificate: (val: boolean) => void
  templateUrl: string | null
  setTemplateUrl: (url: string | null) => void
  templateName: string | null
  setTemplateName: (name: string | null) => void
  certificateTitle?: string
  setCertificateTitle?: (title: string) => void
  courseTitle?: string
}

export function CourseCertificateStep({
  hasCertificate,
  setHasCertificate,
  templateUrl,
  setTemplateUrl,
  templateName,
  setTemplateName,
  courseTitle = 'Specialized Training Course',
}: CourseCertificateStepProps) {
  const [uploading, setUploading] = useState(false)
  const [downloadingStarter, setDownloadingStarter] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pptx') && !file.name.toLowerCase().endsWith('.ppt')) {
      toast.error('Please upload a Microsoft PowerPoint (.pptx) certificate template file.')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Template file size must be less than 50MB.')
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_')
      const storagePath = `templates/${Date.now()}_${safeName}`

      // Upload to 'Certificate template' bucket
      const { data, error } = await supabase.storage
        .from('Certificate template')
        .upload(storagePath, file, {
          upsert: true,
          contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        })

      if (error) {
        // Fallback to 'materials' or 'certificates' if bucket hasn't been created yet
        console.warn('Certificate template bucket error, fallback attempt:', error.message)
        const { data: fbData, error: fbError } = await supabase.storage
          .from('certificates')
          .upload(storagePath, file, { upsert: true })

        if (fbError) throw fbError
        const { data: publicUrlData } = supabase.storage.from('certificates').getPublicUrl(storagePath)
        setTemplateUrl(publicUrlData.publicUrl)
        setTemplateName(file.name)
      } else {
        const { data: publicUrlData } = supabase.storage.from('Certificate template').getPublicUrl(storagePath)
        setTemplateUrl(publicUrlData.publicUrl)
        setTemplateName(file.name)
      }

      toast.success('Certificate PPTX template uploaded successfully!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload certificate template.')
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadStarter = async () => {
    setDownloadingStarter(true)
    try {
      const buffer = await createDefaultPptxTemplate(courseTitle)
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      })
      triggerFileDownload(blob, `MoES_Certificate_Template_${courseTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.pptx`)
      toast.success('Starter PPTX template downloaded! Open in PowerPoint to edit.')
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate starter template.')
    } finally {
      setDownloadingStarter(false)
    }
  }

  const handleRemoveTemplate = () => {
    setTemplateUrl(null)
    setTemplateName(null)
    toast.info('Reverted to default MoES system certificate template.')
  }

  return (
    <div className="space-y-6">
      {/* Certificate Enable Toggle Card */}
      <Card className="bg-white border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0 mt-0.5">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Certificate of Completion</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Issue automated, verifiable completion certificates to trainees who successfully finish this course and meet the passing criteria.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={hasCertificate}
                onChange={e => setHasCertificate(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      {hasCertificate && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Template Upload & Starter Download Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-7 bg-white border-slate-200/90 rounded-3xl shadow-sm overflow-hidden flex flex-col">
              <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-600" /> Certificate PPTX Template
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 mt-1">
                      Upload your customized PowerPoint template with dynamic placeholders.
                    </CardDescription>
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                    Bucket: Certificate template
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-6 flex-1 flex flex-col justify-between space-y-5">
                {templateUrl ? (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-50/80 via-sky-50/60 to-blue-50/80 border border-cyan-200/80 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                        PPTX
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {templateName || 'custom_certificate_template.pptx'}
                        </p>
                        <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active Custom Template
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(templateUrl, '_blank')}
                        className="rounded-xl text-xs h-8 gap-1.5 border-slate-300"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveTemplate}
                        className="rounded-xl text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 hover:border-cyan-400 rounded-3xl p-8 text-center transition-all bg-slate-50/40 group relative">
                    <input
                      type="file"
                      accept=".pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-200/80 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      {uploading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      {uploading ? 'Uploading PPTX Template...' : 'Click or Drag & Drop PPTX Certificate Template'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      PowerPoint presentation (.pptx) up to 50MB
                    </p>
                    <span className="inline-block mt-3 text-[10px] font-semibold text-cyan-700 bg-cyan-100/60 px-2.5 py-1 rounded-full">
                      If not uploaded, the default MoES Capacity Connect template will be used
                    </span>
                  </div>
                )}

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                  <div className="text-[11px] text-slate-500">
                    Need a starting template? Download our pre-configured PPTX with ready placeholders.
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadStarter}
                    disabled={downloadingStarter}
                    className="rounded-xl text-xs h-9 gap-1.5 border-cyan-300 text-cyan-700 hover:bg-cyan-50 font-bold shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {downloadingStarter ? 'Generating...' : 'Download Starter PPTX'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Placeholder Guide Card */}
            <Card className="lg:col-span-5 bg-gradient-to-br from-[#040814] via-[#071328] to-[#040d21] text-white border-cyan-500/30 rounded-3xl shadow-lg flex flex-col">
              <CardHeader className="p-6 border-b border-white/10">
                <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" /> Supported Placeholders
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Include these tags anywhere in your PowerPoint slides. They will be dynamically populated upon course completion:
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-3.5 flex-1">
                {[
                  { tag: '<<NAME>>', desc: 'Trainee full name (e.g. Dr. Rajesh Kumar)' },
                  { tag: '<<PERCENTAGE>>', desc: 'Final score / progress percentage (e.g. 98%)' },
                  { tag: '<<COURSE_NAME>>', desc: 'Official title of the course' },
                  { tag: '<<DATE>>', desc: 'Certificate issue date' },
                  { tag: '<<TRAINER_NAME>>', desc: 'Lead instructor name' },
                ].map(item => (
                  <div key={item.tag} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <code className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
                      {item.tag}
                    </code>
                    <span className="text-[11px] text-slate-300 text-right font-medium">
                      {item.desc}
                    </span>
                  </div>
                ))}

                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-200/90 mt-4">
                  💡 <strong>Tip:</strong> You can format the placeholder text in PowerPoint with custom fonts, colors, and shadows. The formatting will be preserved!
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  )
}
