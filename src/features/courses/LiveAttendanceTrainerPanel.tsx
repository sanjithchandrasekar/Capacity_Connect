import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { UserCheck, Clock, Check, X, AlertCircle, Plus, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useConfirm } from '@/hooks/useConfirm'

export function LiveAttendanceTrainerPanel({ session, enrollments, isCompleted }: { session: any, enrollments: any[], isCompleted?: boolean }) {
  const [activeOtp, setActiveOtp] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [totalGenerated, setTotalGenerated] = useState(0)
  const [roster, setRoster] = useState<Record<string, { entered: number, override?: 'P' | 'F' }>>({})
  const [channel, setChannel] = useState<any>(null)
  const [ConfirmDialog, confirm] = useConfirm()

  const [isManualMapping, setIsManualMapping] = useState(false)

  // Initialize total generated and real-time channel
  useEffect(() => {
    if (!session?.id) return

    const loadMeta = async () => {
      const { data } = await (supabase as any).from('session_attendance_meta').select('*').eq('session_id', session.id).maybeSingle()
      if (data) {
        setTotalGenerated(data.total_generated || 0)
        setIsManualMapping(data.is_manual_mapping || false)
      }
    }
    loadMeta()
    
    // Load persisted roster from DB
    const loadRoster = async () => {
      const { data } = await (supabase as any).from('session_attendance').select('user_id, entered_count, status_override').eq('session_id', session.id)
      if (data) {
        const rData: Record<string, { entered: number, override?: 'P' | 'F' }> = {}
        data.forEach((row: any) => {
          rData[row.user_id] = { entered: row.entered_count, override: row.status_override as any }
        })
        setRoster(rData)
      }
    }
    loadRoster()
    
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
    
    ch.on('broadcast', { event: 'trainee_otp_entered' }, async (payload) => {
      const { userId } = payload.payload
      setRoster(prev => {
        const curr = prev[userId] || { entered: 0 }
        const next = { ...prev, [userId]: { ...curr, entered: curr.entered + 1 } }
        return next
      })
      // Sync DB
      await (supabase as any).from('session_attendance').upsert({
        session_id: session.id,
        user_id: userId,
        entered_count: (roster[userId]?.entered || 0) + 1
      }, { onConflict: 'session_id,user_id' })
      toast.success('A trainee verified their attendance!')
    })

    ch.on('broadcast', { event: 'trainee_sync' }, async (payload) => {
      const { userId, entered } = payload.payload
      setRoster(prev => {
        const curr = prev[userId] || { entered: 0 }
        if (curr.entered >= entered) return prev
        const next = { ...prev, [userId]: { ...curr, entered } }
        return next
      })
      
      const curr = roster[userId] || { entered: 0 }
      if (curr.entered < entered) {
        await (supabase as any).from('session_attendance').upsert({
          session_id: session.id,
          user_id: userId,
          entered_count: entered
        }, { onConflict: 'session_id,user_id' })
      }
    })
    
    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const active = JSON.parse(localStorage.getItem(`active_otp_${session.id}`) || 'null')
        // Get meta from DB
        const { data } = await (supabase as any).from('session_attendance_meta').select('*').eq('session_id', session.id).maybeSingle()
        const meta = data || { total_generated: 0, is_manual_mapping: false }
        
        await ch.track({ 
          activeOtp: active && active.expiresAt > Date.now() ? active.code : null, 
          expiresAt: active && active.expiresAt > Date.now() ? active.expiresAt : 0,
          generated: meta.total_generated || 0,
          isManualMapping: meta.is_manual_mapping || false
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
    ;(supabase as any).from('session_attendance_meta').upsert({
      session_id: session.id,
      total_generated: newTotal,
      is_manual_mapping: isManualMapping
    }).then()
    setTotalGenerated(newTotal)
    
    setActiveOtp(code)
    setTimeLeft(30)
    
    if (channel) {
      channel.track({ activeOtp: code, expiresAt, generated: newTotal, isManualMapping })
    }
    
    toast.success("Attendance check triggered!")
  }

  const enableManualMapping = async () => {
    await (supabase as any).from('session_attendance_meta').upsert({
      session_id: session.id,
      total_generated: totalGenerated,
      is_manual_mapping: true
    })
    setIsManualMapping(true)
    if (channel) {
      channel.track({ activeOtp: null, expiresAt: 0, generated: totalGenerated, isManualMapping: true })
    }
    toast.success("Manual mapping enabled!")
  }

  const disableManualMapping = async () => {
    await (supabase as any).from('session_attendance_meta').upsert({
      session_id: session.id,
      total_generated: totalGenerated,
      is_manual_mapping: false
    })
    setIsManualMapping(false)
    
    // Reset roster checks to 0
    const nextRoster = { ...roster }
    const updates: any[] = []
    Object.keys(nextRoster).forEach(userId => {
      nextRoster[userId].entered = 0
      updates.push({
        session_id: session.id,
        user_id: userId,
        entered_count: 0
      })
      
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'score_adjusted',
          payload: { userId, entered: 0 }
        })
      }
    })
    setRoster(nextRoster)
    if (updates.length > 0) {
      await (supabase as any).from('session_attendance').upsert(updates as any, { onConflict: 'session_id,user_id' })
    }

    if (channel) {
      channel.track({ activeOtp: null, expiresAt: 0, generated: totalGenerated, isManualMapping: false })
    }
    toast.success("Manual mapping disabled")
  }

  const adjustScore = async (userId: string, newScoreVal: number, traineeName: string) => {
    let finalScore = newScoreVal;
    setRoster(prev => {
      const curr = prev[userId] || { entered: 0 }
      const maxPossible = (totalGenerated === 0 && isManualMapping) ? 1 : totalGenerated
      const newScore = Math.max(0, Math.min(maxPossible, newScoreVal))
      finalScore = newScore;
      
      const next = { ...prev, [userId]: { ...curr, entered: newScore } }
      delete next[userId].override // Clear override since we are adjusting score manually
      
      return next
    })

    await (supabase as any).from('session_attendance').upsert({
      session_id: session.id,
      user_id: userId,
      entered_count: finalScore,
      status_override: null
    }, { onConflict: 'session_id,user_id' })

    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'score_adjusted',
        payload: { userId, entered: finalScore }
      })
    }
    toast.success(`Score adjusted for ${traineeName}`)
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
      <ConfirmDialog />
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
          <div className="mt-3 flex gap-2">
             <Badge variant="outline" className="bg-white text-slate-600 border-slate-200 shadow-sm">
                {totalGenerated} check{totalGenerated === 1 ? '' : 's'} generated so far
             </Badge>
             {isManualMapping && (
               <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 shadow-sm">
                 Manual Mode Active
               </Badge>
             )}
          </div>
        </div>
        
        <div className="shrink-0 flex flex-col items-end gap-2">
          {isCompleted ? (
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 font-bold px-3 py-1.5 rounded-lg shadow-none">
                <Check className="w-3.5 h-3.5 mr-1" /> Session Completed
              </Badge>
              {!isManualMapping ? (
                <Button 
                  onClick={enableManualMapping}
                  variant="outline"
                  className="border-cyan-600 text-cyan-700 hover:bg-cyan-50 font-bold h-10 px-4 rounded-xl"
                >
                  Enable Manual Mapping
                </Button>
              ) : (
                <Button 
                  onClick={disableManualMapping}
                  variant="outline"
                  className="border-rose-200 text-rose-600 hover:bg-rose-50 font-bold h-10 px-4 rounded-xl"
                >
                  Disable Manual Mapping
                </Button>
              )}
            </div>
          ) : activeOtp ? (
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
            
            let autoStatus = 'Absent'
            let autoColor = 'text-rose-600 bg-rose-50'
            
            const effectiveTotal = (totalGenerated === 0 && isManualMapping) ? 1 : totalGenerated
            const pct = effectiveTotal > 0 ? Math.round((rData.entered / effectiveTotal) * 100) : 0
            
            if (pct >= 75) {
              autoStatus = 'Present'
              autoColor = 'text-emerald-600 bg-emerald-50'
            } else if (pct >= 30) {
              autoStatus = 'Partial'
              autoColor = 'text-amber-600 bg-amber-50'
            }
            if (effectiveTotal === 0) {
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
                    <p className="font-bold text-slate-800 text-sm">
                      {isManualMapping && totalGenerated === 0 ? (
                         <span className={rData.entered === 1 ? 'text-emerald-600' : 'text-rose-600'}>
                           {rData.entered === 1 ? 'Present' : 'Absent'}
                         </span>
                      ) : (
                        `${rData.entered} / ${totalGenerated || 0}`
                      )}
                    </p>
                  </div>
                  
                  <div className="w-32">
                    <Badge variant="outline" className={`w-full justify-center ${finalColor}`}>
                      {finalStatus}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4 w-32 flex-wrap justify-end">
                    {Array.from({ length: effectiveTotal }, (_, i) => {
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
                    {effectiveTotal === 0 && (
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
