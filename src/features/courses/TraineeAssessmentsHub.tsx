import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShell } from '@/pages/Dashboards'
import {
  BookOpen, Compass, FileCheck, CheckCircle2, Clock,
  Calendar, Search, Filter, PlayCircle, BarChart3, User, ChevronLeft, ChevronRight, Bell
} from 'lucide-react'
import {
  format, isSameDay, addMonths, subMonths,
  startOfMonth, endOfMonth, eachDayOfInterval, getDay
} from 'date-fns'

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
}

// Mini Calendar
function MiniCalendar({
  selectedDate,
  onSelectDate,
  highlightedDates = [],
}: {
  selectedDate: Date | null
  onSelectDate: (d: Date | null) => void
  highlightedDates?: Date[]
}) {
  const [viewMonth, setViewMonth] = useState(new Date())
  const today = new Date()
  const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) })
  const leadingBlanks = getDay(startOfMonth(viewMonth))
  const isHL = (d: Date) => highlightedDates.some(h => isSameDay(h, d))
  const isSel = (d: Date) => !!selectedDate && isSameDay(d, selectedDate)
  const isToday = (d: Date) => isSameDay(d, today)

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setViewMonth(m => subMonths(m, 1))} className="p-1 rounded hover:bg-slate-100 transition-colors text-slate-500">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-slate-700 tracking-wide">{format(viewMonth, 'MMMM yyyy')}</span>
        <button onClick={() => setViewMonth(m => addMonths(m, 1))} className="p-1 rounded hover:bg-slate-100 transition-colors text-slate-500">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`b-${i}`} />)}
        {days.map(day => {
          const sel = isSel(day); const hl = isHL(day); const tod = isToday(day)
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(sel ? null : day)}
              className={[
                'relative w-full aspect-square flex items-center justify-center rounded-full text-[11px] font-semibold transition-all',
                sel ? 'bg-[#1a7a80] text-white shadow' : '',
                !sel && hl ? 'text-[#1a7a80] font-bold' : '',
                !sel && tod ? 'ring-2 ring-[#1a7a80]/40' : '',
                !sel ? 'text-slate-700 hover:bg-slate-100' : '',
              ].filter(Boolean).join(' ')}
            >
              {format(day, 'd')}
              {hl && !sel && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#1a7a80]" />}
            </button>
          )
        })}
      </div>
      {selectedDate && (
        <button onClick={() => onSelectDate(null)} className="mt-3 w-full text-[11px] font-semibold text-slate-500 hover:text-rose-500 transition-colors">
          Clear filter
        </button>
      )}
    </div>
  )
}

export function TraineeAssessmentsHub() {
  const { profile } = useAuth()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed' | 'expired'>((location.state as any)?.tab || 'ongoing')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [calendarDate, setCalendarDate] = useState<Date | null>(null)
  const [expiredCalendarDate, setExpiredCalendarDate] = useState<Date | null>(null)

  // Live clock — updates every second
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['trainee_enrollments_for_assessments', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          course_id, progress_percent, status,
          course:courses!enrollments_course_id_fkey(status)
        `)
        .eq('user_id', profile!.id)
      if (error) throw error
      return (data || []).filter((e: any) => e.course?.status !== 'archived')
    },
    enabled: !!profile?.id,
  })

  const courseIds = enrollments?.map(e => e.course_id) || []
  const enrollmentMap = new Map<string, any>()
  enrollments?.forEach(e => enrollmentMap.set(e.course_id, e))

  const isFinalUnlockedForCourse = (courseId: string) => {
    const en = enrollmentMap.get(courseId)
    if (!en) return false
    if ((en.progress_percent ?? 0) >= 100 || en.status === 'completed') return true
    if (profile?.id) {
      const stored = localStorage.getItem(`cc_mod_progress_${courseId}_${profile.id}`)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (parsed.completed && parsed.completed.length > 0) {
            // If local storage has marked modules completed
            return (en.progress_percent ?? 0) >= 100
          }
        } catch {}
      }
    }
    return false
  }

  const { data: assessments, isLoading: assessmentsLoading } = useQuery({
    queryKey: ['trainee_assessments_v2', courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return []
      const { data, error } = await supabase
        .from('assessments')
        .select(`id, title, scheduled_date, start_time, end_time, duration_minutes,
                 passing_score, course_id, status, assessment_type,
                 results_publish_date, course:courses(title, status)`)
        .in('course_id', courseIds)
        .eq('status', 'published')
        .order('scheduled_date', { ascending: true })
      if (error) throw error
      return (data || []).filter((a: any) => a.course?.status !== 'archived')
    },
    enabled: courseIds.length > 0,
  })

  const assessmentIds = assessments?.map(a => a.id) || []
  const { data: questionCounts } = useQuery({
    queryKey: ['assessment_question_counts', assessmentIds],
    queryFn: async () => {
      if (assessmentIds.length === 0) return {}
      const { data, error } = await supabase.from('questions').select('assessment_id').in('assessment_id', assessmentIds)
      if (error) return {}
      const counts: Record<string, number> = {}
      ;(data || []).forEach((q: any) => { counts[q.assessment_id] = (counts[q.assessment_id] || 0) + 1 })
      return counts
    },
    enabled: assessmentIds.length > 0,
  })

  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ['trainee_assessment_attempts', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('assessment_attempts' as any).select('*').eq('user_id', profile!.id)
      if (error) throw error
      return (data || []) as any[]
    },
    enabled: !!profile?.id,
  })

  const isLoading = enrollmentsLoading || assessmentsLoading || attemptsLoading
  const attemptedIds = new Set(attempts?.map(a => a.assessment_id) || [])

  const completedAssessments = (assessments || [])
    .filter(a => attemptedIds.has(a.id))
    .map(a => ({ ...a, attempt: attempts?.find(att => att.assessment_id === a.id) }))

  const pending = (assessments || []).filter(a => !attemptedIds.has(a.id))

  const ongoingAndUpcoming = pending.filter(a => {
    if (!a.scheduled_date) return true
    const now = new Date()
    const end = new Date(`${a.scheduled_date}T${a.end_time || '23:59:59'}`)
    const start = new Date(`${a.scheduled_date}T${a.start_time || '00:00:00'}`)
    if (end < start) end.setDate(end.getDate() + 1)
    return now <= end
  })

  const expiredAssessments = pending.filter(a => {
    if (!a.scheduled_date) return false
    const now = new Date()
    const end = new Date(`${a.scheduled_date}T${a.end_time || '23:59:59'}`)
    const start = new Date(`${a.scheduled_date}T${a.start_time || '00:00:00'}`)
    if (end < start) end.setDate(end.getDate() + 1)
    return now > end
  })

  const completedDates: Date[] = completedAssessments
    .map(a => { const s = a.attempt?.submitted_at || a.attempt?.started_at || a.scheduled_date; return s ? new Date(s) : null })
    .filter(Boolean) as Date[]

  const expiredDates: Date[] = expiredAssessments
    .map(a => a.scheduled_date ? new Date(a.scheduled_date) : null)
    .filter(Boolean) as Date[]

  const twoMonthsAgo = subMonths(now, 2)
  const headingRange = `${format(twoMonthsAgo, 'd MMM')} - ${format(now, 'd MMM')}`

  const formatType = (t: string) =>
    t === 'daily' ? 'Daily Test (Practice)' : t === 'mock' ? 'Mock Test (Practice)' : t === 'assessment' ? 'Assessment Test (25% Weight)' : t === 'final' ? 'Final Assessment (50% Weight)' : 'Test'

  const matchesFilter = (a: any) => {
    const ms = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
               (a.course as any)?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               (a.assessment_type && formatType(a.assessment_type).toLowerCase().includes(searchQuery.toLowerCase()))
    return ms && (filterType === 'all' || a.assessment_type === filterType)
  }

  const matchesCalendar = (a: any) => {
    if (!calendarDate) return true
    const s = a.attempt?.submitted_at || a.attempt?.started_at || a.scheduled_date
    return s ? isSameDay(new Date(s), calendarDate) : false
  }

  const filteredOngoing = ongoingAndUpcoming.filter(matchesFilter)
  const filteredCompleted = completedAssessments.filter(a => matchesFilter(a) && matchesCalendar(a))
  const filteredExpired = expiredAssessments.filter(a => {
    if (!matchesFilter(a)) return false
    if (!expiredCalendarDate) return true
    return a.scheduled_date ? isSameDay(new Date(a.scheduled_date), expiredCalendarDate) : false
  })

  const scoreCell = (a: any) => {
    if (a.results_publish_date && new Date(a.results_publish_date) > now)
      return <p className="text-sm font-bold text-slate-500 whitespace-nowrap">To Be Announced</p>
    if (a.attempt?.grade_status === 'pending_manual')
      return <p className="text-xl font-black text-amber-600">Pending</p>
    const qCount = (questionCounts as any)?.[a.id] || 0
    const scored = qCount > 0 ? Math.round((a.attempt?.score ?? 0) / 100 * qCount) : (a.attempt?.score ?? 0)
    const total = qCount > 0 ? qCount : 100
    return (
      <>
        <p className="text-2xl font-black text-cyan-600">{scored}<span className="text-sm text-slate-400">/{total}</span></p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Marks</p>
      </>
    )
  }

  return (
    <DashboardShell
      title="Assessments"
      icon={FileCheck}
      navLinks={[
        { to: '/trainee', label: 'Dashboard', icon: BarChart3 },
        { to: '/trainee/courses', label: 'Course Catalog', icon: Compass },
        { to: '/trainee/my-learning', label: 'My Learning', icon: BookOpen },
        { to: '/trainee/assessments', label: 'Assessments', icon: FileCheck },
        { to: '/trainee/notifications', label: 'Notifications', icon: Bell },
        { to: '/trainee/profile', label: 'Profile', icon: User },
      ]}
    >
      <div className="flex flex-col lg:flex-row gap-6 max-w-full">

        {/* Sidebar */}
        <div className="lg:w-64 shrink-0 flex flex-col gap-3">

          {/* Tabs */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-2 shadow-sm flex flex-col">
            <button onClick={() => setActiveTab('ongoing')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'ongoing' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}>
              <Clock className="w-4 h-4" /> Ongoing &amp; Upcoming
            </button>
            <button onClick={() => setActiveTab('completed')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all mt-1 ${activeTab === 'completed' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}>
              <CheckCircle2 className="w-4 h-4" /> Completed
            </button>
            <button onClick={() => setActiveTab('expired')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all mt-1 ${activeTab === 'expired' ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}>
              <Clock className="w-4 h-4" /> Expired &amp; Missed
            </button>
          </div>

          {/* Calendar — Completed & Expired tabs */}
          {(activeTab === 'completed' || activeTab === 'expired') && (
            <div className="bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden">
              <div className={`text-white text-xs font-bold px-4 py-2.5 tracking-wide ${activeTab === 'expired' ? 'bg-rose-800' : 'bg-[#334155]'}`}>
                Search By Date
              </div>
              <div className="p-3 pt-2">
                {activeTab === 'completed' && (
                  <MiniCalendar selectedDate={calendarDate} onSelectDate={setCalendarDate} highlightedDates={completedDates} />
                )}
                {activeTab === 'expired' && (
                  <MiniCalendar selectedDate={expiredCalendarDate} onSelectDate={setExpiredCalendarDate} highlightedDates={expiredDates} />
                )}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Filters</h3>
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" placeholder="Search assessments..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-medium" />
            </div>
            <div className="relative">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer hover:bg-slate-100 font-medium">
                <option value="all">All Types</option>
                <option value="mock">Mock Test</option>
                <option value="assessment">Assessment Test</option>
                <option value="daily">Daily Test</option>
                <option value="final">Final Test</option>
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-sm min-h-[500px]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-4 border-b border-slate-100 mb-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {activeTab === 'ongoing' && 'Ongoing & Upcoming Assessments'}
              {activeTab === 'completed' && (calendarDate ? `Tests on ${format(calendarDate, 'd MMM yyyy')}` : `Recent Tests (${headingRange})`)}
              {activeTab === 'expired' && (expiredCalendarDate ? `Expired on ${format(expiredCalendarDate, 'd MMM yyyy')}` : `Expired & Missed Assessments`)}
            </h2>
            {(activeTab === 'completed' || activeTab === 'expired') && (
              <span className="text-xs font-medium text-slate-400 whitespace-nowrap">{format(now, 'dd MMM yyyy HH:mm:ss')} India Standard Time</span>
            )}
          </div>
          {activeTab === 'completed' && !calendarDate && (
            <p className="text-xs text-[#1a7a80] font-medium mb-5">You can see older tests by selecting the date corresponding to their start time in the calendar</p>
          )}
          {activeTab === 'expired' && !expiredCalendarDate && (
            <p className="text-xs text-rose-500 font-medium mb-5">You can filter by expiry date by selecting a date in the calendar</p>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <AnimatePresence mode="wait">

              {activeTab === 'ongoing' && (
                <motion.div key="ongoing" variants={fadeUp} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                  {filteredOngoing.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-slate-600">No ongoing assessments at this moment</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredOngoing.map(a => {
                        const isFinal = a.assessment_type === 'final'
                        const isPractice = a.assessment_type === 'mock' || a.assessment_type === 'daily'
                        const isUnlocked = !isFinal || isFinalUnlockedForCourse(a.course_id)
                        const courseEnrollment = enrollmentMap.get(a.course_id)
                        const courseProgress = courseEnrollment?.progress_percent ?? 0

                        return (
                          <div key={a.id} className={`p-6 rounded-3xl bg-white border transition-all flex flex-col justify-between ${
                            !isUnlocked
                              ? 'border-amber-200/90 bg-amber-50/20 shadow-xs'
                              : 'border-slate-200 hover:border-cyan-300 hover:shadow-md'
                          }`}>
                            <div>
                              <div className="flex flex-wrap gap-2 mb-3">
                                <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-cyan-100">{(a.course as any)?.title || 'Course'}</span>
                                {isPractice ? (
                                  <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-slate-200">
                                    {a.assessment_type === 'mock' ? 'Mock Test' : 'Daily Test'} • Practice Only
                                  </span>
                                ) : isFinal ? (
                                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-purple-200">
                                    Final Exam • 50% Weight
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-200">
                                    Assessment • 25% Weight
                                  </span>
                                )}
                              </div>
                              <h3 className="text-base font-bold text-slate-900 mb-3">{a.title}</h3>
                              <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-xs text-slate-600 font-medium"><Clock className="w-3.5 h-3.5 text-cyan-600" /><span>{a.duration_minutes ? `${a.duration_minutes} mins` : 'Untimed'}</span></div>
                                {a.scheduled_date && (
                                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                    <span>{format(new Date(a.scheduled_date), 'MMM do, yyyy')}{a.start_time && ` at ${format(new Date(`2000-01-01T${a.start_time}`), 'h:mm a')}`}{a.end_time && ` to ${format(new Date(`2000-01-01T${a.end_time}`), 'h:mm a')}`}</span>
                                  </div>
                                )}
                              </div>

                              {!isUnlocked && (
                                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-xs text-amber-800">
                                  <span className="font-bold shrink-0">🔒 Locked:</span>
                                  <span>Complete all course modules (currently {courseProgress}%) to unlock this Final Assessment.</span>
                                </div>
                              )}
                            </div>

                            {isUnlocked ? (
                              <Link to={`/trainee/courses/${a.course_id}/assessments/${a.id}`}>
                                {(() => {
                                  let upcoming = false
                                  if (a.scheduled_date) { const s = new Date(a.scheduled_date); s.setHours(0,0,0,0); const t = new Date(); t.setHours(0,0,0,0); if (s > t) upcoming = true }
                                  return (<button className={`w-full py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${upcoming ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:opacity-95 shadow-md'}`}>{upcoming ? (<>Upcoming <Calendar className="w-4 h-4" /></>) : (<>Start Test <PlayCircle className="w-4 h-4" /></>)}</button>)
                                })()}
                              </Link>
                            ) : (
                              <Link to={`/trainee/courses/${a.course_id}/learn`}>
                                <button className="w-full py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300 transition-all">
                                  <span>Complete Modules to Unlock ({courseProgress}%)</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </Link>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'completed' && (
                <motion.div key="completed" variants={fadeUp} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                  {filteredCompleted.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <CheckCircle2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-slate-600">{calendarDate ? `No tests found on ${format(calendarDate, 'd MMM yyyy')}` : 'No completed assessments yet'}</p>
                    </div>
                  ) : (
                    filteredCompleted.map(a => (
                      <div key={a.id} className="border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-5 p-5">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-2 mb-2">
                              <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-cyan-100">{(a.course as any)?.title || 'Course'}</span>
                              {a.assessment_type && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-200">{formatType(a.assessment_type)}</span>}
                            </div>
                            <h3 className="text-base font-bold text-slate-900 truncate">{a.title}</h3>
                            <div className="mt-3 space-y-1 text-xs text-slate-600">
                              {a.scheduled_date && (
                                <div>
                                  <span className="font-bold text-slate-800">Scheduled Start Time &amp; Duration</span>
                                  <span className="ml-2">{format(new Date(`${a.scheduled_date}T${a.start_time || '00:00:00'}`), 'dd MMM, HH:mm')}{a.duration_minutes && <span className="ml-2">&#9203; {a.duration_minutes} min</span>}</span>
                                </div>
                              )}
                              {(a.attempt?.started_at || a.attempt?.submitted_at) && (
                                <div>
                                  <span className="font-bold text-slate-800">Start Time - End Time</span>
                                  <span className="ml-2">{a.attempt.started_at ? format(new Date(a.attempt.started_at), 'dd MMM, HH:mm') : '—'}{' - '}{a.attempt.submitted_at ? format(new Date(a.attempt.submitted_at), 'dd MMM, HH:mm') : '—'}</span>
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-slate-800">Marks Scored</span>
                                <span className="ml-2">{(() => { if (a.results_publish_date && new Date(a.results_publish_date) > now) return 'To Be Announced'; if (a.attempt?.grade_status === 'pending_manual') return 'Pending'; const qc = (questionCounts as any)?.[a.id] || 0; const sc = qc > 0 ? Math.round((a.attempt?.score ?? 0) / 100 * qc) : (a.attempt?.score ?? 0); return `${sc}/${qc > 0 ? qc : 100}`; })()}</span>
                              </div>
                              <div>
                                <span className="font-bold text-slate-800">Completion Status</span>
                                <span className="ml-2">{a.attempt?.grade_status === 'pending_manual' ? 'Pending review' : a.attempt?.submitted_at ? 'Completed' : 'Incomplete'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-center justify-center gap-1 shrink-0 min-w-[72px] text-center">
                            {scoreCell(a)}
                          </div>
                        </div>
                        {!(a.results_publish_date && new Date(a.results_publish_date) > now) && (
                          <Link to={`/trainee/courses/${a.course_id}/assessments/${a.id}`} className="block">
                            <button className="w-full py-2.5 bg-[#3db97a] hover:bg-[#35a36b] text-white text-sm font-bold tracking-wide transition-colors">See Results</button>
                          </Link>
                        )}
                      </div>
                    ))
                  )}
                </motion.div>
              )}

              {activeTab === 'expired' && (
                <motion.div key="expired" variants={fadeUp} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                  {filteredExpired.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Clock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-slate-600">No expired assessments</p>
                    </div>
                  ) : (
                    filteredExpired.map(a => (
                      <div key={a.id} className="p-6 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-75">
                        <div className="flex-1">
                          <div className="flex flex-wrap gap-2 mb-2">
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-rose-200">Expired / Missed</span>
                            {a.assessment_type && <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-slate-300">{formatType(a.assessment_type)}</span>}
                          </div>
                          <h3 className="text-lg font-bold text-slate-900">{a.title}</h3>
                          <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-2"><Calendar className="w-3.5 h-3.5 text-slate-400" />Expired on: {a.scheduled_date ? format(new Date(a.scheduled_date), 'MMM do yyyy') : 'Unknown Date'}</span>
                        </div>
                        <button disabled className="px-5 py-2.5 bg-slate-200 text-slate-500 text-sm font-bold rounded-xl whitespace-nowrap cursor-not-allowed">Missed</button>
                      </div>
                    ))
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
