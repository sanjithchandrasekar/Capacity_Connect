import React from 'react'
import { useStorageUrl } from '@/lib/useStorageUrl'
import { Loader2, Sparkles, BookOpen, Layers } from 'lucide-react'

interface ThumbnailProps {
  path: string | null
  alt: string
  className?: string
  fallbackIcon?: React.ReactNode
  type?: string
}

// Deterministic gradient selection based on title/alt
const gradients = [
  'from-purple-700 via-purple-600 to-pink-600',
  'from-pink-600 via-pink-500 to-orange-500',
  'from-purple-800 via-pink-600 to-orange-400',
  'from-orange-500 via-coral-500 to-pink-600',
  'from-purple-900 via-purple-700 to-pink-500',
]

export function Thumbnail({ path, alt, className = '', fallbackIcon, type }: ThumbnailProps) {
  const { url, loading } = useStorageUrl('materials', path)

  const getGradientIndex = (str: string) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    return Math.abs(hash) % gradients.length
  }

  const gradient = gradients[getGradientIndex(alt || 'Course')]

  if (!path || !url) {
    return (
      <div className={`relative w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center p-4 overflow-hidden select-none ${className}`}>
        {/* Ambient geometric decorative elements */}
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-[#070E20]/90/10 blur-xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-orange-400/20 blur-xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/15 via-transparent to-black/20 pointer-events-none" />
        
        <div className="relative z-10 w-12 h-12 rounded-2xl bg-[#070E20]/90/15 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg shadow-black/10 group-hover:scale-110 group-hover:bg-[#070E20]/90/25 transition-all duration-300">
          {fallbackIcon || <BookOpen className="w-6 h-6 text-white" />}
        </div>
        <span className="relative z-10 mt-2 text-[11px] font-semibold text-white/90 tracking-wide truncate max-w-[85%] text-center drop-shadow-sm">
          {alt}
        </span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-cyan-950/30 ${className}`}>
        <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <img src={url} alt={alt} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${className}`} />
      <div className="absolute inset-0 bg-gradient-to-t from-midnight/40 via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity" />
    </div>
  )
}
