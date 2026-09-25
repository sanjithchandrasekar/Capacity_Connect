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

  const deleteNotification = async (id: string) => {
    if (!profile) return
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', profile.id)

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }
  }

  const clearAllNotifications = async () => {
    if (!profile) return
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', profile.id)

    if (!error) {
      setNotifications([])
    }
  }

  const unreadCount = notifications.filter(n => !n.read_at).length

  return { notifications, loading, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications, unreadCount }
}

export function getNotificationRedirectUrl(type: string, role: string | undefined): string {
  if (!role) return '/'
  
  if (type.startsWith('enrollment_request:')) {
    const courseId = type.split(':')[1]
    return `/trainer/courses/${courseId}`
  }
  if (type.startsWith('enrollment_status:')) {
    const courseId = type.split(':')[1]
    return `/trainee/courses/${courseId}`
  }
  if (type.startsWith('course_message:')) {
    const courseId = type.split(':')[1]
    return role === 'trainer' ? `/trainer/courses/${courseId}` : `/trainee/courses/${courseId}`
  }
  if (type.startsWith('course_announcement:') || type.startsWith('announcement:')) {
    const courseId = type.split(':')[1]
    return role === 'trainer' ? `/trainer/courses/${courseId}` : `/trainee/courses/${courseId}`
  }
  if (type.startsWith('course_session:') || type.startsWith('session:')) {
    const courseId = type.split(':')[1]
    return role === 'trainer' ? `/trainer/courses/${courseId}/sessions` : `/trainee/courses/${courseId}`
  }

  switch (type) {
    case 'course_announcement':
    case 'platform_announcement':
    case 'announcement':
      return role === 'trainer' ? '/trainer/dashboard' : role === 'trainee' ? '/trainee/dashboard' : '/admin'
    case 'course_session':
    case 'session':
    case 'live_session':
      return role === 'trainer' ? '/trainer/courses' : '/trainee/courses'
    case 'user_registration':
    case 'course_submission':
      return role === 'super_admin' ? '/super-admin' : '/admin'
    case 'course_status':
    case 'course_assigned':
    case 'enrollment_request':
      return '/trainer/courses'
    case 'enrollment_status':
    case 'certificate_issued':
    case 'assessment_result':
      return '/trainee/my-learning'
    default:
      return `/${role}`
  }
}

export interface NotificationMeta {
  category: 'announcement' | 'session' | 'course' | 'chat' | 'user' | 'system'
  label: string
  color: string
}

export function getNotificationMeta(type: string): NotificationMeta {
  if (type.startsWith('course_announcement:') || type.startsWith('announcement:') || type === 'platform_announcement' || type === 'announcement' || type === 'course_announcement') {
    return {
      category: 'announcement',
      label: 'Announcement',
      color: 'bg-amber-50 text-amber-700 border-amber-200'
    }
  }
  if (type.startsWith('course_session:') || type.startsWith('session:') || type === 'course_session' || type === 'session' || type === 'live_session') {
    return {
      category: 'session',
      label: 'Live Session',
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    }
  }
  if (type.startsWith('course_message:')) {
    return {
      category: 'chat',
      label: 'Message',
      color: 'bg-cyan-50 text-cyan-700 border-cyan-200'
    }
  }
  if (type === 'user_registration') {
    return {
      category: 'user',
      label: 'User',
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    }
  }
  if (type === 'certificate_issued' || type === 'assessment_result') {
    return {
      category: 'course',
      label: 'Achievement',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }
  }
  return {
    category: 'system',
    label: 'Platform',
    color: 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

