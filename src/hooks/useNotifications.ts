import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { Database } from '@/integrations/supabase/types'

type Notification = Database['public']['Tables']['notifications']['Row']

const getDismissedIds = (userId: string): string[] => {
  try {
    return JSON.parse(localStorage.getItem(`cc_dismissed_notifs_${userId}`) || '[]')
  } catch {
    return []
  }
}

const saveDismissedIds = (userId: string, ids: string[]) => {
  try {
    localStorage.setItem(`cc_dismissed_notifs_${userId}`, JSON.stringify(ids))
  } catch (e) {
    console.error('Failed to save dismissed notification IDs:', e)
  }
}

const getReadIds = (userId: string): string[] => {
  try {
    return JSON.parse(localStorage.getItem(`cc_read_notifs_${userId}`) || '[]')
  } catch {
    return []
  }
}

const saveReadIds = (userId: string, ids: string[]) => {
  try {
    localStorage.setItem(`cc_read_notifs_${userId}`, JSON.stringify(ids))
  } catch (e) {
    console.error('Failed to save read notification IDs:', e)
  }
}

const getClearedTimestamp = (userId: string): number => {
  try {
    return Number(localStorage.getItem(`cc_cleared_notifs_ts_${userId}`) || 0)
  } catch {
    return 0
  }
}

const saveClearedTimestamp = (userId: string, ts: number) => {
  try {
    localStorage.setItem(`cc_cleared_notifs_ts_${userId}`, String(ts))
  } catch (e) {
    console.error('Failed to save cleared notification timestamp:', e)
  }
}

export function useNotifications() {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const processAndFilterNotifications = useCallback((rawList: Notification[], userId: string): Notification[] => {
    const dismissedIds = getDismissedIds(userId)
    const readIds = getReadIds(userId)
    const clearedTs = getClearedTimestamp(userId)

    return rawList
      .filter(n => {
        // Exclude dismissed items
        if (dismissedIds.includes(n.id)) return false
        // Exclude items created before global clear timestamp
        if (n.created_at && new Date(n.created_at).getTime() <= clearedTs) return false
        return true
      })
      .map(n => {
        // Enforce local read status if marked read previously
        if (readIds.includes(n.id) && !n.read_at) {
          return { ...n, read_at: new Date().toISOString() }
        }
        return n
      })
  }, [])

  useEffect(() => {
    if (!profile?.id) {
      setNotifications([])
      setLoading(false)
      return
    }

    const userId = profile.id
    let isMounted = true

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(30)

        if (!error && data && isMounted) {
          const filtered = processAndFilterNotifications(data, userId)
          setNotifications(filtered)
        }
      } catch (err) {
        console.error('Error fetching notifications:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchNotifications()

    // Real-time subscription with unique channel ID per hook instance
    const channelName = `public:notifications:${userId}:${Math.random().toString(36).slice(2, 9)}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotif = payload.new as Notification
          const dismissedIds = getDismissedIds(userId)
          const clearedTs = getClearedTimestamp(userId)

          if (
            !dismissedIds.includes(newNotif.id) &&
            (!newNotif.created_at || new Date(newNotif.created_at).getTime() > clearedTs)
          ) {
            setNotifications((prev) => [newNotif, ...prev.filter(n => n.id !== newNotif.id)].slice(0, 30))
            toast.info(newNotif.title, { description: newNotif.message })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const updatedNotif = payload.new as Notification
          setNotifications((prev) => prev.map(n => n.id === updatedNotif.id ? updatedNotif : n))
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [profile?.id, processAndFilterNotifications])

  const markAsRead = async (id: string) => {
    if (!profile?.id) return
    const userId = profile.id
    const nowIso = new Date().toISOString()

    // Persist to local read set immediately
    const readIds = getReadIds(userId)
    if (!readIds.includes(id)) {
      saveReadIds(userId, [...readIds, id])
    }

    // Update state immediately
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: nowIso } : n))

    // Update database asynchronously
    try {
      await supabase
        .from('notifications')
        .update({ read_at: nowIso })
        .eq('id', id)
        .eq('user_id', userId)
    } catch (e) {
      console.warn('DB update failed, local state retained:', e)
    }
  }

  const markAllAsRead = async () => {
    if (!profile?.id) return
    const userId = profile.id
    const nowIso = new Date().toISOString()

    // Persist all current notification IDs to local read set
    const currentIds = notifications.map(n => n.id)
    const readIds = getReadIds(userId)
    const mergedReadIds = Array.from(new Set([...readIds, ...currentIds]))
    saveReadIds(userId, mergedReadIds)

    // Update state immediately
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || nowIso })))
    toast.success('All notifications marked as read')

    // Update database asynchronously
    try {
      await supabase
        .from('notifications')
        .update({ read_at: nowIso })
        .eq('user_id', userId)
        .is('read_at', null)
    } catch (e) {
      console.warn('DB update failed, local state retained:', e)
    }
  }

  const deleteNotification = async (id: string) => {
    if (!profile?.id) return
    const userId = profile.id

    // Persist to local dismissed set immediately
    const dismissedIds = getDismissedIds(userId)
    if (!dismissedIds.includes(id)) {
      saveDismissedIds(userId, [...dismissedIds, id])
    }

    // Update state immediately
    setNotifications(prev => prev.filter(n => n.id !== id))
    toast.success('Notification dismissed')

    // Delete from database asynchronously
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
    } catch (e) {
      console.warn('DB delete failed, local state retained:', e)
    }
  }

  const clearAllNotifications = async () => {
    if (!profile?.id) return
    const userId = profile.id
    const nowTs = Date.now()

    // Record clear timestamp and all current IDs to local storage
    saveClearedTimestamp(userId, nowTs)
    const currentIds = notifications.map(n => n.id)
    const dismissedIds = getDismissedIds(userId)
    saveDismissedIds(userId, Array.from(new Set([...dismissedIds, ...currentIds])))

    // Update state immediately
    setNotifications([])
    toast.success('All notifications cleared')

    // Delete from database asynchronously
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
    } catch (e) {
      console.warn('DB delete failed, local state retained:', e)
    }
  }

  const unreadCount = notifications.filter(n => !n.read_at).length

  return {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    unreadCount
  }
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
  if (type.startsWith('course_session:') || type.startsWith('session:') || type.startsWith('live_session:')) {
    const courseId = type.split(':')[1]
    return role === 'trainer' ? `/trainer/courses/${courseId}/sessions` : `/trainee/courses/${courseId}`
  }

  switch (type) {
    case 'course_announcement':
    case 'platform_announcement':
    case 'announcement':
      return role === 'trainer' ? '/trainer' : role === 'trainee' ? '/trainee' : '/admin'
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
  if (type.startsWith('course_session:') || type.startsWith('session:') || type.startsWith('live_session:') || type === 'course_session' || type === 'session' || type === 'live_session') {
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
      label: 'User Account',
      color: 'bg-blue-50 text-blue-700 border-blue-200'
    }
  }
  if (type === 'certificate_issued' || type === 'assessment_result' || type === 'enrollment' || type === 'enrollment_status') {
    return {
      category: 'course',
      label: 'Enrollment / Result',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }
  }
  return {
    category: 'system',
    label: 'Platform',
    color: 'bg-slate-100 text-slate-700 border-slate-200'
  }
}
