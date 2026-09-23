import React from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function AccessDeniedPage() {
  const navigate = useNavigate()
  const { session } = useAuth()

  return (
    <div className="min-h-screen bg-[#040814] flex items-center justify-center p-4 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-[#040814] border border-red-200 rounded-2xl p-6 md:p-10 shadow-sm text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6">
            <ShieldAlert className="w-8 h-8 md:w-10 md:h-10 text-red-500" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-200 mb-3">Access Denied</h1>
          <p className="text-zinc-200/60 leading-relaxed mb-8 text-sm">
            You do not have permission to access this page. Your account role does not grant the required privileges.
          </p>
          <div className="space-y-3">
            {session ? (
              <Button onClick={() => navigate('/dashboard')} className="w-full h-10 bg-ink/5 hover:bg-ink/10 text-zinc-200 border border-cyan-500/30 transition-all">
                <ArrowLeft className="w-4 h-4 mr-2" /> Go to Dashboard
              </Button>
            ) : (
              <Link to="/login">
                <Button className="w-full h-10 bg-ink/5 hover:bg-ink/10 text-zinc-200 border border-cyan-500/30 transition-all">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
