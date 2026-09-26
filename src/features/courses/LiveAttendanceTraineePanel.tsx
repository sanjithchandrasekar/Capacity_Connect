import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserCheck, Clock, Check, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

export function LiveAttendanceTraineePanel({ session, userId }: { session: any, userId: string }) {
  const [activeOtp, setActiveOtp] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [tally, setTally] = useState({ entered: 0, generated: 0 })
  const [override, setOverride] = useState<'P' | 'F' | null>(null)
  const [channel, setChannel] = useState<any>(null)

  // Sync with Trainer via Supabase Presence
  useEffect(() => {
    if (!session?.id) return
    
    // Load local history
    const tKey = `trainee_attendance_${session.id}_${userId}`
    const tData = JSON.parse(localStorage.getItem(tKey) || '{"entered":0, "generated":0}')
    setTally(prev => ({ ...prev, entered: tData.entered, generated: tData.generated || 0 }))
    setOverride(tData.override || null)

    const ch = supabase.channel(`attendance_${session.id}`)
    
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState()
      if (state['trainer'] && state['trainer'].length > 0) {
        const ts: any = state['trainer'][0]
        setTally(prev => {
          const newGen = Math.max(prev.generated, ts.generated || 0)
          const currentTData = JSON.parse(localStorage.getItem(tKey) || '{"entered":0}')
          localStorage.setItem(tKey, JSON.stringify({ ...currentTData, generated: newGen }))
          return { ...prev, generated: newGen }
        })
        
        if (ts.activeOtp && ts.expiresAt > Date.now()) {
          setActiveOtp({ code: ts.activeOtp, expiresAt: ts.expiresAt })
          setTimeLeft(Math.ceil((ts.expiresAt - Date.now()) / 1000))
        } else {
          setActiveOtp(null)
        }
      }
    })

    ch.on('broadcast', { event: 'score_adjusted' }, (payload) => {
      const { userId: targetUserId, entered } = payload.payload
      if (targetUserId === userId) {
        setTally(prev => ({ ...prev, entered }))
      }
    })

    ch.on('broadcast', { event: 'request_sync' }, () => {
      const currentTData = JSON.parse(localStorage.getItem(tKey) || '{"entered":0}')
      if (currentTData.entered > 0) {
        ch.send({
          type: 'broadcast',
          event: 'trainee_sync',
          payload: { userId, entered: currentTData.entered }
        })
      }
    })

    ch.subscribe()
    setChannel(ch)
    
    // Local timer loop for smooth countdown
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setActiveOtp(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => {
      clearInterval(timer)
      supabase.removeChannel(ch)
    }
  }, [session?.id, userId])

  // Broadcast current state to trainer on load or update
  useEffect(() => {
    if (channel && tally.entered > 0) {
      channel.send({
        type: 'broadcast',
        event: 'trainee_sync',
        payload: { userId, entered: tally.entered }
      })
    }
  }, [channel, tally.entered, userId])

  const handleSubmit = () => {
    if (!activeOtp || timeLeft <= 0) {
      toast.error("The code has expired!")
      return
    }
    
    if (inputValue.trim() === activeOtp.code) {
      const tKey = `trainee_attendance_${session.id}_${userId}`
      const tData = JSON.parse(localStorage.getItem(tKey) || '{"entered":0}')
      
      // Prevent double counting the same OTP code
      const history = tData.history || []
      if (history.includes(activeOtp.code)) {
        toast.error("You already entered this code!")
        setInputValue('')
        return
      }
      
      tData.entered = (tData.entered || 0) + 1
      tData.history = [...history, activeOtp.code]
      localStorage.setItem(tKey, JSON.stringify(tData))
      
      setTally(prev => ({ ...prev, entered: tData.entered }))
      setInputValue('')
      toast.success("Attendance code accepted!")
      
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'trainee_otp_entered',
          payload: { userId, code: activeOtp.code }
        })
      }
    } else {
      toast.error("Invalid code. Please try again.")
    }
  }

  // Auto-status logic
  let autoStatus = 'Absent'
  let autoColor = 'text-rose-600 bg-rose-50'
  const pct = tally.generated > 0 ? Math.round((tally.entered / tally.generated) * 100) : 0
  if (pct >= 75) {
    autoStatus = 'Present'
    autoColor = 'text-emerald-600 bg-emerald-50'
  } else if (pct >= 30) {
    autoStatus = 'Partial'
    autoColor = 'text-amber-600 bg-amber-50'
  }
  if (tally.generated === 0) {
    autoStatus = 'Pending Checks'
    autoColor = 'text-slate-600 bg-slate-100'
  }

  const finalStatus = override === 'P' ? 'Present (Overridden)' : override === 'F' ? 'Absent (Overridden)' : autoStatus;
  const finalColor = override === 'P' ? 'text-blue-700 bg-blue-50 border-blue-200' : override === 'F' ? 'text-red-700 bg-red-50 border-red-200' : autoColor;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-cyan-600" />
          Live Attendance
        </h3>
        <Badge variant="outline" className={finalColor}>
          Status: {finalStatus}
        </Badge>
      </div>

      <div className="flex items-center gap-6 py-2">
        <div className="flex-1">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Your Checks</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{tally.entered}</span>
            <span className="text-sm font-semibold text-slate-400">/ {tally.generated}</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Success Rate</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{pct}%</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeOtp && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="overflow-hidden"
          >
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-cyan-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> Action Required!
                </p>
                <p className="text-xs font-bold text-rose-600 flex items-center gap-1 animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  {timeLeft}s
                </p>
              </div>
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="Enter 6-digit PIN"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  className="text-center font-bold tracking-widest text-lg bg-white border-cyan-300 focus-visible:ring-cyan-500"
                />
                <Button 
                  onClick={handleSubmit}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white shrink-0"
                >
                  <Check className="w-4 h-4 mr-1" /> Verify
                </Button>
              </div>
              <p className="text-[10px] text-cyan-600/70 text-center mt-2 font-medium">
                Listen to the trainer for the PIN. You only have {timeLeft} seconds!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
