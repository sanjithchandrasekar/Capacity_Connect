import React from 'react'
import { motion } from 'framer-motion'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10 text-center"
      >
        <div className="text-6xl md:text-8xl font-black text-ink/5 mb-4 select-none">404</div>
        <div className="w-12 h-12 md:w-16 md:h-16 bg-ink border border-ink/10 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 -mt-4 md:-mt-6">
          <Compass className="w-6 h-6 md:w-8 md:h-8 text-cream" />
        </div>
        <h1 className="text-xl md:text-2xl font-bold text-ink mb-3">Page Not Found</h1>
        <p className="text-ink/60 leading-relaxed mb-8 text-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button className="bg-ink hover:bg-ink/90 text-cream border-0 transition-all px-8">
            Return to Home
          </Button>
        </Link>
      </motion.div>
    </div>
  )
}
