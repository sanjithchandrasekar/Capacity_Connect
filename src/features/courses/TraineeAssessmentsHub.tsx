import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShell } from '@/pages/Dashboards'
import { BookOpen, Compass, FileCheck, CheckCircle2, Clock, Calendar, Search, Filter, PlayCircle, BarChart3, ChevronRight } from 'lucide-react'
import { format, isFuture, isPast } from 'date-fns'

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
}

export function TraineeAssessmentsHub() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed'>('ongoing')
  const [searchQuery, setSearchQuery] = useState('')

  // 1. Fetch user enrollments to get course IDs
  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['trainee_enrollments_for_assessments', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', profile!.id)
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id
  })

  const courseIds = enrollments?.map(e => e.course_id) || []

  // 2. Fetch assessments for those courses
  const { data: assessments, isLoading: assessmentsLoading } = useQuery({
    queryKey: ['trainee_assessments', courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return []
      const { data, error } = await supabase
        .from('assessments')
        .select(`
          id, 
          title, 
          scheduled_date, 
          start_time, 
          end_time, 
          duration_minutes, 
          passing_score,
          course_id,
          status,
          course:courses(title)
        `)
        .in('course_id', courseIds)
        .eq('status', 'published')
        .order('scheduled_date', { ascending: true })
      
      if (error) throw error
      return data || []
    },
    enabled: courseIds.length > 0
  })

  // 3. Fetch user attempts
  const { data: attempts, isLoading: attemptsLoading } = useQuery({
    queryKey: ['trainee_assessment_attempts', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_attempts' as any)
        .select('id, assessment_id, score, created_at')
        .eq('user_id', profile!.id)
      if (error) throw error
      return (data || []) as any[]
    },
    enabled: !!profile?.id
  })

  const isLoading = enrollmentsLoading || assessmentsLoading || attemptsLoading

  // 4. Categorize assessments
  const attemptedAssessmentIds = new Set(attempts?.map(a => a.assessment_id) || [])
  
  const completedAssessments = (assessments || []).filter(a => attemptedAssessmentIds.has(a.id)).map(a => {
    const attempt = attempts?.find(att => att.assessment_id === a.id)
    return { ...a, attempt }
  })

  const pendingAssessments = (assessments || []).filter(a => !attemptedAssessmentIds.has(a.id))

  const ongoingAndUpcoming = pendingAssessments.filter(a => {
    // If no date, it's always ongoing (self-paced)
    if (!a.scheduled_date) return true
    
    const now = new Date()
    const startStr = `${a.scheduled_date}T${a.start_time || '00:00:00'}`
    const endStr = `${a.scheduled_date}T${a.end_time || '23:59:59'}`
    const startDate = new Date(startStr)
    const endDate = new Date(endStr)
    
    // Ongoing or Upcoming
    return now <= endDate
  })

  // Filter based on search query
  const filteredOngoing = ongoingAndUpcoming.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (a.course as any)?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredCompleted = completedAssessments.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (a.course as any)?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <DashboardShell
      title="Assessments Hub"
      icon={FileCheck}
      navLinks={[
        { to: '/trainee', label: 'Overview', icon: BarChart3 },
        { to: '/trainee/courses', label: 'Course Catalog', icon: Compass },
        { to: '/trainee/my-learning', label: 'My Learning', icon: BookOpen },
        { to: '/trainee/assessments', label: 'Assessments', icon: FileCheck },
      ]}
    >
      <div className="flex flex-col lg:flex-row gap-6 max-w-full">
        
        {/* Left Sidebar Layout (CodeTantra Style) */}
        <div className="lg:w-64 shrink-0 flex flex-col gap-2">
          <div className="bg-[#070E20]/90 border border-cyan-500/30 rounded-2xl p-2 shadow-sm overflow-hidden flex flex-col">
            <button
              onClick={() => setActiveTab('ongoing')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'ongoing' 
                  ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30 shadow-inner' 
                  : 'text-zinc-400 hover:bg-cyan-950/20 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <Clock className="w-4 h-4" />
              Ongoing & Upcoming
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all mt-1 ${
                activeTab === 'completed' 
                  ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-500/30 shadow-inner' 
                  : 'text-zinc-400 hover:bg-cyan-950/20 hover:text-zinc-200 border border-transparent'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Completed
            </button>
          </div>

          {/* Search/Filters */}
          <div className="bg-[#070E20]/90 border border-cyan-500/30 rounded-2xl p-4 shadow-sm mt-4">
            <h3 className="text-xs font-bold text-zinc-200/60 uppercase tracking-wider mb-3">Filters</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/50" />
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-cyan-950/20 border border-cyan-500/30 rounded-xl text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-[#070E20]/90 border border-cyan-500/30 rounded-2xl p-6 shadow-sm min-h-[500px]">
          <h2 className="text-xl font-bold text-zinc-200 mb-6 flex items-center gap-2 pb-4 border-b border-cyan-500/30">
            {activeTab === 'ongoing' ? 'Ongoing & Upcoming Assessments' : 'Completed Assessments'}
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'ongoing' && (
                <motion.div key="ongoing" variants={fadeUp} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                  {filteredOngoing.length === 0 ? (
                    <div className="text-center py-12 bg-cyan-950/10 rounded-2xl border border-dashed border-cyan-500/30">
                      <Calendar className="w-10 h-10 text-cyan-500/30 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-zinc-400">No ongoing assessments at this moment</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredOngoing.map((assessment) => (
                        <div key={assessment.id} className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 hover:border-cyan-400/60 transition-all flex flex-col">
                          <div className="flex-1">
                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2 block">
                              {(assessment.course as any)?.title || 'Course'}
                            </span>
                            <h3 className="text-base font-bold text-zinc-200 mb-3">{assessment.title}</h3>
                            
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center gap-2 text-xs text-zinc-400">
                                <Clock className="w-3.5 h-3.5 text-cyan-400/70" />
                                <span>{assessment.duration_minutes ? `${assessment.duration_minutes} mins` : 'Untimed'}</span>
                              </div>
                              {assessment.scheduled_date && (
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                  <Calendar className="w-3.5 h-3.5 text-orange-400/70" />
                                  <span>
                                    {format(new Date(assessment.scheduled_date), 'MMM do, yyyy')} 
                                    {assessment.start_time && ` at ${assessment.start_time}`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Link to={`/trainee/courses/${assessment.course_id}/assessments/${assessment.id}`}>
                            <button className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-cyan-900/40 transition-all flex items-center justify-center gap-2">
                              Take Test <PlayCircle className="w-4 h-4" />
                            </button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'completed' && (
                <motion.div key="completed" variants={fadeUp} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                  {filteredCompleted.length === 0 ? (
                    <div className="text-center py-12 bg-cyan-950/10 rounded-2xl border border-dashed border-cyan-500/30">
                      <CheckCircle2 className="w-10 h-10 text-cyan-500/30 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-zinc-400">No completed assessments yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {filteredCompleted.map((assessment) => (
                        <div key={assessment.id} className="p-5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 hover:border-cyan-400/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1 block">
                              {(assessment.course as any)?.title || 'Course'}
                            </span>
                            <h3 className="text-lg font-bold text-zinc-200">{assessment.title}</h3>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-xs text-zinc-400 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {assessment.attempt?.created_at ? format(new Date(assessment.attempt.created_at), 'MMM do yyyy, HH:mm') : 'Unknown Date'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-2xl font-extrabold text-cyan-400">
                                {assessment.attempt?.score ?? '-'}<span className="text-sm text-zinc-500">/100</span>
                              </p>
                              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Marks</p>
                            </div>
                            <Link to={`/trainee/courses/${assessment.course_id}/assessments/${assessment.id}`}>
                              <button className="px-5 py-2.5 bg-transparent border-2 border-cyan-500/30 hover:border-cyan-400 text-cyan-400 hover:bg-cyan-950/40 text-sm font-bold rounded-xl transition-all whitespace-nowrap">
                                View Result
                              </button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
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
