import React, { useEffect, useState } from 'react'
import { Megaphone, Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export function AnnouncementsFeed() {
  const { user, profile } = useAuth()
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnnouncements() {
      if (!profile || !user) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*, author:admins!author_id(full_name)')
          .eq('is_active', true)
          .in('target_audience', ['all', profile.role])
          .order('created_at', { ascending: false })
          .limit(20) // Fetch a bit more to account for cleared ones

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
  }, [profile, user])

  const handleClear = (id: string) => {
    if (!user) return;
    localStorage.setItem(`cleared_announcement_${id}_${user.id}`, 'true');
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  }

  if (loading) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xl shadow-slate-200/40 flex justify-center items-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
      </div>
    )
  }

  if (announcements.length === 0) return null

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xl shadow-slate-200/40 space-y-4">
      <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
        <div className="p-2 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-xl">
          <Megaphone className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Recent Announcements</h3>
          <p className="text-xs text-slate-500 font-medium">Important platform updates and notices</p>
        </div>
      </div>

      <div className="space-y-3">
        {announcements.map((ann) => (
          <div key={ann.id} className="group p-4 bg-slate-50/80 border border-slate-200/70 rounded-2xl flex flex-col gap-2 relative transition-all hover:bg-white hover:border-cyan-500/40 hover:shadow-md">
            <button 
              onClick={() => handleClear(ann.id)}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
              title="Clear announcement"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-between pr-8">
              <h4 className="text-sm font-bold text-slate-900">{ann.title}</h4>
              <span className="text-[10px] font-bold text-cyan-800 bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200 uppercase tracking-wide">
                {ann.target_audience}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{ann.content}</p>
            <div className="text-[11px] text-slate-500 mt-1 flex justify-between font-medium">
              <span>Posted by {ann.authorName || 'System Administrator'}</span>
              <span>{new Date(ann.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
