import React from 'react'
import { motion } from 'framer-motion'
import { Ban, LogOut, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export function AccountSuspendedPage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#040814] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background radiant glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 md:p-10 shadow-2xl text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-sm">
            <Ban className="w-8 h-8 md:w-10 md:h-10 text-red-600" />
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 mb-3 tracking-tight">Account Suspended</h1>
          <p className="text-slate-600 leading-relaxed mb-8 text-sm font-medium">
            Your account has been suspended by an administrator. You currently do not have access to the platform.
            Please contact support if you believe this is an error.
          </p>
          <div className="space-y-3">
            <Button onClick={handleSignOut} className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl shadow-md shadow-red-500/20 transition-all">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full h-11 border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl transition-all">
              <Home className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
