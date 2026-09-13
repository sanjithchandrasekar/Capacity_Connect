import React from 'react'
import { useStorageUrl } from '@/lib/useStorageUrl'
import { Loader2, BookOpen } from 'lucide-react'

interface ThumbnailProps {
  path: string | null
  alt: string
  className?: string
  fallbackIcon?: React.ReactNode
}

export function Thumbnail({ path, alt, className = '', fallbackIcon }: ThumbnailProps) {
  const { url, loading } = useStorageUrl('materials', path)

  if (!path) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        {fallbackIcon || <BookOpen className="w-12 h-12 text-ink/30" />}
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <Loader2 className="w-6 h-6 text-ink/30 animate-spin" />
      </div>
    )
  }

  if (!url) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        {fallbackIcon || <BookOpen className="w-12 h-12 text-ink/30" />}
      </div>
    )
  }

  return <img src={url} alt={alt} className={`w-full h-full object-cover ${className}`} />
}
