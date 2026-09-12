import React from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export function AccessDeniedPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-feldgrau flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-red-700/15 via-red-800/8 to-transparent rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/4 backdrop-blur-xl border border-red-500/20 rounded-2xl p-10 shadow-2xl text-center">
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-wheat mb-3">Access Denied</h1>
          <p className="text-wheat/70 leading-relaxed mb-8 text-sm">
            You do not have permission to access this page. Your account role does not grant the required privileges.
          </p>
          <Button onClick={() => navigate(-1)} className="w-full h-10 bg-white/8 hover:bg-white/12 text-wheat border border-wheat/10 transition-all">
            <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
