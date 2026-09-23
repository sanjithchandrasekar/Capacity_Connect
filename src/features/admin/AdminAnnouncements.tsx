import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { motion, Variants } from 'framer-motion'
import { Plus, Megaphone, Trash2, Edit2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useConfirm } from '@/hooks/useConfirm'

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
  const { profile } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [ConfirmDialog, confirm] = useConfirm()
  
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

      const authorName = profile?.full_name || 'System Administrator'
      const contentWithAuthor = `${content}\n\n<!--AUTHOR:${authorName}-->`

      if (editingId) {
        const { error } = await supabase
          .from('announcements')
          .update({ title, content: contentWithAuthor, target_audience: targetAudience, is_active: isActive })
          .eq('id', editingId)
        if (error) throw error
        toast.success('Announcement updated')
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert([{ title, content: contentWithAuthor, target_audience: targetAudience, is_active: isActive, author_id: user.id }])
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
    const isConfirmed = await confirm('Are you sure you want to delete this announcement?', 'Delete Announcement')
    if (!isConfirmed) return

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
    setContent(announcement.content.replace(/\n\n<!--AUTHOR:.*?-->/g, ''))
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
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-slate-900">Global Announcements</h3>
          <p className="text-xs text-slate-500 mt-0.5">Publish news and updates to the homepage.</p>
        </div>
        {!isFormOpen && (
          <Button onClick={() => setIsFormOpen(true)} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white rounded-xl text-xs h-9 shadow-md shadow-cyan-600/10">
            <Plus className="w-4 h-4 mr-1.5" /> New Announcement
          </Button>
        )}
      </div>

      <ConfirmDialog />

      {isFormOpen && (
        <motion.form variants={fadeUp} initial="hidden" animate="visible" onSubmit={handleSubmit} className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm mb-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all outline-none placeholder:text-slate-400" placeholder="e.g., New Training Module Available" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Audience</label>
            <select value={targetAudience} onChange={e => setTargetAudience(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all outline-none">
              <option value="all">All Users (Public & Internal)</option>
              <option value="trainer">Trainers Only</option>
              <option value="trainee">Trainees Only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Content</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all outline-none min-h-[100px] placeholder:text-slate-400" placeholder="Type your announcement here..." required />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded text-cyan-600 focus:ring-cyan-500 border-slate-300" />
            <label htmlFor="isActive" className="text-sm text-slate-700 font-medium">Publish immediately (Active)</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={resetForm} className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50">Cancel</Button>
            <Button type="submit" className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white rounded-xl shadow-md shadow-cyan-600/10">
              {editingId ? 'Save Changes' : 'Publish Announcement'}
            </Button>
          </div>
        </motion.form>
      )}

      <div className="grid gap-4">
        {announcements.filter(ann => ann.id !== editingId).map((ann, i) => (
          <motion.div key={ann.id} variants={fadeUp} custom={i} className={`bg-white border ${ann.is_active ? 'border-slate-200/90' : 'border-slate-200 opacity-70'} rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4`}>
            <div className="flex gap-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${ann.is_active ? 'bg-cyan-50 text-cyan-600' : 'bg-slate-100 text-slate-400'}`}>
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  {ann.title}
                  <span className="text-[10px] bg-cyan-50 text-cyan-700 px-2.5 py-0.5 rounded-full font-semibold border border-cyan-200 uppercase">
                    {ann.target_audience || 'ALL'}
                  </span>
                  {!ann.is_active && <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full font-semibold border border-slate-200">DRAFT</span>}
                </h4>
                <p className="text-xs text-slate-400 mt-1 mb-2 font-medium">Published: {new Date(ann.created_at).toLocaleDateString()}</p>
                <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{ann.content.replace(/\n\n<!--AUTHOR:.*?-->/g, '')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 md:self-start">
              <button onClick={() => handleEdit(ann)} className="p-2 hover:bg-slate-100 text-cyan-600 rounded-lg transition-colors" title="Edit">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(ann.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
        {announcements.length === 0 && !loading && (
          <div className="text-center py-10 text-slate-400 text-sm">No announcements found.</div>
        )}
      </div>
    </div>
  )
}
