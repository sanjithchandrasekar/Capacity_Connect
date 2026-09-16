import React from 'react'
import { motion } from 'framer-motion'
import { Ban, LogOut, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { Link } from 'react-router-dom'

export function AccountSuspendedPage() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-cream border border-red-200 rounded-2xl p-6 md:p-10 shadow-sm text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6">
            <Ban className="w-8 h-8 md:w-10 md:h-10 text-red-500" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-ink mb-3">Account Suspended</h1>
          <p className="text-ink/60 leading-relaxed mb-8 text-sm">
            Your account has been suspended by an administrator. You currently do not have access to the platform.
            Please contact support if you believe this is an error.
          </p>
          <div className="space-y-3">
            <Button onClick={signOut} className="w-full h-10 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
            <Link to="/">
              <Button variant="ghost" className="w-full text-ink/50 hover:text-ink text-sm">
                <Globe className="w-4 h-4 mr-2" /> Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
