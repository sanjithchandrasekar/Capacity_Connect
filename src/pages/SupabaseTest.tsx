import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, CheckCircle, XCircle, ShieldCheck, Link as LinkIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

type TestResult = {
  label: string
  status: 'ok' | 'warn' | 'error' | 'loading'
  detail: string
}

export function SupabaseTest() {
  const [results, setResults] = useState<TestResult[]>([
    { label: 'Environment Variables', status: 'loading', detail: '' },
    { label: 'Network Reachability', status: 'loading', detail: '' },
    { label: 'RLS Protection Active', status: 'loading', detail: '' },
  ])

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

      const { error } = await supabase.from('profiles').select('id').limit(1)
      if (!error) {
        next[2] = { label: 'RLS Protection Active', status: 'warn', detail: 'Profiles table is readable without auth — check your RLS policies!' }
      } else if (error.code === '42501' || error.message?.includes('permission denied')) {
        next[2] = { label: 'RLS Protection Active', status: 'ok', detail: 'Permission denied for anon — RLS is enforced correctly' }
      } else if (error.code === 'PGRST301') {
        next[2] = { label: 'RLS Protection Active', status: 'ok', detail: 'JWT required — RLS is enforced correctly' }
      } else {
        next[2] = { label: 'RLS Protection Active', status: 'error', detail: `${error.message} (code: ${error.code})` }
      }

      setResults([...next])
    }

    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allOk = results.every(r => r.status === 'ok')
  const hasError = results.some(r => r.status === 'error')
  const stillLoading = results.some(r => r.status === 'loading')

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="bg-cream border border-ink/10 rounded-2xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="px-8 py-6 border-b border-ink/10">
            <h1 className="text-lg font-bold text-ink">Supabase Connection Test</h1>
            <p className="text-xs text-ink/50 mt-1">Validates environment, network, and database security</p>
          </div>

          {/* Results */}
          <div className="p-6 space-y-3">
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

          {/* Overall status footer */}
          {!stillLoading && (
            <div className={`px-6 pb-6`}>
              {allOk && (
                <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-center">
                  <p className="text-green-700 font-semibold text-sm">All systems operational — Supabase is fully connected!</p>
                  <Link to="/login" className="inline-flex items-center gap-1.5 mt-3 text-xs text-ink/50 hover:text-ink transition-colors">
                    <LinkIcon className="w-3 h-3" /> Proceed to Login
                  </Link>
                </div>
              )}
              {hasError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center">
                  <p className="text-red-700 font-semibold text-sm">Connection issue detected</p>
                  <p className="text-xs text-ink/50 mt-1">Check your <code className="text-ink/60">.env.local</code> file and restart the dev server.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
