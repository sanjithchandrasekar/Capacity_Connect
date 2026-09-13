import React from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export function AccessDeniedPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-cream border border-red-200 rounded-2xl p-10 shadow-sm text-center">
          <div className="w-20 h-20 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-3">Access Denied</h1>
          <p className="text-ink/60 leading-relaxed mb-8 text-sm">
            You do not have permission to access this page. Your account role does not grant the required privileges.
          </p>
          <Button onClick={() => navigate(-1)} className="w-full h-10 bg-ink/5 hover:bg-ink/10 text-ink border border-ink/10 transition-all">
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
