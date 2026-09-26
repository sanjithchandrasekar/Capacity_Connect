import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
  Bell, Check, CheckCheck, Trash2, X,
  Clock, Sparkles, Megaphone,
  Video, Award, BookOpen, MessageSquare,
  ShieldAlert, Loader2, ArrowRight
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu'
import { useNotifications, getNotificationRedirectUrl, getNotificationMeta } from '@/hooks/useNotifications'
import { useAuth } from '@/hooks/useAuth'

interface NotificationPanelProps {
  align?: 'end' | 'start' | 'center'
  triggerClassName?: string
}

export function NotificationPanel({ align = 'end', triggerClassName }: NotificationPanelProps) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    unreadCount
  } = useNotifications()

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')
  const [isOpen, setIsOpen] = useState(false)

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'unread') {
      return notifications.filter(n => !n.read_at)
    }
    return notifications
  }, [notifications, activeTab])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'session':
        return <Video className="w-3.5 h-3.5 text-indigo-600" />
      case 'announcement':
        return <Megaphone className="w-3.5 h-3.5 text-amber-600" />
      case 'chat':
        return <MessageSquare className="w-3.5 h-3.5 text-cyan-600" />
      case 'course':
        return <Award className="w-3.5 h-3.5 text-emerald-600" />
      case 'user':
        return <BookOpen className="w-3.5 h-3.5 text-blue-600" />
      default:
        return <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
    }
  }

  const handleNotificationClick = (notif: any) => {
    if (!notif.read_at) {
      markAsRead(notif.id)
    }
    setIsOpen(false)
    const url = getNotificationRedirectUrl(notif.type || '', profile?.role)
    navigate(url)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open notifications"
          className={
            triggerClassName ||
            "relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer group"
          }
        >
          <Bell className="w-4 h-4 md:w-5 md:h-5 group-hover:text-cyan-600 transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border-2 border-white shadow-xs"></span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        sideOffset={8}
        className="w-[92vw] sm:w-[410px] max-h-[34rem] overflow-hidden bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-2xl rounded-2xl p-0 z-50 text-slate-900 animate-in fade-in-50 zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-b from-slate-50/90 to-white/80 border-b border-slate-100 sticky top-0 z-20">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-100/80 border border-cyan-200 flex items-center justify-center text-cyan-700 shadow-xs">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-extrabold text-sm text-slate-900 tracking-tight">Notifications</h4>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                  {unreadCount} new
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  All caught up
                </span>
              )}
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    markAllAsRead()
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-cyan-700 hover:text-cyan-900 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 rounded-lg transition-all cursor-pointer shadow-2xs"
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Mark read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    clearAllNotifications()
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all cursor-pointer shadow-2xs"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear all</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub Navigation Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/40'
              }`}
            >
              <span>All</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'all' ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/70 text-slate-600'
              }`}>
                {notifications.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'unread'
                  ? 'bg-white text-cyan-800 shadow-xs border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/40'
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-cyan-600 animate-pulse" />
              )}
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'unread' ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-200/70 text-slate-600'
              }`}>
                {unreadCount}
              </span>
            </button>
          </div>
        </div>

        {/* Notifications Scrollable Content */}
        <div className="max-h-[22rem] overflow-y-auto divide-y divide-slate-100 overscroll-contain">
          {loading ? (
            <div className="py-14 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2.5">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
              <span className="font-medium text-slate-500">Checking for latest updates...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-14 px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Sparkles className="w-6 h-6 text-cyan-500" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-[240px] mx-auto leading-relaxed">
                {activeTab === 'unread'
                  ? 'Great job! You have viewed all your notifications.'
                  : 'Important updates regarding courses, live sessions, and announcements will appear here.'}
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {filteredNotifications.map((notif: any) => {
                const isUnread = !notif.read_at
                const meta = getNotificationMeta(notif.type || '')
                const timeAgo = notif.created_at
                  ? formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })
                  : 'Recently'

                return (
                  <motion.div
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleNotificationClick(notif)}
                    className={`relative p-3.5 sm:p-4 transition-all cursor-pointer group flex items-start gap-3 ${
                      isUnread
                        ? 'bg-gradient-to-r from-cyan-50/70 via-sky-50/30 to-white hover:bg-cyan-50/90'
                        : 'bg-white hover:bg-slate-50/90'
                    }`}
                  >
                    {/* Left active marker indicator */}
                    {isUnread && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-r" />
                    )}

                    {/* Category Icon Badge */}
                    <div className="mt-0.5 shrink-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        {getCategoryIcon(meta.category)}
                      </div>
                    </div>

                    {/* Notification Body */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${meta.color}`}>
                          {meta.label}
                        </span>
                        {isUnread && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-700 bg-cyan-100/80 px-1.5 py-0.2 rounded-full border border-cyan-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-600" />
                            New
                          </span>
                        )}
                      </div>

                      <h5 className={`text-xs sm:text-sm font-bold truncate leading-snug ${isUnread ? 'text-slate-900' : 'text-slate-800'}`}>
                        {notif.title}
                      </h5>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mt-1 font-normal">
                        {notif.message}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/80 text-[10px] text-slate-400 font-medium">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {timeAgo}
                        </span>
                        <span className="text-cyan-600 group-hover:translate-x-0.5 transition-transform font-bold inline-flex items-center gap-0.5">
                          Open <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>

                    {/* Right Action Icons (Dismiss / Mark Read) */}
                    <div className="flex flex-col items-center gap-1 shrink-0 -mr-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          deleteNotification(notif.id)
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Dismiss notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      {isUnread && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            markAsRead(notif.id)
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-cyan-700 hover:bg-cyan-50 transition-colors cursor-pointer"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Footer Link */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              const role = profile?.role === 'admin' || profile?.role === 'super_admin' ? 'admin' : (profile?.role || 'trainee')
              navigate(`/${role}/notifications`)
            }}
            className="text-xs font-bold text-cyan-700 hover:text-cyan-900 inline-flex items-center gap-1 hover:underline cursor-pointer"
          >
            Open Full Notification Center <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
