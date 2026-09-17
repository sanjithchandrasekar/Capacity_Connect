import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Database } from '@/integrations/supabase/types'
import { AdminCourses } from '@/features/courses/AdminCourses'
import { Button } from '@/components/ui/button'
import {
  Globe, LogOut, Users, BookOpen, BarChart3, Shield,
  GraduationCap, ChevronRight, CheckCircle, Search,
  XCircle, Clock, Ban, ArrowUpRight, Compass, Bell,
  Award, Target, FileText, Settings,
  ChevronDown, RefreshCw, Star, MessageSquare, Crown,
  Menu, X
} from 'lucide-react'
import { toast } from 'sonner'

type Profile = Database['public']['Tables']['profiles']['Row']
type AuditLog = Database['public']['Tables']['audit_logs']['Row']

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
  navLinks?: { to: string; label: string; icon: React.ElementType; badge?: number }[]
}) {
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const roleColor: Record<string, string> = {
    admin: 'bg-purple-50 text-purple-700 border-purple-200',
    super_admin: 'bg-pink-50 text-pink-700 border-pink-200',
    trainer: 'bg-orange-50 text-orange-700 border-orange-200',
    trainee: 'bg-purple-50 text-purple-600 border-purple-200',
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
      <div className="h-16 flex items-center px-5 border-b border-purple-500/10">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain shrink-0" />
          {(!sidebarCollapsed || mobileOpen) && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm font-bold whitespace-nowrap"
            >
              <span className="text-purple-900">Capacity</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500"> Connect</span>
            </motion.span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto scrollbar-thin">
        {navLinks?.map(link => {
          const isActive = location.pathname === link.to
          return (
            <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}>
              <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm group ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white shadow-md shadow-pink-500/20'
                  : 'text-midnight/70 hover:text-midnight hover:bg-purple-50 border border-transparent'
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
            </Link>
          )
        })}
      </nav>

      {/* Quick Search shortcut */}
      {(!sidebarCollapsed || mobileOpen) && (
        <div className="p-3 mx-3 mb-2 rounded-xl bg-purple-50/70 border border-purple-500/15">
          <div className="flex items-center gap-2 text-xs text-midnight/60">
            <Search className="w-3.5 h-3.5 text-purple-600" />
            <span>
              Press <kbd className="px-1 py-0.5 bg-white border border-purple-200 rounded text-[10px] font-medium">⌘K</kbd> for search
            </span>
          </div>
        </div>
      )}

      {/* Profile summary & logout */}
      <div className="p-3 border-t border-purple-500/10 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-purple-50 transition-all cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-purple-500/20">
            {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          {(!sidebarCollapsed || mobileOpen) && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-midnight truncate group-hover:text-purple-700 transition-colors">
                {profile?.full_name ?? 'User'}
              </p>
              <p className="text-[11px] text-midnight/50 truncate">
                {profile?.email}
              </p>
            </div>
          )}
        </div>
        {(!sidebarCollapsed || mobileOpen) && (
          <div className="flex items-center gap-1.5 px-3">
            <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${roleColor[profile?.role ?? ''] ?? 'bg-purple-50 text-purple-700'}`}>
              {profile?.role?.replace('_', ' ')}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${statusColor[profile?.approval_status ?? ''] ?? 'bg-purple-50 text-purple-700'}`}>
              {profile?.approval_status}
            </span>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-midnight/60 hover:text-red-600 hover:bg-red-500/10 transition-all text-sm"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {(!sidebarCollapsed || mobileOpen) && <span>Sign Out</span>}
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-white text-midnight flex">
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
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-purple-500/10 bg-white/95 backdrop-blur-2xl flex flex-col transition-transform duration-300 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4 z-10">
          <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-purple-50 text-midnight/70 hover:text-midnight transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={`relative z-20 hidden md:flex ${sidebarCollapsed ? 'w-[72px]' : 'w-64'} border-r border-purple-500/10 bg-white/80 backdrop-blur-2xl flex-col shrink-0 h-screen sticky top-0 transition-all duration-300`}>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Topbar */}
        <header className="h-14 md:h-16 border-b border-purple-500/10 bg-white/80 backdrop-blur-2xl sticky top-0 z-10 flex items-center px-4 md:px-6 gap-3">
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileOpen(true)
              } else {
                setSidebarCollapsed(!sidebarCollapsed)
              }
            }}
            className="p-2 rounded-lg hover:bg-purple-50 text-midnight/70 hover:text-midnight transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
            <h1 className="text-sm md:text-base font-semibold text-midnight truncate">{title}</h1>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1 md:gap-2">
            <button className="relative p-2 rounded-lg hover:bg-purple-50 text-midnight/70 hover:text-midnight transition-all">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full" />
            </button>
            <button className="p-2 rounded-lg hover:bg-purple-50 text-midnight/70 hover:text-midnight transition-all">
              <Settings className="w-4 h-4" />
            </button>
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
  const c = config[status] ?? { color: 'bg-ink/70 text-ink/70', icon: Clock }
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
      className="group relative p-5 md:p-6 rounded-3xl bg-white border border-purple-500/15 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 cursor-default overflow-hidden"
    >
      {/* Subtle background ambient corner glow */}
      <div className={`absolute -right-8 -bottom-8 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 blur-xl transition-opacity bg-gradient-to-br ${gradient}`} />
      
      <div className="relative flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-5 h-5" />
        </div>
        {badgeText && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/70">
            {badgeText}
          </span>
        )}
      </div>

      <div className="relative">
        <div className="text-3xl font-extrabold text-midnight tracking-tight mb-1">{value}</div>
        <div className="text-xs font-semibold text-midnight/60">{label}</div>
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
    <div className="flex items-start gap-3.5 p-3.5 rounded-2xl hover:bg-purple-50/50 transition-colors group">
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs md:text-sm text-midnight font-semibold truncate group-hover:text-purple-700 transition-colors">{title}</p>
        <p className="text-xs text-midnight/55 mt-0.5 truncate">{desc}</p>
      </div>
      <span className="text-[11px] text-midnight/40 font-medium whitespace-nowrap bg-purple-50/70 px-2 py-0.5 rounded-full">{time}</span>
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

  const stats = [
    { label: 'Enrolled Courses', value: '3', icon: BookOpen, gradient: 'from-purple-600 to-purple-800', badgeText: 'Active', subtext: '+1 this month' },
    { label: 'Hours Learned', value: '48', icon: Clock, gradient: 'from-pink-500 to-rose-600', badgeText: 'Total', subtext: '12 hrs this week' },
    { label: 'Certificates', value: '2', icon: Award, gradient: 'from-orange-400 to-orange-600', badgeText: 'Verified', subtext: 'Ready to share' },
    { label: 'Completion Rate', value: '78%', icon: Target, gradient: 'from-purple-600 via-pink-500 to-orange-500', badgeText: 'Top 15%', subtext: 'Ahead of target' },
  ]

  const recentCourses = [
    { title: 'Data Science Fundamentals', progress: 72, status: 'In Progress', instructor: 'Dr. Sharma', duration: '6 hrs remaining' },
    { title: 'Python for Analytics', progress: 45, status: 'In Progress', instructor: 'Prof. Kumar', duration: '10 hrs remaining' },
    { title: 'Cloud Computing Basics', progress: 100, status: 'Completed', instructor: 'Ms. Patel', duration: 'Completed' },
  ]

  const activities = [
    { icon: CheckCircle, title: 'Completed Module 5', desc: 'Data Science Fundamentals — Statistics', time: '2h ago', iconBg: 'bg-emerald-100 text-emerald-600' },
    { icon: Award, title: 'Certificate Earned', desc: 'Cloud Computing Basics — Final Exam Passed', time: '1d ago', iconBg: 'bg-orange-100 text-orange-600' },
    { icon: BookOpen, title: 'Started New Course', desc: 'Python for Analytics — Introduction', time: '2d ago', iconBg: 'bg-pink-100 text-pink-600' },
    { icon: Star, title: 'Quiz Score: 92%', desc: 'Data Science Fundamentals — Module 4 Quiz', time: '3d ago', iconBg: 'bg-purple-100 text-purple-700' },
  ]

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
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 max-w-6xl">
        {/* Welcome Hero Banner */}
        <motion.div 
          variants={fadeUp} 
          className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-900 via-purple-800 to-midnight text-white overflow-hidden shadow-xl shadow-purple-900/20 border border-purple-500/20"
        >
          {/* Glowing background orbs */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-pink-500/20 to-orange-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-orange-300 text-xs font-semibold mb-3 border border-white/15">
                <Star className="w-3.5 h-3.5 fill-orange-300" />
                <span>Keep up the momentum!</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                Welcome back, {profile?.full_name?.split(' ')[0] ?? 'Trainee'}! 👋
              </h2>
              <p className="text-white/80 text-sm leading-relaxed">
                Continue your learning journey. You've completed 78% of your scheduled milestones this month!
              </p>
            </div>
            <Link to="/trainee/courses" className="shrink-0">
              <Button className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-bold px-6 py-3 rounded-2xl shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-105 active:scale-95 transition-all">
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
          <motion.div variants={fadeUp} className="lg:col-span-2 bg-white border border-purple-500/15 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col justify-between">
            <div>
              <div className="pb-4 border-b border-purple-500/10 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-midnight">In-Progress Courses</h3>
                  <p className="text-xs text-midnight/50">Your active learning roadmap</p>
                </div>
                <Link to="/trainee/my-learning" className="text-xs font-bold text-purple-600 hover:text-pink-600 transition-colors flex items-center gap-1 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200/60">
                  View All <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="py-4 space-y-3.5">
                {recentCourses.map(course => (
                  <div key={course.title} className="p-4 rounded-2xl bg-purple-50/40 hover:bg-purple-50/80 border border-purple-500/10 hover:border-pink-500/20 transition-all duration-200 group">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="min-w-0 pr-3">
                        <p className="text-sm font-bold text-midnight truncate group-hover:text-purple-700 transition-colors">{course.title}</p>
                        <p className="text-xs text-midnight/50">{course.instructor} • {course.duration}</p>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold shrink-0 ${
                        course.status === 'Completed' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border border-purple-200'
                      }`}>
                        {course.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <ProgressBar 
                        value={course.progress} 
                        color={course.progress === 100 ? 'from-emerald-400 to-emerald-600' : 'from-purple-600 via-pink-500 to-orange-500'} 
                      />
                      <span className="text-xs font-bold text-midnight/70 w-10 text-right">{course.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-purple-500/10 flex items-center justify-between text-xs text-midnight/60">
              <span>Goal: 100% completion by end of quarter</span>
              <span className="font-semibold text-purple-600">On Track 🚀</span>
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={fadeUp} className="bg-white border border-purple-500/15 rounded-3xl p-6 shadow-sm flex flex-col">
            <div className="pb-4 border-b border-purple-500/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-midnight">Recent Activity</h3>
                <p className="text-xs text-midnight/50">Your recent updates & badges</p>
              </div>
              <button className="p-1.5 rounded-xl hover:bg-purple-50 text-purple-600 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="py-2 space-y-1 flex-1">
              {activities.map((act, i) => (
                <ActivityItem key={i} {...act} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Compass, title: 'Explore Catalog', desc: 'Discover new specialized programs', to: '/trainee/courses', gradient: 'from-purple-600 to-purple-800', btn: 'Browse' },
            { icon: BookOpen, title: 'My Learning Space', desc: 'Resume current lessons & quizzes', to: '/trainee/my-learning', gradient: 'from-pink-500 to-rose-600', btn: 'Continue' },
            { icon: Award, title: 'Earned Certificates', desc: 'View, download, and share badges', to: '/trainee/my-learning', gradient: 'from-orange-400 to-orange-600', btn: 'View All' },
          ].map(action => (
            <Link key={action.title} to={action.to}>
              <div className="p-5 rounded-3xl bg-white border border-purple-500/15 hover:border-pink-500/30 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.gradient} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-midnight group-hover:text-purple-700 transition-colors">{action.title}</h4>
                    <p className="text-xs text-midnight/55">{action.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-midnight/30 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </motion.div>

        {/* Profile Card */}
        <motion.div variants={fadeUp} className="bg-white border border-purple-500/15 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-purple-900/60 uppercase tracking-wider">Account Overview</h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
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
              <div key={item.label} className="p-3 bg-purple-50/40 rounded-2xl border border-purple-500/10">
                <p className="text-[11px] font-semibold text-midnight/50 mb-0.5">{item.label}</p>
                <p className="text-sm font-bold text-midnight truncate">{item.value || 'Not provided'}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-purple-500/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-midnight/60">Verification Status:</span>
              <StatusBadge status={profile?.approval_status ?? 'pending'} />
            </div>
            <span className="text-xs text-midnight/50">MoES Capacity Connect</span>
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
    { icon: Star, title: '5-Star Review', desc: 'Cloud Computing Basics — Rating', time: '1d ago', iconBg: 'bg-purple-100 text-purple-700' },
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
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 max-w-6xl">
        {/* Welcome Banner */}
        <motion.div 
          variants={fadeUp} 
          className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-900 via-purple-800 to-midnight text-white overflow-hidden shadow-xl shadow-purple-900/20 border border-purple-500/20"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-pink-500/20 to-orange-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-orange-300 text-xs font-semibold mb-3 border border-white/15">
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

        {/* Stats Grid */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Courses */}
          <motion.div variants={fadeUp} className="lg:col-span-2 bg-white border border-purple-500/15 rounded-3xl p-6 shadow-sm overflow-hidden">
            <div className="pb-4 border-b border-purple-500/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-midnight">Top Performing Courses</h3>
                <p className="text-xs text-midnight/50">Engagement and completion breakdown</p>
              </div>
              <Link to="/trainer/courses" className="text-xs font-bold text-purple-600 hover:text-pink-600 transition-colors flex items-center gap-1 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200/60">
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="py-4 space-y-3.5">
              {topCourses.map(course => (
                <div key={course.title} className="p-4 rounded-2xl bg-purple-50/40 hover:bg-purple-50/80 border border-purple-500/10 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-midnight">{course.title}</p>
                    <div className="flex items-center gap-1 text-orange-500 font-bold text-xs bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/60">
                      <Star className="w-3.5 h-3.5 fill-orange-400 text-orange-400" />
                      <span>{course.rating}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div>
                      <p className="text-base font-extrabold text-midnight">{course.trainees}</p>
                      <p className="text-[11px] font-semibold text-midnight/50">Trainees</p>
                    </div>
                    <div>
                      <p className="text-base font-extrabold text-midnight">{course.completion}%</p>
                      <p className="text-[11px] font-semibold text-midnight/50">Completion</p>
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
          <motion.div variants={fadeUp} className="bg-white border border-purple-500/15 rounded-3xl p-6 shadow-sm flex flex-col">
            <div className="pb-4 border-b border-purple-500/10">
              <h3 className="text-base font-bold text-midnight">Recent Activity</h3>
              <p className="text-xs text-midnight/50">Live trainee actions</p>
            </div>
            <div className="py-2 space-y-1 flex-1">
              {activities.map((act, i) => (
                <ActivityItem key={i} {...act} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Recent Submissions */}
        <motion.div variants={fadeUp} className="bg-white border border-purple-500/15 rounded-3xl p-6 shadow-sm overflow-hidden">
          <div className="pb-4 border-b border-purple-500/10 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-midnight">Recent Trainee Submissions</h3>
              <p className="text-xs text-midnight/50">Assessments and assignments pending review</p>
            </div>
            <button className="text-xs font-bold text-purple-600 hover:text-pink-600 transition-colors flex items-center gap-1 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200/60">
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto mt-2">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-purple-500/10 text-left text-xs text-midnight/60 font-semibold">
                  <th className="px-4 py-3">Trainee</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-500/5">
                {recentSubmissions.map((s, i) => (
                  <tr key={i} className="hover:bg-purple-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {s.name.charAt(0)}
                        </div>
                        <span className="text-xs sm:text-sm font-bold text-midnight truncate">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-midnight/70 truncate">{s.course}</td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-midnight/70">{s.module}</td>
                    <td className="px-4 py-3 text-xs text-midnight/50 text-right">{s.time}</td>
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
  const { profile } = useAuth()
  const [users, setUsers] = useState<Profile[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'trainees' | 'trainers' | 'admins' | 'courses' | 'logs'>('trainees')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [{ data: u }, { data: l }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }),
      ])
      if (u) setUsers(u)
      if (l) setLogs(l)
    } catch (e) {
      console.error(e)
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

    if (!searchQuery) return filtered
    const q = searchQuery.toLowerCase()
    return filtered.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q)
    )
  }, [users, searchQuery, activeTab])

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
    } catch (e) {
      toast.error('Failed to update user. Check Supabase connection.')
      console.error(e)
    }
  }

  const handleRejectUser = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId)
      if (user?.proof_path) {
        await supabase.storage.from('proofs').remove([user.proof_path])
      }

      const { error } = await supabase.rpc('admin_delete_user', {
        target_user_id: userId,
      })
      if (error) throw error
      
      toast.success('User rejected and application deleted.')
      fetchData()
    } catch (e) {
      toast.error('Failed to reject user. Check Supabase connection.')
      console.error(e)
    }
  }

  const handleViewProof = async (proofPath: string) => {
    try {
      const { data, error } = await supabase.storage.from('proofs').createSignedUrl(proofPath, 60)
      if (error) throw error
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (e) {
      console.error('Error viewing proof:', e)
      toast.error('Failed to open proof document')
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

  const tabs = [
    { key: 'trainees', label: 'Trainees', icon: Users },
    { key: 'trainers', label: 'Trainers', icon: Users },
    { key: 'admins', label: 'Admins', icon: Shield },
    { key: 'courses', label: 'Courses', icon: BookOpen },
    { key: 'logs', label: 'Audit Logs', icon: BarChart3 },
  ] as const

  const isSuperAdmin = profile?.role === 'super_admin'
  const pendingCount = users.filter(u => u.approval_status === 'pending').length

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
    { icon: Shield, title: 'Role Updated', desc: 'Priya Singh — Trainee → Trainer', time: '1d ago', iconBg: 'bg-purple-100 text-purple-700' },
  ]

  return (
    <DashboardShell
      title="Admin Dashboard"
      icon={Shield}
      navLinks={[
        { to: '/admin', label: 'Overview', icon: BarChart3, badge: pendingCount },
      ]}
    >
      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6 max-w-6xl">
        {/* Welcome Banner */}
        <motion.div 
          variants={fadeUp} 
          className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-900 via-purple-800 to-midnight text-white overflow-hidden shadow-xl shadow-purple-900/20 border border-purple-500/20"
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-pink-500/20 to-orange-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-orange-300 text-xs font-semibold mb-3 border border-white/15">
                <Shield className="w-3.5 h-3.5" />
                <span>Administration & Governance</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
                Administrator Control Center
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
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tabs + Content */}
          <motion.div variants={fadeUp} className="lg:col-span-2 space-y-4">
            {/* Tabs Bar */}
            <div className="flex items-center gap-1.5 p-1.5 bg-white border border-purple-500/15 rounded-2xl shadow-sm w-full md:w-fit overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white shadow-md shadow-pink-500/25 scale-[1.02]'
                      : 'text-midnight/70 hover:text-purple-700 hover:bg-purple-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.key === 'trainees' && pendingCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-orange-500 text-white rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab: Users */}
            <AnimatePresence mode="wait">
              {['trainees', 'trainers', 'admins'].includes(activeTab) && (
                <motion.div
                  key={activeTab}
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="bg-white border border-purple-500/15 rounded-3xl p-6 shadow-sm overflow-hidden"
                >
                  <div className="pb-4 border-b border-purple-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-midnight capitalize">{activeTab} Management</h3>
                      <p className="text-xs text-midnight/50 mt-0.5">Approve, reject, promote, or suspend user accounts.</p>
                    </div>
                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 text-purple-600/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-purple-50/50 border border-purple-200 rounded-xl text-midnight placeholder:text-midnight/40 focus:outline-none focus:border-pink-500 focus:bg-white transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {loading ? (
                    <div className="p-8 text-center text-midnight/50 text-sm">Loading users...</div>
                  ) : (
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full min-w-[620px]">
                        <thead>
                          <tr className="border-b border-purple-500/10 text-left text-xs text-midnight/60 font-semibold">
                            <th className="px-3 py-3">Name</th>
                            <th className="px-3 py-3">Email</th>
                            <th className="px-3 py-3">Department</th>
                            <th className="px-3 py-3">Role</th>
                            <th className="px-3 py-3">Proof</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-500/5">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-8 text-midnight/50 text-sm">
                                {searchQuery ? 'No users match your search.' : 'No users found.'}
                              </td>
                            </tr>
                          ) : filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-purple-50/40 transition-colors">
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                                  </div>
                                  <span className="text-xs sm:text-sm font-bold text-midnight truncate max-w-[130px]">{u.full_name}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-xs text-midnight/70 truncate max-w-[150px]">{u.email}</td>
                              <td className="px-3 py-3 text-xs text-midnight/70 truncate max-w-[90px]">{u.department ?? '—'}</td>
                              <td className="px-3 py-3">
                                <span className="text-[11px] font-semibold capitalize text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                                  {u.role}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                {u.proof_path ? (
                                  <button onClick={() => handleViewProof(u.proof_path!)} className="text-xs px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 font-bold transition-all">
                                    View
                                  </button>
                                ) : (
                                  <span className="text-xs text-midnight/40">—</span>
                                )}
                              </td>
                              <td className="px-3 py-3"><StatusBadge status={u.approval_status} /></td>
                              <td className="px-3 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {u.approval_status === 'pending' && (
                                    <>
                                      <button 
                                        onClick={() => handleUpdateUser(u.id, u.email, u.role, 'approved')} 
                                        className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold transition-all"
                                      >
                                        Approve
                                      </button>
                                      <button 
                                        onClick={() => handleRejectUser(u.id)} 
                                        className="text-xs px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 font-bold transition-all"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  {u.role === 'trainee' && u.approval_status === 'approved' && (
                                    <button 
                                      onClick={() => handleUpdateUser(u.id, u.email, 'trainer', 'approved')} 
                                      className="text-xs px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 font-bold transition-all"
                                    >
                                      → Trainer
                                    </button>
                                  )}
                                  {u.approval_status === 'approved' && (
                                    <button 
                                      onClick={() => handleUpdateUser(u.id, u.email, u.role, 'suspended')} 
                                      className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-bold transition-all"
                                    >
                                      Suspend
                                    </button>
                                  )}
                                  {isSuperAdmin && u.approval_status === 'approved' && u.role !== 'admin' && u.role !== 'super_admin' && (
                                    <button 
                                      onClick={() => handlePromoteToAdmin(u.id)} 
                                      className="text-xs px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold hover:opacity-90 transition-all shadow-sm"
                                    >
                                      Promote
                                    </button>
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

              {/* Tab: Audit Logs */}
              {activeTab === 'logs' && (
                <motion.div key="logs" variants={scaleIn} initial="hidden" animate="visible" exit="hidden" className="bg-white border border-purple-500/15 rounded-3xl p-6 shadow-sm overflow-hidden">
                  <div className="pb-4 border-b border-purple-500/10">
                    <h3 className="text-base font-bold text-midnight">Audit Logs</h3>
                    <p className="text-xs text-midnight/50 mt-0.5">Complete platform activity and compliance record.</p>
                  </div>
                  {loading ? (
                    <div className="p-8 text-center text-midnight/50 text-sm">Loading logs...</div>
                  ) : (
                    <div className="overflow-x-auto mt-2">
                      <table className="w-full min-w-[500px]">
                        <thead>
                          <tr className="border-b border-purple-500/10 text-left text-xs text-midnight/60 font-semibold">
                            <th className="px-4 py-3">Time</th>
                            <th className="px-4 py-3">Actor</th>
                            <th className="px-4 py-3">Action</th>
                            <th className="px-4 py-3">Entity</th>
                            <th className="px-4 py-3">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-500/5">
                          {logs.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-8 text-midnight/50 text-sm">No audit logs found.</td></tr>
                          ) : logs.map(log => (
                            <tr key={log.id} className="hover:bg-purple-50/40 transition-colors">
                              <td className="px-4 py-3 text-xs text-midnight/60 whitespace-nowrap">{new Date(log.created_at || '').toLocaleString()}</td>
                              <td className="px-4 py-3 text-xs font-mono text-purple-700">{log.actor_id?.slice(0, 8)}…</td>
                              <td className="px-4 py-3 text-xs text-midnight font-bold">{log.action}</td>
                              <td className="px-4 py-3 text-xs text-midnight/70">{log.entity_type}</td>
                              <td className="px-4 py-3 text-xs font-mono text-midnight/60 max-w-xs truncate">{JSON.stringify(log.metadata)}</td>
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
          <motion.div variants={fadeUp} className="bg-white border border-purple-500/15 rounded-3xl p-6 shadow-sm flex flex-col">
            <div className="pb-4 border-b border-purple-500/10">
              <h3 className="text-base font-bold text-midnight">System Activity</h3>
              <p className="text-xs text-midnight/50">Live audit events</p>
            </div>
            <div className="py-2 space-y-1 flex-1">
              {activities.map((act, i) => (
                <ActivityItem key={i} {...act} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Users, title: 'Manage Users', desc: 'Approve, suspend, or promote accounts', to: '/admin', gradient: 'from-purple-600 to-purple-800' },
            { icon: Shield, title: 'System Governance', desc: 'Configure platform access & policies', to: '/admin', gradient: 'from-pink-500 to-rose-600' },
            { icon: BarChart3, title: 'Platform Analytics', desc: 'Usage metrics, completions & trends', to: '/admin', gradient: 'from-orange-400 to-orange-600' },
          ].map(action => (
            <Link key={action.title} to={action.to}>
              <div className="p-5 rounded-3xl bg-white border border-purple-500/15 hover:border-pink-500/30 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 group cursor-pointer flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.gradient} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-midnight group-hover:text-purple-700 transition-colors">{action.title}</h4>
                    <p className="text-xs text-midnight/55">{action.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-midnight/30 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </motion.div>
      </motion.div>
    </DashboardShell>
  )
}
