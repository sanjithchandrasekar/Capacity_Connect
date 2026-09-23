import React from 'react'
import { motion } from 'framer-motion'
import { Clock, LogOut, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { Link, useNavigate } from 'react-router-dom'

export function PendingApprovalPage() {
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#070E20]/90 text-zinc-200 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative ambient gradients */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-purple-500/15 via-pink-500/15 to-orange-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-bl from-orange-500/15 via-pink-500/15 to-purple-500/10 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-[#070E20]/90/90 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 md:p-10 shadow-2xl shadow-cyan-950/50 text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-orange-50 border border-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-sm">
            <Clock className="w-8 h-8 md:w-10 md:h-10 text-orange-500" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-200 mb-2">Approval Pending</h1>
          {profile?.full_name && (
            <p className="text-cyan-300 text-sm font-semibold mb-4">Hello, {profile.full_name}!</p>
          )}
          <p className="text-zinc-200/60 leading-relaxed mb-8 text-sm">
            Your account has been created and is awaiting administrator approval.
            You'll receive access once an admin reviews your registration.
          </p>
          <div className="space-y-3">
            <Button onClick={handleSignOut} className="w-full h-11 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 hover:opacity-95 text-white shadow-lg shadow-pink-500/25 border-0 transition-all font-semibold">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full h-10 border-cyan-500/30 text-zinc-200/80 hover:bg-cyan-950/30 text-sm">
              <Home className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
