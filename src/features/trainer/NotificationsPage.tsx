import React, { useState } from 'react'
import { useNotifications, getNotificationRedirectUrl } from '@/hooks/useNotifications'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2, Inbox, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useConfirm } from '@/hooks/useConfirm'

export function NotificationsPage() {
  const { notifications, loading, markAsRead, markAllAsRead, unreadCount, deleteNotification, clearAllNotifications } = useNotifications()
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [ConfirmDialog, confirm] = useConfirm()

  const handleMarkAsRead = async (id: string) => {
    setMarkingId(id)
    await markAsRead(id)
    setMarkingId(null)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingId(id)
    await deleteNotification(id)
    setDeletingId(null)
  }

  const handleClearAll = async () => {
    const isConfirmed = await confirm('Are you sure you want to delete all notifications?', 'Clear All')
    if (isConfirmed) {
      await clearAllNotifications()
    }
  }

  if (loading) {
    return (
      <TrainerLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
        </div>
      </TrainerLayout>
    )
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read_at
    if (filter === 'read') return !!n.read_at
    return true
  })

  return (
    <TrainerLayout>
      <ConfirmDialog />
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-3xl mx-auto space-y-6">
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h2>
            <p className="text-slate-500 text-sm mt-1">{unreadCount} unread</p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-slate-50 font-medium">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5 text-cyan-600" /> Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button onClick={handleClearAll} variant="outline" size="sm" className="border-rose-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-medium">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear all
              </Button>
            )}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
          {(['all', 'unread', 'read'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize whitespace-nowrap ${
                filter === f ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {f}
            </button>
          ))}
        </motion.div>

        {filteredNotifications.length === 0 ? (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border border-slate-200/90 shadow-xs">
              <CardContent className="py-16 text-center">
                <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium">No notifications yet.</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="space-y-2.5">
            {filteredNotifications.map(n => (
              <div 
                key={n.id} 
                onClick={() => {
                  if (!n.read_at) handleMarkAsRead(n.id)
                  navigate(getNotificationRedirectUrl(n.type, profile?.role))
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-sm ${
                  n.read_at
                    ? 'bg-white border-slate-200/80 hover:border-slate-300'
                    : 'bg-cyan-50/40 border-cyan-200/80 hover:border-cyan-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!n.read_at && <div className="w-2 h-2 rounded-full bg-cyan-600 shrink-0" />}
                      <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-medium">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!n.read_at && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkAsRead(n.id)
                        }} 
                        disabled={markingId === n.id} 
                        className="text-xs text-cyan-600 hover:text-cyan-700 font-semibold transition-colors shrink-0"
                      >
                        {markingId === n.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Mark read'}
                      </button>
                    )}
                    <button 
                      onClick={(e) => handleDelete(n.id, e)} 
                      disabled={deletingId === n.id} 
                      className="text-xs text-slate-400 hover:text-rose-600 transition-colors shrink-0 p-1.5 rounded-lg hover:bg-rose-50"
                      title="Clear message"
                    >
                      {deletingId === n.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </TrainerLayout>
  )
}
