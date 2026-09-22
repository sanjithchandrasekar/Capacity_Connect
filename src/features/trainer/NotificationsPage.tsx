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

export function NotificationsPage() {
  const { notifications, loading, markAsRead, markAllAsRead, unreadCount, deleteNotification, clearAllNotifications } = useNotifications()
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const navigate = useNavigate()
  const { profile } = useAuth()

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
    if (window.confirm('Are you sure you want to delete all notifications?')) {
      await clearAllNotifications()
    }
  }

  if (loading) {
    return <TrainerLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-ink" /></div></TrainerLayout>
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read_at
    if (filter === 'read') return !!n.read_at
    return true
  })

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-3xl mx-auto space-y-6">
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">Notifications</h2>
            <p className="text-ink/60 text-sm mt-1">{unreadCount} unread</p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} variant="outline" size="sm" className="border-ink/10 text-ink">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button onClick={handleClearAll} variant="outline" size="sm" className="border-ink/10 text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear all
              </Button>
            )}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="flex bg-ink/5 p-1 rounded-xl border border-ink/10 w-fit">
          {(['all', 'unread', 'read'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize whitespace-nowrap ${
                filter === f ? 'bg-white text-ink shadow-sm' : 'text-ink/60 hover:text-ink hover:bg-ink/10'
              }`}
            >
              {f}
            </button>
          ))}
        </motion.div>

        {filteredNotifications.length === 0 ? (
          <motion.div variants={fadeUp}>
            <Card className="bg-white border-ink/10">
              <CardContent className="py-16 text-center">
                <Inbox className="w-12 h-12 text-ink/40 mx-auto mb-4" />
                <p className="text-ink/60">No notifications yet.</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="space-y-2">
            {filteredNotifications.map(n => (
              <div 
                key={n.id} 
                onClick={() => {
                  if (!n.read_at) handleMarkAsRead(n.id)
                  navigate(getNotificationRedirectUrl(n.type, profile?.role))
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                  n.read_at
                    ? 'bg-ink/5 border-ink/5'
                    : 'bg-ink/5 border-ink/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!n.read_at && <div className="w-2 h-2 rounded-full bg-ink shrink-0" />}
                      <p className="text-sm font-medium text-ink">{n.title}</p>
                    </div>
                    <p className="text-xs text-ink/60">{n.message}</p>
                    <p className="text-[10px] text-ink/40 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!n.read_at && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkAsRead(n.id)
                        }} 
                        disabled={markingId === n.id} 
                        className="text-xs text-ink/50 hover:text-ink transition-colors shrink-0"
                      >
                        {markingId === n.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Mark read'}
                      </button>
                    )}
                    <button 
                      onClick={(e) => handleDelete(n.id, e)} 
                      disabled={deletingId === n.id} 
                      className="text-xs text-rose-500/70 hover:text-rose-600 transition-colors shrink-0 p-1 rounded-md hover:bg-rose-50"
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
