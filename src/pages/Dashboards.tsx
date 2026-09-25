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
import { AdminContactMessages } from '@/features/admin/AdminContactMessages'
import { Button } from '@/components/ui/button'
import { ResponsiveContainer, Tooltip, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import { MaterialPreviewDialog } from '@/components/ui/MaterialPreviewDialog'
import { AnnouncementModal } from '@/components/ui/AnnouncementModal'
import { AnnouncementsFeed } from '@/components/ui/AnnouncementsFeed'
import { AdminUserDetailsModal } from '@/features/admin/AdminUserDetailsModal'
import {
  Globe, LogOut, Users, BookOpen, BarChart3, Shield,
  GraduationCap, ChevronRight, CheckCircle, Search,
  XCircle, Clock, Ban, ArrowUpRight, Compass, Bell,
  Award, Target, FileText, Settings, User, Mail,
  RefreshCw, Star, MessageSquare, Eye,
  Menu, X, Trash2, Loader2, LayoutDashboard, Megaphone, FileCheck
} from 'lucide-react'
import { toast } from 'sonner'
import { useNotifications, getNotificationRedirectUrl, getNotificationMeta } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import { useConfirm } from '@/hooks/useConfirm'
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

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const roleColor: Record<string, string> = {
    admin: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    super_admin: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
    trainer: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    trainee: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain shrink-0" />
          {(!sidebarCollapsed || mobileOpen) && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm font-bold whitespace-nowrap"
            >
              <span className="text-white">Capacity</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-400"> Connect</span>
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
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium group ${
              isActive
                ? 'bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 text-white shadow-md shadow-cyan-600/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
            }`}>
              <link.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-cyan-400'} transition-colors`} />
              {(!sidebarCollapsed || mobileOpen) && (
                <>
                  <span className="flex-1 text-left">{link.label}</span>
                  {link.badge !== undefined && link.badge > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
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

      {/* Profile summary & logout */}
      <div className="p-3 border-t border-slate-800 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800/50 transition-all cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-cyan-500/20">
            {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          {(!sidebarCollapsed || mobileOpen) && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-400 transition-colors">
                {profile?.full_name ?? 'User'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {profile?.email}
              </p>
            </div>
          )}
        </div>
        {(!sidebarCollapsed || mobileOpen) && (
          <div className="flex items-center gap-1.5 px-3">
            <span className={`text-xs px-2 py-0.5 rounded-full border capitalize font-semibold ${roleColor[profile?.role ?? ''] ?? 'bg-cyan-950/30 text-cyan-400 border-cyan-500/30'}`}>
              {profile?.role?.replace('_', ' ')}
            </span>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-sm font-medium"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(!sidebarCollapsed || mobileOpen) && <span>Sign Out</span>}
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex">
      <AnnouncementModal />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-800 bg-[#040814] text-white flex flex-col transition-transform duration-300 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4 z-10">
          <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={`relative z-20 hidden md:flex ${sidebarCollapsed ? 'w-[72px]' : 'w-64'} border-r border-slate-800 bg-[#040814] text-white flex-col shrink-0 h-screen sticky top-0 transition-all duration-300`}>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="h-14 md:h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 flex items-center px-4 md:px-6 gap-3 shadow-xs">
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileOpen(true)
              } else {
                setSidebarCollapsed(!sidebarCollapsed)
              }
            }}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 shadow-xs">
              <Icon className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <h1 className="text-sm md:text-base font-bold text-slate-900 truncate">{title}</h1>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 md:gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all group border border-transparent hover:border-slate-200">
                  <Bell className="w-4 h-4 group-hover:text-cyan-600 transition-colors" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 border border-white"></span>
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 sm:w-96 max-h-[30rem] overflow-y-auto bg-white border border-slate-200/90 shadow-2xl rounded-2xl p-0">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-100 sticky top-0 z-10 backdrop-blur-xs">
                  <div className="flex items-center gap-2">
                    <DropdownMenuLabel className="p-0 font-bold text-slate-900 text-sm">Notifications</DropdownMenuLabel>
                    {unreadCount > 0 && (
                      <span className="bg-cyan-100 text-cyan-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-200">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {unreadCount > 0 && (
                      <button onClick={(e) => { e.preventDefault(); markAllAsRead() }} className="text-[10px] font-bold text-cyan-700 hover:text-cyan-800 bg-white hover:bg-cyan-50 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors">
                        Mark read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button onClick={(e) => { e.preventDefault(); clearAllNotifications() }} className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors">
                        Clear all
                      </button>
                    )}
                  </div>
                </div>
                
                {notifsLoading ? (
                  <div className="py-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
                    <span>Loading notifications...</span>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500 px-4">
                    <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2.5 opacity-60" />
                    <p className="font-medium text-slate-700">No new notifications</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">You're completely up to date with sessions & announcements.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.map((notif: any) => {
                      const meta = getNotificationMeta(notif.type || '')
                      return (
                        <DropdownMenuItem 
                          key={notif.id}
                          className={`flex flex-col items-start gap-1 p-3.5 cursor-pointer transition-colors ${!notif.read_at ? 'bg-cyan-50/40 hover:bg-cyan-50/70' : 'hover:bg-slate-50'}`}
                          onClick={() => {
                            if (!notif.read_at) markAsRead(notif.id);
                            navigate(getNotificationRedirectUrl(notif.type, profile?.role));
                          }}
                        >
                          <div className="flex items-start justify-between w-full gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.color}`}>
                                {meta.label}
                              </span>
                              {!notif.read_at && <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 shrink-0" />}
                              <span className="text-xs font-bold text-slate-900 line-clamp-1">{notif.title}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                deleteNotification(notif.id)
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors shrink-0 -mr-1"
                              title="Dismiss"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed mt-0.5">{notif.message}</p>
                          <span className="text-[10px] font-medium text-slate-400 mt-1">
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                          </span>
                        </DropdownMenuItem>
                      )
                    })}
                  </div>
                )}
                
                {profile?.role === 'trainer' && (
                  <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                    <DropdownMenuItem 
                      onClick={() => navigate('/trainer/notifications')}
                      className="w-full text-center text-xs font-bold text-cyan-700 justify-center cursor-pointer py-1.5 hover:bg-cyan-100/50 rounded-lg transition-colors"
                    >
                      View all in Notification Center &rarr;
                    </DropdownMenuItem>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to={`/${profile?.role}/profile`} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all border border-transparent hover:border-slate-200" title="Profile">
              <User className="w-4 h-4" />
            </Link>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}

/* ─── Status Badge ──────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ElementType }> = {
    approved: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle },
    pending: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
    rejected: { color: 'bg-rose-50 text-rose-700 border-rose-200', icon: XCircle },
    suspended: { color: 'bg-rose-50 text-rose-700 border-rose-200', icon: Ban },
  }
  const c = config[status] ?? { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Clock }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border capitalize font-semibold shadow-xs ${c.color}`}>
      <c.icon className="w-3.5 h-3.5" />
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
      className="group relative p-5 md:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-300 cursor-default overflow-hidden"
    >
      <div className="relative flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300`}>
          <Icon className="w-5 h-5" />
        </div>
        {badgeText && (
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {badgeText}
          </span>
        )}
      </div>

      <div className="relative">
        <div className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">{value}</div>
        <div className="text-xs font-semibold text-slate-500">{label}</div>
        {subtext && <div className="text-[11px] text-cyan-700 font-medium mt-1">{subtext}</div>}
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
    <div className="flex items-start gap-3.5 p-3.5 rounded-2xl hover:bg-slate-50 transition-colors group">
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs md:text-sm text-slate-900 font-bold truncate group-hover:text-cyan-600 transition-colors">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{desc}</p>
      </div>
      <span className="text-[11px] text-slate-600 font-semibold whitespace-nowrap bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">{time}</span>
    </div>
  )
}

/* ─── Progress Bar ──────────────────────────────────────────── */
function ProgressBar({ value, max = 100, color = 'from-cyan-600 to-blue-600' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(Math.round((value / max) * 100), 100)
  return (
    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        className={`h-full bg-gradient-to-r ${color} rounded-full shadow-xs`}
      />
    </div>
  )
}

/* ─── Trainee Dashboard ─────────────────────────────────────── */
export function TraineeDashboard() {
  const { profile } = useAuth()

  // Fetch real skills from Supabase (User's acquired skills)
  const { data: dbSkills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['trainee-skills', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_skills')
        .select(`
          level,
          skill:skills (name, category)
        `)
        .eq('user_id', profile!.id);
      
      if (error) {
        console.error("Error fetching user skills:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch ALL available skills to dynamically build the radar axes
  const { data: allSkills = [], isLoading: allSkillsLoading } = useQuery({
    queryKey: ['all-available-skills'],
    queryFn: async () => {
      const { data, error } = await supabase.from('skills').select('*').order('name');
      if (error) {
        console.error("Error fetching all skills:", error);
        return [];
      }
      return data || [];
    }
  });

  // Calculate competency data merging live DB data with dynamically fetched baseline
  const competencyData = React.useMemo(() => {
    let baseline: any[] = [];
    
    if (allSkills && allSkills.length > 0) {
      baseline = allSkills.map((s: any) => ({
        subject: s.name,
        A: 0,
        B: 85, // Default target
        fullMark: 100
      }));
    } else {
      // Fallback if the skills table is completely empty
      baseline = [
        { subject: 'All Courses', A: 0, B: 85, fullMark: 100 },
        { subject: 'Standard Courses', A: 0, B: 85, fullMark: 100 },
        { subject: 'Scenario Courses', A: 0, B: 85, fullMark: 100 }
      ];
    }

    if (!dbSkills || dbSkills.length === 0) {
      return baseline.slice(0, 5);
    }

    // Merge DB skills into baseline
    const merged = [...baseline];
    
    dbSkills.forEach((ds: any) => {
      const skillName = ds.skill?.name;
      if (!skillName) return;
      
      const existingIdx = merged.findIndex(m => m.subject.toLowerCase() === skillName.toLowerCase());
      if (existingIdx >= 0) {
        merged[existingIdx].A = ds.level || 0;
      } else {
        // Add completely new skills from DB that aren't in baseline
        merged.push({
          subject: skillName,
          A: ds.level || 0,
          B: 85, // Default target
          fullMark: 100
        });
      }
    });

    // Sort to prioritize skills where the user has a level > 0, then by name
    merged.sort((a, b) => {
      if (b.A !== a.A) return b.A - a.A;
      return a.subject.localeCompare(b.subject);
    });

    // Limit to exactly 5 items for a basic, clean pentagon shape (prevents any overlap)
    return merged.slice(0, 5);
  }, [dbSkills, allSkills]);

  // Find top gaps for recommendations
  const topGaps = React.useMemo(() => {
    return [...competencyData]
      .map(c => ({ ...c, gap: Math.max(0, c.B - c.A) }))
      .filter(c => c.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 2);
  }, [competencyData]);

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

  const enrolledCount = enrollments.length
  const completedEnrollments = enrollments.filter(
    (e: any) => e.status === 'completed' || (e.progress_percent ?? 0) === 100
  )
  const completionRate = enrolledCount > 0
    ? Math.round((completedEnrollments.length / enrolledCount) * 100)
    : 0
  const totalMinutes = enrollments.reduce((sum: number, e: any) => {
    const mins = e.course?.duration_minutes ?? 0
    const pct = (e.progress_percent ?? 0) / 100
    return sum + Math.round(mins * pct)
  }, 0)
  const hoursLearned = Math.round(totalMinutes / 60)
  const earnedCertificatesCount = Math.max(
    certificates.length,
    completedEnrollments.length
  )

  const stats = [
    {
      label: 'Enrolled Courses',
      value: enrollmentsLoading ? '…' : String(enrolledCount),
      icon: BookOpen,
      gradient: 'from-cyan-600 to-blue-700',
      badgeText: 'Active',
      subtext: enrolledCount === 0 ? 'No courses yet' : `${enrollments.filter((e: any) => e.status !== 'completed' && e.status !== 'withdrawn' && (e.progress_percent ?? 0) < 100).length} active`,
    },
    {
      label: 'Hours Learned',
      value: enrollmentsLoading ? '…' : String(hoursLearned),
      icon: Clock,
      gradient: 'from-blue-600 to-indigo-700',
      badgeText: 'Total',
      subtext: hoursLearned === 0 ? 'Start learning!' : `Based on progress`,
    },
    {
      label: 'Certificates',
      value: certLoading && enrollmentsLoading ? '…' : String(earnedCertificatesCount),
      icon: Award,
      gradient: 'from-amber-500 to-orange-600',
      badgeText: earnedCertificatesCount > 0 ? 'Verified' : 'Pending',
      subtext: earnedCertificatesCount === 0 ? 'None yet' : `${earnedCertificatesCount} earned • Ready to view`,
    },
    {
      label: 'Completion Rate',
      value: enrollmentsLoading ? '…' : `${completionRate}%`,
      icon: Target,
      gradient: 'from-emerald-500 to-teal-700',
      badgeText: completionRate >= 75 ? 'Top 25%' : completionRate >= 50 ? 'On Track' : 'Keep Going',
      subtext: enrolledCount === 0 ? 'No data yet' : `${completedEnrollments.length} of ${enrolledCount} done`,
    },
  ]

  const recentCourses = enrollments
    .filter((e: any) => e.status !== 'withdrawn')
    .slice(0, 3)
    .map((e: any) => ({
      id: e.course?.id,
      title: e.course?.title ?? 'Untitled Course',
      progress: e.progress_percent ?? 0,
      status: e.status === 'completed' || (e.progress_percent ?? 0) === 100 ? 'Completed' : 'In Progress',
      instructor: e.course?.trainer?.full_name ?? 'Instructor',
      duration: e.status === 'completed' || (e.progress_percent ?? 0) === 100
        ? 'Completed'
        : e.course?.duration_minutes
          ? `${Math.round(e.course.duration_minutes * (1 - (e.progress_percent ?? 0) / 100))} min left`
          : 'Self-paced',
    }))

  const activities = notifications.length > 0
    ? notifications.map((n: any) => ({
        icon: n.type === 'certificate_issued' ? Award
          : n.type === 'enrollment' ? BookOpen
          : n.type === 'assessment_result' ? CheckCircle
          : Star,
        title: n.title,
        desc: n.message,
        time: formatDistanceToNow(new Date(n.created_at), { addSuffix: true }),
        iconBg: n.type === 'certificate_issued' ? 'bg-amber-100 text-amber-700'
          : n.type === 'enrollment' ? 'bg-cyan-100 text-cyan-700'
          : n.type === 'assessment_result' ? 'bg-emerald-100 text-emerald-700'
          : 'bg-blue-100 text-blue-700',
      }))
    : enrollments.slice(0, 4).map((e: any) => ({
        icon: e.status === 'completed' || (e.progress_percent ?? 0) === 100 ? CheckCircle : BookOpen,
        title: e.status === 'completed' || (e.progress_percent ?? 0) === 100 ? 'Completed Course' : 'Enrolled in Course',
        desc: e.course?.title ?? 'Course',
        time: formatDistanceToNow(new Date(e.enrolled_at), { addSuffix: true }),
        iconBg: e.status === 'completed' || (e.progress_percent ?? 0) === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-cyan-100 text-cyan-700',
      }))

  return (
    <DashboardShell
      title="Trainee Dashboard"
      icon={GraduationCap}
      navLinks={[
        { to: '/trainee', label: 'Dashboard', icon: BarChart3 },
        { to: '/trainee/courses', label: 'Course Catalog', icon: Compass },
        { to: '/trainee/my-learning', label: 'My Learning', icon: BookOpen },
        { to: '/trainee/assessments', label: 'Assessments', icon: FileCheck },
        { to: '/trainee/profile', label: 'Profile', icon: User },
      ]}
    >
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 max-w-full">
        {/* Welcome Hero Banner (Dark Midnight Aesthetic) */}
        <motion.div 
          variants={fadeUp} 
          className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#040814] via-[#07132a] to-[#0a1e3f] text-white overflow-hidden shadow-xl border border-cyan-500/30"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-sky-500/15 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-semibold mb-3 border border-white/15">
                <Star className="w-3.5 h-3.5 fill-amber-300" />
                <span>Keep up the momentum!</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                Welcome back, {profile?.full_name?.split(' ')[0] ?? 'Trainee'}! 👋
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Continue your learning journey.
                {completionRate > 0
                  ? ` You've completed ${completionRate}% of your enrolled courses!`
                  : enrolledCount > 0
                    ? ` You have ${enrolledCount} active course${enrolledCount > 1 ? 's' : ''} in progress.`
                    : ' Browse the catalog to start your learning journey!'}
              </p>
            </div>
            <Link to="/trainee/courses" className="shrink-0">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all">
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
          <motion.div variants={fadeUp} className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col justify-between">
            <div>
              <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">In-Progress Courses</h3>
                  <p className="text-xs text-slate-500">Your active learning roadmap</p>
                </div>
                <Link to="/trainee/my-learning" className="text-xs font-bold text-cyan-600 hover:text-cyan-700 transition-colors flex items-center gap-1 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-3 py-1.5 rounded-full">
                  View All <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="py-4 space-y-3.5">
                {enrollmentsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-cyan-600 animate-spin" />
                  </div>
                ) : recentCourses.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No courses yet. Browse the catalog to get started!</p>
                  </div>
                ) : (
                  recentCourses.map((course: any) => (
                    <div key={course.id ?? course.title} className="p-4 rounded-2xl bg-slate-50/70 hover:bg-slate-50 border border-slate-200 hover:border-cyan-300 transition-all duration-200 group">
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="min-w-0 pr-3">
                          <p className="text-sm font-bold text-slate-900 truncate group-hover:text-cyan-600 transition-colors">{course.title}</p>
                          <p className="text-xs text-slate-500">{course.instructor} • {course.duration}</p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold shrink-0 ${
                          course.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                        }`}>
                          {course.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <ProgressBar
                          value={course.progress}
                          color={course.progress === 100 ? 'from-emerald-500 to-teal-600' : 'from-cyan-500 to-blue-600'}
                        />
                        <span className="text-xs font-bold text-slate-700 w-10 text-right">{course.progress}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>{enrolledCount > 0 ? `${enrolledCount} course${enrolledCount > 1 ? 's' : ''} enrolled` : 'No enrollments yet'}</span>
              <span className="font-semibold text-cyan-700">
                {completionRate >= 75 ? 'Excellent 🚀' : completionRate >= 50 ? 'On Track 📈' : completionRate > 0 ? 'Keep Going 💪' : 'Get Started!'}
              </span>
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={fadeUp} className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col">
            <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Activity</h3>
                <p className="text-xs text-slate-500">Your recent updates & badges</p>
              </div>
              <button className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="py-2 space-y-1 flex-1">
              {notifLoading || enrollmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 text-cyan-600 animate-spin" />
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No activity yet. Enroll in a course to get started!</p>
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
        <motion.div variants={fadeUp} className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm overflow-hidden relative">
          <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-center">
            <div className="lg:w-1/2 space-y-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 text-xs font-bold mb-2">
                  <Target className="w-3.5 h-3.5" />
                  <span>AI Skill Analysis</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 leading-tight">Your Skill Profile</h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-2">
                  See how your current skills compare to your target goals.
                  {topGaps.length > 0 && (
                    <span> We recommend focusing on <strong className="text-cyan-700">{topGaps.map(g => g.subject).join(' and ')}</strong> to improve.</span>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-600 shadow-sm" /> Your Current Level
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm" /> Target Level
                </div>
              </div>

              {/* Actionable Insights */}
              {topGaps.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Top Areas for Improvement</h4>
                  {topGaps.map((gap, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{gap.subject}</p>
                        <p className="text-xs text-slate-500">Current: {gap.A}% <span className="mx-1 text-slate-300">•</span> Target: {gap.B}%</p>
                      </div>
                      <Link to={`/trainee/courses?search=${encodeURIComponent(gap.subject)}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs bg-white border-slate-200 text-cyan-700 hover:bg-cyan-50 hover:border-cyan-200">
                          Find Course <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="lg:w-1/2 h-80 w-full relative">
              {(skillsLoading || allSkillsLoading) && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-20 backdrop-blur-sm rounded-3xl">
                  <Loader2 className="w-8 h-8 text-cyan-600 animate-spin" />
                </div>
              )}
              {competencyData.length >= 3 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={competencyData}>
                    <PolarGrid stroke="#f1f5f9" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                    <Radar name="Current Level" dataKey="A" stroke="#0ea5e9" strokeWidth={2} fill="#0ea5e9" fillOpacity={0.2} />
                    <Radar name="Target Level" dataKey="B" stroke="#cbd5e1" strokeWidth={2} fill="none" />
                    <Tooltip 
                      wrapperStyle={{ outline: 'none' }} 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                  <Target className="w-12 h-12 mb-3 text-slate-200" />
                  <p className="text-sm font-medium">Add more skills to view chart</p>
                  <p className="text-xs text-slate-400 max-w-[200px] text-center mt-1">Add at least 2 skill categories to display the chart.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Compass, title: 'Explore Catalog', desc: 'Discover new specialized programs', to: '/trainee/courses', gradient: 'from-cyan-600 to-blue-700' },
            { icon: BookOpen, title: 'My Learning Space', desc: 'Resume current lessons & quizzes', to: '/trainee/my-learning', gradient: 'from-blue-600 to-indigo-700' },
            { icon: Award, title: 'Earned Certificates', desc: 'View, download, and share badges', to: '/trainee/my-learning', gradient: 'from-amber-500 to-orange-600' },
          ].map(action => (
            <Link key={action.title} to={action.to}>
              <div className="p-5 rounded-3xl bg-white border border-slate-200/90 hover:border-cyan-400 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.gradient} text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-cyan-600 transition-colors">{action.title}</h4>
                    <p className="text-xs text-slate-500">{action.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-cyan-600 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </motion.div>
      </motion.div>
    </DashboardShell>
  )
}

/* ─── Trainer Dashboard ─────────────────────────────────────── */
export function TrainerDashboard() {
  const { profile } = useAuth()

  const stats = [
    { label: 'Active Courses', value: '8', icon: BookOpen, gradient: 'from-cyan-600 to-blue-700', badgeText: 'Published' },
    { label: 'Total Trainees', value: '156', icon: Users, gradient: 'from-blue-600 to-indigo-700', badgeText: 'Enrolled', subtext: '+14 this week' },
    { label: 'Avg. Completion', value: '82%', icon: BarChart3, gradient: 'from-amber-500 to-orange-600', badgeText: 'High Rate' },
    { label: 'Avg. Rating', value: '4.7', icon: Star, gradient: 'from-emerald-500 to-teal-700', badgeText: '⭐ 4.7 / 5.0' },
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
    { icon: FileText, title: 'New Submission', desc: 'Amit Kumar — Module 6 Quiz (94%)', time: '1h ago', iconBg: 'bg-emerald-100 text-emerald-700' },
    { icon: Users, title: '5 New Enrollments', desc: 'Data Science Fundamentals', time: '3h ago', iconBg: 'bg-cyan-100 text-cyan-700' },
    { icon: MessageSquare, title: 'New Question', desc: 'Python for Analytics — Forum Post', time: '6h ago', iconBg: 'bg-amber-100 text-amber-700' },
    { icon: Star, title: '5-Star Review', desc: 'Cloud Computing Basics — Rating', time: '1d ago', iconBg: 'bg-blue-100 text-blue-700' },
  ]

  return (
    <DashboardShell
      title="Trainer Dashboard"
      icon={BookOpen}
      navLinks={[
        { to: '/trainer', label: 'Dashboard', icon: BarChart3 },
        { to: '/trainer/courses', label: 'My Courses', icon: BookOpen },
      ]}
    >
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 max-w-full">
        {/* Welcome Banner (Midnight Dark Gradient) */}
        <motion.div 
          variants={fadeUp} 
          className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#040814] via-[#07132a] to-[#0a1e3f] text-white overflow-hidden shadow-xl border border-cyan-500/30"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-semibold mb-3 border border-white/15">
                <span>Trainer Command Center</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                Welcome, {profile?.full_name?.split(' ')[0] ?? 'Trainer'}!
              </h2>
              <p className="text-slate-300 text-sm">Manage your course curriculum and track real-time trainee engagement.</p>
            </div>
            <Link to="/trainer/courses" className="shrink-0">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-cyan-500/30 hover:scale-105 transition-all">
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
          <motion.div variants={fadeUp} className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm overflow-hidden">
            <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Top Performing Courses</h3>
                <p className="text-xs text-slate-500">Engagement and completion breakdown</p>
              </div>
              <Link to="/trainer/courses" className="text-xs font-bold text-cyan-600 hover:text-cyan-700 transition-colors flex items-center gap-1 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-3 py-1.5 rounded-full">
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="py-4 space-y-3.5">
              {topCourses.map(course => (
                <div key={course.title} className="p-4 rounded-2xl bg-slate-50/70 hover:bg-slate-50 border border-slate-200 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-slate-900">{course.title}</p>
                    <div className="flex items-center gap-1 text-amber-700 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{course.rating}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div>
                      <p className="text-base font-extrabold text-slate-900">{course.trainees}</p>
                      <p className="text-[11px] font-semibold text-slate-500">Trainees</p>
                    </div>
                    <div>
                      <p className="text-base font-extrabold text-slate-900">{course.completion}%</p>
                      <p className="text-[11px] font-semibold text-slate-500">Completion</p>
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
          <motion.div variants={fadeUp} className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Recent Activity</h3>
              <p className="text-xs text-slate-500">Live trainee actions</p>
            </div>
            <div className="py-2 space-y-1 flex-1">
              {activities.map((act, i) => (
                <ActivityItem key={i} {...act} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Recent Submissions */}
        <motion.div variants={fadeUp} className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm overflow-hidden">
          <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Trainee Submissions</h3>
              <p className="text-xs text-slate-500">Assessments and assignments pending review</p>
            </div>
            <button className="text-xs font-bold text-cyan-600 hover:text-cyan-700 transition-colors flex items-center gap-1 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 px-3 py-1.5 rounded-full">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto mt-2">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-600 font-bold bg-slate-50">
                  <th className="px-4 py-3">Trainee</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSubmissions.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {s.name.charAt(0)}
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-slate-600 truncate">{s.course}</td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-slate-600">{s.module}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 text-right">{s.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Announcements Feed Section */}
        <motion.div variants={fadeUp}>
          <AnnouncementsFeed />
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
  const [activeTab, setActiveTab] = useState<'overview' | 'trainees' | 'trainers' | 'admins' | 'courses' | 'logs' | 'announcements' | 'messages' | 'home_page'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'suspended' | 'rejected'>('all')
  const [ConfirmDialog, confirm] = useConfirm()

  const [previewMaterial, setPreviewMaterial] = useState<{file_name: string, storage_path: string} | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pendingCoursesCount, setPendingCoursesCount] = useState(0)
  const [coursesList, setCoursesList] = useState<any[]>([])
  const [enrollmentsList, setEnrollmentsList] = useState<any[]>([])
  const [selectedUserForModal, setSelectedUserForModal] = useState<any | null>(null)
  const [isUserDetailsModalOpen, setIsUserDetailsModalOpen] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [trRes, trnRes, admRes, logRes, pendingCoursesRes, allCoursesRes, enrollmentsRes] = await Promise.all([
        supabase.from('trainees').select('*').order('created_at', { ascending: false }),
        supabase.from('trainers').select('*').order('created_at', { ascending: false }),
        supabase.from('admins').select('*').order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('courses').select('id', { count: 'exact' }).eq('status', 'pending_review'),
        supabase.from('courses').select('id, title, status, delivery_mode, department, course_type, created_at'),
        supabase.from('enrollments').select('id, course_id, user_id, status, progress_percent, completed_at, enrolled_at'),
      ])

      const allUsers = [
        ...(trRes.data || []),
        ...(trnRes.data || []),
        ...(admRes.data || [])
      ]
      setUsers(allUsers as any)
      if (logRes.data) setLogs(logRes.data)
      setPendingCoursesCount(pendingCoursesRes.count || 0)
      if (allCoursesRes.data) setCoursesList(allCoursesRes.data)
      if (enrollmentsRes.data) setEnrollmentsList(enrollmentsRes.data)
    } catch (e) {
      console.error('Exception in fetchData:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const platformAnalytics = useMemo(() => {
    const totalEnrollments = enrollmentsList.length
    const completedEnrollments = enrollmentsList.filter(e => e.status === 'completed' || (e.progress_percent ?? 0) >= 100).length
    const activeEnrollments = enrollmentsList.filter(e => e.status === 'in_progress' || e.status === 'enrolled' || ((e.progress_percent ?? 0) > 0 && (e.progress_percent ?? 0) < 100)).length
    const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0
    
    const totalProgress = enrollmentsList.reduce((acc, curr) => acc + (Number(curr.progress_percent) || 0), 0)
    const avgProgress = totalEnrollments > 0 ? Math.round(totalProgress / totalEnrollments) : 0

    // Department grouping - normalized to aggregate clean institutional units
    const deptMap: Record<string, number> = {}
    users.forEach(u => {
      let d = (u.department || 'MoES HQ').trim()
      if (d) {
        const upper = d.toUpperCase()
        if (upper === 'CSE' || upper === 'IMD' || upper === 'NCMRWF' || upper === 'INCOIS' || upper === 'IITM' || upper === 'NIOT' || upper === 'NCPOR') {
          d = upper
        }
      }
      deptMap[d] = (deptMap[d] || 0) + 1
    })
    const deptArray = Object.entries(deptMap)
      .map(([name, count]) => ({
        name,
        count,
        percent: users.length > 0 ? Math.round((count / users.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)

    const publishedCourses = coursesList.filter(c => c.status === 'published').length
    const draftCourses = coursesList.filter(c => c.status === 'draft').length
    const pendingCourses = coursesList.filter(c => c.status === 'pending_review').length

    const recordedCount = coursesList.filter(c => c.delivery_mode === 'recorded' || !c.delivery_mode).length
    const liveCount = coursesList.filter(c => c.delivery_mode === 'live').length
    const hybridCount = coursesList.filter(c => c.delivery_mode === 'hybrid').length

    return {
      totalEnrollments,
      completedEnrollments,
      activeEnrollments,
      completionRate,
      avgProgress,
      deptArray: deptArray.slice(0, 6),
      totalCourses: coursesList.length,
      publishedCourses,
      draftCourses,
      pendingCourses,
      deliveryModes: {
        recorded: recordedCount,
        live: liveCount,
        hybrid: hybridCount,
      }
    }
  }, [enrollmentsList, coursesList, users])

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
    const isConfirmed = await confirm("Are you sure you want to permanently delete this user? This action cannot be undone.", "Delete User")
    if (!isConfirmed) return;
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
    { key: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'trainees', label: 'Trainees', icon: Users },
    { key: 'trainers', label: 'Trainers', icon: Users },
    ...(isSuperAdmin ? [{ key: 'admins', label: 'Admins', icon: Shield }] : []),
    { key: 'courses', label: 'Courses', icon: BookOpen },
    { key: 'announcements', label: 'Announcements', icon: Megaphone },
    { key: 'messages', label: 'Messages', icon: Mail },
    { key: 'home_page', label: 'Home Page', icon: Globe },
    ...(isSuperAdmin ? [{ key: 'logs', label: 'Audit Logs', icon: BarChart3 }] : []),
  ] as const

  const pendingCount = users.filter(u => u.approval_status === 'pending').length
  const pendingTrainees = users.filter(u => u.approval_status === 'pending' && u.role === 'trainee').length
  const pendingTrainers = users.filter(u => u.approval_status === 'pending' && u.role === 'trainer').length
  const pendingAdmins = isSuperAdmin ? users.filter(u => u.approval_status === 'pending' && u.role === 'admin').length : 0

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, gradient: 'from-cyan-600 to-blue-700', badgeText: 'Registered' },
    { label: 'Pending Approval', value: pendingCount, icon: Clock, gradient: 'from-amber-500 to-orange-600', badgeText: pendingCount > 0 ? 'Action Needed' : 'All Clear' },
    { label: 'Approved Users', value: users.filter(u => u.approval_status === 'approved').length, icon: CheckCircle, gradient: 'from-emerald-500 to-teal-700', badgeText: 'Verified' },
  ]

  const activities = useMemo(() => {
    const list: Array<{
      id: string
      icon: React.ElementType
      title: string
      desc: string
      time: string
      iconBg: string
      timestamp: number
    }> = []

    // 1. From real audit_logs
    if (logs && logs.length > 0) {
      logs.forEach((log) => {
        let icon = Shield
        let iconBg = 'bg-slate-100 text-slate-700'
        let title = log.action || 'System Event'
        let desc = log.entity_type ? `${log.entity_type} event` : 'Audit log recorded'

        const actionLower = (log.action || '').toLowerCase()
        if (actionLower.includes('create') || actionLower.includes('register') || actionLower.includes('insert')) {
          icon = Users
          iconBg = 'bg-cyan-100 text-cyan-700'
          title = 'Registration / Creation'
        } else if (actionLower.includes('approve') || actionLower.includes('verify') || actionLower.includes('complete')) {
          icon = CheckCircle
          iconBg = 'bg-emerald-100 text-emerald-700'
          title = 'Account Approved'
        } else if (actionLower.includes('suspend') || actionLower.includes('reject') || actionLower.includes('delete') || actionLower.includes('ban')) {
          icon = Ban
          iconBg = 'bg-rose-100 text-rose-700'
          title = 'Security & Status'
        } else if (actionLower.includes('course') || actionLower.includes('publish')) {
          icon = BookOpen
          iconBg = 'bg-blue-100 text-blue-700'
          title = 'Course Updated'
        }

        if (log.metadata && typeof log.metadata === 'object') {
          const meta = log.metadata as any
          if (meta.email) desc = `${meta.email} — ${log.action}`
          else if (meta.title) desc = `"${meta.title}" — ${log.action}`
          else if (meta.target_user_id) desc = `User ${meta.target_user_id.slice(0, 8)}... — ${log.action}`
        }

        const createdAt = log.created_at ? new Date(log.created_at) : new Date()
        list.push({
          id: `log-${log.id}`,
          icon,
          title,
          desc,
          time: formatDistanceToNow(createdAt, { addSuffix: true }),
          iconBg,
          timestamp: createdAt.getTime(),
        })
      })
    }

    // 2. From real users (new registrations / status changes)
    users.forEach((u) => {
      const createdAt = u.created_at ? new Date(u.created_at) : null
      if (createdAt) {
        let icon = Users
        let iconBg = 'bg-cyan-100 text-cyan-700'
        let title = `${u.role === 'trainer' ? 'Trainer' : u.role === 'admin' || u.role === 'super_admin' ? 'Admin' : 'Trainee'} Registered`
        let desc = `${u.full_name || u.email} ${u.department ? `(${u.department})` : ''}`

        if (u.approval_status === 'approved') {
          icon = CheckCircle
          iconBg = 'bg-emerald-100 text-emerald-700'
          title = `${u.role === 'trainer' ? 'Trainer' : 'User'} Verified`
          desc = `${u.full_name || u.email} is active`
        } else if (u.approval_status === 'suspended') {
          icon = Ban
          iconBg = 'bg-rose-100 text-rose-700'
          title = 'User Suspended'
          desc = `${u.full_name || u.email} suspended`
        } else if (u.approval_status === 'pending') {
          icon = Clock
          iconBg = 'bg-amber-100 text-amber-700'
          title = 'Application Pending'
          desc = `${u.full_name || u.email} awaiting review`
        }

        list.push({
          id: `user-${u.id}-${u.approval_status}`,
          icon,
          title,
          desc,
          time: formatDistanceToNow(createdAt, { addSuffix: true }),
          iconBg,
          timestamp: createdAt.getTime(),
        })
      }
    })

    // 3. From real courses created
    coursesList.forEach((c) => {
      const createdAt = c.created_at ? new Date(c.created_at) : null
      if (createdAt) {
        list.push({
          id: `course-${c.id}`,
          icon: BookOpen,
          title: c.status === 'published' ? 'Course Published' : 'Course Created',
          desc: `"${c.title}" (${c.delivery_mode || 'recorded'})`,
          time: formatDistanceToNow(createdAt, { addSuffix: true }),
          iconBg: c.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700',
          timestamp: createdAt.getTime(),
        })
      }
    })

    // 4. From real enrollments
    enrollmentsList.forEach((e) => {
      const enrolledAt = e.enrolled_at ? new Date(e.enrolled_at) : null
      if (enrolledAt) {
        const isDone = e.status === 'completed' || (e.progress_percent ?? 0) >= 100
        list.push({
          id: `enroll-${e.id}`,
          icon: isDone ? Award : GraduationCap,
          title: isDone ? 'Certification Completed' : 'Program Enrollment',
          desc: isDone ? `Trainee completed certification (100%)` : `Trainee enrolled in course (${e.progress_percent ?? 0}% progress)`,
          time: formatDistanceToNow(enrolledAt, { addSuffix: true }),
          iconBg: isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
          timestamp: enrolledAt.getTime(),
        })
      }
    })

    // Deduplicate and sort by newest
    const seen = new Set()
    const unique = list.filter(item => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })

    unique.sort((a, b) => b.timestamp - a.timestamp)
    return unique.slice(0, 6)
  }, [logs, users, coursesList, enrollmentsList])

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
        <ConfirmDialog />
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 max-w-full">
          {/* Welcome Banner (Midnight Dark Aesthetic) */}
          <motion.div 
            variants={fadeUp} 
            className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#040814] via-[#07132a] to-[#0a1e3f] text-white overflow-hidden shadow-xl border border-cyan-500/30"
          >
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-semibold mb-3 border border-white/15">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Administration & Governance</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                  {isSuperAdmin ? "Super Administrator Control Center" : "Administrator Control Center"}
                </h2>
                <p className="text-slate-300 text-sm">
                  {pendingCount > 0
                    ? `${pendingCount} user application(s) require verification.`
                    : 'All applications are processed. Platform security and integrity verified.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {pendingCount > 0 && (
                  <Button 
                    onClick={() => setActiveTab('trainees')} 
                    className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-amber-500/30 hover:scale-105 transition-all"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Review {pendingCount} Pending
                  </Button>
                )}
                {isSuperAdmin && (
                  <Button 
                    onClick={cleanupOrphanedFiles}
                    disabled={isCleaningFiles}
                    className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold px-6 py-3 rounded-2xl transition-all"
                  >
                    {isCleaningFiles ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Cleanup Files
                  </Button>
                )}
              </div>
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {stats.map(s => <StatCard key={s.label} {...s} />)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div 
                        onClick={() => navigate('/admin/courses/new')}
                        className="group cursor-pointer p-5 rounded-3xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-md shadow-cyan-600/20 hover:scale-105 transition-all flex flex-col justify-between h-32"
                      >
                        <BookOpen className="w-6 h-6 text-white/80 group-hover:text-white group-hover:scale-110 transition-transform" />
                        <div>
                          <h4 className="font-bold text-sm">Create Course</h4>
                          <p className="text-xs text-white/80">Assign a trainer & publish</p>
                        </div>
                      </div>
                      <div 
                        onClick={() => setActiveTab('trainees')}
                        className="group cursor-pointer p-5 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20 hover:scale-105 transition-all flex flex-col justify-between h-32 relative overflow-hidden"
                      >
                        <Users className="w-6 h-6 text-white/80 group-hover:text-white group-hover:scale-110 transition-transform" />
                        <div>
                          <h4 className="font-bold text-sm">Review Trainees</h4>
                          <p className="text-xs text-white/80">Manage user accounts</p>
                        </div>
                        {pendingTrainees > 0 && (
                          <div className="absolute top-4 right-4 bg-black/30 px-2 py-1 rounded-lg text-xs font-bold backdrop-blur-sm">
                            {pendingTrainees} Pending
                          </div>
                        )}
                      </div>
                      <div 
                        onClick={() => setActiveTab('trainers')}
                        className="group cursor-pointer p-5 rounded-3xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-md shadow-slate-500/20 hover:scale-105 transition-all flex flex-col justify-between h-32 relative overflow-hidden"
                      >
                        <GraduationCap className="w-6 h-6 text-white/80 group-hover:text-white group-hover:scale-110 transition-transform" />
                        <div>
                          <h4 className="font-bold text-sm">Review Trainers</h4>
                          <p className="text-xs text-white/80">Manage trainer accounts</p>
                        </div>
                        {pendingTrainers > 0 && (
                          <div className="absolute top-4 right-4 bg-black/30 px-2 py-1 rounded-lg text-xs font-bold backdrop-blur-sm">
                            {pendingTrainers} Pending
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm overflow-hidden">
                      <div className="pb-4 border-b border-slate-100 mb-4">
                        <h3 className="text-base font-bold text-slate-900">Recent Activity</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Live platform activity & system logs.</p>
                      </div>
                      <div className="space-y-4">
                        {activities.length === 0 ? (
                          <p className="text-xs text-slate-400 py-4 text-center">No platform activity recorded yet.</p>
                        ) : (
                          activities.map((act) => (
                            <div key={act.id} className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${act.iconBg}`}>
                                <act.icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{act.title}</p>
                                <p className="text-xs text-slate-500 truncate">{act.desc}</p>
                              </div>
                              <span className="text-xs text-slate-400 font-medium whitespace-nowrap">{act.time}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tab: Trainees */}
              <AnimatePresence mode="wait">
                {activeTab === 'trainees' && (
                  <motion.div
                    key="trainees"
                    variants={scaleIn}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm overflow-hidden"
                  >
                    <div className="pb-4 border-b border-slate-100 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 capitalize">Trainees Management</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Approve, reject, promote, or suspend trainee accounts.</p>
                        </div>
                        <div className="relative w-full sm:w-64 shrink-0">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search trainees..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all shadow-xs"
                          />
                        </div>
                      </div>
                      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-fit overflow-x-auto hide-scrollbar">
                        {(['all', 'pending', 'approved', 'suspended', 'rejected'] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize whitespace-nowrap ${
                              statusFilter === f ? 'bg-white text-cyan-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    {loading ? (
                      <div className="p-8 text-center text-slate-400 text-sm">Loading trainees...</div>
                    ) : (
                      <div className="overflow-x-auto mt-2">
                        <table className="w-full min-w-[620px]">
                          <thead>
                            <tr className="border-b border-slate-200 text-left text-xs text-slate-600 font-bold bg-slate-50">
                              <th className="px-3 py-3">Name</th>
                              <th className="px-3 py-3">Email</th>
                              <th className="px-3 py-3">Department</th>
                              <th className="px-3 py-3">Proof</th>
                              <th className="px-3 py-3">Status</th>
                              <th className="px-3 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredUsers.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="text-center py-8 text-slate-400 text-sm">
                                  {searchQuery ? 'No trainees match your search.' : 'No trainees found.'}
                                </td>
                              </tr>
                            ) : filteredUsers.map(u => (
                              <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-3 py-3">
                                  <div
                                    onClick={() => { setSelectedUserForModal(u); setIsUserDetailsModalOpen(true); }}
                                    className="flex items-center gap-2.5 cursor-pointer group"
                                    title="Click to view full profile details"
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                                      {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                                    </div>
                                    <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-cyan-700 transition-colors truncate max-w-[130px]">{u.full_name}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-xs text-slate-600 truncate max-w-[150px]">{u.email}</td>
                                <td className="px-3 py-3 text-xs text-slate-600 truncate max-w-[90px]">{u.department ?? '—'}</td>
                                <td className="px-3 py-3">
                                  {u.proof_path ? (
                                    <div className="flex flex-col gap-1.5">
                                      <div className="flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 w-fit" title="Securely stored in MoES Cloud">
                                        <Shield className="w-3 h-3 text-emerald-600" />
                                        <span className="truncate max-w-[100px]">{u.proof_path.split('/').pop()}</span>
                                      </div>
                                      <button onClick={() => handleViewProof(u.proof_path!)} className="text-[10px] px-2 py-0.5 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100 font-bold transition-all w-fit cursor-pointer">
                                        View Document
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-3"><StatusBadge status={u.approval_status} /></td>
                                <td className="px-3 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setSelectedUserForModal(u)
                                        setIsUserDetailsModalOpen(true)
                                      }}
                                      className="text-xs px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100 hover:border-sky-400 font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                      title="View Complete Trainee Info"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-sky-700" /> Info
                                    </button>
                                    {u.approval_status === 'pending' && (
                                      <>
                                        <button onClick={() => handleUpdateUser(u.id, u.email, u.role, 'approved')} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold transition-all shadow-xs cursor-pointer">Approve</button>
                                        <button onClick={() => handleUpdateUser(u.id, u.email, u.role, 'rejected')} className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold transition-all shadow-xs cursor-pointer">Reject</button>
                                      </>
                                    )}
                                    {u.approval_status === 'approved' && (
                                      <>
                                        <button onClick={() => handleUpdateUser(u.id, u.email, 'trainer', 'approved')} className="text-xs px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100 font-bold transition-all shadow-xs cursor-pointer">→ Trainer</button>
                                        <button onClick={() => handleUpdateUser(u.id, u.email, u.role, 'suspended')} className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold transition-all shadow-xs cursor-pointer">Suspend</button>
                                      </>
                                    )}
                                    {u.approval_status === 'suspended' && (
                                      <button onClick={() => handleUpdateUser(u.id, u.email, u.role, 'approved')} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold transition-all shadow-xs cursor-pointer">Unsuspend</button>
                                    )}
                                    {u.approval_status !== 'pending' && (
                                      <button onClick={() => handleDeleteUser(u.id)} className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold transition-all shadow-xs cursor-pointer" title="Permanently Delete Account">Delete</button>
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

                {/* Tab: Trainers */}
                {activeTab === 'trainers' && (
                  <motion.div
                    key="trainers"
                    variants={scaleIn}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm overflow-hidden"
                  >
                    <div className="pb-4 border-b border-slate-100 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-base font-bold text-slate-900 capitalize">Trainers Management</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Approve, reject, suspend or promote trainers.</p>
                        </div>
                        <div className="relative w-full sm:w-64 shrink-0">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Search trainers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all shadow-xs"
                          />
                        </div>
                      </div>
                      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-fit overflow-x-auto hide-scrollbar">
                        {(['all', 'pending', 'approved', 'suspended', 'rejected'] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize whitespace-nowrap ${
                              statusFilter === f ? 'bg-white text-cyan-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    {loading ? (
                      <div className="p-8 text-center text-slate-400 text-sm">Loading trainers...</div>
                    ) : (
                      <div className="overflow-x-auto mt-2">
                        <table className="w-full min-w-[620px]">
                          <thead>
                            <tr className="border-b border-slate-200 text-left text-xs text-slate-600 font-bold bg-slate-50">
                              <th className="px-3 py-3">Name</th>
                              <th className="px-3 py-3">Email</th>
                              <th className="px-3 py-3">Qualifications</th>
                              <th className="px-3 py-3">Experience</th>
                              <th className="px-3 py-3">Proof</th>
                              <th className="px-3 py-3">Status</th>
                              <th className="px-3 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredUsers.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="text-center py-8 text-slate-400 text-sm">
                                  {searchQuery ? 'No trainers match your search.' : 'No trainers found.'}
                                </td>
                              </tr>
                            ) : filteredUsers.map(u => (
                              <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-3 py-3">
                                  <div
                                    onClick={() => { setSelectedUserForModal(u); setIsUserDetailsModalOpen(true); }}
                                    className="flex items-center gap-2.5 cursor-pointer group"
                                    title="Click to view full profile details"
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                                      {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                                    </div>
                                    <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-cyan-700 transition-colors truncate max-w-[130px]">{u.full_name}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-xs text-slate-600 truncate max-w-[150px]">{u.email}</td>
                                <td className="px-3 py-3 text-xs text-slate-600 truncate max-w-[120px]">{(u as any).qualifications ?? '—'}</td>
                                <td className="px-3 py-3 text-xs text-slate-600">{(u as any).years_of_experience ? `${(u as any).years_of_experience} yrs` : '—'}</td>
                                <td className="px-3 py-3">
                                  {u.proof_path ? (
                                    <div className="flex flex-col gap-1.5">
                                      <div className="flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 w-fit" title="Securely stored in MoES Cloud">
                                        <Shield className="w-3 h-3 text-emerald-600" />
                                        <span className="truncate max-w-[100px]">{u.proof_path.split('/').pop()}</span>
                                      </div>
                                      <button onClick={() => handleViewProof(u.proof_path!)} className="text-[10px] px-2 py-0.5 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100 font-bold transition-all w-fit cursor-pointer">
                                        View Document
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-3"><StatusBadge status={u.approval_status} /></td>
                                <td className="px-3 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setSelectedUserForModal(u)
                                        setIsUserDetailsModalOpen(true)
                                      }}
                                      className="text-xs px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100 hover:border-sky-400 font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                      title="View Complete Trainer Info"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-sky-700" /> Info
                                    </button>
                                    {u.approval_status === 'pending' && (
                                      <>
                                        <button onClick={() => handleUpdateUser(u.id, u.email, u.role, 'approved')} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold transition-all shadow-xs cursor-pointer">Approve</button>
                                        <button onClick={() => handleUpdateUser(u.id, u.email, u.role, 'rejected')} className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold transition-all shadow-xs cursor-pointer">Reject</button>
                                      </>
                                    )}
                                    {u.approval_status === 'approved' && (
                                      <button onClick={() => handleUpdateUser(u.id, u.email, u.role, 'suspended')} className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold transition-all shadow-xs cursor-pointer">Suspend</button>
                                    )}
                                    {u.approval_status === 'suspended' && (
                                      <button onClick={() => handleUpdateUser(u.id, u.email, u.role, 'approved')} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold transition-all shadow-xs cursor-pointer">Unsuspend</button>
                                    )}
                                    {u.approval_status !== 'pending' && (
                                      <button onClick={() => handleDeleteUser(u.id)} className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold transition-all shadow-xs cursor-pointer" title="Permanently Delete Account">Delete</button>
                                    )}
                                    {isSuperAdmin && u.approval_status === 'approved' && (
                                      <button onClick={() => handlePromoteToAdmin(u.id)} className="text-xs px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold hover:opacity-95 transition-all shadow-xs cursor-pointer">Promote to Admin</button>
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

                {/* Tab: Admins */}
                {activeTab === 'admins' && (
                  <motion.div
                    key="admins"
                    variants={scaleIn}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm overflow-hidden"
                  >
                    <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 capitalize">Admins Management</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Manage administrative access to the platform.</p>
                      </div>
                      <div className="relative w-full sm:w-64 shrink-0">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search admins..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all shadow-xs"
                        />
                      </div>
                    </div>

                    {loading ? (
                      <div className="p-8 text-center text-slate-400 text-sm">Loading admins...</div>
                    ) : (
                      <div className="overflow-x-auto mt-2">
                        <table className="w-full min-w-[620px]">
                          <thead>
                            <tr className="border-b border-slate-200 text-left text-xs text-slate-600 font-bold bg-slate-50">
                              <th className="px-3 py-3">Name</th>
                              <th className="px-3 py-3">Email</th>
                              <th className="px-3 py-3">Role</th>
                              <th className="px-3 py-3">Status</th>
                              <th className="px-3 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredUsers.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="text-center py-8 text-slate-400 text-sm">
                                  {searchQuery ? 'No admins match your search.' : 'No admins found.'}
                                </td>
                              </tr>
                            ) : filteredUsers.map(u => (
                              <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-3 py-3">
                                  <div
                                    onClick={() => { setSelectedUserForModal(u); setIsUserDetailsModalOpen(true); }}
                                    className="flex items-center gap-2.5 cursor-pointer group"
                                    title="Click to view full profile details"
                                  >
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                                      {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                                    </div>
                                    <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-cyan-700 transition-colors truncate max-w-[130px]">{u.full_name}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-3 text-xs text-slate-600 truncate max-w-[150px]">{u.email}</td>
                                <td className="px-3 py-3">
                                  <span className="text-[11px] font-semibold capitalize text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-md">
                                    {u.role.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="px-3 py-3"><StatusBadge status={u.approval_status} /></td>
                                <td className="px-3 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setSelectedUserForModal(u)
                                        setIsUserDetailsModalOpen(true)
                                      }}
                                      className="text-xs px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-300 hover:bg-sky-100 hover:border-sky-400 font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                                      title="View Complete Admin Info"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-sky-700" /> Info
                                    </button>
                                    {u.approval_status === 'approved' && u.role !== 'super_admin' && (
                                      <button onClick={() => handleUpdateUser(u.id, u.email, u.role, 'suspended')} className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold transition-all shadow-xs cursor-pointer">Suspend</button>
                                    )}
                                    {u.approval_status !== 'pending' && u.role !== 'super_admin' && (
                                      <button onClick={() => handleDeleteUser(u.id)} className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-bold transition-all shadow-xs cursor-pointer" title="Permanently Delete Account">Delete</button>
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
              </AnimatePresence>

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

              {/* Tab: Messages */}
              {activeTab === 'messages' && (
                <motion.div key="messages" variants={scaleIn} initial="hidden" animate="visible" exit="hidden">
                  <AdminContactMessages />
                </motion.div>
              )}

              {/* Tab: Audit Logs */}
              {activeTab === 'logs' && (
                <motion.div key="logs" variants={scaleIn} initial="hidden" animate="visible" exit="hidden" className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm overflow-hidden">
                  <div className="pb-4 border-b border-slate-100">
                    <h3 className="text-base font-bold text-slate-900">Audit Logs</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Complete platform activity and compliance record.</p>
                  </div>
                  {loading ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Loading logs...</div>
                  ) : (
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full min-w-[500px]">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-xs text-slate-600 font-bold bg-slate-50">
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Actor</th>
                            <th className="px-4 py-3">Action</th>
                            <th className="px-4 py-3">Entity</th>
                            <th className="px-4 py-3">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {logs.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-8 text-slate-400 text-sm">No audit logs found.</td></tr>
                          ) : logs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{new Date(log.created_at || '').toLocaleString()}</td>
                              <td className="px-4 py-3 text-xs font-mono text-cyan-700">{log.actor_id?.slice(0, 8)}…</td>
                              <td className="px-4 py-3 text-xs text-slate-900 font-bold">{log.action}</td>
                              <td className="px-4 py-3 text-xs text-slate-600">{log.entity_type}</td>
                              <td className="px-4 py-3 text-xs font-mono text-slate-500 max-w-xs truncate">{JSON.stringify(log.metadata)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>

            {/* Recent Activity Sidebar */}
            {activeTab === 'overview' && (
              <motion.div variants={fadeUp} className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col">
                <div className="pb-4 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">System Activity</h3>
                  <p className="text-xs text-slate-500">Live audit events</p>
                </div>
                <div className="py-2 space-y-1 flex-1">
                  {activities.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">No live events logged.</p>
                  ) : (
                    activities.map((act) => (
                      <ActivityItem key={act.id} {...act} />
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Announcements Feed Section */}
          <motion.div variants={fadeUp}>
            <AnnouncementsFeed />
          </motion.div>

          {/* Platform Analytics & Governance Statistics Section */}
          {activeTab === 'overview' && (
            <motion.div variants={fadeUp} className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-sm overflow-hidden space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">Platform Analytics & Insights</h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Live Metrics
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Real-time training metrics, completion trends, and institutional capacity distribution.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchData}
                    className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh Stats
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('courses')}
                    className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:opacity-95 text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 mr-1.5" /> View Courses
                  </Button>
                </div>
              </div>

              {/* 4 Stat Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                  <p className="text-xs font-semibold text-slate-500">Total Enrollments</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">{platformAnalytics.totalEnrollments}</p>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-cyan-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>
                    <span>{platformAnalytics.activeEnrollments} Active in training</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                  <p className="text-xs font-semibold text-slate-500">Course Completion Rate</p>
                  <p className="text-2xl font-extrabold text-emerald-600 mt-1">{platformAnalytics.completionRate}%</p>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-emerald-700">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{platformAnalytics.completedEnrollments} Certified Trainees</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                  <p className="text-xs font-semibold text-slate-500">Average Learner Progress</p>
                  <p className="text-2xl font-extrabold text-blue-600 mt-1">{platformAnalytics.avgProgress}%</p>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${platformAnalytics.avgProgress}%` }} />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                  <p className="text-xs font-semibold text-slate-500">Published Programs</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">{platformAnalytics.publishedCourses}</p>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-slate-500">
                    <span>{platformAnalytics.totalCourses} total created</span>
                    {platformAnalytics.pendingCourses > 0 && (
                      <span className="text-amber-600 font-bold">({platformAnalytics.pendingCourses} pending)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2 Detailed Breakdown Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                {/* Department Distribution */}
                <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Users className="w-4 h-4 text-cyan-600" />
                      MoES Departmental Representation
                    </h4>
                    <span className="text-[11px] text-slate-400 font-medium">Top Units</span>
                  </div>

                  <div className="space-y-3">
                    {platformAnalytics.deptArray.length > 0 ? (
                      platformAnalytics.deptArray.map(dept => (
                        <div key={dept.name} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-800 font-bold">{dept.name}</span>
                            <span className="text-slate-500">{dept.count} users ({dept.percent}%)</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(dept.percent, 8)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 py-3 text-center">No departmental data available yet.</p>
                    )}
                  </div>
                </div>

                {/* Course Delivery & Operational Status */}
                <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Target className="w-4 h-4 text-orange-600" />
                      Program Delivery Modes
                    </h4>
                    <span className="text-[11px] text-slate-400 font-medium">Distribution</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div className="p-3 rounded-xl bg-cyan-50/60 border border-cyan-100 text-center">
                      <p className="text-[11px] font-semibold text-cyan-800">Recorded</p>
                      <p className="text-lg font-extrabold text-cyan-950 mt-0.5">{platformAnalytics.deliveryModes.recorded}</p>
                      <p className="text-[10px] text-cyan-600 mt-0.5">Self-paced</p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 text-center">
                      <p className="text-[11px] font-semibold text-amber-800">Live</p>
                      <p className="text-lg font-extrabold text-amber-950 mt-0.5">{platformAnalytics.deliveryModes.live}</p>
                      <p className="text-[10px] text-amber-600 mt-0.5">Real-time cohorts</p>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-center">
                      <p className="text-[11px] font-semibold text-purple-800">Hybrid</p>
                      <p className="text-lg font-extrabold text-purple-950 mt-0.5">{platformAnalytics.deliveryModes.hybrid}</p>
                      <p className="text-[10px] text-purple-600 mt-0.5">Blended sessions</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Award className="w-4 h-4 text-emerald-600" />
                      Digital Certifications:
                    </span>
                    <span className="font-bold text-slate-900">{platformAnalytics.completedEnrollments} issued</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </DashboardShell>
      <MaterialPreviewDialog
        material={previewMaterial}
        previewUrl={previewUrl}
        onClose={() => setPreviewMaterial(null)}
      />
      <AdminUserDetailsModal
        user={selectedUserForModal}
        isOpen={isUserDetailsModalOpen}
        onClose={() => {
          setIsUserDetailsModalOpen(false)
          setSelectedUserForModal(null)
        }}
        onUpdateStatus={handleUpdateUser}
        onViewProof={handleViewProof}
      />
    </>
  )
}

export function SuperAdminDashboard() {
  return <AdminDashboard />
}
