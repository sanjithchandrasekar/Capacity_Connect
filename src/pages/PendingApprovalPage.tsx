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
    <div className="min-h-screen bg-cream flex items-center justify-center p-4 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-cream border border-ink/10 rounded-2xl p-6 md:p-10 shadow-sm text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-yellow-50 border border-yellow-200 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6">
            <Clock className="w-8 h-8 md:w-10 md:h-10 text-yellow-600" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-ink mb-2">Approval Pending</h1>
          {profile?.full_name && (
            <p className="text-ink text-sm font-medium mb-4">Hello, {profile.full_name}!</p>
          )}
          <p className="text-ink/60 leading-relaxed mb-8 text-sm">
            Your account has been created and is awaiting administrator approval.
            You'll receive access once an admin reviews your registration.
          </p>
          <div className="space-y-3">
            <Button onClick={handleSignOut} className="w-full h-10 bg-ink/5 hover:bg-ink/10 text-ink border border-ink/10 transition-all">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
            <Button variant="ghost" onClick={() => navigate('/')} className="w-full text-ink/50 hover:text-ink text-sm">
              <Home className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
