import React, { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { Loader2, Download, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function OverallAttendanceDialog({
  open,
  onOpenChange,
  courseId,
  sessions,
  enrollments
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  courseId: string
  sessions: any[]
  enrollments: any[]
}) {
  const [loading, setLoading] = useState(false)
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [metaRecords, setMetaRecords] = useState<any[]>([])

  useEffect(() => {
    if (open && sessions.length > 0) {
      loadAttendance()
    }
  }, [open, sessions])

  const loadAttendance = async () => {
    setLoading(true)
    try {
      const sessionIds = sessions.map(s => s.id)
      const [{ data: attData }, { data: metaData }] = await Promise.all([
        (supabase as any).from('session_attendance').select('*').in('session_id', sessionIds),
        (supabase as any).from('session_attendance_meta').select('*').in('session_id', sessionIds)
      ])
      if (attData) setAttendanceRecords(attData)
      if (metaData) setMetaRecords(metaData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const attendanceData = useMemo(() => {
    if (!sessions.length || !enrollments.length) return []
    
    return enrollments.map(e => {
      let presentCount = 0
      let totalCount = sessions.length
      
      const sessionDetails = sessions.map(s => {
        const att = attendanceRecords.find(a => a.session_id === s.id && a.user_id === e.user_id)
        const meta = metaRecords.find(m => m.session_id === s.id)
        
        let status = 'Absent'
        if (att?.status_override) {
          status = att.status_override === 'present' ? 'Present' : (att.status_override === 'late' ? 'Late' : 'Absent')
        } else if (meta?.total_generated > 0 && att?.entered_count >= meta.total_generated * 0.5) {
          status = 'Present'
        }

        if (status === 'Present' || status === 'Late') {
          presentCount++
        }
        
        return { sessionId: s.id, status }
      })
      
      const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0
      
      return {
        trainee: e.trainee,
        presentCount,
        totalCount,
        percentage,
        sessionDetails
      }
    }).sort((a, b) => b.percentage - a.percentage)
  }, [sessions, enrollments, attendanceRecords, metaRecords])

  const exportCSV = () => {
    let csv = 'Trainee Name,Email,Overall %,' + sessions.map(s => `"${s.title.replace(/"/g, '""')}"`).join(',') + '\n'
    
    attendanceData.forEach(row => {
      const name = `"${row.trainee?.full_name?.replace(/"/g, '""') || 'Unknown'}"`
      const email = `"${row.trainee?.email || ''}"`
      const pct = `${row.percentage}%`
      
      const sStatuses = sessions.map(s => {
        const det = row.sessionDetails.find(d => d.sessionId === s.id)
        return `"${det?.status || 'Absent'}"`
      }).join(',')
      
      csv += `${name},${email},${pct},${sStatuses}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `overall_attendance_${courseId}.csv`
    a.click()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white rounded-3xl border border-slate-200/60 shadow-2xl">
        <DialogHeader className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-slate-800">Overall Attendance</DialogTitle>
              <DialogDescription className="text-sm text-slate-500 font-medium mt-1">
                View attendance across {sessions.length} sessions for {enrollments.length} enrolled trainees.
              </DialogDescription>
            </div>
            <Button onClick={exportCSV} variant="outline" size="sm" className="h-9 gap-2 border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold rounded-xl">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        </DialogHeader>

        <div className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-cyan-500" />
              <p className="text-sm font-medium">Calculating overall attendance...</p>
            </div>
          ) : attendanceData.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm font-medium flex flex-col items-center gap-3">
              <AlertCircle className="w-8 h-8 text-slate-300" />
              No attendance data available. Make sure there are sessions and enrolled trainees.
            </div>
          ) : (
            <div className="overflow-auto max-h-[60vh]">
              <div className="min-w-max p-6">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead>
                    <tr>
                      <th className="pb-4 font-bold text-slate-900 border-b border-slate-200 pr-6 sticky left-0 bg-white z-10">Trainee</th>
                      <th className="pb-4 font-bold text-slate-900 border-b border-slate-200 px-6 text-center">Overall</th>
                      {sessions.map((s, idx) => (
                        <th key={s.id} className="pb-4 font-semibold text-slate-500 border-b border-slate-200 px-4 whitespace-nowrap text-center text-xs">
                          S{idx + 1}<br/>
                          <span className="font-normal text-slate-400 truncate max-w-[80px] inline-block">{s.title}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 pr-6 sticky left-0 bg-white z-10 font-medium text-slate-800">
                          {row.trainee?.full_name || 'Unknown'}
                          <div className="text-xs text-slate-400 font-normal mt-0.5">{row.trainee?.email}</div>
                        </td>
                        <td className="py-3 px-6 text-center">
                          <div className={`inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                            row.percentage >= 80 ? 'bg-emerald-100 text-emerald-700' :
                            row.percentage >= 50 ? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {row.percentage}%
                          </div>
                        </td>
                        {sessions.map(s => {
                          const det = row.sessionDetails.find(d => d.sessionId === s.id)
                          return (
                            <td key={s.id} className="py-3 px-4 text-center">
                              {det?.status === 'Present' ? (
                                <span className="text-emerald-500 font-bold">P</span>
                              ) : det?.status === 'Late' ? (
                                <span className="text-amber-500 font-bold">L</span>
                              ) : (
                                <span className="text-rose-400 font-bold">A</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
