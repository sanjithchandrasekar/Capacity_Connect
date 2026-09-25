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
      <DialogContent className="max-w-4xl w-[90vw] h-[80vh] flex flex-col bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-slate-800 p-0 overflow-hidden shadow-2xl rounded-2xl">
        <DialogHeader className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0 flex flex-row items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <DialogTitle className="text-slate-800 dark:text-slate-100 flex items-center gap-2 truncate text-sm sm:text-base font-bold">
            <FileText className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
            {material?.file_name}
          </DialogTitle>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {previewUrl && !canEmbedInline && (
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="w-4 h-4 mr-1.5" /> Open in New Tab
              </Button>
            )}
            {onDownload && (
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                onClick={onDownload}
              >
                <Download className="w-4 h-4 mr-1.5" /> Download
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-slate-100/50 dark:bg-[#070B14] relative flex items-center justify-center p-4">
          {!previewUrl ? (
            <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-purple-600 dark:text-purple-400" />
              <p className="text-sm font-medium">Loading preview...</p>
            </div>
          ) : isVideo ? (
            <video controls autoPlay className="w-full h-full object-contain rounded-xl shadow-lg bg-black" src={previewUrl} />
          ) : isImage ? (
            <div className="w-full h-full flex items-center justify-center p-2">
              <img
                src={previewUrl}
                alt={material?.file_name}
                className="max-w-full max-h-full object-contain rounded-xl shadow-md bg-white p-2 border border-slate-200 dark:border-slate-700"
              />
            </div>
          ) : isPdf ? (
            <iframe src={`${previewUrl}#view=FitH`} className="w-full h-full border-0 rounded-xl shadow-md bg-white" title={material?.file_name} />
          ) : isText ? (
            <iframe src={previewUrl} className="w-full h-full border-0 bg-white dark:bg-[#0D1424] rounded-xl shadow-md p-4 text-slate-800 dark:text-slate-100" title={material?.file_name} />
          ) : isOffice ? (
            <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewUrl)}&embedded=true`} className="w-full h-full border-0 rounded-xl shadow-md bg-white" title={material?.file_name} />
          ) : (
            /* For other unrecognized docs show a fallback */
            <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-4 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-center">
                <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">{material?.file_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">This file type cannot be previewed inline.</p>
              </div>
              <Button
                onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2 shadow-md"
              >
                <ExternalLink className="w-4 h-4" /> Open File
              </Button>
              {onDownload && (
                <Button variant="outline" onClick={onDownload} className="rounded-xl text-sm flex items-center gap-2 border-slate-300 dark:border-slate-700">
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
