import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { motion, Variants } from 'framer-motion'
import { Plus, Megaphone, Trash2, Edit2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
}

interface Announcement {
  id: string
  title: string
  content: string
  target_audience: string
  is_active: boolean
  created_at: string
}

export function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [targetAudience, setTargetAudience] = useState('all')
  const [isActive, setIsActive] = useState(true)

  const fetchAnnouncements = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      if (data) setAnnouncements(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !content) {
      toast.error('Title and content are required')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      if (editingId) {
        const { error } = await supabase
          .from('announcements')
          .update({ title, content, target_audience: targetAudience, is_active: isActive })
          .eq('id', editingId)
        if (error) throw error
        toast.success('Announcement updated')
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert([{ title, content, target_audience: targetAudience, is_active: isActive, author_id: user.id }])
        if (error) throw error
        toast.success('Announcement published')
      }
      resetForm()
      fetchAnnouncements()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save announcement')
      console.error(e)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id)
      if (error) throw error
      toast.success('Announcement deleted')
      fetchAnnouncements()
    } catch (e) {
      toast.error('Failed to delete')
    }
  }

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id)
    setTitle(announcement.title)
    setContent(announcement.content)
    setTargetAudience(announcement.target_audience || 'all')
    setIsActive(announcement.is_active)
    setIsFormOpen(true)
  }

  const resetForm = () => {
    setEditingId(null)
    setTitle('')
    setContent('')
    setTargetAudience('all')
    setIsActive(true)
    setIsFormOpen(false)
  }

  if (loading && announcements.length === 0) {
    return (
      <div className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-zinc-200">Global Announcements</h3>
          <p className="text-xs text-zinc-200/50 mt-0.5">Publish news and updates to the homepage.</p>
        </div>
        {!isFormOpen && (
          <Button onClick={() => setIsFormOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs h-9">
            <Plus className="w-4 h-4 mr-1.5" /> New Announcement
          </Button>
        )}
      </div>

      {isFormOpen && (
        <motion.form variants={fadeUp} initial="hidden" animate="visible" onSubmit={handleSubmit} className="bg-cyan-950/40 border border-cyan-500/30 rounded-3xl p-6 shadow-inner mb-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-200 mb-1">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[#070E20]/90 border border-cyan-500/30 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none" placeholder="e.g., New Training Module Available" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-200 mb-1">Target Audience</label>
            <select value={targetAudience} onChange={e => setTargetAudience(e.target.value)} className="w-full bg-[#070E20]/90 border border-cyan-500/30 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none">
              <option value="all">All Users (Public & Internal)</option>
              <option value="trainer">Trainers Only</option>
              <option value="trainee">Trainees Only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-200 mb-1">Content</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full bg-[#070E20]/90 border border-cyan-500/30 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none min-h-[100px]" placeholder="Type your announcement here..." required />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500 border-cyan-500/30" />
            <label htmlFor="isActive" className="text-sm text-zinc-200/80 font-medium">Publish immediately (Active)</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={resetForm} className="rounded-xl border-cyan-500/30 text-purple-800">Cancel</Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl">
              {editingId ? 'Save Changes' : 'Publish Announcement'}
            </Button>
          </div>
        </motion.form>
      )}

      <div className="grid gap-4">
        {announcements.map((ann, i) => (
          <motion.div key={ann.id} variants={fadeUp} custom={i} className={`bg-[#070E20]/90 border ${ann.is_active ? 'border-cyan-500/30' : 'border-gray-200 opacity-70'} rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4`}>
            <div className="flex gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${ann.is_active ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                  {ann.title}
                  <span className="text-[10px] bg-cyan-950/30 text-cyan-400 px-2 py-0.5 rounded-full font-semibold border border-cyan-500/30 uppercase">
                    {ann.target_audience || 'ALL'}
                  </span>
                  {!ann.is_active && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold border border-gray-200">DRAFT</span>}
                </h4>
                <p className="text-xs text-zinc-200/60 mt-1 mb-2">Published: {new Date(ann.created_at).toLocaleDateString()}</p>
                <p className="text-sm text-zinc-200/80 whitespace-pre-wrap">{ann.content}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 md:self-start">
              <button onClick={() => handleEdit(ann)} className="p-2 hover:bg-cyan-950/30 text-purple-600 rounded-lg transition-colors" title="Edit">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(ann.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
        {announcements.length === 0 && !loading && (
          <div className="text-center py-10 text-zinc-200/40 text-sm">No announcements found.</div>
        )}
      </div>
    </div>
  )
}
