import React, { useEffect, useState } from 'react'
import { Megaphone, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function AnnouncementsFeed() {
  const { profile } = useAuth()
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnnouncements() {
      if (!profile) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*, author:admins!author_id(full_name)')
          .eq('is_active', true)
          .in('target_audience', ['all', profile.role])
          .order('created_at', { ascending: false })
          .limit(5)

        if (error) throw error

        if (data) {
          // Fetch author names manually since we can't join admins directly if author_id references auth.users
          const authorIds = [...new Set(data.map(a => a.author_id).filter(Boolean))]
          const { data: admins } = await supabase
            .from('admins')
            .select('id, full_name')
            .in('id', authorIds)

          const adminMap = admins?.reduce((acc: Record<string, string>, admin) => {
            acc[admin.id] = admin.full_name
            return acc
          }, {} as Record<string, string>) || {}

          setAnnouncements(data.map(a => ({
            ...a,
            authorName: a.author_id ? adminMap[a.author_id] : 'System Administrator'
          })))
        }
      } catch (err) {
        console.error('Failed to fetch announcements feed:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnnouncements()
  }, [profile])

  if (loading) {
    return (
      <div className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm flex justify-center items-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
      </div>
    )
  }

  if (announcements.length === 0) return null

  return (
    <div className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2 pb-4 border-b border-cyan-500/30">
        <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
          <Megaphone className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-zinc-200">Recent Announcements</h3>
          <p className="text-xs text-zinc-200/50">Important updates and news</p>
        </div>
      </div>

      <div className="space-y-3">
        {announcements.map((ann) => (
          <div key={ann.id} className="p-4 bg-cyan-950/30 border border-cyan-500/30 rounded-2xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-zinc-200">{ann.title}</h4>
              <span className="text-[10px] text-zinc-200/50 bg-black/20 px-2 py-0.5 rounded-full border border-cyan-500/10 uppercase">
                {ann.target_audience}
              </span>
            </div>
            <p className="text-sm text-zinc-200/80 whitespace-pre-wrap">{ann.content}</p>
            <div className="text-[10px] text-zinc-200/40 mt-1 flex justify-between">
              <span>Posted by {ann.authorName || 'System Administrator'}</span>
              <span>{new Date(ann.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
