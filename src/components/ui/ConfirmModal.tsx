import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#070E20] border border-cyan-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-cyan-950/30 text-zinc-200/70 hover:text-cyan-400 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 pt-8 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-zinc-200 mb-2">{title}</h2>
              <p className="text-zinc-200/70 text-sm">{message}</p>
            </div>

            <div className="bg-[#020612]/50 p-4 flex items-center justify-end gap-3 border-t border-cyan-500/20">
              <Button
                variant="outline"
                onClick={onCancel}
                className="border-cyan-500/30 text-zinc-300 hover:text-white rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={onConfirm}
                className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl"
              >
                Confirm
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
