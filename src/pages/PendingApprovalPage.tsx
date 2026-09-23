import React from 'react'
import { motion } from 'framer-motion'
import { Clock, LogOut, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export function PendingApprovalPage() {
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#040814] text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative ambient gradients */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-transparent blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-bl from-amber-500/15 via-orange-500/15 to-transparent blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white text-slate-900 border border-slate-200/90 rounded-3xl p-6 md:p-10 shadow-2xl text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-xs">
            <Clock className="w-8 h-8 md:w-10 md:h-10 text-amber-500" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Approval Pending</h1>
          {profile?.full_name && (
            <p className="text-cyan-700 text-sm font-semibold mb-3">Hello, {profile.full_name}!</p>
          )}
          <p className="text-slate-600 leading-relaxed mb-8 text-sm">
            Your account has been registered and is awaiting administrator approval.
            You'll receive full access once an administrator reviews your application.
          </p>
          <div className="space-y-3">
            <Button onClick={handleSignOut} className="w-full h-11 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white shadow-md shadow-cyan-600/20 border-0 transition-all font-bold rounded-xl">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full h-11 border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold rounded-xl">
              <Home className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
