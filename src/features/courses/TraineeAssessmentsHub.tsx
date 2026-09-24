import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShell } from '@/pages/Dashboards'
import { BookOpen, Compass, FileCheck, CheckCircle2, Clock, Calendar, Search, Filter, PlayCircle, BarChart3, ChevronRight, User } from 'lucide-react'
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
        { to: '/trainee', label: 'Dashboard', icon: BarChart3 },
        { to: '/trainee/courses', label: 'Course Catalog', icon: Compass },
        { to: '/trainee/my-learning', label: 'My Learning', icon: BookOpen },
        { to: '/trainee/assessments', label: 'Assessments', icon: FileCheck },
        { to: '/trainee/profile', label: 'Profile', icon: User },
      ]}
    >
      <div className="flex flex-col lg:flex-row gap-6 max-w-full">
        
        {/* Left Sidebar Layout */}
        <div className="lg:w-64 shrink-0 flex flex-col gap-2">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-2 shadow-sm overflow-hidden flex flex-col">
            <button
              onClick={() => setActiveTab('ongoing')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'ongoing' 
                  ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <Clock className="w-4 h-4" />
              Ongoing & Upcoming
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all mt-1 ${
                activeTab === 'completed' 
                  ? 'bg-cyan-50 text-cyan-700 border border-cyan-200 shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Completed
            </button>
          </div>

          {/* Search/Filters */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm mt-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Filters</h3>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-medium"
              />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-sm min-h-[500px]">
          <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2 pb-4 border-b border-slate-100 tracking-tight">
            {activeTab === 'ongoing' ? 'Ongoing & Upcoming Assessments' : 'Completed Assessments'}
          </h2>

          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
            </div>
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
                      {filteredOngoing.map((assessment) => (
                        <div key={assessment.id} className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-cyan-300 hover:shadow-md transition-all flex flex-col justify-between">
                          <div className="flex-1">
                            <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-3 inline-block border border-cyan-100">
                              {(assessment.course as any)?.title || 'Course'}
                            </span>
                            <h3 className="text-base font-bold text-slate-900 mb-3">{assessment.title}</h3>
                            
                            <div className="space-y-2 mb-6">
                              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                <Clock className="w-3.5 h-3.5 text-cyan-600" />
                                <span>{assessment.duration_minutes ? `${assessment.duration_minutes} mins` : 'Untimed'}</span>
                              </div>
                              {assessment.scheduled_date && (
                                <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                                  <span>
                                    {format(new Date(assessment.scheduled_date), 'MMM do, yyyy')} 
                                    {assessment.start_time && ` at ${assessment.start_time}`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Link to={`/trainee/courses/${assessment.course_id}/assessments/${assessment.id}`}>
                            <button className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white text-sm font-bold rounded-xl shadow-md shadow-cyan-600/10 transition-all flex items-center justify-center gap-2">
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
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <CheckCircle2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-slate-600">No completed assessments yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {filteredCompleted.map((assessment) => (
                        <div key={assessment.id} className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider mb-2 inline-block border border-cyan-100">
                              {(assessment.course as any)?.title || 'Course'}
                            </span>
                            <h3 className="text-lg font-bold text-slate-900">{assessment.title}</h3>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {assessment.attempt?.created_at ? format(new Date(assessment.attempt.created_at), 'MMM do yyyy, HH:mm') : 'Unknown Date'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-center">
                              <p className="text-2xl font-black text-cyan-600">
                                {assessment.attempt?.score ?? '-'}<span className="text-sm text-slate-400">/100</span>
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marks</p>
                            </div>
                            <Link to={`/trainee/courses/${assessment.course_id}/assessments/${assessment.id}`}>
                              <button className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-all whitespace-nowrap shadow-sm">
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
