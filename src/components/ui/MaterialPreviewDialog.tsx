import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, FileText, Download, ExternalLink } from 'lucide-react'

interface Material {
  id?: string
  file_name: string
  mime_type?: string | null
  storage_path?: string | null
}

interface MaterialPreviewDialogProps {
  material: Material | null
  previewUrl: string | null
  onClose: () => void
  onDownload?: () => void
}

function detectMimeFromPath(path: string | null | undefined): string | null {
  if (!path) return null
  const lower = path.toLowerCase().split('?')[0]
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')) return 'video/mp4'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.doc') || lower.endsWith('.docx')) return 'application/msword'
  if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return 'application/vnd.ms-powerpoint'
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return 'application/vnd.ms-excel'
  if (lower.endsWith('.txt')) return 'text/plain'
  return null
}

export function MaterialPreviewDialog({ material, previewUrl, onClose, onDownload }: MaterialPreviewDialogProps) {
  // Detect from storage_path (reliable, no query string noise) then fall back to URL
  const mime = material?.mime_type
    || detectMimeFromPath(material?.storage_path)
    || detectMimeFromPath(previewUrl)

  const isVideo = mime?.startsWith('video/')
  const isImage = mime?.startsWith('image/')
  const isPdf = mime === 'application/pdf'
  const isOffice = mime === 'application/msword' || mime === 'application/vnd.ms-powerpoint' || mime === 'application/vnd.ms-excel' || mime?.includes('openxmlformats-officedocument')
  const isText = mime === 'text/plain'
  
  // Use embedded viewer for images, videos, PDFs, Text and Office docs
  const canEmbedInline = isVideo || isImage || isPdf || isOffice || isText

  return (
    <Dialog open={!!material} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[90vw] h-[80vh] flex flex-col bg-cream border-ink/20 p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-ink/10 shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-ink flex items-center gap-2 truncate">
            <FileText className="w-4 h-4 shrink-0 text-ink/60" />
            {material?.file_name}
          </DialogTitle>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {previewUrl && !canEmbedInline && (
              <Button
                variant="ghost"
                size="sm"
                className="text-ink/60 hover:text-ink"
                onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="w-4 h-4 mr-1.5" /> Open in New Tab
              </Button>
            )}
            {onDownload && (
              <Button variant="ghost" size="sm" className="text-ink/60 hover:text-ink" onClick={onDownload}>
                <Download className="w-4 h-4 mr-1.5" /> Download
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-ink/5 relative flex items-center justify-center">
          {!previewUrl ? (
            <div className="flex flex-col items-center justify-center text-ink/50">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Loading preview...</p>
            </div>
          ) : isVideo ? (
            <video controls autoPlay className="w-full h-full object-contain" src={previewUrl} />
          ) : isImage ? (
            <img src={previewUrl} alt={material?.file_name} className="max-w-full max-h-full object-contain" />
          ) : isPdf ? (
            <iframe src={`${previewUrl}#view=FitH`} className="w-full h-full border-0" title={material?.file_name} />
          ) : isText ? (
            <iframe src={previewUrl} className="w-full h-full border-0 bg-white" title={material?.file_name} />
          ) : isOffice ? (
            <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewUrl)}&embedded=true`} className="w-full h-full border-0" title={material?.file_name} />
          ) : (
            /* For other unrecognized docs show a fallback */
            <div className="flex flex-col items-center justify-center text-ink/50 gap-4 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                <FileText className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink/70 mb-1">{material?.file_name}</p>
                <p className="text-xs text-ink/40">This file type cannot be previewed inline.</p>
              </div>
              <Button
                onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
                className="bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" /> Open File
              </Button>
              {onDownload && (
                <Button variant="outline" onClick={onDownload} className="rounded-xl text-sm flex items-center gap-2">
                  <Download className="w-4 h-4" /> Download Instead
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
