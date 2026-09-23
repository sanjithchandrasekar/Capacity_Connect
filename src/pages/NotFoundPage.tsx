import React from 'react'
import { motion } from 'framer-motion'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#040814] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10 text-center"
      >
        <div className="bg-white border border-slate-200/90 rounded-3xl p-8 md:p-10 shadow-2xl">
          <div className="text-6xl md:text-8xl font-black text-slate-100 mb-2 select-none tracking-tighter">404</div>
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 -mt-8 shadow-lg shadow-cyan-500/20 text-white">
            <Compass className="w-8 h-8" />
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 mb-3 tracking-tight">Page Not Found</h1>
          <p className="text-slate-600 leading-relaxed mb-8 text-sm font-medium">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link to="/">
            <Button className="w-full h-11 bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:opacity-95 text-white font-semibold rounded-xl shadow-lg shadow-cyan-600/20 border-0 transition-all">
              Return to Home
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
