import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
  LogOut, BookOpen, BarChart3,
  Settings, Bell, Menu, X,
  User, ChevronRight, GraduationCap, PlusCircle
} from 'lucide-react'

const navItems = [
  { to: '/trainer', label: 'Dashboard', icon: BarChart3, exact: true },
  { to: '/trainer/courses', label: 'My Courses', icon: BookOpen },
  { to: '/trainer/courses/new', label: 'Create Course', icon: PlusCircle },
  { to: '/trainer/notifications', label: 'Notifications', icon: Bell },
  { to: '/trainer/profile', label: 'Profile', icon: User },
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

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return location.pathname === item.to
    if (item.to === '/trainer/courses') return location.pathname === '/trainer/courses'
    return location.pathname.startsWith(item.to) && item.to !== '/trainer'
  }

  const sidebarContent = (
    <>
      <div className="h-16 flex items-center px-5 border-b border-slate-800">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain shrink-0" />
          <span className="text-sm font-bold whitespace-nowrap">
            <span className="text-white">Capacity</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-400"> Connect</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map(item => {
          const active = isActive(item)
          return (
            <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}>
              <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium group ${
                active
                  ? 'bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 text-white shadow-md shadow-cyan-600/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}>
                <div className="relative">
                  <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-cyan-400'} transition-colors`} />
                  {item.label === 'Notifications' && unreadCount !== null && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
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

      <div className="p-3 border-t border-slate-800 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800/50 transition-all cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-cyan-500/20 overflow-hidden">
            {profile?.avatar_path ? (
              <img src={profile.avatar_path} alt={profile.full_name} className="w-full h-full object-cover" />
            ) : (
              profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-400 transition-colors">{profile?.full_name}</p>
            <p className="text-[11px] text-slate-400 truncate">{profile?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3">
          <span className="text-xs px-2 py-0.5 rounded-full border bg-orange-500/10 text-orange-400 border-orange-500/30 capitalize font-semibold">Trainer</span>
        </div>
        <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-sm font-medium">
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-800 bg-[#040814] text-white flex flex-col transition-transform duration-300 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4 z-10">
          <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      <aside className="relative z-20 hidden md:flex w-64 border-r border-slate-800 bg-[#040814] text-white flex-col shrink-0 h-screen sticky top-0 transition-all duration-300">
        {sidebarContent}
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 md:h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-30 flex items-center px-4 md:px-6 gap-3 shadow-xs">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all md:hidden">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600 shadow-xs">
              <GraduationCap className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <span className="text-sm md:text-base font-bold text-slate-900">Trainer Dashboard</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 md:gap-2">
            <Link to="/trainer/notifications" className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all">
              <Bell className="w-4 h-4" />
              {unreadCount !== null && unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              )}
            </Link>
            <Link to="/trainer/profile" className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all" title="Profile">
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
