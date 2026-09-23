import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function AnnouncementModal() {
  const { user, profile } = useAuth()
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnnouncements() {
      if (!user || !profile) {
        setLoading(false)
        return
      }

      if (profile.role === 'admin' || profile.role === 'super_admin') {
        setLoading(false)
        return
      }

      try {
        // Query announcements targeted to 'all' or the specific user's role
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .in('target_audience', ['all', profile.role])
          .order('created_at', { ascending: false })
          .limit(10)

        if (error) {
          console.error('Error fetching announcements:', error)
          return
        }

        if (data && data.length > 0) {
          // Filter out dismissed announcements
          const unreadAnnouncements = data.filter((ann) => {
            const dismissKey = `dismissed_announcement_${ann.id}_${user.id}`
            return !localStorage.getItem(dismissKey)
          }).map((ann) => {
            const authorMatch = ann.content.match(/<!--AUTHOR:(.*?)-->/)
            const authorName = authorMatch ? authorMatch[1] : 'System Administrator'
            const cleanContent = ann.content.replace(/\n\n<!--AUTHOR:.*?-->/g, '')

            return {
              ...ann,
              content: cleanContent,
              authorName
            }
          })

          if (unreadAnnouncements.length > 0) {
            setAnnouncements(unreadAnnouncements)
            setIsOpen(true)
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncements()
  }, [user, profile])

  const handleDismiss = (id: string) => {
    if (user) {
      localStorage.setItem(`dismissed_announcement_${id}_${user.id}`, 'true')
    }
    
    setAnnouncements(prev => {
      const updated = prev.filter(a => a.id !== id)
      if (updated.length === 0) {
        setIsOpen(false)
      }
      return updated
    })
  }

  const handleClose = (id: string) => {
    // Only temporarily remove from the array for this session
    setAnnouncements(prev => {
      const updated = prev.filter(a => a.id !== id)
      if (updated.length === 0) {
        setIsOpen(false)
      }
      return updated
    })
  }

  if (loading || announcements.length === 0) return null

  const currentAnnouncement = announcements[0]

  return (
    <AnimatePresence>
      {isOpen && currentAnnouncement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            key={currentAnnouncement.id}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <button
              onClick={() => handleClose(currentAnnouncement.id)}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header branding */}
            <div className="pt-8 pb-4 flex flex-col items-center border-b border-gray-100 px-6">
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
                <div className="text-2xl font-black tracking-tight text-gray-900 uppercase">
                  Capacity <span className="text-purple-600">Connect</span>
                </div>
              </div>
              <div className="w-full border-t border-gray-100 mt-2 pt-4">
                <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 flex flex-col items-center text-center">
                  <AlertTriangle className="w-8 h-8 mb-2" />
                  <h2 className="font-bold text-xl uppercase tracking-wider">{currentAnnouncement.title}</h2>
                  <p className="text-xs font-semibold uppercase mt-1 opacity-80">
                    Important update for {currentAnnouncement.target_audience === 'all' ? 'All Users' : `${currentAnnouncement.target_audience}s`}
                  </p>
                </div>
              </div>
              {announcements.length > 1 && (
                <div className="mt-4 text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                  1 of {announcements.length} Updates
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto">
              <div className="prose prose-sm prose-gray max-w-none whitespace-pre-wrap text-gray-700 text-center leading-relaxed">
                {currentAnnouncement.content}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t border-gray-100 p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500 flex flex-col gap-1 text-center sm:text-left">
                <span className="font-semibold text-gray-700">
                  Posted by {currentAnnouncement.authorName}
                </span>
                <span>{new Date(currentAnnouncement.created_at).toLocaleString()}</span>
              </div>
              <button
                onClick={() => handleDismiss(currentAnnouncement.id)}
                className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl font-medium transition-colors"
              >
                Noted
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
