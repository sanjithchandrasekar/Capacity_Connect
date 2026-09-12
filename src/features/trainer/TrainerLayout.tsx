import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
  Globe, LogOut, BookOpen, BarChart3,
  Settings, Bell, Menu, X,
  Award, User, ChevronRight, GraduationCap, PlusCircle
} from 'lucide-react'

const navItems = [
  { to: '/trainer', label: 'Dashboard', icon: BarChart3, exact: true },
  { to: '/trainer/courses', label: 'My Courses', icon: BookOpen },
  { to: '/trainer/courses/new', label: 'Create Course', icon: PlusCircle },
  { to: '/trainer/skills', label: 'Skills & Expertise', icon: Award },
  { to: '/trainer/notifications', label: 'Notifications', icon: Bell },
  { to: '/trainer/profile', label: 'Profile', icon: User },
  { to: '/trainer/settings', label: 'Settings', icon: Settings },
]

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
export const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }

export function TrainerLayout({ children }: { children: React.ReactNode }) {
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState<number | null>(null)

  React.useEffect(() => {
    if (!profile?.id) return
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .is('read_at', null)
      .then(({ count }) => setUnreadCount(count ?? 0))
  }, [profile?.id])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (item: typeof navItems[0]) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to) && item.to !== '/trainer'

  const sidebarContent = (
    <>
      <div className="h-14 flex items-center px-4 border-b border-white/[0.06]">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(14,165,233,0.4)] shrink-0">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold whitespace-nowrap">
            <span className="text-white">Capacity</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500"> Connect</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = isActive(item)
          return (
            <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}>
              <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm group ${
                active
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}>
                <div className="relative">
                  <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-cyan-400' : 'group-hover:text-cyan-400'} transition-colors`} />
                  {item.label === 'Notifications' && unreadCount !== null && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
              </button>
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/[0.06] space-y-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-cyan-500/30">
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white font-medium truncate">{profile?.full_name}</p>
            <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3">
          <span className="text-xs px-2 py-0.5 rounded-full border bg-blue-500/20 text-blue-300 border-blue-500/30 capitalize">Trainer</span>
          <span className="text-xs px-2 py-0.5 rounded-full border bg-green-500/20 text-green-300 border-green-500/30 capitalize">{profile?.approval_status}</span>
        </div>
        <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/8 transition-all text-sm">
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[#050A15] text-slate-100 flex">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-cyan-600/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-blue-600/5 blur-[120px]" />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-white/[0.06] bg-[#0a0f1e] backdrop-blur-2xl flex flex-col transition-transform duration-300 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-3 right-3 z-10">
          <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      <aside className="relative z-20 hidden md:flex w-64 border-r border-white/[0.06] bg-[#0a0f1e]/80 backdrop-blur-2xl flex-col shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      <div className="flex-1 min-w-0">
        <header className="h-14 border-b border-white/[0.06] bg-[#050A15]/80 backdrop-blur-2xl sticky top-0 z-10 flex items-center px-4 md:px-6 gap-3">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all md:hidden">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-cyan-400" />
            <span className="text-sm font-semibold text-white">Trainer</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1 md:gap-2">
            <Link to="/trainer/notifications" className="relative p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all">
              <Bell className="w-4 h-4" />
              {unreadCount !== null && unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Link>
            <Link to="/trainer/settings" className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all">
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
