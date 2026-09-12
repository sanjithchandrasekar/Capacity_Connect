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
    admin: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    super_admin: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    trainer: 'bg-wheat/10 text-wheat border-wheat/20',
    trainee: 'bg-wheat/10 text-wheat border-wheat/20',
  }
  const statusColor: Record<string, string> = {
    approved: 'bg-green-500/20 text-green-300 border-green-500/30',
    pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    suspended: 'bg-red-500/20 text-red-300 border-red-500/30',
    rejected: 'bg-red-500/20 text-red-300 border-red-500/30',
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-wheat/10">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-wheat to-wheat/70 flex items-center justify-center shadow-[0_0_15px_rgba(230,207,167,0.2)] shrink-0">
            <Globe className="w-4 h-4 text-wheat" />
          </div>
          {(!sidebarCollapsed || mobileOpen) && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm font-bold whitespace-nowrap"
            >
              <span className="text-wheat">Capacity</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-wheat to-wheat/70"> Connect</span>
            </motion.span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navLinks?.map(link => {
          const isActive = location.pathname === link.to
          return (
            <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}>
              <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm group ${
                isActive
                  ? 'bg-wheat/10 text-wheat border border-wheat/20'
                  : 'text-wheat/70 hover:text-wheat hover:bg-wheat/10 border border-transparent'
              }`}>
                <link.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-wheat' : 'group-hover:text-wheat'} transition-colors`} />
                {(!sidebarCollapsed || mobileOpen) && (
                  <>
                    <span className="flex-1 text-left">{link.label}</span>
                    {link.badge !== undefined && link.badge > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-wheat rounded-full">
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

      {/* Quick actions */}
      {(!sidebarCollapsed || mobileOpen) && (
        <div className="px-3 pb-2">
          <div className="p-3 rounded-xl bg-wheat/10 border border-wheat/20">
            <p className="text-xs font-medium text-wheat mb-1">Quick Help</p>
            <p className="text-[11px] text-wheat/70 leading-relaxed">
              Press <kbd className="px-1 py-0.5 bg-white/10 rounded text-[10px]">⌘K</kbd> for search
            </p>
          </div>
        </div>
      )}

      {/* User footer */}
      <div className="p-3 border-t border-wheat/10 space-y-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-wheat/10 transition-all cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-wheat to-wheat/70 flex items-center justify-center text-wheat text-xs font-bold shrink-0 ring-2 ring-cyan-500/30">
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          {(!sidebarCollapsed || mobileOpen) && (
            <div className="min-w-0 flex-1">
              <p className="text-sm text-wheat font-medium truncate">{profile?.full_name}</p>
              <p className="text-xs text-wheat0 truncate">{profile?.email}</p>
            </div>
          )}
          {(!sidebarCollapsed || mobileOpen) && <ChevronDown className="w-4 h-4 text-wheat0 group-hover:text-wheat/70 transition-colors" />}
        </div>
        {(!sidebarCollapsed || mobileOpen) && (
          <div className="flex items-center gap-2 px-3 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${roleColor[profile?.role ?? ''] ?? 'bg-slate-700 text-wheat/70'}`}>
              {profile?.role}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${statusColor[profile?.approval_status ?? ''] ?? 'bg-slate-700 text-wheat/70'}`}>
              {profile?.approval_status}
            </span>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-wheat0 hover:text-red-400 hover:bg-red-500/8 transition-all text-sm"
        >
          <LogOut className="w-4 h-4" />
          {(!sidebarCollapsed || mobileOpen) && <span>Sign Out</span>}
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-feldgrau text-wheat flex">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-cyan-600/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-blue-600/5 blur-[120px]" />
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-wheat/10 bg-feldgrau-dark backdrop-blur-2xl flex flex-col transition-transform duration-300 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4 z-10">
          <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-wheat/10 text-wheat/70 hover:text-wheat transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={`relative z-20 hidden md:flex ${sidebarCollapsed ? 'w-[72px]' : 'w-64'} border-r border-wheat/10 bg-feldgrau-dark backdrop-blur-2xl flex-col shrink-0 h-screen sticky top-0 transition-all duration-300`}>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Topbar */}
        <header className="h-14 md:h-16 border-b border-wheat/10 bg-feldgrau backdrop-blur-2xl sticky top-0 z-10 flex items-center px-4 md:px-6 gap-3">
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileOpen(true)
              } else {
                setSidebarCollapsed(!sidebarCollapsed)
              }
            }}
            className="p-2 rounded-lg hover:bg-wheat/10 text-wheat/70 hover:text-wheat transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 md:w-5 md:h-5 text-wheat" />
            <h1 className="text-sm md:text-base font-semibold text-wheat truncate">{title}</h1>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1 md:gap-2">
            <button className="relative p-2 rounded-lg hover:bg-wheat/10 text-wheat/70 hover:text-wheat transition-all">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button className="p-2 rounded-lg hover:bg-wheat/10 text-wheat/70 hover:text-wheat transition-all">
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
    approved: { color: 'bg-green-500/20 text-green-300 border-green-500/30', icon: CheckCircle },
    pending: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: Clock },
    rejected: { color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: XCircle },
    suspended: { color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: Ban },
  }
  const c = config[status] ?? { color: 'bg-slate-700 text-wheat/70', icon: Clock }
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border capitalize font-medium ${c.color}`}>
      <c.icon className="w-3 h-3" />
      {status}
    </span>
  )
}

/* ─── Stat Card ─────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <motion.div variants={fadeUp} className={`group relative p-5 rounded-2xl border bg-gradient-to-br ${color} backdrop-blur-sm hover:scale-[1.02] transition-all duration-300 cursor-default overflow-hidden`}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-white/[0.02] to-transparent transition-opacity" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icon className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
          </div>
        </div>
        <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
        <div className="text-xs text-slate-400">{label}</div>
      </div>
    </motion.div>
  )
}

/* ─── Activity Item ─────────────────────────────────────────── */
function ActivityItem({ icon: Icon, title, desc, time, color }: { icon: React.ElementType; title: string; desc: string; time: string; color: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{desc}</p>
      </div>
      <span className="text-[11px] text-slate-500 whitespace-nowrap">{time}</span>
    </div>
  )
}

/* ─── Progress Bar ──────────────────────────────────────────── */
function ProgressBar({ value, max = 100, color = 'from-cyan-500 to-blue-500' }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(Math.round((value / max) * 100), 100)
  return (
    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        className={`h-full bg-gradient-to-r ${color} rounded-full`}
      />
    </div>
  )
}

/* ─── Trainee Dashboard ─────────────────────────────────────── */
export function TraineeDashboard() {
  const { profile } = useAuth()

  const stats = [
    { label: 'Enrolled Courses', value: '3', icon: BookOpen, color: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20' },
    { label: 'Hours Learned', value: '48', icon: Clock, color: 'from-blue-500/10 to-blue-500/5 border-blue-500/20' },
    { label: 'Certificates', value: '2', icon: Award, color: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20' },
    { label: 'Completion Rate', value: '78%', icon: Target, color: 'from-violet-500/10 to-violet-500/5 border-violet-500/20' },
  ]

  const recentCourses = [
    { title: 'Data Science Fundamentals', progress: 72, status: 'In Progress', instructor: 'Dr. Sharma' },
    { title: 'Python for Analytics', progress: 45, status: 'In Progress', instructor: 'Prof. Kumar' },
    { title: 'Cloud Computing Basics', progress: 100, status: 'Completed', instructor: 'Ms. Patel' },
  ]

  const activities = [
    { icon: CheckCircle, title: 'Completed Module 5', desc: 'Data Science Fundamentals — Statistics', time: '2h ago', color: 'bg-green-500/10 text-green-400' },
    { icon: Award, title: 'Certificate Earned', desc: 'Cloud Computing Basics — Final Exam Passed', time: '1d ago', color: 'bg-yellow-500/10 text-yellow-400' },
    { icon: BookOpen, title: 'Started New Course', desc: 'Python for Analytics — Introduction', time: '2d ago', color: 'bg-blue-500/10 text-wheat' },
    { icon: Star, title: 'Quiz Score: 92%', desc: 'Data Science Fundamentals — Module 4 Quiz', time: '3d ago', color: 'bg-violet-500/10 text-violet-400' },
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
        {/* Welcome Banner */}
        <motion.div variants={fadeUp} className="relative p-6 rounded-2xl bg-wheat/10 border border-wheat/20 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[60px]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-wheat mb-1">
                Welcome back, {profile?.full_name?.split(' ')[0] ?? 'Trainee'}!
              </h2>
              <p className="text-wheat/70 text-sm">Continue your learning journey. You've made great progress this week!</p>
            </div>
            <Link to="/trainee/courses" className="shrink-0">
              <Button className="w-full sm:w-auto bg-wheat/10 text-wheat border border-wheat/20 hover:bg-wheat/20 transition-all">
                <Compass className="w-4 h-4 mr-2" />
                Browse Courses
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Course Progress */}
          <motion.div variants={fadeUp} className="lg:col-span-2 bg-wheat/5 border border-wheat/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-wheat/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-wheat">Course Progress</h3>
              <Link to="/trainee/my-learning" className="text-xs text-wheat hover:text-wheat transition-colors flex items-center gap-1">
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-4 space-y-3">
              {recentCourses.map(course => (
                <div key={course.title} className="p-4 rounded-xl bg-wheat/5 border border-white/[0.04] hover:bg-white/[0.04] transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-wheat font-medium">{course.title}</p>
                      <p className="text-xs text-wheat0">{course.instructor}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      course.status === 'Completed' ? 'bg-green-500/15 text-green-400' : 'bg-blue-500/15 text-wheat'
                    }`}>
                      {course.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <ProgressBar value={course.progress} color={course.progress === 100 ? 'from-green-500 to-emerald-500' : 'from-cyan-500 to-blue-500'} />
                    <span className="text-xs text-wheat/70 font-medium w-10 text-right">{course.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={fadeUp} className="bg-wheat/5 border border-wheat/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-wheat/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-wheat">Recent Activity</h3>
              <button className="p-1 rounded hover:bg-wheat/10 transition-colors">
                <RefreshCw className="w-3.5 h-3.5 text-wheat/70" />
              </button>
            </div>
            <div className="p-2">
              {activities.map((act, i) => (
                <ActivityItem key={i} {...act} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Compass, title: 'Explore Catalog', desc: 'Discover new courses', to: '/trainee/courses', color: 'from-cyan-500/10 to-cyan-500/5 border-wheat/20 hover:border-wheat/20' },
            { icon: BookOpen, title: 'My Learning', desc: 'Continue where you left off', to: '/trainee/my-learning', color: 'from-blue-500/10 to-blue-500/5 border-wheat/20 hover:border-wheat/20' },
            { icon: Award, title: 'Certificates', desc: 'View your achievements', to: '/trainee/my-learning', color: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/40' },
          ].map(action => (
            <Link key={action.title} to={action.to}>
              <div className={`p-5 rounded-2xl bg-gradient-to-br ${action.color} border backdrop-blur-sm hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer`}>
                <action.icon className="w-6 h-6 text-wheat mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="text-sm font-semibold text-wheat mb-1">{action.title}</h4>
                <p className="text-xs text-wheat/70">{action.desc}</p>
              </div>
            </Link>
          ))}
        </motion.div>

        {/* Profile card */}
        <motion.div variants={fadeUp} className="bg-wheat/5 border border-wheat/10 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-wheat/70 uppercase tracking-wider mb-4">Your Profile</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Full Name', value: profile?.full_name },
              { label: 'Email', value: profile?.email },
              { label: 'Department', value: profile?.department ?? '—' },
              { label: 'Designation', value: profile?.designation ?? '—' },
            ].map(item => (
              <div key={item.label}>
                <p className="text-xs text-wheat0 mb-1">{item.label}</p>
                <p className="text-sm text-wheat font-medium truncate">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-wheat/10 flex items-center gap-3">
            <StatusBadge status={profile?.approval_status ?? 'pending'} />
            <span className="text-xs text-wheat0 capitalize">Role: {profile?.role}</span>
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
    { label: 'Active Courses', value: '8', icon: BookOpen, color: 'from-blue-500/10 to-blue-500/5 border-blue-500/20' },
    { label: 'Total Trainees', value: '156', icon: Users, color: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20' },
    { label: 'Avg. Completion', value: '82%', icon: BarChart3, color: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20' },
    { label: 'Avg. Rating', value: '4.7', icon: Star, color: 'from-violet-500/10 to-violet-500/5 border-violet-500/20' },
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
    { icon: FileText, title: 'New Submission', desc: 'Amit Kumar — Module 6 Quiz (94%)', time: '1h ago', color: 'bg-green-500/10 text-green-400' },
    { icon: Users, title: '5 New Enrollments', desc: 'Data Science Fundamentals', time: '3h ago', color: 'bg-blue-500/10 text-wheat' },
    { icon: MessageSquare, title: 'New Question', desc: 'Python for Analytics — Forum Post', time: '6h ago', color: 'bg-yellow-500/10 text-yellow-400' },
    { icon: Star, title: '5-Star Review', desc: 'Cloud Computing Basics — Rating', time: '1d ago', color: 'bg-violet-500/10 text-violet-400' },
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
        <motion.div variants={fadeUp} className="relative p-6 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-wheat/20 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[60px]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-wheat mb-1">
                Welcome, {profile?.full_name?.split(' ')[0] ?? 'Trainer'}!
              </h2>
              <p className="text-wheat/70 text-sm">Manage your courses and track trainee progress. 3 new submissions today!</p>
            </div>
            <Link to="/trainer/courses" className="shrink-0">
              <Button className="w-full sm:w-auto bg-wheat/10 text-wheat border border-wheat/20 hover:bg-wheat/20 transition-all">
                <BookOpen className="w-4 h-4 mr-2" />
                Manage Courses
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Courses */}
          <motion.div variants={fadeUp} className="lg:col-span-2 bg-wheat/5 border border-wheat/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-wheat/10 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-wheat">Top Courses</h3>
              <Link to="/trainer/courses" className="text-xs text-wheat hover:text-wheat transition-colors flex items-center gap-1">
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="p-4 space-y-3">
              {topCourses.map(course => (
                <div key={course.title} className="p-4 rounded-xl bg-wheat/5 border border-white/[0.04] hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-wheat font-medium">{course.title}</p>
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Star className="w-3.5 h-3.5 fill-yellow-400" />
                      <span className="text-xs font-medium">{course.rating}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
                    <div>
                      <p className="text-lg font-bold text-wheat">{course.trainees}</p>
                      <p className="text-[11px] text-wheat0">Trainees</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-wheat">{course.completion}%</p>
                      <p className="text-[11px] text-wheat0">Completion</p>
                    </div>
                    <div>
                      <ProgressBar value={course.completion} color="from-blue-500 to-indigo-500" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={fadeUp} className="bg-wheat/5 border border-wheat/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-wheat/10">
              <h3 className="text-sm font-semibold text-wheat">Recent Activity</h3>
            </div>
            <div className="p-2">
              {activities.map((act, i) => (
                <ActivityItem key={i} {...act} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Recent Submissions */}
        <motion.div variants={fadeUp} className="bg-wheat/5 border border-wheat/10 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-wheat/10 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-wheat">Recent Submissions</h3>
            <button className="text-xs text-wheat hover:text-wheat transition-colors flex items-center gap-1">
              View All <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-wheat/10">
                  {['Trainee', 'Course', 'Module', 'Time'].map(h => (
                    <th key={h} className="text-left text-xs text-wheat0 font-medium px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {recentSubmissions.map((s, i) => (
                  <tr key={i} className="hover:bg-wheat/5 transition-colors">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-wheat text-[10px] font-bold">
                          {s.name.charAt(0)}
                        </div>
                        <span className="text-sm text-wheat">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-sm text-wheat/70">{s.course}</td>
                    <td className="px-6 py-3 text-sm text-wheat/70">{s.module}</td>
                    <td className="px-6 py-3 text-xs text-wheat0">{s.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: BookOpen, title: 'Create Course', desc: 'Start building new content', to: '/trainer/courses', color: 'from-blue-500/10 to-blue-500/5 border-wheat/20 hover:border-wheat/20' },
            { icon: Users, title: 'View Trainees', desc: 'Track engagement & progress', to: '/trainer/courses', color: 'from-cyan-500/10 to-cyan-500/5 border-wheat/20 hover:border-wheat/20' },
            { icon: BarChart3, title: 'Analytics', desc: 'Course performance insights', to: '/trainer/courses', color: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/40' },
          ].map(action => (
            <Link key={action.title} to={action.to}>
              <div className={`p-5 rounded-2xl bg-gradient-to-br ${action.color} border backdrop-blur-sm hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer`}>
                <action.icon className="w-6 h-6 text-wheat mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="text-sm font-semibold text-wheat mb-1">{action.title}</h4>
                <p className="text-xs text-wheat/70">{action.desc}</p>
              </div>
            </Link>
          ))}
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
  const [activeTab, setActiveTab] = useState<'users' | 'courses' | 'logs' | 'staff'>('users')
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
    if (!searchQuery) return users
    const q = searchQuery.toLowerCase()
    return users.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.department?.toLowerCase().includes(q)
    )
  }, [users, searchQuery])

  const handleUpdateUser = async (userId: string, role: Profile['role'], status: Profile['approval_status']) => {
    try {
      const { error } = await supabase.rpc('admin_update_user', {
        target_user_id: userId,
        new_role: role,
        new_status: status,
      })
      if (error) throw error
      toast.success('User updated successfully')
      fetchData()
    } catch (e) {
      toast.error('Failed to update user. Check Supabase connection.')
      console.error(e)
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
    { key: 'users', label: 'Users', icon: Users },
    { key: 'staff', label: 'Staff', icon: Shield },
    { key: 'courses', label: 'Courses', icon: BookOpen },
    { key: 'logs', label: 'Audit Logs', icon: BarChart3 },
  ] as const

  const isSuperAdmin = profile?.role === 'super_admin'
  const staffUsers = useMemo(() => users.filter(u => u.role === 'admin' || u.role === 'super_admin'), [users])
  const adminCount = staffUsers.filter(u => u.role === 'admin').length
  const superAdminCount = staffUsers.filter(u => u.role === 'super_admin').length

  const pendingCount = users.filter(u => u.approval_status === 'pending').length
  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, color: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20' },
    { label: 'Pending Approval', value: pendingCount, icon: Clock, color: 'from-yellow-500/10 to-yellow-500/5 border-yellow-500/20' },
    { label: 'Approved', value: users.filter(u => u.approval_status === 'approved').length, icon: CheckCircle, color: 'from-green-500/10 to-green-500/5 border-green-500/20' },
    { label: 'Audit Logs', value: logs.length, icon: BarChart3, color: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20' },
  ]

  const activities = [
    { icon: Users, title: 'New Registration', desc: 'user@example.com registered as Trainee', time: '30m ago', color: 'bg-blue-500/10 text-wheat' },
    { icon: CheckCircle, title: 'User Approved', desc: 'Amit Kumar — Trainer role', time: '2h ago', color: 'bg-green-500/10 text-green-400' },
    { icon: Ban, title: 'User Suspended', desc: 'Inactive account — 90 days', time: '5h ago', color: 'bg-red-500/10 text-red-400' },
    { icon: Shield, title: 'Role Updated', desc: 'Priya Singh — Trainee → Trainer', time: '1d ago', color: 'bg-violet-500/10 text-violet-400' },
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
        <motion.div variants={fadeUp} className="relative p-6 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[60px]" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-wheat mb-1">
                Admin Panel
              </h2>
              <p className="text-wheat/70 text-sm">
                {pendingCount > 0
                  ? `${pendingCount} user(s) pending approval.`
                  : 'All users are approved. System running smoothly.'}
              </p>
            </div>
            {pendingCount > 0 && (
              <Button onClick={() => setActiveTab('users')} className="w-full sm:w-auto bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30 transition-all">
                <Clock className="w-4 h-4 mr-2" />
                Review Pending
              </Button>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tabs + Content */}
          <motion.div variants={fadeUp} className="lg:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-wheat/5 border border-wheat/10 rounded-xl w-full md:w-fit overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-wheat to-wheat/70 text-wheat shadow-sm'
                      : 'text-wheat/70 hover:text-wheat hover:bg-wheat/10'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.key === 'users' && pendingCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-wheat rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab: Users */}
            <AnimatePresence mode="wait">
              {activeTab === 'users' && (
                <motion.div
                  key="users"
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="bg-wheat/5 border border-wheat/10 rounded-2xl overflow-hidden"
                >
                  <div className="px-4 md:px-6 py-4 border-b border-wheat/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-wheat">User Management</h3>
                      <p className="text-xs text-wheat0 mt-0.5">Approve, reject, promote, or suspend users.</p>
                    </div>
                    <div className="relative w-full sm:w-56">
                      <Search className="w-4 h-4 text-wheat0 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-wheat/5 border border-wheat/10 rounded-lg text-wheat placeholder:text-wheat0 focus:outline-none focus:border-wheat/20 transition-colors"
                      />
                    </div>
                  </div>
                  {loading ? (
                    <div className="p-8 text-center text-wheat0 text-sm">Loading users...</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-wheat/10">
                            {['Name', 'Email', 'Department', 'Role', 'Status', 'Actions'].map(h => (
                              <th key={h} className="text-left text-xs text-wheat0 font-medium px-6 py-3">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {filteredUsers.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-8 text-wheat0 text-sm">
                              {searchQuery ? 'No users match your search.' : 'No users found.'}
                            </td></tr>
                          ) : filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-wheat/5 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-wheat to-wheat/70 flex items-center justify-center text-wheat text-xs font-bold shrink-0 ring-2 ring-white/5 group-hover:ring-cyan-500/30 transition-all">
                                    {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                                  </div>
                                  <span className="text-sm text-wheat font-medium">{u.full_name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-wheat/70">{u.email}</td>
                              <td className="px-6 py-4 text-sm text-wheat/70">{u.department ?? '—'}</td>
                              <td className="px-6 py-4">
                                <span className="text-xs capitalize text-slate-300 bg-white/8 px-2.5 py-1 rounded-lg">{u.role}</span>
                              </td>
                              <td className="px-6 py-4"><StatusBadge status={u.approval_status} /></td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {u.approval_status === 'pending' && (
                                    <>
                                      <button onClick={() => handleUpdateUser(u.id, u.role, 'approved')} className="text-xs px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/25 transition-all font-medium">
                                        Approve
                                      </button>
                                      <button onClick={() => handleUpdateUser(u.id, u.role, 'rejected')} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-all font-medium">
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  {u.role === 'trainee' && u.approval_status === 'approved' && (
                                    <button onClick={() => handleUpdateUser(u.id, 'trainer', 'approved')} className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/15 text-wheat border border-wheat/20 hover:bg-blue-500/25 transition-all font-medium">
                                      → Trainer
                                    </button>
                                  )}
                                  {u.approval_status === 'approved' && (
                                    <button onClick={() => handleUpdateUser(u.id, u.role, 'suspended')} className="text-xs px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 transition-all font-medium">
                                      Suspend
                                    </button>
                                  )}
                                  {isSuperAdmin && u.approval_status === 'approved' && u.role !== 'admin' && u.role !== 'super_admin' && (
                                    <button onClick={() => handlePromoteToAdmin(u.id)} className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/15 text-violet-400 border border-violet-500/25 hover:bg-violet-500/25 transition-all font-medium">
                                      Promote Admin
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
                <motion.div
                  key="courses"
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <AdminCourses />
                </motion.div>
              )}

              {/* Tab: Staff Management (Super Admin only) */}
              {activeTab === 'staff' && (
                <motion.div
                  key="staff"
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="bg-wheat/5 border border-wheat/10 rounded-2xl overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-wheat/10 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-wheat flex items-center gap-2">
                        <Shield className="w-4 h-4 text-violet-400" />
                        Staff Management
                        {isSuperAdmin && (
                          <span className="text-[10px] px-2 py-0.5 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full font-medium">
                            Super Admin
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-wheat0 mt-0.5">
                        {isSuperAdmin
                          ? 'View all admins and super admins. Promote approved users to Admin.'
                          : 'View admin staff. Only Super Admins can promote new admins.'}
                      </p>
                    </div>
                  </div>

                  {loading ? (
                    <div className="p-8 text-center text-wheat0 text-sm">Loading staff...</div>
                  ) : (
                    <>
                      {/* Staff summary cards */}
                      <div className="grid grid-cols-2 gap-4 p-6 border-b border-wheat/10">
                        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                          <div className="text-2xl font-bold text-wheat">{adminCount}</div>
                          <div className="text-xs text-indigo-400 mt-1">Admins</div>
                        </div>
                        <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                          <div className="text-2xl font-bold text-wheat">{superAdminCount}</div>
                          <div className="text-xs text-violet-400 mt-1">Super Admins</div>
                        </div>
                      </div>

                      {/* Admin table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-wheat/10">
                              {['Name', 'Email', 'Department', 'Role', 'Joined'].map(h => (
                                <th key={h} className="text-left text-xs text-wheat0 font-medium px-6 py-3">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {staffUsers.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="text-center py-8 text-wheat0 text-sm">No admin staff found.</td>
                              </tr>
                            ) : staffUsers.map(u => (
                              <tr key={u.id} className="hover:bg-wheat/5 transition-colors group">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-wheat text-xs font-bold shrink-0 ring-2 ring-white/5 group-hover:ring-violet-500/30 transition-all ${
                                      u.role === 'super_admin'
                                        ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                                        : 'bg-gradient-to-br from-indigo-500 to-blue-600'
                                    }`}>
                                      {u.role === 'super_admin' ? <Crown className="w-4 h-4" /> : u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                                    </div>
                                    <span className="text-sm text-wheat font-medium">{u.full_name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-wheat/70">{u.email}</td>
                                <td className="px-6 py-4 text-sm text-wheat/70">{u.department ?? '—'}</td>
                                <td className="px-6 py-4">
                                  <span className={`text-xs capitalize px-2.5 py-1 rounded-lg font-medium border ${
                                    u.role === 'super_admin'
                                      ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                                  }`}>
                                    {u.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-xs text-wheat0">
                                  {new Date(u.created_at || '').toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Promote section (Super Admin only) */}
                      {isSuperAdmin && (
                        <div className="p-6 border-t border-wheat/10">
                          <h4 className="text-sm font-semibold text-wheat mb-1">Promote User to Admin</h4>
                          <p className="text-xs text-wheat0 mb-4">
                            Select an approved, non-admin user to promote. They must first register via the /register page.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {users
                              .filter(u => u.approval_status === 'approved' && u.role !== 'admin' && u.role !== 'super_admin')
                              .map(u => (
                                <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-wheat/5 border border-wheat/10 hover:border-violet-500/30 transition-all group">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-wheat to-wheat/70 flex items-center justify-center text-wheat text-xs font-bold shrink-0">
                                      {u.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm text-wheat font-medium truncate">{u.full_name}</p>
                                      <p className="text-[11px] text-wheat0 capitalize">{u.role} — {u.department ?? 'No dept'}</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handlePromoteToAdmin(u.id)}
                                    className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/15 text-violet-400 border border-violet-500/25 hover:bg-violet-500/25 transition-all font-medium shrink-0 ml-3"
                                  >
                                    → Admin
                                  </button>
                                </div>
                              ))}
                            {users.filter(u => u.approval_status === 'approved' && u.role !== 'admin' && u.role !== 'super_admin').length === 0 && (
                              <p className="text-sm text-wheat0 col-span-full">No eligible users to promote.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {/* Tab: Audit Logs */}
              {activeTab === 'logs' && (
                <motion.div
                  key="logs"
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="bg-wheat/5 border border-wheat/10 rounded-2xl overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-wheat/10">
                    <h3 className="text-sm font-semibold text-wheat">Audit Logs</h3>
                    <p className="text-xs text-wheat0 mt-0.5">Complete activity history for compliance and tracking.</p>
                  </div>
                  {loading ? (
                    <div className="p-8 text-center text-wheat0 text-sm">Loading logs...</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-wheat/10">
                            {['Time', 'Actor', 'Action', 'Entity', 'Details'].map(h => (
                              <th key={h} className="text-left text-xs text-wheat0 font-medium px-6 py-3">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                          {logs.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-8 text-wheat0 text-sm">No audit logs found.</td></tr>
                          ) : logs.map(log => (
                            <tr key={log.id} className="hover:bg-wheat/5 transition-colors">
                              <td className="px-6 py-3 text-xs text-wheat0 whitespace-nowrap">{new Date(log.created_at || '').toLocaleString()}</td>
                              <td className="px-6 py-3 text-xs font-mono text-wheat/70">{log.actor_id?.slice(0, 8)}…</td>
                              <td className="px-6 py-3 text-xs text-wheat font-medium">{log.action}</td>
                              <td className="px-6 py-3 text-xs text-wheat/70">{log.entity_type}</td>
                              <td className="px-6 py-3 text-xs font-mono text-wheat0 max-w-xs truncate">{JSON.stringify(log.metadata)}</td>
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
          <motion.div variants={fadeUp} className="bg-wheat/5 border border-wheat/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-wheat/10">
              <h3 className="text-sm font-semibold text-wheat">Recent Activity</h3>
            </div>
            <div className="p-2">
              {activities.map((act, i) => (
                <ActivityItem key={i} {...act} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Users, title: 'Manage Users', desc: 'Approve, suspend, or promote', to: '/admin', color: 'from-cyan-500/10 to-cyan-500/5 border-wheat/20 hover:border-wheat/20' },
            { icon: Shield, title: 'System Settings', desc: 'Configure platform settings', to: '/admin', color: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/40' },
            { icon: BarChart3, title: 'Analytics', desc: 'Platform usage insights', to: '/admin', color: 'from-violet-500/10 to-violet-500/5 border-violet-500/20 hover:border-violet-500/40' },
          ].map(action => (
            <Link key={action.title} to={action.to}>
              <div className={`p-5 rounded-2xl bg-gradient-to-br ${action.color} border backdrop-blur-sm hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer`}>
                <action.icon className="w-6 h-6 text-indigo-400 mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="text-sm font-semibold text-wheat mb-1">{action.title}</h4>
                <p className="text-xs text-wheat/70">{action.desc}</p>
              </div>
            </Link>
          ))}
        </motion.div>
      </motion.div>
    </DashboardShell>
  )
}
