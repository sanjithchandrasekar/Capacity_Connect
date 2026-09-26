import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { UserCheck, Clock, Check, X, AlertCircle, Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

export function LiveAttendanceTrainerPanel({ session, enrollments }: { session: any, enrollments: any[] }) {
  const [activeOtp, setActiveOtp] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [totalGenerated, setTotalGenerated] = useState(0)
  const [roster, setRoster] = useState<Record<string, { entered: number, override?: 'P' | 'F' }>>({})
  const [channel, setChannel] = useState<any>(null)

  // Initialize total generated and real-time channel
  useEffect(() => {
    if (!session?.id) return
    const key = `attendance_meta_${session.id}`
    const meta = JSON.parse(localStorage.getItem(key) || '{"generated":0}')
    setTotalGenerated(meta.generated || 0)
    
    // Load persisted roster
    const rKey = `trainer_roster_${session.id}`
    const rData = JSON.parse(localStorage.getItem(rKey) || '{}')
    setRoster(rData)
    
    const active = JSON.parse(localStorage.getItem(`active_otp_${session.id}`) || 'null')
    if (active && active.expiresAt > Date.now()) {
      setActiveOtp(active.code)
      setTimeLeft(Math.ceil((active.expiresAt - Date.now()) / 1000))
    }
  }, [session?.id])

  // Timer loop
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && activeOtp) {
      setActiveOtp(null)
    }
  }, [timeLeft, activeOtp])

  // Setup Supabase Realtime for cross-browser sync
  useEffect(() => {
    if (!session?.id) return
    const ch = supabase.channel(`attendance_${session.id}`, {
      config: { presence: { key: 'trainer' } }
    })
    
    ch.on('broadcast', { event: 'trainee_otp_entered' }, (payload) => {
      const { userId } = payload.payload
      setRoster(prev => {
        const curr = prev[userId] || { entered: 0 }
        const next = { ...prev, [userId]: { ...curr, entered: curr.entered + 1 } }
        localStorage.setItem(`trainer_roster_${session.id}`, JSON.stringify(next))
        return next
      })
      toast.success('A trainee verified their attendance!')
    })

    ch.on('broadcast', { event: 'trainee_sync' }, (payload) => {
      const { userId, entered } = payload.payload
      setRoster(prev => {
        const curr = prev[userId] || { entered: 0 }
        if (curr.entered >= entered) return prev
        const next = { ...prev, [userId]: { ...curr, entered } }
        localStorage.setItem(`trainer_roster_${session.id}`, JSON.stringify(next))
        return next
      })
    })
    
    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const active = JSON.parse(localStorage.getItem(`active_otp_${session.id}`) || 'null')
        const meta = JSON.parse(localStorage.getItem(`attendance_meta_${session.id}`) || '{"generated":0}')
        await ch.track({ 
          activeOtp: active && active.expiresAt > Date.now() ? active.code : null, 
          expiresAt: active && active.expiresAt > Date.now() ? active.expiresAt : 0,
          generated: meta.generated || 0 
        })
        
        // Ask all online trainees to report their current score
        ch.send({
          type: 'broadcast',
          event: 'request_sync',
          payload: {}
        })
      }
    })
    
    setChannel(ch)
    return () => { supabase.removeChannel(ch) }
  }, [session?.id])

  const generateOTP = () => {
    if (timeLeft > 0) {
      toast.error("An attendance check is already running!")
      return
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 30000 // 30 seconds
    
    // Save active OTP
    localStorage.setItem(`active_otp_${session.id}`, JSON.stringify({ code, expiresAt }))
    
    // Increment total generated
    const newTotal = totalGenerated + 1
    localStorage.setItem(`attendance_meta_${session.id}`, JSON.stringify({ generated: newTotal }))
    setTotalGenerated(newTotal)
    
    setActiveOtp(code)
    setTimeLeft(30)
    
    if (channel) {
      channel.track({ activeOtp: code, expiresAt, generated: newTotal })
    }
    
    toast.success("Attendance check triggered!")
  }

  const adjustScore = (userId: string, newScoreVal: number, traineeName: string) => {
    setRoster(prev => {
      const curr = prev[userId] || { entered: 0 }
      const newScore = Math.max(0, Math.min(totalGenerated, newScoreVal))
      
      const next = { ...prev, [userId]: { ...curr, entered: newScore } }
      delete next[userId].override // Clear override since we are adjusting score manually
      
      localStorage.setItem(`trainer_roster_${session.id}`, JSON.stringify(next))
      
      const tKey = `trainee_attendance_${session.id}_${userId}`
      const existing = JSON.parse(localStorage.getItem(tKey) || '{"entered":0}')
      existing.entered = newScore
      delete existing.override // Clear override
      localStorage.setItem(tKey, JSON.stringify(existing))
      
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'score_adjusted',
          payload: { userId, entered: newScore }
        })
      }
      
      return next
    })
    toast.success(`Score adjusted for ${traineeName}`)
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
      {/* Header Section */}
      <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-cyan-600" />
            Live Attendance Checks
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Trigger a random 6-digit PIN. Trainees have 30 seconds to enter it.
          </p>
          <div className="mt-3">
             <Badge variant="outline" className="bg-white">
                {totalGenerated} checks generated so far
             </Badge>
          </div>
        </div>
        
        <div className="shrink-0 flex flex-col items-end">
          {activeOtp ? (
            <div className="text-center">
              <div className="text-4xl font-black tracking-widest text-cyan-600 bg-cyan-50 px-6 py-2 rounded-lg border border-cyan-200">
                {activeOtp}
              </div>
              <p className="text-xs font-bold text-rose-600 mt-2 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {timeLeft}s remaining
              </p>
            </div>
          ) : (
            <Button 
              onClick={generateOTP}
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold h-12 px-6 rounded-xl shadow-sm"
            >
              Take Attendance Now
            </Button>
          )}
        </div>
      </div>

      {/* Roster Section */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
          <span className="font-bold text-sm text-slate-800">Session Roster</span>
          <span className="text-xs text-slate-400">Auto-saves instantly</span>
        </div>
        <div className="divide-y divide-slate-50 overflow-y-auto flex-1">
          {enrollments.map(e => {
            const trainee = e.trainee || { full_name: 'Unknown', email: '' }
            const rData = roster[e.user_id] || { entered: 0 }
            
            const pct = totalGenerated > 0 ? Math.round((rData.entered / totalGenerated) * 100) : 0
            let autoStatus = 'Absent'
            let autoColor = 'text-rose-600 bg-rose-50'
            if (pct >= 75) {
              autoStatus = 'Present'
              autoColor = 'text-emerald-600 bg-emerald-50'
            } else if (pct >= 30) {
              autoStatus = 'Partial'
              autoColor = 'text-amber-600 bg-amber-50'
            }
            if (totalGenerated === 0) {
              autoStatus = 'Pending'
              autoColor = 'text-slate-600 bg-slate-100'
            }

            const finalStatus = autoStatus;
            const finalColor = autoColor;

            return (
              <div key={e.user_id} className="px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center shrink-0">
                    <span className="font-bold text-cyan-700 text-sm">
                      {trainee.full_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{trainee.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{trainee.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-500">Auto Score</p>
                    <p className="font-bold text-slate-800 text-sm">{rData.entered} / {totalGenerated || 0}</p>
                  </div>
                  
                  <div className="w-32">
                    <Badge variant="outline" className={`w-full justify-center ${finalColor}`}>
                      {finalStatus}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4 w-32 flex-wrap justify-end">
                    {Array.from({ length: totalGenerated }, (_, i) => {
                      const isChecked = i < rData.entered
                      return (
                        <button
                          key={i}
                          onClick={() => adjustScore(e.user_id, isChecked ? rData.entered - 1 : rData.entered + 1, trainee.full_name)}
                          className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                            isChecked 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' 
                              : 'bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100'
                          }`}
                          title={isChecked ? "Remove check" : "Add check"}
                        >
                          {isChecked ? <Check className="w-4 h-4" strokeWidth={3} /> : <X className="w-4 h-4" strokeWidth={3} />}
                        </button>
                      )
                    })}
                    {totalGenerated === 0 && (
                      <span className="text-xs text-slate-400 italic">No checks</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {enrollments.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-sm">
              No trainees enrolled in this course yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
