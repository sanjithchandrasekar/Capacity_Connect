import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Megaphone, BookOpen, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'

interface Assignment {
  id: string
  course_id: string
  message: string | null
  assigned_at: string
  is_read: boolean
  course: { title: string; description: string; status: string }
  assigned_by_name: string
}

export function TrainerAssignmentBanner() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [dismissedIds, setDismissedIds] = useState<string[]>([])
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!user) return
    const stored = JSON.parse(localStorage.getItem('dismissed_assignments') || '[]')
    setDismissedIds(stored)

    ;(supabase as any)
      .from('course_assignments')
      .select('id, course_id, message, assigned_at, is_read, course:courses(title, description, status), admin:admins!assigned_by(full_name)')
      .eq('trainer_id', user.id)
      .order('assigned_at', { ascending: false })
      .limit(5)
      .then(({ data }: { data: any[] | null }) => {
        if (data) {
          setAssignments(data.map((a: any) => ({
            ...a,
            course: Array.isArray(a.course) ? a.course[0] : a.course,
            assigned_by_name: (Array.isArray(a.admin) ? a.admin[0]?.full_name : a.admin?.full_name) || 'Admin',
          })))
        }
      })
  }, [user])

  const dismiss = async (id: string) => {
    const newDismissed = [...dismissedIds, id]
    setDismissedIds(newDismissed)
    localStorage.setItem('dismissed_assignments', JSON.stringify(newDismissed))
    await (supabase as any).from('course_assignments').update({ is_read: true }).eq('id', id)
  }

  const visible = assignments.filter(a => !dismissedIds.includes(a.id))
  if (visible.length === 0) return null

  const safeCurrent = Math.min(current, visible.length - 1)
  const assignment = visible[safeCurrent]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={assignment.id}
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.4, type: 'spring', bounce: 0.2 }}
        className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-[#040814] via-[#07132a] to-[#0a1e3f] text-white shadow-xl mb-6"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-10 -right-10 w-64 h-64 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-gradient-to-tr from-sky-400/20 to-blue-400/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <div className="shrink-0 w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-inner">
                <Megaphone className="w-7 h-7 text-amber-300" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-200 text-[11px] font-bold uppercase tracking-wider mb-2">
                  <Sparkles className="w-3 h-3" />
                  New Course Assignment
                </div>
                <h3 className="text-xl font-extrabold text-white leading-tight mb-1 truncate">
                  🎓 {assignment.course?.title ?? 'Course Assigned to You'}
                </h3>
                <p className="text-slate-300 text-sm mb-2 line-clamp-2">
                  {assignment.course?.description ?? 'Admin has assigned you a new course to develop and manage.'}
                </p>
                {assignment.message && (
                  <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-4 py-2.5 mb-3">
                    <p className="text-white/90 text-sm italic">"{assignment.message}"</p>
                    <p className="text-slate-400 text-xs mt-0.5">— {assignment.assigned_by_name}</p>
                  </div>
                )}
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-slate-400 text-xs">
                    {formatDistanceToNow(new Date(assignment.assigned_at), { addSuffix: true })}
                  </span>
                  <Link to={'/trainer/courses/' + assignment.course_id}>
                    <Button className="bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold rounded-xl px-5 py-2 h-auto text-sm shadow-md hover:scale-105 transition-all">
                      <BookOpen className="w-4 h-4 mr-1.5" />
                      View Course
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            <button
              onClick={() => dismiss(assignment.id)}
              className="shrink-0 w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>

          {visible.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-white/10">
              <span className="text-slate-400 text-xs">{safeCurrent + 1} of {visible.length}</span>
              <div className="flex gap-1.5">
                {visible.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={'rounded-full transition-all ' + (i === safeCurrent ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60')}
                  />
                ))}
              </div>
              <button
                onClick={() => setCurrent(c => (c + 1) % visible.length)}
                className="text-slate-400 hover:text-white text-xs ml-2 transition-colors"
              >
                Next &rarr;
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
