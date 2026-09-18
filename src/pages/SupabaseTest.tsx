import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, CheckCircle, XCircle, ShieldCheck, ExternalLink, Database, Globe, Lock, Users, BookOpen, Shield, GraduationCap, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

type TestResult = {
  label: string
  status: 'ok' | 'warn' | 'error' | 'loading'
  detail: string
}

const appPages = [
  { label: 'Landing Page', path: '/', icon: Globe, desc: 'Home / Marketing page', public: true },
  { label: 'Login', path: '/login', icon: Lock, desc: 'Sign in page', public: true },
  { label: 'Register', path: '/register', icon: Users, desc: 'New user registration', public: true },
  { label: 'Forgot Password', path: '/forgot-password', icon: Lock, desc: 'Password reset request', public: true },
  { label: 'Setup Password', path: '/setup-password', icon: Lock, desc: 'Set password from email link', public: true },
  { label: 'Pending Approval', path: '/pending-approval', icon: Shield, desc: 'Awaiting admin approval', public: true },
  { label: 'Account Suspended', path: '/account-suspended', icon: XCircle, desc: 'Suspended account page', public: true },
  { label: 'Access Denied', path: '/access-denied', icon: Shield, desc: 'Unauthorized access page', public: true },
  { label: 'Trainee Dashboard', path: '/trainee', icon: GraduationCap, desc: 'Role: Trainee', public: false },
  { label: 'Course Catalog', path: '/trainee/courses', icon: BookOpen, desc: 'Role: Trainee', public: false },
  { label: 'My Learning', path: '/trainee/my-learning', icon: BookOpen, desc: 'Role: Trainee', public: false },
  { label: 'Trainer Dashboard', path: '/trainer', icon: Users, desc: 'Role: Trainer', public: false },
  { label: 'Trainer Courses', path: '/trainer/courses', icon: BookOpen, desc: 'Role: Trainer', public: false },
  { label: 'Admin Dashboard', path: '/admin', icon: Shield, desc: 'Role: Admin / Super Admin', public: false },
  { label: 'DB Test (this page)', path: '/supabase-test', icon: Database, desc: 'Connection health check', public: true },
]

export function SupabaseTest() {
  const [results, setResults] = useState<TestResult[]>([
    { label: 'Environment Variables', status: 'loading', detail: '' },
    { label: 'Network Reachability', status: 'loading', detail: '' },
    { label: 'RLS Protection Active', status: 'loading', detail: '' },
  ])
  const [refreshKey, setRefreshKey] = useState(0)

  const resetAndRefresh = () => {
    setResults([
      { label: 'Environment Variables', status: 'loading', detail: '' },
      { label: 'Network Reachability', status: 'loading', detail: '' },
      { label: 'RLS Protection Active', status: 'loading', detail: '' },
    ])
    setRefreshKey(k => k + 1)
  }

  useEffect(() => {
    const run = async () => {
      const next = [...results]

      const url = import.meta.env.VITE_SUPABASE_URL
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
      if (url && key && url.startsWith('https://') && key.startsWith('sb_publishable')) {
        next[0] = { label: 'Environment Variables', status: 'ok', detail: `URL: ${url}` }
      } else {
        next[0] = { label: 'Environment Variables', status: 'error', detail: 'Missing or malformed VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY in .env.local' }
        setResults([...next])
        return
      }

      try {
        const res = await fetch(`${url}/rest/v1/`, {
          headers: { apikey: key },
        })
        if (res.ok || res.status === 404 || res.status === 401) {
          next[1] = { label: 'Network Reachability', status: 'ok', detail: `HTTP ${res.status} — Supabase REST API is reachable` }
        } else {
          next[1] = { label: 'Network Reachability', status: 'warn', detail: `Unexpected HTTP ${res.status}` }
        }
      } catch (e) {
        next[1] = { label: 'Network Reachability', status: 'error', detail: `Network error: ${e instanceof Error ? e.message : String(e)}` }
        setResults([...next])
        return
      }

      const { error } = await supabase.from('trainees').select('id').limit(1)
      if (!error) {
        next[2] = { label: 'RLS Protection Active', status: 'warn', detail: 'Trainees table readable without auth — check RLS policies!' }
      } else if (error.code === '42501' || error.message?.includes('permission denied')) {
        next[2] = { label: 'RLS Protection Active', status: 'ok', detail: 'Permission denied for anon — RLS is enforced correctly ✓' }
      } else if (error.code === 'PGRST301') {
        next[2] = { label: 'RLS Protection Active', status: 'ok', detail: 'JWT required — RLS is enforced correctly ✓' }
      } else {
        next[2] = { label: 'RLS Protection Active', status: 'error', detail: `${error.message} (code: ${error.code})` }
      }

      setResults([...next])
    }

    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const allOk = results.every(r => r.status === 'ok')
  const hasError = results.some(r => r.status === 'error')
  const stillLoading = results.some(r => r.status === 'loading')

  return (
    <div className="min-h-screen bg-cream p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="Capacity Connect" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-ink">Capacity Connect — Health Dashboard</h1>
              <p className="text-xs text-ink/50">DB connectivity check + full app page map</p>
            </div>
          </div>
        </motion.div>

        {/* DB Tests */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white border border-ink/10 rounded-2xl overflow-hidden shadow-sm"
        >
          <div className="px-6 py-4 border-b border-ink/10 flex items-center gap-2">
            <Database className="w-4 h-4 text-ink/60" />
            <h2 className="text-sm font-semibold text-ink">Supabase Connection Tests</h2>
            <button
              onClick={resetAndRefresh}
              disabled={stillLoading}
              className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-ink/20 text-ink/60 hover:text-ink hover:bg-ink/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3 h-3 ${stillLoading ? 'animate-spin' : ''}`} />
              {stillLoading ? 'Checking...' : 'Refresh'}
            </button>
          </div>
          <div className="p-4 space-y-3">
            {results.map((r) => (
              <div key={r.label} className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                r.status === 'ok' ? 'bg-green-50 border-green-200' :
                r.status === 'error' ? 'bg-red-50 border-red-200' :
                r.status === 'warn' ? 'bg-yellow-50 border-yellow-200' :
                'bg-ink/5 border-ink/10'
              }`}>
                <div className="mt-0.5 shrink-0">
                  {r.status === 'loading' && <Loader2 className="w-4 h-4 text-ink/50 animate-spin" />}
                  {r.status === 'ok' && <CheckCircle className="w-4 h-4 text-green-600" />}
                  {r.status === 'warn' && <ShieldCheck className="w-4 h-4 text-yellow-600" />}
                  {r.status === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${
                    r.status === 'ok' ? 'text-green-700' :
                    r.status === 'error' ? 'text-red-700' :
                    r.status === 'warn' ? 'text-yellow-700' :
                    'text-ink/60'
                  }`}>{r.label}</p>
                  {r.detail && <p className="text-xs text-ink/50 mt-0.5 break-all">{r.detail}</p>}
                </div>
              </div>
            ))}
          </div>

          {!stillLoading && (
            <div className="px-4 pb-4">
              {allOk && (
                <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-center">
                  <p className="text-green-700 font-semibold text-sm">✅ All systems operational — Supabase is fully connected!</p>
                </div>
              )}
              {hasError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center">
                  <p className="text-red-700 font-semibold text-sm">❌ Connection issue detected</p>
                  <p className="text-xs text-ink/50 mt-1">Check your <code className="text-ink/60">.env.local</code> file and Vercel environment variables.</p>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* App Pages Map */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white border border-ink/10 rounded-2xl overflow-hidden shadow-sm"
        >
          <div className="px-6 py-4 border-b border-ink/10 flex items-center gap-2">
            <Globe className="w-4 h-4 text-ink/60" />
            <h2 className="text-sm font-semibold text-ink">App Pages — Full Sitemap</h2>
            <span className="ml-auto text-xs text-ink/40">{appPages.length} pages total</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {appPages.map((page) => (
              <Link
                key={page.path}
                to={page.path}
                className="flex items-center gap-3 p-3 rounded-xl border border-ink/10 hover:border-ink/30 hover:bg-ink/5 transition-all group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${page.public ? 'bg-ink/10' : 'bg-ink/5'}`}>
                  <page.icon className="w-4 h-4 text-ink/60" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink group-hover:text-ink truncate">{page.label}</p>
                  <p className="text-xs text-ink/50 truncate">{page.desc}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${page.public ? 'bg-green-50 text-green-700 border-green-200' : 'bg-ink/5 text-ink/50 border-ink/10'}`}>
                    {page.public ? 'Public' : 'Auth'}
                  </span>
                  <ExternalLink className="w-3 h-3 text-ink/30 group-hover:text-ink/60 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          <Link to="/login" className="p-4 bg-ink text-cream rounded-xl text-center text-sm font-semibold hover:bg-ink/90 transition-all">
            Go to Login →
          </Link>
          <Link to="/register" className="p-4 bg-white border border-ink/20 text-ink rounded-xl text-center text-sm font-semibold hover:bg-ink/5 transition-all">
            Register New User →
          </Link>
          <Link to="/" className="p-4 bg-white border border-ink/20 text-ink rounded-xl text-center text-sm font-semibold hover:bg-ink/5 transition-all">
            Back to Landing Page →
          </Link>
        </motion.div>

      </div>
    </div>
  )
}
