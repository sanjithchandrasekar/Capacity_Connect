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
    <div className="min-h-screen bg-[#040814] text-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-rose-500/20 via-orange-500/15 to-transparent blur-[120px]" />
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white text-slate-900 border border-slate-200/90 rounded-3xl p-6 md:p-10 shadow-2xl text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6">
            <ShieldAlert className="w-8 h-8 md:w-10 md:h-10 text-rose-500" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-3">Access Denied</h1>
          <p className="text-slate-600 leading-relaxed mb-8 text-sm">
            You do not have permission to access this page. Your account role does not grant the required privileges.
          </p>
          <div className="space-y-3">
            {session ? (
              <Button onClick={() => navigate('/dashboard')} className="w-full h-11 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-md transition-all">
                <ArrowLeft className="w-4 h-4 mr-2" /> Go to Dashboard
              </Button>
            ) : (
              <Link to="/login" className="block w-full">
                <Button className="w-full h-11 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-md transition-all">
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
