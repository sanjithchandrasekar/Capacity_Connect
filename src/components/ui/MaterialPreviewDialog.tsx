import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, FileText, Download } from 'lucide-react'

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

function detectMimeFromUrl(url: string | null): string | null {
  if (!url) return null
  const lower = url.toLowerCase().split('?')[0]
  if (lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov')) return 'video/mp4'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.gif')) return 'image/gif'
  if (lower.endsWith('.webp')) return 'image/webp'
  return null
}

export function MaterialPreviewDialog({ material, previewUrl, onClose, onDownload }: MaterialPreviewDialogProps) {
  const mime = material?.mime_type || detectMimeFromUrl(previewUrl)

  const isVideo = mime?.startsWith('video/')
  const isImage = mime?.startsWith('image/')

  // Use Google Docs Viewer to bypass Chrome iframe security restrictions on Supabase URLs
  const googleViewerUrl = previewUrl
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(previewUrl)}&embedded=true`
    : null

  return (
    <Dialog open={!!material} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[90vw] h-[80vh] flex flex-col bg-cream border-ink/20 p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-ink/10 shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-ink flex items-center gap-2 truncate">
            <FileText className="w-4 h-4 shrink-0 text-ink/60" />
            {material?.file_name}
          </DialogTitle>
          {onDownload && (
            <Button variant="ghost" size="sm" className="shrink-0 ml-4 text-ink/60 hover:text-ink" onClick={onDownload}>
              <Download className="w-4 h-4 mr-1.5" /> Download
            </Button>
          )}
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
          ) : googleViewerUrl ? (
            <iframe
              src={googleViewerUrl}
              className="w-full h-full border-none"
              title={material?.file_name}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-ink/50">
              <FileText className="w-16 h-16 mb-4 opacity-50" />
              <p>No preview available.</p>
              {onDownload && (
                <Button variant="outline" className="mt-4" onClick={onDownload}>
                  Download to View
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
