import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, MessageSquare, Search, Filter, CheckCircle2, Clock,
  Trash2, Eye, Reply, Building, Calendar, AlertCircle, RefreshCw,
  User, Check, ChevronDown, Sparkles, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export interface ContactMessage {
  id: string
  name: string
  email: string
  department?: string
  subject?: string
  message: string
  status: 'unread' | 'read' | 'resolved'
  created_at: string
}

export function AdminContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read' | 'resolved'>('all')
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchMessages = async () => {
    setLoading(true)
    try {
      let dbMessages: ContactMessage[] = []
      const { data, error } = await (supabase as any)
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        dbMessages = data as unknown as ContactMessage[]
      }

      // Check local storage fallback
      const local = JSON.parse(localStorage.getItem('local_contact_messages') || '[]')
      
      // Merge unique
      const mergedMap = new Map<string, ContactMessage>()
      for (const m of local) mergedMap.set(m.id, m)
      for (const m of dbMessages) mergedMap.set(m.id, m)

      setMessages(Array.from(mergedMap.values()).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ))
    } catch (err) {
      console.error('Failed to load contact messages:', err)
      toast.error('Failed to fetch contact messages.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [])

  const handleUpdateStatus = async (id: string, newStatus: 'unread' | 'read' | 'resolved') => {
    try {
      // Update in Supabase
      await (supabase as any)
        .from('contact_messages')
        .update({ status: newStatus })
        .eq('id', id)

      // Update in local state
      setMessages(prev =>
        prev.map(m => (m.id === id ? { ...m, status: newStatus } : m))
      )

      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage(prev => prev ? { ...prev, status: newStatus } : null)
      }

      // Update local storage
      const local = JSON.parse(localStorage.getItem('local_contact_messages') || '[]')
      const updatedLocal = local.map((m: ContactMessage) => m.id === id ? { ...m, status: newStatus } : m)
      localStorage.setItem('local_contact_messages', JSON.stringify(updatedLocal))

      toast.success(`Message marked as ${newStatus}`)
    } catch (err) {
      toast.error('Failed to update message status.')
    }
  }

  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return
    setDeletingId(id)
    try {
      await (supabase as any).from('contact_messages').delete().eq('id', id)
      setMessages(prev => prev.filter(m => m.id !== id))
      if (selectedMessage?.id === id) setSelectedMessage(null)

      const local = JSON.parse(localStorage.getItem('local_contact_messages') || '[]')
      const filteredLocal = local.filter((m: ContactMessage) => m.id !== id)
      localStorage.setItem('local_contact_messages', JSON.stringify(filteredLocal))

      toast.success('Message deleted successfully.')
    } catch (err) {
      toast.error('Failed to delete message.')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredMessages = messages.filter(m => {
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter
    const q = searchQuery.toLowerCase()
    const matchesQuery =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (m.department && m.department.toLowerCase().includes(q)) ||
      (m.subject && m.subject.toLowerCase().includes(q)) ||
      m.message.toLowerCase().includes(q)

    return matchesStatus && matchesQuery
  })

  const totalCount = messages.length
  const unreadCount = messages.filter(m => m.status === 'unread').length
  const resolvedCount = messages.filter(m => m.status === 'resolved').length

  return (
    <div className="space-y-6">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white border-slate-200/90 rounded-3xl shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Inquiries</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
              <Mail className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/90 rounded-3xl shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unread Messages</p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">{unreadCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/90 rounded-3xl shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolved</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">{resolvedCount}</h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Filter & Search Bar */}
      <Card className="bg-white border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-cyan-600" />
                Contact Inquiries &amp; Messages
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Review and respond to messages submitted through the public contact page.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMessages}
                disabled={loading}
                className="rounded-xl text-xs h-9 gap-1.5 border-slate-300"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search by sender name, email, department, or keyword..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl text-xs bg-white border-slate-300"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {(['all', 'unread', 'read', 'resolved'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all shrink-0 cursor-pointer ${
                    statusFilter === tab
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab} {tab === 'unread' && unreadCount > 0 ? `(${unreadCount})` : ''}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-600 mb-2" />
              Loading messages...
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Mail className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
              <p className="text-sm font-bold text-slate-700">No contact messages found</p>
              <p className="text-xs text-slate-400">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'New messages submitted through the contact page will appear here.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredMessages.map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedMessage(item)
                    if (item.status === 'unread') {
                      handleUpdateStatus(item.id, 'read')
                    }
                  }}
                  className={`p-5 sm:p-6 transition-colors hover:bg-slate-50 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    item.status === 'unread' ? 'bg-cyan-50/40 font-medium' : ''
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm mt-0.5">
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{item.name}</span>
                        <span className="text-xs text-slate-500">({item.email})</span>
                        {item.department && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {item.department}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            item.status === 'unread'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : item.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                        {item.subject || 'General Inquiry'}
                      </h4>

                      <p className="text-xs text-slate-500 line-clamp-2">
                        {item.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedMessage(item)
                      }}
                      className="rounded-xl text-xs h-8 text-cyan-700 hover:bg-cyan-50"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === item.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteMessage(item.id)
                      }}
                      className="rounded-xl text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Details Modal */}
      <AnimatePresence>
        {selectedMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                    {selectedMessage.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{selectedMessage.name}</h3>
                    <p className="text-xs text-slate-500">{selectedMessage.email}</p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm flex-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold">Department</span>
                    <span className="font-bold text-slate-800">{selectedMessage.department || 'MoES'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Date Sent</span>
                    <span className="font-bold text-slate-800">{new Date(selectedMessage.created_at).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Status</span>
                    <span className="font-bold text-cyan-700 capitalize">{selectedMessage.status}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Subject</h4>
                  <p className="text-sm font-bold text-slate-900">{selectedMessage.subject || 'General Inquiry'}</p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Message Content</h4>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selectedMessage.message}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedMessage.id, selectedMessage.status === 'resolved' ? 'read' : 'resolved')}
                    className="rounded-xl text-xs h-9 gap-1.5 border-slate-300"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {selectedMessage.status === 'resolved' ? 'Mark as Unresolved' : 'Mark as Resolved'}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject || 'Capacity Connect Inquiry')}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition-all"
                  >
                    <Reply className="w-3.5 h-3.5" /> Reply via Email
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
