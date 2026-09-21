import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './dialog'
import { Button } from './button'
import { getCroppedImg } from '@/utils/cropImage'
import { Loader2 } from 'lucide-react'

interface ImageCropperModalProps {
  isOpen: boolean
  imageFile: File | null
  onClose: () => void
  onCropComplete: (croppedFile: File) => void
  aspectRatio?: number
}

export function ImageCropperModal({ 
  isOpen, 
  imageFile, 
  onClose, 
  onCropComplete, 
  aspectRatio = 16 / 5 // Defaulting to wide banner
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const imageSrc = React.useMemo(() => {
    if (!imageFile) return ''
    return URL.createObjectURL(imageFile)
  }, [imageFile])

  const onCropChange = (crop: { x: number; y: number }) => setCrop(crop)
  const onZoomChange = (zoom: number) => setZoom(zoom)

  const handleCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setIsProcessing(true)
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, imageFile?.name || 'thumbnail.jpg')
      onCropComplete(croppedImage)
    } catch (e) {
      console.error(e)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-cream border-ink/10">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold text-ink">Crop Thumbnail</DialogTitle>
        </DialogHeader>
        
        <div className="px-6 space-y-4">
          <div className="relative w-full h-[350px] bg-black/5 rounded-xl overflow-hidden border border-ink/10">
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio}
                onCropChange={onCropChange}
                onCropComplete={handleCropComplete}
                onZoomChange={onZoomChange}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-ink/40 text-sm">
                No image selected
              </div>
            )}
          </div>
          
          <div className="py-2 flex items-center gap-4">
            <span className="text-sm font-medium text-ink/70">Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-2 bg-ink/10 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>
        
        <DialogFooter className="p-6 pt-2 bg-cream/50 border-t border-ink/5 mt-4">
          <Button variant="outline" onClick={onClose} disabled={isProcessing} className="border-ink/20 text-ink/70">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isProcessing || !imageSrc} className="bg-primary text-primary-foreground">
            {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
