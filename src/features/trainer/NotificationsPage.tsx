import React, { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2, Inbox } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function NotificationsPage() {
  const { notifications, loading, markAsRead, markAllAsRead, unreadCount } = useNotifications()
  const [markingId, setMarkingId] = useState<string | null>(null)

  const handleMarkAsRead = async (id: string) => {
    setMarkingId(id)
    await markAsRead(id)
    setMarkingId(null)
  }

  if (loading) {
    return <TrainerLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-ink" /></div></TrainerLayout>
  }

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-3xl mx-auto space-y-6">
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-ink">Notifications</h2>
            <p className="text-ink/60 text-sm mt-1">{unreadCount} unread</p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline" size="sm" className="border-ink/10 text-ink">
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Mark all read
            </Button>
          )}
        </motion.div>

        {notifications.length === 0 ? (
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
            {notifications.map(n => (
              <div key={n.id} className={`p-4 rounded-xl border transition-all ${
                n.read_at
                  ? 'bg-ink/5 border-ink/5'
                  : 'bg-ink/5 border-ink/20'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!n.read_at && <div className="w-2 h-2 rounded-full bg-ink shrink-0" />}
                      <p className="text-sm font-medium text-ink">{n.title}</p>
                    </div>
                    <p className="text-xs text-ink/60">{n.message}</p>
                    <p className="text-[10px] text-ink/40 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                  </div>
                  {!n.read_at && (
                    <button onClick={() => handleMarkAsRead(n.id)} disabled={markingId === n.id} className="text-xs text-ink/50 hover:text-ink transition-colors shrink-0">
                      {markingId === n.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Mark read'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </TrainerLayout>
  )
}
