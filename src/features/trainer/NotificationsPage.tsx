import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Database } from '@/integrations/supabase/types'
import { TrainerLayout, fadeUp, stagger } from './TrainerLayout'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, CheckCircle, Loader2, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

type Notification = Database['public']['Tables']['notifications']['Row']

export function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingId, setMarkingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setNotifications(data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  const markAsRead = async (id: string) => {
    setMarkingId(id)
    try {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    } catch {
      toast.error('Failed to mark as read')
    } finally {
      setMarkingId(null)
    }
  }

  const markAllRead = async () => {
    if (!user) return
    try {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null)
      setNotifications(prev => prev.map(n => n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
      toast.success('All marked as read')
    } catch {
      toast.error('Failed')
    }
  }

  const unreadCount = notifications.filter(n => !n.read_at).length

  if (loading) {
    return <TrainerLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div></TrainerLayout>
  }

  return (
    <TrainerLayout>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-3xl mx-auto space-y-6">
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Notifications</h2>
            <p className="text-slate-400 text-sm mt-1">{unreadCount} unread</p>
          </div>
          {unreadCount > 0 && (
            <Button onClick={markAllRead} variant="outline" size="sm" className="border-white/10 text-white">
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Mark all read
            </Button>
          )}
        </motion.div>

        {notifications.length === 0 ? (
          <motion.div variants={fadeUp}>
            <Card className="bg-white/[0.02] border-white/[0.06]">
              <CardContent className="py-16 text-center">
                <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No notifications yet.</p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="space-y-2">
            {notifications.map(n => (
              <div key={n.id} className={`p-4 rounded-xl border transition-all ${
                n.read_at
                  ? 'bg-white/[0.01] border-white/[0.04]'
                  : 'bg-white/[0.03] border-cyan-500/20'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {!n.read_at && <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />}
                      <p className="text-sm font-medium text-white">{n.title}</p>
                    </div>
                    <p className="text-xs text-slate-400">{n.message}</p>
                    <p className="text-[10px] text-slate-600 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                  </div>
                  {!n.read_at && (
                    <button onClick={() => markAsRead(n.id)} disabled={markingId === n.id} className="text-xs text-slate-500 hover:text-white transition-colors shrink-0">
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
