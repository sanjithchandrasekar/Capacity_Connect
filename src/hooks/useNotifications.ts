import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { Database } from '@/integrations/supabase/types'

type Notification = Database['public']['Tables']['notifications']['Row']

export function useNotifications() {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (!error && data) {
        setNotifications(data)
      }
      setLoading(false)
    }

    fetchNotifications()

    // Real-time subscription
    const channel = supabase
      .channel(`public:notifications:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          const newNotif = payload.new as Notification
          setNotifications((prev) => [newNotif, ...prev].slice(0, 10))
          toast.info(newNotif.title, { description: newNotif.message })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          const updatedNotif = payload.new as Notification
          setNotifications((prev) => prev.map(n => n.id === updatedNotif.id ? updatedNotif : n))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile])

  const markAsRead = async (id: string) => {
    if (!profile) return
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', profile.id)

    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    }
  }

  const markAllAsRead = async () => {
    if (!profile) return
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', profile.id)
      .is('read_at', null)

    if (!error) {
      setNotifications(prev => prev.map(n => n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
    }
  }

  const unreadCount = notifications.filter(n => !n.read_at).length

  return { notifications, loading, markAsRead, markAllAsRead, unreadCount }
}
