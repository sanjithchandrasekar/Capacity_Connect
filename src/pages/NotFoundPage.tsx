import React from 'react'
import { motion } from 'framer-motion'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-feldgrau flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-slate-600/15 via-slate-700/8 to-transparent rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10 text-center"
      >
        <div className="text-8xl font-black text-wheat/5 mb-4 select-none">404</div>
        <div className="w-16 h-16 bg-slate-800 border border-wheat/10 rounded-2xl flex items-center justify-center mx-auto mb-6 -mt-6">
          <Compass className="w-8 h-8 text-wheat/70" />
        </div>
        <h1 className="text-2xl font-bold text-wheat mb-3">Page Not Found</h1>
        <p className="text-wheat/70 leading-relaxed mb-8 text-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button className="bg-gradient-to-r from-wheat to-wheat/70 hover:from-cyan-400 hover:to-blue-500 text-wheat border-0 shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all px-8">
            Return to Home
          </Button>
        </Link>
      </motion.div>
    </div>
  )
}
