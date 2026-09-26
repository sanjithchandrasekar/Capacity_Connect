import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { useNotifications, getNotificationRedirectUrl, getNotificationMeta } from '@/hooks/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { useConfirm } from '@/hooks/useConfirm'
import { DashboardShell } from '@/components/layout/DashboardShell'
import { TrainerLayout } from '@/features/trainer/TrainerLayout'
import {
  Bell, Check, CheckCheck, Trash2, X,
  Clock, Sparkles, Megaphone, Video,
  Award, BookOpen, MessageSquare, ShieldAlert,
  Loader2, ArrowRight, CheckCircle, RefreshCw,
  Compass, FileCheck, User, BarChart3, Globe,
  Shield, Mail, LayoutDashboard
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

export function UniversalNotificationsPage({ hideShell = false }: { hideShell?: boolean } = {}) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [ConfirmDialog, confirm] = useConfirm()

  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    unreadCount,
    deleteNotification,
    clearAllNotifications
  } = useNotifications()

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setMarkingId(id)
    await markAsRead(id)
    setMarkingId(null)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDeletingId(id)
    await deleteNotification(id)
    setDeletingId(null)
  }

  const handleClearAll = async () => {
    const isConfirmed = await confirm('Are you sure you want to delete all notifications?', 'Clear All Notifications')
    if (isConfirmed) {
      await clearAllNotifications()
    }
  }

  const formatSafeTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Recently'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return 'Recently'
      return formatDistanceToNow(d, { addSuffix: true })
    } catch {
      return 'Recently'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'session':
        return <Video className="w-4 h-4 text-indigo-600" />
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-amber-600" />
      case 'chat':
        return <MessageSquare className="w-4 h-4 text-cyan-600" />
      case 'course':
        return <Award className="w-4 h-4 text-emerald-600" />
      case 'user':
        return <BookOpen className="w-4 h-4 text-blue-600" />
      default:
        return <ShieldAlert className="w-4 h-4 text-slate-600" />
    }
  }

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read_at
    if (filter === 'read') return !!n.read_at
    return true
  })

  const content = (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <ConfirmDialog />

      {/* Header Banner */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white border border-slate-200/90 rounded-3xl shadow-xs"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-600/20 shrink-0">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Notification Center</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {unreadCount > 0 ? `You have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'All caught up! No unread messages'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              variant="outline"
              size="sm"
              className="bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100 font-bold rounded-xl transition-all shadow-xs"
            >
              <CheckCheck className="w-4 h-4 mr-1.5" /> Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              onClick={handleClearAll}
              variant="outline"
              size="sm"
              className="bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 font-bold rounded-xl transition-all shadow-xs"
            >
              <Trash2 className="w-4 h-4 mr-1.5" /> Clear all
            </Button>
          )}
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex items-center gap-2 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 w-fit">
        {[
          { key: 'all', label: 'All Notifications', count: notifications.length },
          { key: 'unread', label: 'Unread', count: unreadCount },
          { key: 'read', label: 'Read History', count: notifications.filter(n => !!n.read_at).length },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === f.key
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <span>{f.label}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              filter === f.key ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {f.count}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Notifications List */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-600" />
          <p className="text-sm font-semibold text-slate-600">Loading your notifications...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="p-12 text-center bg-white border border-slate-200/90 rounded-3xl shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Sparkles className="w-8 h-8 text-cyan-500" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications in this view'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            {filter === 'unread'
              ? 'You have viewed all incoming notifications. Check back later for new alerts.'
              : 'Course enrollments, session updates, assessments, and announcements will be logged here.'}
          </p>
        </motion.div>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-3">
          <AnimatePresence initial={false}>
            {filteredNotifications.map((notif: any) => {
              const isUnread = !notif.read_at
              const meta = getNotificationMeta(notif.type || '')
              const isMarking = markingId === notif.id
              const isDeleting = deletingId === notif.id

              return (
                <motion.div
                  key={notif.id}
                  layout
                  variants={fadeUp}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => {
                    if (isUnread) markAsRead(notif.id)
                    const url = getNotificationRedirectUrl(notif.type || '', profile?.role)
                    navigate(url)
                  }}
                  className={`group relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isUnread
                      ? 'bg-gradient-to-r from-cyan-50/80 via-sky-50/40 to-white border-cyan-200 hover:border-cyan-300 hover:shadow-md hover:shadow-cyan-500/5'
                      : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80'
                  }`}
                >
                  {/* Left blue active bar */}
                  {isUnread && (
                    <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-l-2xl" />
                  )}

                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100/90 border border-slate-200/80 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      {getCategoryIcon(meta.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${meta.color}`}>
                          {meta.label}
                        </span>
                        {isUnread && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-800 bg-cyan-100 px-2 py-0.5 rounded-full border border-cyan-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-600" />
                            New Alert
                          </span>
                        )}
                      </div>
                      <h4 className={`text-sm font-bold truncate ${isUnread ? 'text-slate-900' : 'text-slate-800'}`}>
                        {notif.title}
                      </h4>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mt-1 font-normal">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 font-medium">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatSafeTime(notif.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 shrink-0 sm:self-center" onClick={(e) => e.stopPropagation()}>
                    {isUnread && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleMarkAsRead(notif.id, e)}
                        disabled={isMarking}
                        className="text-xs font-bold text-cyan-700 hover:text-cyan-800 hover:bg-cyan-100/60 rounded-xl"
                      >
                        {isMarking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" /> Mark read</>}
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(notif.id, e)}
                      disabled={isDeleting}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Dismiss notification"
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin text-rose-500" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )

  const traineeNavLinks = [
    { to: '/trainee', label: 'Dashboard', icon: BarChart3 },
    { to: '/trainee/courses', label: 'Course Catalog', icon: Compass },
    { to: '/trainee/my-learning', label: 'My Learning', icon: BookOpen },
    { to: '/trainee/assessments', label: 'Assessments', icon: FileCheck },
    { to: '/trainee/notifications', label: 'Notifications', icon: Bell },
    { to: '/trainee/profile', label: 'Profile', icon: User },
  ]

  const adminNavLinks = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/courses', label: 'Courses', icon: BookOpen },
    { to: '/admin/assessments', label: 'Assessments', icon: FileCheck },
    { to: '/admin/notifications', label: 'Notifications', icon: Bell },
    { to: '/admin/profile', label: 'Profile', icon: User },
  ]

  if (hideShell) {
    return content
  }

  if (profile?.role === 'trainer') {
    return (
      <TrainerLayout>
        {content}
      </TrainerLayout>
    )
  }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  return (
    <DashboardShell
      title="Notifications"
      icon={Bell}
      navLinks={isAdmin ? adminNavLinks : traineeNavLinks}
    >
      {content}
    </DashboardShell>
  )
}


