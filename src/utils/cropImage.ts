export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => {
      // Fallback: try loading without crossOrigin if CORS header is missing
      const fallbackImg = new Image()
      fallbackImg.onload = () => resolve(fallbackImg)
      fallbackImg.onerror = (err) => reject(err)
      fallbackImg.src = url
    }
    image.src = url
  })

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  fileName: string = 'cropped.jpeg'
): Promise<File> {
  let sourceToLoad = imageSrc

  // If remote URL, attempt to convert to local blob first to prevent canvas tainting
  if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
    try {
      const response = await fetch(imageSrc, { mode: 'cors' })
      if (response.ok) {
        const blob = await response.blob()
        sourceToLoad = URL.createObjectURL(blob)
      }
    } catch (fetchErr) {
      console.warn('Direct blob fetch failed, falling back to direct image loading:', fetchErr)
    }
  }

  const image = await createImage(sourceToLoad)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  const targetWidth = Math.max(1, Math.round(pixelCrop.width))
  const targetHeight = Math.max(1, Math.round(pixelCrop.height))

  canvas.width = targetWidth
  canvas.height = targetHeight

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  )

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((file) => {
        if (file) {
          resolve(new File([file], fileName, { type: 'image/jpeg' }))
        } else {
          // Fallback: toDataURL conversion
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
            const byteString = atob(dataUrl.split(',')[1])
            const ab = new ArrayBuffer(byteString.length)
            const ia = new Uint8Array(ab)
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i)
            }
            resolve(new File([ab], fileName, { type: 'image/jpeg' }))
          } catch (dataUrlErr) {
            reject(new Error('Canvas export failed: ' + dataUrlErr))
          }
        }
      }, 'image/jpeg', 0.9)
    } catch (toBlobErr) {
      // If toBlob threw SecurityError (tainted canvas)
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
        const byteString = atob(dataUrl.split(',')[1])
        const ab = new ArrayBuffer(byteString.length)
        const ia = new Uint8Array(ab)
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i)
        }
        resolve(new File([ab], fileName, { type: 'image/jpeg' }))
      } catch (finalErr) {
        reject(new Error('Failed to process image crop: ' + finalErr))
      }
    }
  })
}
