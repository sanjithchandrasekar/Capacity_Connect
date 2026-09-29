import React, { useState, useCallback, useEffect } from 'react'
import Cropper from 'react-easy-crop'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './dialog'
import { Button } from './button'
import { getCroppedImg } from '@/utils/cropImage'
import { Loader2, ZoomIn, RotateCcw, Crop } from 'lucide-react'
import { toast } from 'sonner'

interface ImageCropperModalProps {
  isOpen: boolean
  imageFile?: File | null
  imageUrl?: string | null
  onClose: () => void
  onCropComplete: (croppedFile: File) => void
  aspectRatio?: number
  cropShape?: 'rect' | 'round'
  title?: string
}

export function ImageCropperModal({ 
  isOpen, 
  imageFile, 
  imageUrl,
  onClose, 
  onCropComplete, 
  aspectRatio = 1, // Defaulting to 1:1 square for profile photos
  cropShape = 'rect',
  title = 'Adjust & Crop Photo'
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [imageSrc, setImageSrc] = useState<string>('')
  const [loadingImage, setLoadingImage] = useState(false)
  
  useEffect(() => {
    let active = true
    let blobUrlToRevoke: string | null = null

    if (!isOpen) {
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCroppedAreaPixels(null)
      return
    }

    if (imageFile) {
      const url = URL.createObjectURL(imageFile)
      blobUrlToRevoke = url
      setImageSrc(url)
      return
    }

    if (imageUrl) {
      if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
        setImageSrc(imageUrl)
        return
      }

      setLoadingImage(true)
      fetch(imageUrl, { mode: 'cors' })
        .then(res => res.blob())
        .then(blob => {
          if (active) {
            const url = URL.createObjectURL(blob)
            blobUrlToRevoke = url
            setImageSrc(url)
          }
        })
        .catch((err) => {
          console.warn('Direct fetch failed, falling back to direct URL:', err)
          if (active) setImageSrc(imageUrl)
        })
        .finally(() => {
          if (active) setLoadingImage(false)
        })
    } else {
      setImageSrc('')
    }

    return () => {
      active = false
      if (blobUrlToRevoke) URL.revokeObjectURL(blobUrlToRevoke)
    }
  }, [imageFile, imageUrl, isOpen])

  const onCropChange = (crop: { x: number; y: number }) => setCrop(crop)
  const onZoomChange = (zoom: number) => setZoom(zoom)

  const handleCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (!imageSrc) return
    setIsProcessing(true)
    try {
      const fileName = imageFile?.name || 'profile_photo_adjusted.jpg'
      // If user hasn't moved the crop, compute fallback square crop
      const pixels = croppedAreaPixels || { x: 0, y: 0, width: 400, height: 400 }
      const croppedImage = await getCroppedImg(imageSrc, pixels, fileName)
      onCropComplete(croppedImage)
    } catch (e: any) {
      console.error('Error cropping image:', e)
      toast.error('Failed to crop image: ' + (e?.message || 'Error processing crop'))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = () => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden bg-slate-900 border-slate-700 text-white shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Crop className="w-5 h-5 text-cyan-400" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-4">
          <div className="relative w-full h-[360px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
            {imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                minZoom={0.5}
                maxZoom={4}
                aspect={aspectRatio}
                cropShape={cropShape}
                showGrid={true}
                restrictPosition={false}
                onCropChange={onCropChange}
                onCropComplete={handleCropComplete}
                onZoomChange={onZoomChange}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
                No image selected
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 text-center">
            Drag image to reposition • Use the slider to zoom in/out
          </p>
          
          <div className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 shrink-0">
              <ZoomIn className="w-4 h-4 text-cyan-400" />
              Zoom
            </div>
            <input
              type="range"
              value={zoom}
              min={0.5}
              max={4}
              step={0.05}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-xs font-mono text-cyan-300 w-10 text-right">{zoom.toFixed(1)}x</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-slate-400 hover:text-white hover:bg-slate-700 h-8 px-2 text-xs rounded-lg cursor-pointer"
              title="Reset Zoom & Position"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          </div>
        </div>
        
        <DialogFooter className="p-5 pt-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white font-semibold px-5 rounded-xl cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isProcessing || !imageSrc}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold px-6 shadow-md rounded-xl cursor-pointer"
          >
            {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save & Apply Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
