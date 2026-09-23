import React, { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Database } from '@/integrations/supabase/types'
import { AdminCourses } from '@/features/courses/AdminCourses'
import { TrainerAssignmentBanner } from '@/features/admin/TrainerAssignmentBanner'
import { AdminAnnouncements } from '@/features/admin/AdminAnnouncements'
import { AdminHomePageSettings } from '@/features/admin/AdminHomePageSettings'
import { Button } from '@/components/ui/button'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import { MaterialPreviewDialog } from '@/components/ui/MaterialPreviewDialog'
import {
  Globe, LogOut, Users, BookOpen, BarChart3, Shield,
  GraduationCap, ChevronRight, CheckCircle, Search,
  XCircle, Clock, Ban, ArrowUpRight, Compass, Bell,
  Award, Target, FileText, Settings,
  ChevronDown, RefreshCw, Star, MessageSquare, Crown,
  Menu, X, Trash2, Loader2, LayoutDashboard, Megaphone
} from 'lucide-react'
import { toast } from 'sonner'
import { useNotifications, getNotificationRedirectUrl } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type AuditLog = Database['public']['Tables']['audit_logs']['Row']
type Profile = (
  | Database['public']['Tables']['admins']['Row']
  | Database['public']['Tables']['trainers']['Row']
  | Database['public']['Tables']['trainees']['Row']
) & { department?: string | null; proof_path?: string | null }


const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }
const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
}

/* ─── Shared Shell ─────────────────────────────────────────── */
export function DashboardShell({
  title, icon: Icon, children, navLinks,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  navLinks?: { id?: string; to?: string; label: string; icon: React.ElementType; badge?: number; isActive?: boolean; onClick?: () => void }[]
}) {
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { notifications, loading: notifsLoading, unreadCount, markAsRead, clearAllNotifications, deleteNotification, markAllAsRead } = useNotifications()

  const handleResetPassword = async () => {
    if (!profile?.email) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/setup-password`,
      });
      if (error) throw error;
      toast.success('Secure password reset email sent! Please check your inbox.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to send reset email.');
    }
  };

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const roleColor: Record<string, string> = {
    admin: 'bg-cyan-950/30 text-cyan-400 border-cyan-500/30',
    super_admin: 'bg-pink-50 text-pink-700 border-pink-200',
    trainer: 'bg-orange-50 text-orange-700 border-orange-200',
    trainee: 'bg-cyan-950/30 text-purple-600 border-cyan-500/30',
  }
  const statusColor: Record<string, string> = {
    approved: 'bg-green-50 text-green-700 border-green-200',
    pending: 'bg-orange-50 text-orange-700 border-orange-200',
    suspended: 'bg-red-50 text-red-600 border-red-200',
    rejected: 'bg-red-50 text-red-600 border-red-200',
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-cyan-500/30">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain shrink-0" />
          {(!sidebarCollapsed || mobileOpen) && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm font-bold whitespace-nowrap"
            >
              <span className="text-cyan-300">Capacity</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500"> Connect</span>
            </motion.span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto scrollbar-thin">
        {navLinks?.map(link => {
          const isActive = link.isActive !== undefined ? link.isActive : (link.to ? location.pathname === link.to : false)
          
          const buttonContent = (
            <button 
              onClick={() => {
                if (link.onClick) link.onClick()
                setMobileOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm group ${
              isActive
                ? 'bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white shadow-md shadow-pink-500/20'
                : 'text-zinc-200/70 hover:text-zinc-200 hover:bg-cyan-950/30 border border-transparent'
            }`}>
              <link.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'group-hover:text-purple-600'} transition-colors`} />
              {(!sidebarCollapsed || mobileOpen) && (
                <>
                  <span className="flex-1 text-left">{link.label}</span>
                  {link.badge !== undefined && link.badge > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded-full">
                      {link.badge > 99 ? '99+' : link.badge}
                    </span>
                  )}
                  <ChevronRight className={`w-3.5 h-3.5 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                </>
              )}
            </button>
          )

          if (link.to) {
            return (
              <Link key={link.to || link.id || link.label} to={link.to}>
                {buttonContent}
              </Link>
            )
          }

          return <div key={link.id || link.label}>{buttonContent}</div>
        })}
      </nav>

      {/* Quick Search shortcut */}
      {(!sidebarCollapsed || mobileOpen) && (
        <div className="p-3 mx-3 mb-2 rounded-xl bg-cyan-950/30/70 border border-cyan-500/30">
          <div className="flex items-center gap-2 text-xs text-zinc-200/60">
            <Search className="w-3.5 h-3.5 text-purple-600" />
            <span>
              Press <kbd className="px-1 py-0.5 bg-[#070E20]/90 border border-cyan-500/30 rounded text-[10px] font-medium">⌘K</kbd> for search
            </span>
          </div>
        </div>
      )}

      {/* Profile summary & logout */}
      <div className="p-3 border-t border-cyan-500/30 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-cyan-950/30 transition-all cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-purple-500/20">
            {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          {(!sidebarCollapsed || mobileOpen) && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-cyan-400 transition-colors">
                {profile?.full_name ?? 'User'}
              </p>
              <p className="text-[11px] text-zinc-200/50 truncate">
                {profile?.email}
              </p>
            </div>
          )}
        </div>
        {(!sidebarCollapsed || mobileOpen) && (
          <div className="flex items-center gap-1.5 px-3">
            <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${roleColor[profile?.role ?? ''] ?? 'bg-cyan-950/30 text-cyan-400'}`}>
              {profile?.role?.replace('_', ' ')}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${statusColor[profile?.approval_status ?? ''] ?? 'bg-cyan-950/30 text-cyan-400'}`}>
              {profile?.approval_status}
            </span>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-zinc-200/60 hover:text-red-600 hover:bg-red-500/10 transition-all text-sm"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(!sidebarCollapsed || mobileOpen) && <span>Sign Out</span>}
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[#070E20]/90 text-zinc-200 flex">
      {/* Background ambient effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-transparent blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-orange-500/10 via-pink-500/10 to-transparent blur-[120px]" />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-midnight/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-cyan-500/30 bg-[#070E20]/90/95 backdrop-blur-2xl flex flex-col transition-transform duration-300 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4 z-10">
          <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-cyan-950/30 text-zinc-200/70 hover:text-zinc-200 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={`relative z-20 hidden md:flex ${sidebarCollapsed ? 'w-[72px]' : 'w-64'} border-r border-cyan-500/30 bg-[#070E20]/90/80 backdrop-blur-2xl flex-col shrink-0 h-screen sticky top-0 transition-all duration-300`}>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Topbar */}
        <header className="h-14 md:h-16 border-b border-cyan-500/30 bg-[#070E20]/90/80 backdrop-blur-2xl sticky top-0 z-10 flex items-center px-4 md:px-6 gap-3">
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileOpen(true)
              } else {
                setSidebarCollapsed(!sidebarCollapsed)
              }
            }}
            className="p-2 rounded-lg hover:bg-cyan-950/30 text-zinc-200/70 hover:text-zinc-200 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
            <h1 className="text-sm md:text-base font-semibold text-zinc-200 truncate">{title}</h1>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1 md:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 rounded-lg hover:bg-cyan-950/30 text-zinc-200/70 hover:text-zinc-200 transition-all group">
                  <Bell className="w-4 h-4 group-hover:text-purple-600" />
                  {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full animate-pulse" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between px-2 pb-2">
                  <DropdownMenuLabel className="pb-0">Notifications</DropdownMenuLabel>
                  <div className="flex items-center gap-1 pr-2">
                    {unreadCount > 0 && (
                      <button onClick={(e) => { e.preventDefault(); markAllAsRead() }} className="text-[10px] font-bold text-purple-600 hover:text-cyan-400 bg-cyan-950/30 px-2 py-1 rounded">
                        Mark read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button onClick={(e) => { e.preventDefault(); clearAllNotifications() }} className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded">
                        Clear all
                      </button>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                
                {notifsLoading ? (
                  <div className="p-4 text-center text-xs text-zinc-200/50">Loading...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-zinc-200/50">No new notifications</div>
                ) : (
                  notifications.map((notif) => (
                    <React.Fragment key={notif.id}>
                      <DropdownMenuItem 
                        className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!notif.read_at ? 'bg-cyan-950/40' : ''}`}
                        onClick={() => {
                          if (!notif.read_at) markAsRead(notif.id);
                          navigate(getNotificationRedirectUrl(notif.type, profile?.role));
                        }}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            {!notif.read_at && <div className="w-1.5 h-1.5 rounded-full bg-purple-600 shrink-0" />}
                            <span className="text-sm font-semibold text-zinc-200 truncate max-w-[160px]">{notif.title}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              deleteNotification(notif.id)
                            }}
                            className="text-rose-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                            title="Clear message"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-xs text-zinc-200/60">{notif.message}</span>
                        <span className="text-[10px] text-zinc-200/40 mt-1">
                          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </React.Fragment>
                  ))
                )}
                
                <DropdownMenuItem className="text-center text-xs font-medium text-purple-600 justify-center cursor-pointer">
                  View all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to={`/${profile?.role}/settings`} className="p-2 rounded-lg hover:bg-cyan-950/30 text-zinc-200/70 hover:text-zinc-200 transition-all">
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        </header>
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

/* ─── Status Badge ──────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ElementType }> = {
    approved: { color: 'bg-green-50 text-green-700 border border-green-200', icon: CheckCircle },
    pending: { color: 'bg-yellow-50 text-yellow-700 border border-yellow-200', icon: Clock },
    rejected: { color: 'bg-red-50 text-red-600 border border-red-200', icon: XCircle },
    suspended: { color: 'bg-red-50 text-red-600 border border-red-200', icon: Ban },
  }
  const c = config[status] ?? { color: 'bg-ink/70 text-zinc-200/70', icon: Clock }
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border capitalize font-medium ${c.color}`}>
      <c.icon className="w-3 h-3" />
      {status}
    </span>
  )
}

/* ─── Stat Card ─────────────────────────────────────────────── */
function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  gradient, 
  subtext,
  badgeText
}: { 
  label: string
  value: string | number
  icon: React.ElementType
  gradient: string
  subtext?: string
  badgeText?: string
}) {
  return (
    <motion.div 
      variants={fadeUp} 
      className="group relative p-5 md:p-6 rounded-3xl bg-[#070E20]/90 border border-cyan-500/30 shadow-sm hover:shadow-xl hover:shadow-cyan-950/50 hover:-translate-y-1 transition-all duration-300 cursor-default overflow-hidden"
    >
      {/* Subtle background ambient corner glow */}
      <div className={`absolute -right-8 -bottom-8 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 blur-xl transition-opacity bg-gradient-to-br ${gradient}`} />
      
      <div className="relative flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-5 h-5" />
        </div>
        {badgeText && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-950/30 text-cyan-400 border border-cyan-500/30">
            {badgeText}
          </span>
        )}
      </div>

      <div className="relative">
        <div className="text-3xl font-extrabold text-zinc-200 tracking-tight mb-1">{value}</div>
        <div className="text-xs font-semibold text-zinc-200/60">{label}</div>
        {subtext && <div className="text-[11px] text-purple-600/80 font-medium mt-1">{subtext}</div>}
      </div>
    </motion.div>
  )
}

/* ─── Activity Item ─────────────────────────────────────────── */
function ActivityItem({ 
  icon: Icon, 
  title, 
  desc, 
  time, 
  iconBg 
}: { 
  icon: React.ElementType
  title: string
  desc: string
  time: string
  iconBg: string
}) {
  return (
    <div className="flex items-start gap-3.5 p-3.5 rounded-2xl hover:bg-cyan-950/40 transition-colors group">
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs md:text-sm text-zinc-200 font-semibold truncate group-hover:text-cyan-400 transition-colors">{title}</p>
        <p className="text-xs text-zinc-200/55 mt-0.5 truncate">{desc}</p>
      </div>
      <span className="text-[11px] text-zinc-200/40 font-medium whitespace-nowrap bg-cyan-950/30/70 px-2 py-0.5 rounded-full">{time}</span>
    </div>
  )
}

/* ─── Progress Bar ──────────────────────────────────────────── */
function ProgressBar({ value, max = 100, color = 'from-purple-600 via-pink-500 to-orange-500' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(Math.round((value / max) * 100), 100)
  return (
    <div className="w-full h-2.5 bg-purple-100/60 rounded-full overflow-hidden p-0.5">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        className={`h-full bg-gradient-to-r ${color} rounded-full shadow-sm`}
      />
    </div>
  )
}

/* ─── Trainee Dashboard ─────────────────────────────────────── */
export function TraineeDashboard() {
  const { profile } = useAuth()

  // Mock IMD-specific competency data for Digital Twin
  const competencyData = [
    { subject: 'Forecasting', A: 85, B: 90, fullMark: 100 },
    { subject: 'Radar Ops', A: 60, B: 85, fullMark: 100 },
    { subject: 'Climate Mod', A: 90, B: 80, fullMark: 100 },
    { subject: 'Aviation Met', A: 75, B: 80, fullMark: 100 },
    { subject: 'Marine Met', A: 45, B: 75, fullMark: 100 },
    { subject: 'Data Analysis', A: 80, B: 85, fullMark: 100 },
  ];

  const handleResetPassword = async () => {
    if (!profile?.email) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/setup-password`,
      });
      if (error) throw error;
      toast.success('Secure password reset email sent! Please check your inbox.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to send reset email.');
    }
  };

  // ── Real data from Supabase ──────────────────────────────────

  // Fetch all enrollments for this trainee with course & trainer info
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['trainee-dashboard-enrollments', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          course:courses(
            id, title, duration_minutes,
            trainer:trainers!courses_trainer_id_fkey(full_name)
          )
        `)
        .eq('user_id', profile!.id)
        .order('enrolled_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Fetch certificates for this trainee
  const { data: certificates = [], isLoading: certLoading } = useQuery({
    queryKey: ['trainee-dashboard-certs', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certificates')
        .select('id, issued_at, status')
        .eq('user_id', profile!.id)
        .eq('status', 'valid')
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Fetch recent notifications as activity feed
  const { data: notifications = [], isLoading: notifLoading } = useQuery({
    queryKey: ['trainee-dashboard-notifications', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
  })

  // ── Derived stats ────────────────────────────────────────────
  const enrolledCount = enrollments.length
  const completedEnrollments = enrollments.filter((e: any) => e.status === 'completed')
  const completionRate = enrolledCount > 0
    ? Math.round((completedEnrollments.length / enrolledCount) * 100)
    : 0
  const totalMinutes = enrollments.reduce((sum: number, e: any) => {
    const mins = e.course?.duration_minutes ?? 0
    const pct = (e.progress_percent ?? 0) / 100
    return sum + Math.round(mins * pct)
  }, 0)
  const hoursLearned = Math.round(totalMinutes / 60)

  const stats = [
    {
      label: 'Enrolled Courses',
      value: enrollmentsLoading ? '…' : String(enrolledCount),
      icon: BookOpen,
      gradient: 'from-purple-600 to-purple-800',
      badgeText: 'Active',
      subtext: enrolledCount === 0 ? 'No courses yet' : `${enrollments.filter((e: any) => e.status !== 'completed' && e.status !== 'withdrawn').length} active`,
    },
    {
      label: 'Hours Learned',
      value: enrollmentsLoading ? '…' : String(hoursLearned),
      icon: Clock,
      gradient: 'from-pink-500 to-rose-600',
      badgeText: 'Total',
      subtext: hoursLearned === 0 ? 'Start learning!' : `Based on progress`,
    },
    {
      label: 'Certificates',
      value: certLoading ? '…' : String(certificates.length),
      icon: Award,
      gradient: 'from-orange-400 to-orange-600',
      badgeText: 'Verified',
      subtext: certificates.length === 0 ? 'None yet' : 'Ready to share',
    },
    {
      label: 'Completion Rate',
      value: enrollmentsLoading ? '…' : `${completionRate}%`,
      icon: Target,
      gradient: 'from-purple-600 via-pink-500 to-orange-500',
      badgeText: completionRate >= 75 ? 'Top 25%' : completionRate >= 50 ? 'On Track' : 'Keep Going',
      subtext: enrolledCount === 0 ? 'No data yet' : `${completedEnrollments.length} of ${enrolledCount} done`,
    },
  ]

  // ── In-progress courses (last 3 active enrollments) ──────────
  const recentCourses = enrollments
    .filter((e: any) => e.status !== 'withdrawn')
    .slice(0, 3)
    .map((e: any) => ({
      id: e.course?.id,
      title: e.course?.title ?? 'Untitled Course',
      progress: e.progress_percent ?? 0,
      status: e.status === 'completed' ? 'Completed' : 'In Progress',
      instructor: e.course?.trainer?.full_name ?? 'Instructor',
      duration: e.status === 'completed'
        ? 'Completed'
        : e.course?.duration_minutes
          ? `${Math.round(e.course.duration_minutes * (1 - (e.progress_percent ?? 0) / 100))} min left`
          : 'Self-paced',
    }))

  // ── Recent activity from notifications ───────────────────────
  const activities = notifications.length > 0
    ? notifications.map((n: any) => ({
        icon: n.type === 'certificate_issued' ? Award
          : n.type === 'enrollment' ? BookOpen
          : n.type === 'assessment_result' ? CheckCircle
          : Star,
        title: n.title,
        desc: n.message,
        time: formatDistanceToNow(new Date(n.created_at), { addSuffix: true }),
        iconBg: n.type === 'certificate_issued' ? 'bg-orange-100 text-orange-600'
          : n.type === 'enrollment' ? 'bg-pink-100 text-pink-600'
          : n.type === 'assessment_result' ? 'bg-emerald-100 text-emerald-600'
          : 'bg-purple-100 text-cyan-400',
      }))
    : enrollments.slice(0, 4).map((e: any) => ({
        icon: e.status === 'completed' ? CheckCircle : BookOpen,
        title: e.status === 'completed' ? 'Completed Course' : 'Enrolled in Course',
        desc: e.course?.title ?? 'Course',
        time: formatDistanceToNow(new Date(e.enrolled_at), { addSuffix: true }),
        iconBg: e.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-pink-100 text-pink-600',
      }))

  const dashboardLoading = enrollmentsLoading || certLoading

  return (
    <DashboardShell
      title="Trainee Dashboard"
      icon={GraduationCap}
      navLinks={[
        { to: '/trainee', label: 'Overview', icon: BarChart3 },
        { to: '/trainee/courses', label: 'Course Catalog', icon: Compass },
        { to: '/trainee/my-learning', label: 'My Learning', icon: BookOpen },
      ]}
    >
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 max-w-full">
        {/* Welcome Hero Banner */}
        <motion.div 
          variants={fadeUp} 
          className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-900 via-purple-800 to-midnight text-white overflow-hidden shadow-xl shadow-cyan-950/50 border border-cyan-500/30"
        >
          {/* Glowing background orbs */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-pink-500/20 to-orange-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#070E20]/90/10 backdrop-blur-md text-orange-300 text-xs font-semibold mb-3 border border-white/15">
                <Star className="w-3.5 h-3.5 fill-orange-300" />
                <span>Keep up the momentum!</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                Welcome back, {profile?.full_name?.split(' ')[0] ?? 'Trainee'}! 👋
              </h2>
              <p className="text-white/80 text-sm leading-relaxed">
                Continue your learning journey.
                {completionRate > 0
                  ? ` You've completed ${completionRate}% of your enrolled courses!`
                  : enrolledCount > 0
                    ? ` You have ${enrolledCount} active course${enrolledCount > 1 ? 's' : ''} in progress.`
                    : ' Browse the catalog to start your learning journey!'}
              </p>
            </div>
            <Link to="/trainee/courses" className="shrink-0">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-pink-500/30 hover:shadow-cyan-500/10 hover:scale-105 active:scale-95 transition-all">
                <Compass className="w-4 h-4 mr-2" />
                Browse Catalog
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Course Progress */}
          <motion.div variants={fadeUp} className="lg:col-span-2 bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col justify-between">
            <div>
              <div className="pb-4 border-b border-cyan-500/30 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-200">In-Progress Courses</h3>
                  <p className="text-xs text-zinc-200/50">Your active learning roadmap</p>
                </div>
                <Link to="/trainee/my-learning" className="text-xs font-bold text-purple-600 hover:text-pink-600 transition-colors flex items-center gap-1 bg-cyan-950/30 px-3 py-1.5 rounded-full border border-cyan-500/30">
                  View All <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="py-4 space-y-3.5">
                {enrollmentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                  </div>
                ) : recentCourses.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-8 h-8 text-purple-200 mx-auto mb-2" />
                    <p className="text-sm text-zinc-200/40">No courses yet. Browse the catalog to get started!</p>
                  </div>
                ) : (
                  recentCourses.map((course: any) => (
                    <div key={course.id ?? course.title} className="p-4 rounded-2xl bg-cyan-950/30/40 hover:bg-cyan-950/30/80 border border-cyan-500/30 hover:border-cyan-400/50 transition-all duration-200 group">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="min-w-0 pr-3">
                          <p className="text-sm font-bold text-zinc-200 truncate group-hover:text-cyan-400 transition-colors">{course.title}</p>
                          <p className="text-xs text-zinc-200/50">{course.instructor} • {course.duration}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold shrink-0 ${
                          course.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border border-cyan-500/30'
                        }`}>
                          {course.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <ProgressBar
                          value={course.progress}
                          color={course.progress === 100 ? 'from-emerald-400 to-emerald-600' : 'from-purple-600 via-pink-500 to-orange-500'}
                        />
                        <span className="text-xs font-bold text-zinc-200/70 w-10 text-right">{course.progress}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-cyan-500/30 flex items-center justify-between text-xs text-zinc-200/60">
              <span>{enrolledCount > 0 ? `${enrolledCount} course${enrolledCount > 1 ? 's' : ''} enrolled` : 'No enrollments yet'}</span>
              <span className="font-semibold text-purple-600">
                {completionRate >= 75 ? 'Excellent 🚀' : completionRate >= 50 ? 'On Track 📈' : completionRate > 0 ? 'Keep Going 💪' : 'Get Started!'}
              </span>
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={fadeUp} className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm flex flex-col">
            <div className="pb-4 border-b border-cyan-500/30 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-200">Recent Activity</h3>
                <p className="text-xs text-zinc-200/50">Your recent updates & badges</p>
              </div>
              <button className="p-1.5 rounded-xl hover:bg-cyan-950/30 text-purple-600 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="py-2 space-y-1 flex-1">
              {notifLoading || enrollmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="w-7 h-7 text-purple-200 mx-auto mb-2" />
                  <p className="text-xs text-zinc-200/40">No activity yet. Enroll in a course to get started!</p>
                </div>
              ) : (
                activities.map((act: any, i: number) => (
                  <ActivityItem key={i} {...act} />
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Trainee Digital Twin */}
        <motion.div variants={fadeUp} className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-center">
            <div className="lg:w-1/3 space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/30 text-cyan-400 border border-cyan-500/30 text-xs font-bold mb-1">
                <Target className="w-3.5 h-3.5" />
                <span>AI Competency Mapping</span>
              </div>
              <h3 className="text-xl font-bold text-zinc-200 leading-tight">Your Digital Twin</h3>
              <p className="text-sm text-zinc-200/60 leading-relaxed">
                Compare your current meteorological skills against the required competencies for your role. Focus your learning on <strong>Marine Met</strong> and <strong>Radar Ops</strong> to close the gap.
              </p>
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-200/70">
                  <div className="w-3 h-3 rounded-full bg-purple-500 opacity-70" /> Your Current Skill Level
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-zinc-200/70">
                  <div className="w-3 h-3 rounded-full bg-orange-400 opacity-40" /> Role Requirement
                </div>
              </div>
            </div>
            <div className="lg:w-2/3 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={competencyData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Your Score" dataKey="A" stroke="#9333ea" strokeWidth={2} fill="#a855f7" fillOpacity={0.4} />
                  <Radar name="Required" dataKey="B" stroke="#f97316" strokeWidth={2} fill="#fb923c" fillOpacity={0.15} />
                  <Tooltip wrapperStyle={{ borderRadius: '12px' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Compass, title: 'Explore Catalog', desc: 'Discover new specialized programs', to: '/trainee/courses', gradient: 'from-purple-600 to-purple-800', btn: 'Browse' },
            { icon: BookOpen, title: 'My Learning Space', desc: 'Resume current lessons & quizzes', to: '/trainee/my-learning', gradient: 'from-pink-500 to-rose-600', btn: 'Continue' },
            { icon: Award, title: 'Earned Certificates', desc: 'View, download, and share badges', to: '/trainee/my-learning', gradient: 'from-orange-400 to-orange-600', btn: 'View All' },
          ].map(action => (
            <Link key={action.title} to={action.to}>
              <div className="p-5 rounded-3xl bg-[#070E20]/90 border border-cyan-500/30 hover:border-cyan-400/50 hover:shadow-xl hover:shadow-cyan-950/50 hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.gradient} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-200 group-hover:text-cyan-400 transition-colors">{action.title}</h4>
                    <p className="text-xs text-zinc-200/55">{action.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-200/30 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </motion.div>

        {/* Profile Card */}
        <motion.div variants={fadeUp} className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-cyan-300/60 uppercase tracking-wider">Account Overview</h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-950/30 text-cyan-400 border border-cyan-500/30">
              Trainee Profile
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Full Name', value: profile?.full_name },
              { label: 'Email Address', value: profile?.email },
              { label: 'Department', value: profile?.department ?? '—' },
              { label: 'Designation', value: profile?.designation ?? '—' },
            ].map(item => (
              <div key={item.label} className="p-3 bg-cyan-950/30/40 rounded-2xl border border-cyan-500/30">
                <p className="text-[11px] font-semibold text-zinc-200/50 mb-0.5">{item.label}</p>
                <p className="text-sm font-bold text-zinc-200 truncate">{item.value || 'Not provided'}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-cyan-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-200/60">Verification Status:</span>
              <StatusBadge status={profile?.approval_status ?? 'pending'} />
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={handleResetPassword}
                className="text-xs font-semibold text-purple-600 hover:text-pink-600 transition-colors flex items-center gap-1.5 bg-cyan-950/30 hover:bg-purple-100 px-3 py-1.5 rounded-lg border border-cyan-500/30"
              >
                <Shield className="w-3.5 h-3.5" />
                Reset Password
              </button>
              <span className="text-xs text-zinc-200/50">MoES Capacity Connect</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </DashboardShell>
  )
}

/* ─── Trainer Dashboard ─────────────────────────────────────── */
export function TrainerDashboard() {
  const { profile } = useAuth()

  const stats = [
    { label: 'Active Courses', value: '8', icon: BookOpen, gradient: 'from-purple-600 to-purple-800', badgeText: 'Published' },
    { label: 'Total Trainees', value: '156', icon: Users, gradient: 'from-pink-500 to-rose-600', badgeText: 'Enrolled', subtext: '+14 this week' },
    { label: 'Avg. Completion', value: '82%', icon: BarChart3, gradient: 'from-orange-400 to-orange-600', badgeText: 'High Rate' },
    { label: 'Avg. Rating', value: '4.7', icon: Star, gradient: 'from-purple-600 via-pink-500 to-orange-500', badgeText: '⭐ 4.7 / 5.0' },
  ]

  const recentSubmissions = [
    { name: 'Amit Kumar', course: 'Data Science Fundamentals', module: 'Module 6 — ML Basics', time: '1h ago' },
    { name: 'Priya Singh', course: 'Python for Analytics', module: 'Module 3 — DataFrames', time: '3h ago' },
    { name: 'Rahul Verma', course: 'Cloud Computing', module: 'Final Assessment', time: '5h ago' },
    { name: 'Sneha Patel', course: 'Data Science Fundamentals', module: 'Module 5 — Statistics', time: '1d ago' },
  ]

  const topCourses = [
    { title: 'Data Science Fundamentals', trainees: 89, completion: 76, rating: 4.8 },
    { title: 'Python for Analytics', trainees: 67, completion: 64, rating: 4.6 },
    { title: 'Cloud Computing Basics', trainees: 45, completion: 82, rating: 4.7 },
  ]

  const activities = [
    { icon: FileText, title: 'New Submission', desc: 'Amit Kumar — Module 6 Quiz (94%)', time: '1h ago', iconBg: 'bg-emerald-100 text-emerald-600' },
    { icon: Users, title: '5 New Enrollments', desc: 'Data Science Fundamentals', time: '3h ago', iconBg: 'bg-pink-100 text-pink-600' },
    { icon: MessageSquare, title: 'New Question', desc: 'Python for Analytics — Forum Post', time: '6h ago', iconBg: 'bg-orange-100 text-orange-600' },
    { icon: Star, title: '5-Star Review', desc: 'Cloud Computing Basics — Rating', time: '1d ago', iconBg: 'bg-purple-100 text-cyan-400' },
  ]

  return (
    <DashboardShell
      title="Trainer Dashboard"
      icon={BookOpen}
      navLinks={[
        { to: '/trainer', label: 'Overview', icon: BarChart3 },
        { to: '/trainer/courses', label: 'My Courses', icon: BookOpen },
      ]}
    >
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 max-w-full">
        {/* Welcome Banner */}
        <motion.div 
          variants={fadeUp} 
          className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-900 via-purple-800 to-midnight text-white overflow-hidden shadow-xl shadow-cyan-950/50 border border-cyan-500/30"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-pink-500/20 to-orange-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#070E20]/90/10 backdrop-blur-md text-orange-300 text-xs font-semibold mb-3 border border-white/15">
                <span>Trainer Command Center</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                Welcome, {profile?.full_name?.split(' ')[0] ?? 'Trainer'}!
              </h2>
              <p className="text-white/80 text-sm">Manage your course curriculum and track real-time trainee engagement.</p>
            </div>
            <Link to="/trainer/courses" className="shrink-0">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-pink-500/30 hover:scale-105 transition-all">
                <BookOpen className="w-4 h-4 mr-2" />
                Manage Courses
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Assignment Announcement Banner */}
        <TrainerAssignmentBanner />

        {/* Stats Grid */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Courses */}
          <motion.div variants={fadeUp} className="lg:col-span-2 bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm overflow-hidden">
            <div className="pb-4 border-b border-cyan-500/30 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-200">Top Performing Courses</h3>
                <p className="text-xs text-zinc-200/50">Engagement and completion breakdown</p>
              </div>
              <Link to="/trainer/courses" className="text-xs font-bold text-purple-600 hover:text-pink-600 transition-colors flex items-center gap-1 bg-cyan-950/30 px-3 py-1.5 rounded-full border border-cyan-500/30">
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="py-4 space-y-3.5">
              {topCourses.map(course => (
                <div key={course.title} className="p-4 rounded-2xl bg-cyan-950/30/40 hover:bg-cyan-950/30/80 border border-cyan-500/30 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-zinc-200">{course.title}</p>
                    <div className="flex items-center gap-1 text-orange-500 font-bold text-xs bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/60">
                      <Star className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
                      <span>{course.rating}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div>
                      <p className="text-base font-extrabold text-zinc-200">{course.trainees}</p>
                      <p className="text-[11px] font-semibold text-zinc-200/50">Trainees</p>
                    </div>
                    <div>
                      <p className="text-base font-extrabold text-zinc-200">{course.completion}%</p>
                      <p className="text-[11px] font-semibold text-zinc-200/50">Completion</p>
                    </div>
                    <div>
                      <ProgressBar value={course.completion} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={fadeUp} className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm flex flex-col">
            <div className="pb-4 border-b border-cyan-500/30">
              <h3 className="text-base font-bold text-zinc-200">Recent Activity</h3>
              <p className="text-xs text-zinc-200/50">Live trainee actions</p>
            </div>
            <div className="py-2 space-y-1 flex-1">
              {activities.map((act, i) => (
                <ActivityItem key={i} {...act} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Recent Submissions */}
        <motion.div variants={fadeUp} className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm overflow-hidden">
          <div className="pb-4 border-b border-cyan-500/30 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-200">Recent Trainee Submissions</h3>
              <p className="text-xs text-zinc-200/50">Assessments and assignments pending review</p>
            </div>
            <button className="text-xs font-bold text-purple-600 hover:text-pink-600 transition-colors flex items-center gap-1 bg-cyan-950/30 px-3 py-1.5 rounded-full border border-cyan-500/30">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto mt-2">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-cyan-500/30 text-left text-xs text-zinc-200/60 font-semibold">
                  <th className="px-4 py-3">Trainee</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/5">
                {recentSubmissions.map((s, i) => (
                  <tr key={i} className="hover:bg-cyan-950/30/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {s.name.charAt(0)}
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-zinc-200 truncate">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-zinc-200/70 truncate">{s.course}</td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-zinc-200/70">{s.module}</td>
                    <td className="px-4 py-3 text-xs text-zinc-200/50 text-right">{s.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </DashboardShell>
  )
}

/* ─── Admin Dashboard ───────────────────────────────────────── */
export function AdminDashboard() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'trainees' | 'trainers' | 'admins' | 'courses' | 'logs' | 'announcements' | 'home_page'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'suspended' | 'rejected'>('all')

  const [previewMaterial, setPreviewMaterial] = useState<{file_name: string, storage_path: string} | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pendingCoursesCount, setPendingCoursesCount] = useState(0)

  const fetchData = async () => {
    setLoading(true)
    try {
      console.log('Fetching data for Admin Dashboard...')
      const [trRes, trnRes, admRes, logRes, coursesRes] = await Promise.all([
        supabase.from('trainees').select('*').order('created_at', { ascending: false }),
        supabase.from('trainers').select('*').order('created_at', { ascending: false }),
        supabase.from('admins').select('*').order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('courses').select('id', { count: 'exact' }).eq('status', 'pending_review'),
      ])
      
      console.log('Trainees fetch result:', trRes)
      console.log('Trainers fetch result:', trnRes)
      console.log('Admins fetch result:', admRes)
      console.log('Audit logs fetch result:', logRes)

      const allUsers = [
        ...(trRes.data || []),
        ...(trnRes.data || []),
        ...(admRes.data || [])
      ]
      console.log('Combined users:', allUsers)
      setUsers(allUsers as any)
      if (logRes.data) setLogs(logRes.data)
      setPendingCoursesCount(coursesRes.count || 0)
    } catch (e) {
      console.error('Exception in fetchData:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const filteredUsers = useMemo(() => {
    let filtered = users
    if (activeTab === 'trainees') filtered = users.filter(u => u.role === 'trainee')
    else if (activeTab === 'trainers') filtered = users.filter(u => u.role === 'trainer')
    else if (activeTab === 'admins') filtered = users.filter(u => u.role === 'admin' || u.role === 'super_admin')

    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => u.approval_status === statusFilter)
    }

    if (!searchQuery) return filtered
    const q = searchQuery.toLowerCase()
    return filtered.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q) ||
      (u as any).qualifications?.toLowerCase().includes(q)
    )
  }, [users, searchQuery, activeTab, statusFilter])

  const handleUpdateUser = async (userId: string, email: string | null, role: Profile['role'], status: Profile['approval_status']) => {
    try {
      const { error } = await supabase.rpc('admin_update_user', {
        target_user_id: userId,
        new_role: role,
        new_status: status,
      })
      if (error) throw error
      
      if (status === 'approved' && email) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/setup-password`,
        })
        if (resetError) {
          console.error("Failed to send setup email:", resetError)
          toast.error("User approved, but failed to send setup email.")
        } else {
          toast.success('User approved and setup email sent!')
        }
      } else {
        toast.success('User updated successfully')
      }
      fetchData()
    } catch (e: any) {
      toast.error(`Failed to update user: ${e?.message || JSON.stringify(e)}`)
      console.error('Update user error:', e)
    }
  }


  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) return;
    try {
      const { error } = await supabase.rpc('admin_delete_user', {
        target_user_id: userId,
      })
      if (error) throw error
      
      toast.success('User account completely deleted.')
      fetchData()
    } catch (e) {
      toast.error('Failed to delete user. Check Supabase connection.')
      console.error(e)
    }
  }

  const handleViewProof = async (proofPath: string) => {
    try {
      setPreviewMaterial({ file_name: 'ID Proof Document', storage_path: proofPath })
      setPreviewUrl(null)
      const { data, error } = await supabase.storage.from('proofs').createSignedUrl(proofPath, 60)
      if (error) throw error
      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl)
      }
    } catch (e) {
      console.error('Error viewing proof:', e)
      toast.error('Failed to open proof document')
      setPreviewMaterial(null)
    }
  }

  const handlePromoteToAdmin = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('super_admin_promote_to_admin', {
        target_user_id: userId,
      })
      if (error) throw error
      toast.success('User promoted to Admin successfully')
      fetchData()
    } catch (e: any) {
      const msg = e?.message?.includes('super_admin')
        ? 'Only Super Admins can promote users to Admin.'
        : 'Failed to promote user.'
      toast.error(msg)
      console.error(e)
    }
  }

  const [isCleaningFiles, setIsCleaningFiles] = useState(false)
  const cleanupOrphanedFiles = async () => {
    setIsCleaningFiles(true)
    try {
      const { data: courses } = await supabase.from('courses').select('id')
      const { data: trainees } = await supabase.from('trainees').select('id')
      const { data: trainers } = await supabase.from('trainers').select('id')
      const { data: admins } = await supabase.from('admins').select('id')
      
      const courseIds = new Set(courses?.map(c => c.id) || [])
      const userIds = new Set([
        ...(trainees?.map(u => u.id) || []),
        ...(trainers?.map(u => u.id) || []),
        ...(admins?.map(u => u.id) || [])
      ])

      // Clean materials bucket (folders match course id)
      const { data: materialFolders } = await supabase.storage.from('materials').list()
      if (materialFolders) {
        for (const folder of materialFolders) {
          if (folder.name && folder.name !== '.emptyFolderPlaceholder' && !courseIds.has(folder.name)) {
            const { data: files } = await supabase.storage.from('materials').list(folder.name)
            if (files && files.length > 0) {
              await supabase.storage.from('materials').remove(files.map(f => `${folder.name}/${f.name}`))
            }
          }
        }
      }

      // Clean proofs bucket (folders match user id)
      const { data: proofFolders } = await supabase.storage.from('proofs').list()
      if (proofFolders) {
        for (const folder of proofFolders) {
          if (folder.name && folder.name !== '.emptyFolderPlaceholder' && !userIds.has(folder.name)) {
            const { data: files } = await supabase.storage.from('proofs').list(folder.name)
            if (files && files.length > 0) {
              await supabase.storage.from('proofs').remove(files.map(f => `${folder.name}/${f.name}`))
            }
          }
        }
      }
      
      toast.success('Successfully cleaned up orphaned files!')
    } catch (e: any) {
      console.error(e)
      toast.error('Failed to clean up files.')
    } finally {
      setIsCleaningFiles(false)
    }
  }

  const isSuperAdmin = profile?.role === 'super_admin'

  const tabs = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'trainees', label: 'Trainees', icon: Users },
    { key: 'trainers', label: 'Trainers', icon: Users },
    ...(isSuperAdmin ? [{ key: 'admins', label: 'Admins', icon: Shield }] : []),
    { key: 'courses', label: 'Courses', icon: BookOpen },
    { key: 'announcements', label: 'Announcements', icon: Megaphone },
    { key: 'home_page', label: 'Home Page', icon: Globe },
    ...(isSuperAdmin ? [{ key: 'logs', label: 'Audit Logs', icon: BarChart3 }] : []),
  ] as const

  const pendingCount = users.filter(u => u.approval_status === 'pending').length
  const pendingTrainees = users.filter(u => u.approval_status === 'pending' && u.role === 'trainee').length
  const pendingTrainers = users.filter(u => u.approval_status === 'pending' && u.role === 'trainer').length
  const pendingAdmins = isSuperAdmin ? users.filter(u => u.approval_status === 'pending' && u.role === 'admin').length : 0

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, gradient: 'from-purple-600 to-purple-800', badgeText: 'Registered' },
    { label: 'Pending Approval', value: pendingCount, icon: Clock, gradient: 'from-orange-400 to-orange-600', badgeText: pendingCount > 0 ? 'Action Needed' : 'All Clear' },
    { label: 'Approved Users', value: users.filter(u => u.approval_status === 'approved').length, icon: CheckCircle, gradient: 'from-emerald-500 to-emerald-700', badgeText: 'Verified' },
    { label: 'Audit Logs', value: logs.length, icon: BarChart3, gradient: 'from-pink-500 to-rose-600', badgeText: 'Logged Events' },
  ]

  const activities = [
    { icon: Users, title: 'New Registration', desc: 'user@example.com registered as Trainee', time: '30m ago', iconBg: 'bg-pink-100 text-pink-600' },
    { icon: CheckCircle, title: 'User Approved', desc: 'Amit Kumar — Trainer role', time: '2h ago', iconBg: 'bg-emerald-100 text-emerald-600' },
    { icon: Ban, title: 'User Suspended', desc: 'Inactive account — 90 days', time: '5h ago', iconBg: 'bg-red-100 text-red-600' },
    { icon: Shield, title: 'Role Updated', desc: 'Priya Singh — Trainee → Trainer', time: '1d ago', iconBg: 'bg-purple-100 text-cyan-400' },
  ]

  return (
    <>
      <DashboardShell
        title={isSuperAdmin ? "Super Admin Dashboard" : "Admin Dashboard"}
        icon={Shield}
      navLinks={tabs.map(tab => ({
        id: tab.key,
        label: tab.label,
        icon: tab.icon,
        badge: tab.key === 'trainees' ? pendingTrainees || undefined :
               tab.key === 'trainers' ? pendingTrainers || undefined :
               tab.key === 'admins' ? pendingAdmins || undefined :
               tab.key === 'courses' ? pendingCoursesCount || undefined : undefined,
        isActive: activeTab === tab.key,
        onClick: () => setActiveTab(tab.key as any)
      }))}
    >
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 max-w-full">
        {/* Welcome Banner */}
        <motion.div 
          variants={fadeUp} 
          className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-900 via-purple-800 to-midnight text-white overflow-hidden shadow-xl shadow-cyan-950/50 border border-cyan-500/30"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-pink-500/20 to-orange-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#070E20]/90/10 backdrop-blur-md text-orange-300 text-xs font-semibold mb-3 border border-white/15">
                <Shield className="w-3.5 h-3.5" />
                <span>Administration & Governance</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                {isSuperAdmin ? "Super Administrator Control Center" : "Administrator Control Center"}
              </h2>
              <p className="text-white/80 text-sm">
                {pendingCount > 0
                  ? `${pendingCount} user application(s) require verification.`
                  : 'All applications are processed. Platform security and integrity verified.'}
              </p>
            </div>
            {pendingCount > 0 && (
              <Button 
                onClick={() => setActiveTab('trainees')} 
                className="w-full sm:w-auto bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-orange-500/30 hover:scale-105 transition-all"
              >
                <Clock className="w-4 h-4 mr-2" />
                Review {pendingCount} Pending
              </Button>
            )}
            {isSuperAdmin && (
              <Button 
                onClick={cleanupOrphanedFiles}
                disabled={isCleaningFiles}
                className="w-full sm:w-auto bg-[#070E20]/90/10 hover:bg-[#070E20]/90/20 text-white border border-white/20 font-bold px-6 py-3 rounded-2xl transition-all"
              >
                {isCleaningFiles ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Cleanup Orphaned Files
              </Button>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <motion.div variants={fadeUp} className={`space-y-4 min-w-0 ${activeTab === 'overview' ? 'lg:col-span-2' : 'lg:col-span-3'}`}>

            {/* Tab: Overview */}
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="space-y-6"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map(s => <StatCard key={s.label} {...s} />)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div 
                      onClick={() => navigate('/admin/courses/new')}
                      className="group cursor-pointer p-5 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-md shadow-pink-500/20 hover:scale-105 transition-all flex flex-col justify-between h-32"
                    >
                      <BookOpen className="w-6 h-6 text-white/80 group-hover:text-white group-hover:scale-110 transition-transform" />
                      <div>
                        <h4 className="font-bold text-sm">Create Course</h4>
                        <p className="text-xs text-white/70">Assign a trainer & publish</p>
                      </div>
                    </div>
                    <div 
                      onClick={() => setActiveTab('trainees')}
                      className="group cursor-pointer p-5 rounded-3xl bg-gradient-to-br from-orange-400 to-rose-400 text-white shadow-md shadow-orange-500/20 hover:scale-105 transition-all flex flex-col justify-between h-32 relative overflow-hidden"
                    >
                      <Users className="w-6 h-6 text-white/80 group-hover:text-white group-hover:scale-110 transition-transform" />
                      <div>
                        <h4 className="font-bold text-sm">Review Trainees</h4>
                        <p className="text-xs text-white/70">Manage user accounts</p>
                      </div>
                      {pendingCount > 0 && (
                        <div className="absolute top-4 right-4 bg-[#070E20]/90/20 px-2 py-1 rounded-lg text-xs font-bold backdrop-blur-sm">
                          {pendingCount} Pending
                        </div>
                      )}
                    </div>
                    <div 
                      onClick={() => setActiveTab('logs')}
                      className="group cursor-pointer p-5 rounded-3xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-md shadow-slate-500/20 hover:scale-105 transition-all flex flex-col justify-between h-32"
                    >
                      <BarChart3 className="w-6 h-6 text-white/80 group-hover:text-white group-hover:scale-110 transition-transform" />
                      <div>
                        <h4 className="font-bold text-sm">Audit Logs</h4>
                        <p className="text-xs text-white/70">View platform activity</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm overflow-hidden">
                    <div className="pb-4 border-b border-cyan-500/30 mb-4">
                      <h3 className="text-base font-bold text-zinc-200">Recent Activity</h3>
                      <p className="text-xs text-zinc-200/50 mt-0.5">Latest actions across the platform.</p>
                    </div>
                    <div className="space-y-4">
                      {activities.map((act, i) => (
                        <div key={i} className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${act.iconBg}`}>
                            <act.icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-zinc-200">{act.title}</p>
                            <p className="text-xs text-zinc-200/60">{act.desc}</p>
                          </div>
                          <span className="text-xs text-zinc-200/40">{act.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tab: Users */}
            <AnimatePresence mode="wait">
              {activeTab === 'trainees' && (
                <motion.div
                  key="trainees"
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm overflow-hidden"
                >
                  <div className="pb-4 border-b border-cyan-500/30 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold text-zinc-200 capitalize">Trainees Management</h3>
                        <p className="text-xs text-zinc-200/50 mt-0.5">Approve, reject, promote, or suspend trainee accounts.</p>
                      </div>
                      <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="w-4 h-4 text-purple-600/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search trainees..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-sm bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-zinc-200 placeholder:text-zinc-200/40 focus:outline-none focus:border-pink-500 focus:bg-[#070E20]/90 transition-all shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="flex bg-cyan-950/40 p-1 rounded-xl border border-cyan-500/30 w-full sm:w-fit overflow-x-auto hide-scrollbar">
                      {(['all', 'pending', 'approved', 'suspended', 'rejected'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setStatusFilter(f)}
                          className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize whitespace-nowrap ${
                            statusFilter === f ? 'bg-[#070E20]/90 text-cyan-400 shadow-sm' : 'text-zinc-200/60 hover:text-zinc-200 hover:bg-purple-100/50'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loading ? (
                    <div className="p-8 text-center text-zinc-200/50 text-sm">Loading trainees...</div>
                  ) : (
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full min-w-[620px]">
                        <thead>
                          <tr className="border-b border-cyan-500/30 text-left text-xs text-zinc-200/60 font-semibold">
                            <th className="px-3 py-3">Name</th>
                            <th className="px-3 py-3">Email</th>
                            <th className="px-3 py-3">Department</th>
                            <th className="px-3 py-3">Proof</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-500/5">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-8 text-zinc-200/50 text-sm">
                                {searchQuery ? 'No trainees match your search.' : 'No trainees found.'}
                              </td>
                            </tr>
                          ) : filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-cyan-950/30/40 transition-colors">
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                                  </div>
                                  <span className="text-xs sm:text-sm font-bold text-zinc-200 truncate max-w-[130px]">{u.full_name}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-xs text-zinc-200/70 truncate max-w-[150px]">{u.email}</td>
                              <td className="px-3 py-3 text-xs text-zinc-200/70 truncate max-w-[90px]">{u.department ?? '—'}</td>
                              <td className="px-3 py-3">
                                {u.proof_path ? (
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1 text-[10px] text-zinc-200/60 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/30 w-fit" title="Securely stored in MoES Cloud">
                                      <Shield className="w-3 h-3 text-emerald-600" />
                                      <span className="truncate max-w-[100px]">{u.proof_path.split('/').pop()}</span>
                                    </div>
                                    <button onClick={() => handleViewProof(u.proof_path!)} className="text-[10px] px-2 py-0.5 rounded-lg bg-cyan-950/30 text-cyan-400 border border-cyan-500/30 hover:bg-purple-100 font-bold transition-all w-fit">
                                      View Document
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-zinc-200/40">—</span>
                                )}
                              </td>
                              <td className="px-3 py-3"><StatusBadge status={u.approval_status} /></td>
                              <td className="px-3 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {u.approval_status === 'pending' && (
                                    <>
                                      <button onClick={() => handleUpdateUser(u.id, u.email, u.role, 'approved')} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold transition-all">Approve</button>
                                      <button onClick={() => handleUpdateUser(u.id, u.email, u.role, 'rejected')} className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold transition-all">Reject</button>
                                    </>
                                  )}
                                  {u.approval_status === 'approved' && (
                                    <>
                                      <button onClick={() => handleUpdateUser(u.id, u.email, 'trainer', 'approved')} className="text-xs px-2.5 py-1 rounded-lg bg-cyan-950/30 text-cyan-400 border border-cyan-500/30 hover:bg-purple-100 font-bold transition-all">→ Trainer</button>
                                      <button onClick={() => handleUpdateUser(u.id, u.email, u.role, 'suspended')} className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-bold transition-all">Suspend</button>
                                    </>
                                  )}
                                  {u.approval_status !== 'pending' && (
                                    <button onClick={() => handleDeleteUser(u.id)} className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold transition-all" title="Permanently Delete Account">Delete</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'trainers' && (
                <motion.div
                  key="trainers"
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm overflow-hidden"
                >
                  <div className="pb-4 border-b border-cyan-500/30 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold text-zinc-200 capitalize">Trainers Management</h3>
                        <p className="text-xs text-zinc-200/50 mt-0.5">Approve, reject, suspend or promote trainers.</p>
                      </div>
                      <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="w-4 h-4 text-purple-600/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search trainers..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-sm bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-zinc-200 placeholder:text-zinc-200/40 focus:outline-none focus:border-pink-500 focus:bg-[#070E20]/90 transition-all shadow-sm"
                        />
                      </div>
                    </div>
                    <div className="flex bg-cyan-950/40 p-1 rounded-xl border border-cyan-500/30 w-full sm:w-fit overflow-x-auto hide-scrollbar">
                      {(['all', 'pending', 'approved', 'suspended', 'rejected'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setStatusFilter(f)}
                          className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize whitespace-nowrap ${
                            statusFilter === f ? 'bg-[#070E20]/90 text-cyan-400 shadow-sm' : 'text-zinc-200/60 hover:text-zinc-200 hover:bg-purple-100/50'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {loading ? (
                    <div className="p-8 text-center text-zinc-200/50 text-sm">Loading trainers...</div>
                  ) : (
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full min-w-[620px]">
                        <thead>
                          <tr className="border-b border-cyan-500/30 text-left text-xs text-zinc-200/60 font-semibold">
                            <th className="px-3 py-3">Name</th>
                            <th className="px-3 py-3">Email</th>
                            <th className="px-3 py-3">Qualifications</th>
                            <th className="px-3 py-3">Experience</th>
                            <th className="px-3 py-3">Proof</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-500/5">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center py-8 text-zinc-200/50 text-sm">
                                {searchQuery ? 'No trainers match your search.' : 'No trainers found.'}
                              </td>
                            </tr>
                          ) : filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-cyan-950/30/40 transition-colors">
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                                  </div>
                                  <span className="text-xs sm:text-sm font-bold text-zinc-200 truncate max-w-[130px]">{u.full_name}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-xs text-zinc-200/70 truncate max-w-[150px]">{u.email}</td>
                              <td className="px-3 py-3 text-xs text-zinc-200/70 truncate max-w-[120px]">{(u as any).qualifications ?? '—'}</td>
                              <td className="px-3 py-3 text-xs text-zinc-200/70">{(u as any).years_of_experience ? `${(u as any).years_of_experience} yrs` : '—'}</td>
                              <td className="px-3 py-3">
                                {u.proof_path ? (
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1 text-[10px] text-zinc-200/60 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/30 w-fit" title="Securely stored in MoES Cloud">
                                      <Shield className="w-3 h-3 text-emerald-600" />
                                      <span className="truncate max-w-[100px]">{u.proof_path.split('/').pop()}</span>
                                    </div>
                                    <button onClick={() => handleViewProof(u.proof_path!)} className="text-[10px] px-2 py-0.5 rounded-lg bg-cyan-950/30 text-cyan-400 border border-cyan-500/30 hover:bg-purple-100 font-bold transition-all w-fit">
                                      View Document
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-zinc-200/40">—</span>
                                )}
                              </td>
                              <td className="px-3 py-3"><StatusBadge status={u.approval_status} /></td>
                              <td className="px-3 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {u.approval_status === 'pending' && (
                                    <>
                                      <button onClick={() => handleUpdateUser(u.id, u.email, u.role, 'approved')} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold transition-all">Approve</button>
                                      <button onClick={() => handleUpdateUser(u.id, u.email, u.role, 'rejected')} className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold transition-all">Reject</button>
                                    </>
                                  )}
                                  {u.approval_status === 'approved' && (
                                    <button onClick={() => handleUpdateUser(u.id, u.email, u.role, 'suspended')} className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-bold transition-all">Suspend</button>
                                  )}
                                  {u.approval_status !== 'pending' && (
                                    <button onClick={() => handleDeleteUser(u.id)} className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold transition-all" title="Permanently Delete Account">Delete</button>
                                  )}
                                  {isSuperAdmin && u.approval_status === 'approved' && (
                                    <button onClick={() => handlePromoteToAdmin(u.id)} className="text-xs px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold hover:opacity-90 transition-all shadow-sm">Promote to Admin</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'admins' && (
                <motion.div
                  key="admins"
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm overflow-hidden"
                >
                  <div className="pb-4 border-b border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-zinc-200 capitalize">Admins Management</h3>
                      <p className="text-xs text-zinc-200/50 mt-0.5">Manage administrative access to the platform.</p>
                    </div>
                    <div className="relative w-full sm:w-64 shrink-0">
                      <Search className="w-4 h-4 text-purple-600/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search admins..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-zinc-200 placeholder:text-zinc-200/40 focus:outline-none focus:border-pink-500 focus:bg-[#070E20]/90 transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {loading ? (
                    <div className="p-8 text-center text-zinc-200/50 text-sm">Loading admins...</div>
                  ) : (
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full min-w-[620px]">
                        <thead>
                          <tr className="border-b border-cyan-500/30 text-left text-xs text-zinc-200/60 font-semibold">
                            <th className="px-3 py-3">Name</th>
                            <th className="px-3 py-3">Email</th>
                            <th className="px-3 py-3">Role</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-500/5">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-8 text-zinc-200/50 text-sm">
                                {searchQuery ? 'No admins match your search.' : 'No admins found.'}
                              </td>
                            </tr>
                          ) : filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-cyan-950/30/40 transition-colors">
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                                  </div>
                                  <span className="text-xs sm:text-sm font-bold text-zinc-200 truncate max-w-[130px]">{u.full_name}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-xs text-zinc-200/70 truncate max-w-[150px]">{u.email}</td>
                              <td className="px-3 py-3">
                                <span className="text-[11px] font-semibold capitalize text-purple-800 bg-cyan-950/30 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                                  {u.role.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-3 py-3"><StatusBadge status={u.approval_status} /></td>
                              <td className="px-3 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {u.approval_status === 'approved' && u.role !== 'super_admin' && (
                                    <button onClick={() => handleUpdateUser(u.id, u.email, u.role, 'suspended')} className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-bold transition-all">Suspend</button>
                                  )}
                                  {u.approval_status !== 'pending' && u.role !== 'super_admin' && (
                                    <button onClick={() => handleDeleteUser(u.id)} className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold transition-all" title="Permanently Delete Account">Delete</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Tab: Courses */}
              {activeTab === 'courses' && (
                <motion.div key="courses" variants={scaleIn} initial="hidden" animate="visible" exit="hidden">
                  <AdminCourses />
                </motion.div>
              )}

              {/* Tab: Announcements */}
              {activeTab === 'announcements' && (
                <motion.div key="announcements" variants={scaleIn} initial="hidden" animate="visible" exit="hidden">
                  <AdminAnnouncements />
                </motion.div>
              )}

              {/* Tab: Home Page Management */}
              {activeTab === 'home_page' && (
                <motion.div key="home_page" variants={scaleIn} initial="hidden" animate="visible" exit="hidden">
                  <AdminHomePageSettings />
                </motion.div>
              )}

              {/* Tab: Audit Logs */}
              {activeTab === 'logs' && (
                <motion.div key="logs" variants={scaleIn} initial="hidden" animate="visible" exit="hidden" className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm overflow-hidden">
                  <div className="pb-4 border-b border-cyan-500/30">
                    <h3 className="text-base font-bold text-zinc-200">Audit Logs</h3>
                    <p className="text-xs text-zinc-200/50 mt-0.5">Complete platform activity and compliance record.</p>
                  </div>
                  {loading ? (
                    <div className="p-8 text-center text-zinc-200/50 text-sm">Loading logs...</div>
                  ) : (
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full min-w-[500px]">
                        <thead>
                          <tr className="border-b border-cyan-500/30 text-left text-xs text-zinc-200/60 font-semibold">
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Actor</th>
                            <th className="px-4 py-3">Action</th>
                            <th className="px-4 py-3">Entity</th>
                            <th className="px-4 py-3">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-500/5">
                          {logs.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-8 text-zinc-200/50 text-sm">No audit logs found.</td></tr>
                          ) : logs.map(log => (
                            <tr key={log.id} className="hover:bg-cyan-950/30/40 transition-colors">
                              <td className="px-4 py-3 text-xs text-zinc-200/60 whitespace-nowrap">{new Date(log.created_at || '').toLocaleString()}</td>
                              <td className="px-4 py-3 text-xs font-mono text-cyan-400">{log.actor_id?.slice(0, 8)}…</td>
                              <td className="px-4 py-3 text-xs text-zinc-200 font-bold">{log.action}</td>
                              <td className="px-4 py-3 text-xs text-zinc-200/70">{log.entity_type}</td>
                              <td className="px-4 py-3 text-xs font-mono text-zinc-200/60 max-w-xs truncate">{JSON.stringify(log.metadata)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Recent Activity Sidebar */}
          {activeTab === 'overview' && (
            <motion.div variants={fadeUp} className="bg-[#070E20]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-sm flex flex-col">
              <div className="pb-4 border-b border-cyan-500/30">
              <h3 className="text-base font-bold text-zinc-200">System Activity</h3>
              <p className="text-xs text-zinc-200/50">Live audit events</p>
            </div>
            <div className="py-2 space-y-1 flex-1">
              {activities.map((act, i) => (
                <ActivityItem key={i} {...act} />
              ))}
            </div>
          </motion.div>
          )}
        </div>

        {/* Quick Actions (Overview Tab Only) */}
        {activeTab === 'overview' && (
          <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Users, title: 'Manage Users', desc: 'Approve, suspend, or promote accounts', to: '/admin', gradient: 'from-purple-600 to-purple-800' },
              { icon: Shield, title: 'System Governance', desc: 'Configure platform access & policies', to: '/admin', gradient: 'from-pink-500 to-rose-600' },
              { icon: BarChart3, title: 'Platform Analytics', desc: 'Usage metrics, completions & trends', to: '/admin', gradient: 'from-orange-400 to-orange-600' },
            ].map(action => (
              <Link key={action.title} to={action.to}>
                <div className="p-5 rounded-3xl bg-[#070E20]/90 border border-cyan-500/30 hover:border-cyan-400/50 hover:shadow-xl hover:shadow-cyan-950/50 hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.gradient} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                      <action.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-200 group-hover:text-cyan-400 transition-colors">{action.title}</h4>
                      <p className="text-xs text-zinc-200/55">{action.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-200/30 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </motion.div>
        )}
      </motion.div>
    </DashboardShell>
      <MaterialPreviewDialog
        material={previewMaterial}
        previewUrl={previewUrl}
        onClose={() => setPreviewMaterial(null)}
      />
    </>
  )
}

export function SuperAdminDashboard() {
  return <AdminDashboard />
}
