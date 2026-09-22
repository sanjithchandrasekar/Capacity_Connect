import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
  Globe, LogOut, BookOpen, BarChart3,
  Settings, Bell, Menu, X,
  User, ChevronRight, GraduationCap, PlusCircle
} from 'lucide-react'

const navItems = [
  { to: '/trainer', label: 'Dashboard', icon: BarChart3, exact: true },
  { to: '/trainer/courses', label: 'My Courses', icon: BookOpen },
  { to: '/trainer/courses/new', label: 'Create Course', icon: PlusCircle },
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

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return location.pathname === item.to
    if (item.to === '/trainer/courses') return location.pathname === '/trainer/courses'
    return location.pathname.startsWith(item.to) && item.to !== '/trainer'
  }

  const sidebarContent = (
    <>
      <div className="h-14 flex items-center px-4 border-b border-purple-500/10">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain shrink-0" />
          <span className="text-sm font-bold whitespace-nowrap">
            <span className="text-purple-900">Capacity</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500"> Connect</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map(item => {
          const active = isActive(item)
          return (
            <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}>
              <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm group ${
                active
                  ? 'bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-white shadow-md shadow-pink-500/20'
                  : 'text-midnight/70 hover:text-midnight hover:bg-purple-50 border border-transparent'
              }`}>
                <div className="relative">
                  <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'group-hover:text-purple-600'} transition-colors`} />
                  {item.label === 'Notifications' && unreadCount !== null && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-orange-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">
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

      <div className="p-3 border-t border-purple-500/10 space-y-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0 ring-2 ring-purple-500/20">
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-midnight font-medium truncate">{profile?.full_name}</p>
            <p className="text-xs text-midnight/50 truncate">{profile?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3">
          <span className="text-xs px-2 py-0.5 rounded-full border bg-orange-50 text-orange-700 border-orange-200 capitalize">Trainer</span>
          <span className="text-xs px-2 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200 capitalize">{profile?.approval_status}</span>
        </div>
        <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-midnight/60 hover:text-red-600 hover:bg-red-50 transition-all text-sm">
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-white text-midnight flex">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-midnight/40 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-purple-500/10 bg-white/95 backdrop-blur-2xl flex flex-col transition-transform duration-300 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-3 right-3 z-10">
          <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-purple-50 text-midnight/50 hover:text-midnight transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      <aside className="relative z-20 hidden md:flex w-64 border-r border-purple-500/10 bg-white/80 backdrop-blur-2xl flex-col shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      <div className="flex-1 min-w-0">
        <header className="h-14 border-b border-purple-500/10 bg-white/80 backdrop-blur-2xl sticky top-0 z-10 flex items-center px-4 md:px-6 gap-3">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-purple-50 text-midnight/50 hover:text-midnight transition-all md:hidden">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-semibold text-midnight">Trainer Dashboard</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1 md:gap-2">
            <Link to="/trainer/notifications" className="relative p-2 rounded-lg hover:bg-purple-50 text-midnight/50 hover:text-midnight transition-all">
              <Bell className="w-4 h-4" />
              {unreadCount !== null && unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-pink-500 rounded-full" />
              )}
            </Link>
            <Link to="/trainer/settings" className="p-2 rounded-lg hover:bg-purple-50 text-midnight/50 hover:text-midnight transition-all">
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
