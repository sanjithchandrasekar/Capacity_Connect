import React from 'react'
import { motion } from 'framer-motion'
import { Clock, LogOut, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { Link } from 'react-router-dom'

export function PendingApprovalPage() {
  const { signOut, profile } = useAuth()

  return (
    <div className="min-h-screen bg-feldgrau flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-yellow-600/15 via-amber-700/8 to-transparent rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/4 backdrop-blur-xl border border-wheat/10 rounded-2xl p-10 shadow-2xl text-center">
          <div className="w-20 h-20 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold text-wheat mb-2">Approval Pending</h1>
          {profile?.full_name && (
            <p className="text-wheat text-sm font-medium mb-4">Hello, {profile.full_name}!</p>
          )}
          <p className="text-wheat/70 leading-relaxed mb-8 text-sm">
            Your account has been created and is awaiting administrator approval.
            You'll receive access once an admin reviews your registration.
          </p>
          <div className="space-y-3">
            <Button onClick={signOut} className="w-full h-10 bg-white/8 hover:bg-white/12 text-wheat border border-wheat/10 transition-all">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
            <Link to="/">
              <Button variant="ghost" className="w-full text-wheat0 hover:text-slate-300 text-sm">
                <Globe className="w-4 h-4 mr-2" /> Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
