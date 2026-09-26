import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import {
  FileCheck, Clock,
  Calendar, Search, PlayCircle, ChevronLeft, ChevronRight,
  Award, Target, Users, Sparkles, ExternalLink, Eye,
  Brain, ShieldAlert, CheckCircle2, XCircle, AlertCircle,
  Loader2, Check, X, Shield, RefreshCw, Plus, Edit, Trash2,
  HelpCircle, Settings, FileText, CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  format, isSameDay, addMonths, subMonths,
  startOfMonth, endOfMonth, eachDayOfInterval, getDay
} from 'date-fns'
import { toast } from 'sonner'

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
}

interface QuestionItem {
  id?: string
  assessment_id: string
  question_text: string
  options: any
  correct_answer: string
  explanation?: string | null
  position?: number
  approved?: boolean
  difficulty?: 'easy' | 'medium' | 'hard' | null
  question_type?: string | null
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
        <button onClick={() => setViewMonth(m => subMonths(m, 1))} className="p-1 rounded hover:bg-slate-100 transition-colors text-slate-500 cursor-pointer">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-slate-700 tracking-wide">{format(viewMonth, 'MMMM yyyy')}</span>
        <button onClick={() => setViewMonth(m => addMonths(m, 1))} className="p-1 rounded hover:bg-slate-100 transition-colors text-slate-500 cursor-pointer">
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
                'relative w-full aspect-square flex items-center justify-center rounded-full text-[11px] font-semibold transition-all cursor-pointer',
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
        <button onClick={() => onSelectDate(null)} className="mt-3 w-full text-[11px] font-semibold text-slate-500 hover:text-rose-500 transition-colors cursor-pointer">
          Clear date filter
        </button>
      )}
    </div>
  )
}

export function AdminAssessmentsHub() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'ongoing' | 'requests' | 'completed' | 'expired'>('ongoing')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [courseFilter, setCourseFilter] = useState('all')
  const [calendarDate, setCalendarDate] = useState<Date | null>(null)
  const [selectedAssessmentForSubmissions, setSelectedAssessmentForSubmissions] = useState<any | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  // Question & Assessment Content Editor States
  const [selectedAssessmentForQuestions, setSelectedAssessmentForQuestions] = useState<any | null>(null)
  const [activeModalTab, setActiveModalTab] = useState<'questions' | 'settings'>('questions')
  const [questionsList, setQuestionsList] = useState<QuestionItem[]>([])
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<{
    id?: string
    question_text: string
    option_a: string
    option_b: string
    option_c: string
    option_d: string
    correct_answer: string
    explanation: string
    difficulty: 'easy' | 'medium' | 'hard'
    question_type: 'mcq' | 'true_false'
  } | null>(null)
  const [isSavingQuestion, setIsSavingQuestion] = useState(false)

  // Assessment Settings Form State
  const [assessmentSettingsForm, setAssessmentSettingsForm] = useState<{
    title: string
    duration_minutes: number
    passing_score: number
    scheduled_date: string
    start_time: string
    end_time: string
    requires_sea: boolean
  }>({
    title: '',
    duration_minutes: 30,
    passing_score: 50,
    scheduled_date: '',
    start_time: '',
    end_time: '',
    requires_sea: false,
  })
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  // Live clock
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 1. Fetch All Courses
  const { data: courses = [] } = useQuery({
    queryKey: ['admin_all_courses_assessments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, status, course_type, trainer:trainers(full_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  // 2. Fetch All Assessments (including published, pending_review, and draft final exams)
  const { data: assessments = [], isLoading: assessmentsLoading, refetch: refetchAssessments } = useQuery({
    queryKey: ['admin_all_assessments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessments')
        .select(`
          id, title, scheduled_date, start_time, end_time, duration_minutes,
          passing_score, course_id, status, assessment_type, requires_sea,
          results_publish_date, created_by,
          course:courses(id, title, course_type, department, trainer:trainers(full_name))
        `)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []) as any[]
    },
  })

  // 3. Fetch Questions Count per assessment
  const assessmentIds = assessments.map(a => a.id)
  const { data: questionCounts = {}, refetch: refetchQuestionCounts } = useQuery({
    queryKey: ['admin_assessment_question_counts', assessmentIds],
    queryFn: async () => {
      if (assessmentIds.length === 0) return {}
      const { data, error } = await supabase
        .from('questions')
        .select('assessment_id')
        .in('assessment_id', assessmentIds)
      if (error) return {}
      const counts: Record<string, number> = {}
      ;(data || []).forEach((q: any) => {
        counts[q.assessment_id] = (counts[q.assessment_id] || 0) + 1
      })
      return counts
    },
    enabled: assessmentIds.length > 0,
  })

  // 4. Fetch All Trainee Assessment Attempts
  const { data: attempts = [] } = useQuery({
    queryKey: ['admin_all_assessment_attempts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assessment_attempts')
        .select(`
          id, assessment_id, user_id, score, started_at, submitted_at, time_taken_seconds,
          grade_status, status,
          user:profiles(id, full_name, email, department, avatar_path)
        `)
        .order('submitted_at', { ascending: false })
      if (error) return []
      return (data || []) as any[]
    },
  })

  const attemptsByAssessment = attempts.reduce((acc: Record<string, any[]>, att: any) => {
    if (!acc[att.assessment_id]) acc[att.assessment_id] = []
    acc[att.assessment_id].push(att)
    return acc
  }, {})

  // Categorize assessments
  const pendingFinalExamRequests = assessments.filter(a => 
    a.status === 'pending_review' || 
    (a.assessment_type === 'final' && (a.status === 'pending_approval' || a.status === 'pending_review'))
  )

  const ongoingAndUpcoming = assessments.filter(a => {
    if (a.status !== 'published') return false
    if (!a.scheduled_date) return true
    const end = new Date(`${a.scheduled_date}T${a.end_time || '23:59:59'}`)
    const start = new Date(`${a.scheduled_date}T${a.start_time || '00:00:00'}`)
    if (end < start) end.setDate(end.getDate() + 1)
    return now <= end
  })

  const expiredAssessments = assessments.filter(a => {
    if (a.status !== 'published') return false
    if (!a.scheduled_date) return false
    const end = new Date(`${a.scheduled_date}T${a.end_time || '23:59:59'}`)
    const start = new Date(`${a.scheduled_date}T${a.start_time || '00:00:00'}`)
    if (end < start) end.setDate(end.getDate() + 1)
    return now > end
  })

  const assessmentsWithSubmissions = assessments.filter(a => {
    const atts = attemptsByAssessment[a.id] || []
    return atts.length > 0
  })

  const formatType = (t: string) =>
    t === 'daily'
      ? 'Daily Test (Practice)'
      : t === 'mock'
      ? 'Mock Test (Practice)'
      : t === 'assessment'
      ? 'Regular Assessment (25% Weight)'
      : t === 'final'
      ? 'Final Assessment (50% Weight)'
      : 'Test'

  const matchesFilter = (a: any) => {
    const ms =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.course as any)?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.assessment_type && formatType(a.assessment_type).toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesType = filterType === 'all' || a.assessment_type === filterType
    const matchesCourse = courseFilter === 'all' || a.course_id === courseFilter
    const matchesCal = !calendarDate || (a.scheduled_date && isSameDay(new Date(a.scheduled_date), calendarDate))

    return ms && matchesType && matchesCourse && matchesCal
  }

  const filteredOngoing = ongoingAndUpcoming.filter(matchesFilter)
  const filteredRequests = pendingFinalExamRequests.filter(matchesFilter)
  const filteredCompleted = assessmentsWithSubmissions.filter(matchesFilter)
  const filteredExpired = expiredAssessments.filter(matchesFilter)

  const highlightedDates = assessments
    .map(a => (a.scheduled_date ? new Date(a.scheduled_date) : null))
    .filter(Boolean) as Date[]

  // Load questions for an assessment
  const fetchQuestionsForAssessment = async (assessment: any) => {
    setSelectedAssessmentForQuestions(assessment)
    setActiveModalTab('questions')
    setEditingQuestion(null)
    setQuestionsLoading(true)

    setAssessmentSettingsForm({
      title: assessment.title || '',
      duration_minutes: assessment.duration_minutes || 30,
      passing_score: assessment.passing_score ?? 50,
      scheduled_date: assessment.scheduled_date || '',
      start_time: assessment.start_time || '',
      end_time: assessment.end_time || '',
      requires_sea: !!assessment.requires_sea,
    })

    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('assessment_id', assessment.id)
        .order('position', { ascending: true })

      if (error) throw error
      setQuestionsList((data || []) as QuestionItem[])
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to load questions for this assessment')
    } finally {
      setQuestionsLoading(false)
    }
  }

  // Parse options helper
  const parseQuestionOptions = (options: any) => {
    if (!options) return { A: '', B: '', C: '', D: '', raw: [] }
    if (typeof options === 'object') {
      if (Array.isArray(options)) {
        return {
          A: options[0] || '',
          B: options[1] || '',
          C: options[2] || '',
          D: options[3] || '',
          raw: options
        }
      }
      return {
        A: options.A || options.a || '',
        B: options.B || options.b || '',
        C: options.C || options.c || '',
        D: options.D || options.d || '',
        raw: Object.values(options).filter(v => typeof v === 'string')
      }
    }
    return { A: '', B: '', C: '', D: '', raw: [] }
  }

  // Save/Update Question
  const handleSaveQuestion = async () => {
    if (!selectedAssessmentForQuestions || !editingQuestion) return
    if (!editingQuestion.question_text.trim()) {
      toast.error('Please enter question text')
      return
    }

    if (editingQuestion.question_type === 'mcq') {
      if (!editingQuestion.option_a.trim() || !editingQuestion.option_b.trim()) {
        toast.error('Please provide at least Option A and Option B')
        return
      }
    }

    setIsSavingQuestion(true)
    try {
      const optionsPayload = {
        ...(editingQuestion.question_type === 'mcq'
          ? {
              A: editingQuestion.option_a.trim(),
              B: editingQuestion.option_b.trim(),
              C: editingQuestion.option_c.trim(),
              D: editingQuestion.option_d.trim(),
            }
          : {
              A: 'True',
              B: 'False',
            }),
        _question_type: editingQuestion.question_type,
        _difficulty: editingQuestion.difficulty,
      }

      const qPayload = {
        assessment_id: selectedAssessmentForQuestions.id,
        question_text: editingQuestion.question_text.trim(),
        options: optionsPayload,
        correct_answer: editingQuestion.correct_answer,
        explanation: editingQuestion.explanation.trim() || null,
        approved: true,
        difficulty: editingQuestion.difficulty,
        question_type: editingQuestion.question_type,
      }

      if (editingQuestion.id) {
        const { error } = await supabase
          .from('questions')
          .update(qPayload as any)
          .eq('id', editingQuestion.id)
        if (error) throw error
        toast.success('Question updated successfully')
      } else {
        const { error } = await supabase
          .from('questions')
          .insert({
            ...qPayload,
            position: questionsList.length + 1,
          } as any)
        if (error) throw error
        toast.success('Question added successfully')
      }

      // Refetch questions
      const { data } = await supabase
        .from('questions')
        .select('*')
        .eq('assessment_id', selectedAssessmentForQuestions.id)
        .order('position', { ascending: true })
      setQuestionsList((data || []) as QuestionItem[])
      setEditingQuestion(null)
      refetchQuestionCounts()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to save question')
    } finally {
      setIsSavingQuestion(false)
    }
  }

  // Delete Question
  const handleDeleteQuestion = async (questionId: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return

    try {
      const { error } = await supabase.from('questions').delete().eq('id', questionId)
      if (error) throw error
      toast.success('Question deleted')
      setQuestionsList(prev => prev.filter(q => q.id !== questionId))
      refetchQuestionCounts()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to delete question')
    }
  }

  // Save Assessment Settings
  const handleSaveAssessmentSettings = async () => {
    if (!selectedAssessmentForQuestions) return
    setIsSavingSettings(true)
    try {
      const { error } = await supabase
        .from('assessments')
        .update({
          title: assessmentSettingsForm.title.trim(),
          duration_minutes: Number(assessmentSettingsForm.duration_minutes),
          passing_score: Number(assessmentSettingsForm.passing_score),
          scheduled_date: assessmentSettingsForm.scheduled_date || null,
          start_time: assessmentSettingsForm.start_time || null,
          end_time: assessmentSettingsForm.end_time || null,
          requires_sea: assessmentSettingsForm.requires_sea,
        } as any)
        .eq('id', selectedAssessmentForQuestions.id)

      if (error) throw error
      toast.success('Assessment settings updated successfully')
      refetchAssessments()
      setSelectedAssessmentForQuestions((prev: any) => ({
        ...prev,
        ...assessmentSettingsForm,
      }))
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to update assessment settings')
    } finally {
      setIsSavingSettings(false)
    }
  }

  // Action: Approve Final Exam Request
  const handleApproveFinalExam = async (assessment: any) => {
    setProcessingId(assessment.id)
    try {
      // 1. Update assessment status to published
      const { error: aErr } = await supabase
        .from('assessments')
        .update({ status: 'published' })
        .eq('id', assessment.id)

      if (aErr) throw aErr

      // 2. Approve all associated questions
      await supabase
        .from('questions')
        .update({ approved: true } as any)
        .eq('assessment_id', assessment.id)

      // 3. Notify trainer
      if (assessment.created_by) {
        await supabase.from('notifications').insert({
          user_id: assessment.created_by,
          type: 'assessment',
          title: 'Final Exam Approved',
          message: `Your final exam "${assessment.title}" for "${assessment.course?.title || 'course'}" has been approved and published by Admin.`,
        })
      }

      // 4. Notify enrolled trainees
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('user_id')
        .eq('course_id', assessment.course_id)
        .in('status', ['enrolled', 'in_progress', 'completed'])

      if (enrollments && enrollments.length > 0) {
        const notifs = enrollments.map(en => ({
          user_id: en.user_id,
          type: 'assessment',
          title: 'Final Examination Published',
          message: `The official final examination for "${assessment.course?.title || 'course'}" is now scheduled and published.`,
        }))
        await supabase.from('notifications').insert(notifs)
      }

      toast.success('Final Exam approved and published successfully!')
      refetchAssessments()
      queryClient.invalidateQueries({ queryKey: ['admin_all_assessments'] })
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to approve final exam')
    } finally {
      setProcessingId(null)
    }
  }

  // Action: Reject / Send back Final Exam
  const handleRejectFinalExam = async (assessment: any) => {
    setProcessingId(assessment.id)
    try {
      const { error } = await supabase
        .from('assessments')
        .update({ status: 'draft' })
        .eq('id', assessment.id)

      if (error) throw error

      if (assessment.created_by) {
        await supabase.from('notifications').insert({
          user_id: assessment.created_by,
          type: 'assessment',
          title: 'Final Exam Revision Requested',
          message: `Admin requested changes on final exam "${assessment.title}" for "${assessment.course?.title || 'course'}". Status has been returned to draft.`,
        })
      }

      toast.info('Final Exam request sent back to Trainer for revision')
      refetchAssessments()
      queryClient.invalidateQueries({ queryKey: ['admin_all_assessments'] })
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to return final exam')
    } finally {
      setProcessingId(null)
    }
  }

  // Stats
  const totalTests = assessments.length
  const finalExamsCount = assessments.filter(a => a.assessment_type === 'final').length
  const totalSubmissions = attempts.length
  const activeCount = ongoingAndUpcoming.length
  const pendingRequestsCount = pendingFinalExamRequests.length

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-[#040814] via-[#091834] to-[#0f2752] text-white shadow-xl border border-cyan-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-semibold mb-2 border border-white/15">
              <FileCheck className="w-3.5 h-3.5" />
              <span>Assessment & Evaluation Governance</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1">
              Course Assessments Hub
            </h2>
            <p className="text-slate-300 text-sm">
              Review and edit assessment questions, verify trainer final exam requests, and manage test schedules.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
              <span className="text-[10px] text-slate-300 uppercase font-bold tracking-wider block">Total Tests</span>
              <span className="text-xl font-black text-white">{totalTests}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
              <span className="text-[10px] text-cyan-300 uppercase font-bold tracking-wider block">Active Tests</span>
              <span className="text-xl font-black text-cyan-300">{activeCount}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
              <span className="text-[10px] text-purple-300 uppercase font-bold tracking-wider block">Final Exams</span>
              <span className="text-xl font-black text-purple-300">{finalExamsCount}</span>
            </div>
            <div className={`backdrop-blur-md rounded-2xl p-3 border text-center transition-all ${
              pendingRequestsCount > 0 ? 'bg-amber-500/20 border-amber-500/40 ring-1 ring-amber-400/40' : 'bg-white/10 border-white/10'
            }`}>
              <span className="text-[10px] text-amber-300 uppercase font-bold tracking-wider block">Final Requests</span>
              <span className="text-xl font-black text-amber-300">{pendingRequestsCount}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 text-center">
              <span className="text-[10px] text-emerald-300 uppercase font-bold tracking-wider block">Submissions</span>
              <span className="text-xl font-black text-emerald-300">{totalSubmissions}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Filters + Sidebar Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left 3 Columns: Assessments List */}
        <div className="lg:col-span-3 space-y-5">
          
          {/* Controls Bar - Split into Distinct Clean Rows */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
            
            {/* Row 1: Search & Course Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search assessment name, course title, or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white transition-all"
                />
              </div>

              {/* Course filter dropdown */}
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="py-2.5 px-3.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Courses ({courses.length})</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            {/* Row 2: Status Lifecycle Tabs (Dedicated Row) */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'ongoing', label: 'Ongoing & Scheduled', count: filteredOngoing.length, isWarning: false },
                  { id: 'requests', label: 'Trainer Final Exam Requests', count: filteredRequests.length, isWarning: true },
                  { id: 'completed', label: 'Completed & Submissions', count: filteredCompleted.length, isWarning: false },
                  { id: 'expired', label: 'Past / Expired', count: filteredExpired.length, isWarning: false },
                ].map(tab => {
                  const isSelected = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? tab.isWarning && tab.count > 0
                            ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/20'
                            : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm shadow-cyan-600/20'
                          : tab.isWarning && tab.count > 0
                          ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                          : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-transparent'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : tab.isWarning && tab.count > 0
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Row 3: Evaluation Category / Weight Filter (Dedicated Row) */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-2.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
                Evaluation Type:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: 'All Types' },
                  { id: 'final', label: 'Final Exam (50% Grade)' },
                  { id: 'assessment', label: 'Regular Assessment (25% Weight)' },
                  { id: 'mock', label: 'Mock Test (Practice)' },
                  { id: 'daily', label: 'Daily Test (Practice)' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setFilterType(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                      filterType === t.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Assessment Cards List */}
          {assessmentsLoading ? (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-400 font-medium border border-slate-200 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
              <span>Loading assessments...</span>
            </div>
          ) : (() => {
            const currentList =
              activeTab === 'ongoing' ? filteredOngoing :
              activeTab === 'requests' ? filteredRequests :
              activeTab === 'completed' ? filteredCompleted :
              filteredExpired

            if (currentList.length === 0) {
              return (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {activeTab === 'requests' ? 'No pending Final Exam requests' : 'No assessments found'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {activeTab === 'requests'
                      ? 'All final exam submissions from trainers have been reviewed and processed.'
                      : searchQuery || filterType !== 'all' || courseFilter !== 'all' || calendarDate
                      ? 'Try adjusting the search query or clearing the active filters.'
                      : 'No scheduled assessments in this category.'}
                  </p>
                </div>
              )
            }

            return (
              <div className="space-y-4">
                {currentList.map((a: any) => {
                  const qCount = questionCounts[a.id] || 0
                  const isFinal = a.assessment_type === 'final'
                  const isPractice = a.assessment_type === 'mock' || a.assessment_type === 'daily'
                  const atts = attemptsByAssessment[a.id] || []
                  const isPendingReview = a.status === 'pending_review' || a.status === 'pending_approval'

                  return (
                    <motion.div
                      key={a.id}
                      variants={fadeUp}
                      className={`bg-white border rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-4 ${
                        isPendingReview
                          ? 'border-amber-300 ring-1 ring-amber-200/60 bg-gradient-to-br from-amber-50/20 via-white to-white'
                          : 'border-slate-200/90 hover:border-cyan-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Course Badge */}
                            <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                              {(a.course as any)?.title || 'Course'}
                            </span>

                            {/* Assessment Type Badge */}
                            {isFinal ? (
                              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                                <Award className="w-3 h-3 text-purple-600" /> Final Exam (50% Grade)
                              </span>
                            ) : isPractice ? (
                              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                                <Brain className="w-3 h-3 text-slate-500" /> {a.assessment_type === 'mock' ? 'Mock Test' : 'Daily Test'} (Practice)
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                                <Target className="w-3 h-3 text-amber-600" /> Regular Assessment (25% Weight)
                              </span>
                            )}

                            {/* Review Pending Badge */}
                            {isPendingReview && (
                              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-white flex items-center gap-1 animate-pulse">
                                <Clock className="w-3 h-3" /> Trainer Approval Requested
                              </span>
                            )}

                            {a.requires_sea && (
                              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-rose-500" /> SEA Enabled
                              </span>
                            )}
                          </div>

                          <h3 className="text-base sm:text-lg font-bold text-slate-900 pt-0.5">
                            {a.title}
                          </h3>
                        </div>

                        {/* Submissions Count Badge */}
                        <div className="shrink-0 text-right">
                          <span className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl inline-flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-cyan-600" />
                            <span>{atts.length} Submissions</span>
                          </span>
                        </div>
                      </div>

                      {/* Info Row: Date, Duration, Questions, Passing Score */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{a.scheduled_date ? format(new Date(a.scheduled_date), 'd MMM yyyy') : 'Self-Paced'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>{a.duration_minutes || 30} mins {a.start_time ? `(${a.start_time})` : ''}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-cyan-600" />
                          <span>{qCount} Questions</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Pass Threshold: {a.passing_score ?? 50}%</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <div className="text-[11px] text-slate-500 font-medium">
                          Trainer: <span className="font-bold text-slate-700">{(a.course as any)?.trainer?.full_name || 'Assigned Instructor'}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Trainer Final Exam Decision Actions (Approve / Reject) */}
                          {isPendingReview ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApproveFinalExam(a)}
                                disabled={processingId === a.id}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-4 py-2 shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                {processingId === a.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                <span>Approve & Publish Final Exam</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectFinalExam(a)}
                                disabled={processingId === a.id}
                                className="border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs rounded-xl px-3.5 py-2 flex items-center gap-1.5 cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Send Back to Trainer</span>
                              </Button>
                            </>
                          ) : null}

                          {/* View & Update Questions Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fetchQuestionsForAssessment(a)}
                            className="bg-cyan-50/80 border-cyan-200 text-cyan-800 hover:bg-cyan-100 font-bold text-xs rounded-xl px-3.5 py-2 flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-cyan-600" />
                            <span>Questions ({qCount})</span>
                          </Button>

                          {/* Preview / Take Test Button */}
                          <Button
                            size="sm"
                            onClick={() => {
                              window.open(`/trainee/courses/${a.course_id}/assessments/${a.id}`, '_blank')
                            }}
                            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl px-4 py-2 shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>Preview Test Player</span>
                            <ExternalLink className="w-3 h-3 opacity-70 ml-0.5" />
                          </Button>

                          {/* Submissions Button */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAssessmentForSubmissions(a)}
                            className="border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-xl px-3.5 py-2 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                            <span>Submissions ({atts.length})</span>
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )
          })()}
        </div>

        {/* Right 1 Column: Mini Calendar Widget */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Calendar className="w-4 h-4 text-cyan-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Assessment Calendar</h3>
            </div>
            <MiniCalendar
              selectedDate={calendarDate}
              onSelectDate={setCalendarDate}
              highlightedDates={highlightedDates}
            />
          </div>

          <div className="bg-cyan-50/50 border border-cyan-200/70 rounded-3xl p-5 shadow-xs space-y-2 text-xs text-cyan-950">
            <h4 className="font-bold flex items-center gap-1.5 text-cyan-900">
              <Sparkles className="w-3.5 h-3.5 text-cyan-600" /> Grading Model Key
            </h4>
            <ul className="space-y-1.5 text-[11px] text-cyan-800">
              <li>• <strong>Course Modules:</strong> 25% course completion mark.</li>
              <li>• <strong>Regular Assessments:</strong> 25% weight (average of tests).</li>
              <li>• <strong>Final Assessment:</strong> 50% weight (unlocked after 100% modules).</li>
              <li>• <strong>Mock & Daily:</strong> 0% weight practice only.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Questions & Content Editor Dialog */}
      <Dialog
        open={!!selectedAssessmentForQuestions}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAssessmentForQuestions(null)
            setEditingQuestion(null)
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl p-6 sm:p-7 space-y-5">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-600" />
                  <span>{selectedAssessmentForQuestions?.title}</span>
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Course: <span className="font-bold text-slate-700">{selectedAssessmentForQuestions?.course?.title}</span> &bull; {formatType(selectedAssessmentForQuestions?.assessment_type)}
                </p>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('questions')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeModalTab === 'questions'
                      ? 'bg-white text-cyan-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Questions ({questionsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('settings')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeModalTab === 'settings'
                      ? 'bg-white text-cyan-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Test Settings
                </button>
              </div>
            </div>
          </DialogHeader>

          {/* TAB 1: QUESTIONS LIST & QUESTION EDITOR */}
          {activeModalTab === 'questions' && (
            <div className="space-y-5">
              {/* Question Editor Form (when editing/adding) */}
              {editingQuestion ? (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Edit className="w-4 h-4 text-cyan-600" />
                      <span>{editingQuestion.id ? 'Edit Question' : 'Add New Question'}</span>
                    </h4>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingQuestion(null)}
                      className="text-xs text-slate-500 hover:text-slate-900"
                    >
                      Cancel
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Question Text *
                      </label>
                      <Textarea
                        rows={3}
                        placeholder="Type the question prompt here..."
                        value={editingQuestion.question_text}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                        className="bg-white text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Question Type
                        </label>
                        <select
                          value={editingQuestion.question_type}
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, question_type: e.target.value as any })}
                          className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl"
                        >
                          <option value="mcq">Multiple Choice (4 Options)</option>
                          <option value="true_false">True / False</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1">
                          Difficulty Level
                        </label>
                        <select
                          value={editingQuestion.difficulty}
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as any })}
                          className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 rounded-xl capitalize"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                    </div>

                    {/* Options (MCQ) */}
                    {editingQuestion.question_type === 'mcq' ? (
                      <div className="space-y-2.5 pt-2">
                        <label className="text-xs font-bold text-slate-700 block">
                          Options & Correct Answer Choice *
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {[
                            { key: 'option_a', letter: 'A' },
                            { key: 'option_b', letter: 'B' },
                            { key: 'option_c', letter: 'C' },
                            { key: 'option_d', letter: 'D' },
                          ].map(opt => {
                            const isCorrect = editingQuestion.correct_answer === opt.letter
                            return (
                              <div
                                key={opt.key}
                                className={`flex items-center gap-2 p-2 rounded-xl border bg-white ${
                                  isCorrect ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setEditingQuestion({ ...editingQuestion, correct_answer: opt.letter })}
                                  className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 cursor-pointer ${
                                    isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                  title="Mark as correct option"
                                >
                                  {opt.letter}
                                </button>
                                <Input
                                  placeholder={`Option ${opt.letter} text...`}
                                  value={(editingQuestion as any)[opt.key]}
                                  onChange={(e) => setEditingQuestion({ ...editingQuestion, [opt.key]: e.target.value })}
                                  className="h-8 text-xs border-0 focus-visible:ring-0 p-1"
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      /* True / False Options */
                      <div className="space-y-2 pt-2">
                        <label className="text-xs font-bold text-slate-700 block">
                          Correct Answer *
                        </label>
                        <div className="flex gap-3">
                          {['True', 'False'].map(val => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setEditingQuestion({ ...editingQuestion, correct_answer: val })}
                              className={`px-5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                editingQuestion.correct_answer === val
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Explanation */}
                    <div className="pt-2">
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Explanation (Displayed to trainees upon test completion)
                      </label>
                      <Input
                        placeholder="Why is this answer correct?"
                        value={editingQuestion.explanation}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                        className="bg-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingQuestion(null)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveQuestion}
                      disabled={isSavingQuestion}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs"
                    >
                      {isSavingQuestion ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                      Save Question
                    </Button>
                  </div>
                </motion.div>
              ) : (
                /* Header row with Add Question button */
                <div className="flex items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Assessment Question Pool
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Total: <span className="font-bold text-slate-800">{questionsList.length} Questions</span>
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingQuestion({
                        question_text: '',
                        option_a: '',
                        option_b: '',
                        option_c: '',
                        option_d: '',
                        correct_answer: 'A',
                        explanation: '',
                        difficulty: 'medium',
                        question_type: 'mcq',
                      })
                    }}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Question
                  </Button>
                </div>
              )}

              {/* Questions List */}
              {questionsLoading ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-600" />
                  <span className="text-xs">Loading questions...</span>
                </div>
              ) : questionsList.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No questions found in this assessment</p>
                  <p className="text-[11px] text-slate-400">Click "+ Add Question" to create the first question item.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                  {questionsList.map((q, idx) => {
                    const opts = parseQuestionOptions(q.options)
                    const isTF = (q.options as any)?._question_type === 'true_false'

                    return (
                      <div
                        key={q.id || idx}
                        className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-cyan-300 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-800 text-xs font-extrabold flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-slate-900 leading-snug">
                                {q.question_text}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] font-semibold text-slate-600 capitalize">
                                  {q.difficulty || (q.options as any)?._difficulty || 'medium'}
                                </Badge>
                                <span className="text-[11px] text-slate-400">
                                  {isTF ? 'True/False' : 'Multiple Choice'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Question Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingQuestion({
                                  id: q.id,
                                  question_text: q.question_text,
                                  option_a: opts.A,
                                  option_b: opts.B,
                                  option_c: opts.C,
                                  option_d: opts.D,
                                  correct_answer: q.correct_answer,
                                  explanation: q.explanation || '',
                                  difficulty: q.difficulty || (q.options as any)?._difficulty || 'medium',
                                  question_type: isTF ? 'true_false' : 'mcq',
                                })
                              }}
                              className="h-8 text-xs font-bold border-slate-200 hover:bg-slate-100"
                            >
                              <Edit className="w-3.5 h-3.5 mr-1 text-slate-500" /> Edit
                            </Button>
                            {q.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteQuestion(q.id!)}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Options Display */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {isTF ? (
                            ['True', 'False'].map(optVal => {
                              const isCorrect = q.correct_answer === optVal
                              return (
                                <div
                                  key={optVal}
                                  className={`p-2 rounded-xl text-xs flex items-center gap-2 border ${
                                    isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  {isCorrect && <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                  <span>{optVal}</span>
                                </div>
                              )
                            })
                          ) : (
                            [
                              { letter: 'A', text: opts.A },
                              { letter: 'B', text: opts.B },
                              { letter: 'C', text: opts.C },
                              { letter: 'D', text: opts.D },
                            ]
                              .filter(item => Boolean(item.text))
                              .map(item => {
                                const isCorrect = q.correct_answer === item.letter || q.correct_answer === item.text
                                return (
                                  <div
                                    key={item.letter}
                                    className={`p-2 rounded-xl text-xs flex items-center gap-2 border ${
                                      isCorrect ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    <span className={`w-5 h-5 rounded-md text-[10px] font-extrabold flex items-center justify-center shrink-0 ${
                                      isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                                    }`}>
                                      {item.letter}
                                    </span>
                                    <span className="truncate">{item.text}</span>
                                  </div>
                                )
                              })
                          )}
                        </div>

                        {/* Explanation Note */}
                        {q.explanation && (
                          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            <strong>Explanation:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ASSESSMENT SETTINGS */}
          {activeModalTab === 'settings' && (
            <div className="space-y-4 p-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Assessment Title *
                  </label>
                  <Input
                    value={assessmentSettingsForm.title}
                    onChange={(e) => setAssessmentSettingsForm({ ...assessmentSettingsForm, title: e.target.value })}
                    className="text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Duration (Minutes) *
                  </label>
                  <Input
                    type="number"
                    min={5}
                    max={360}
                    value={assessmentSettingsForm.duration_minutes}
                    onChange={(e) => setAssessmentSettingsForm({ ...assessmentSettingsForm, duration_minutes: Number(e.target.value) })}
                    className="text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Passing Threshold Score (%) *
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={assessmentSettingsForm.passing_score}
                    onChange={(e) => setAssessmentSettingsForm({ ...assessmentSettingsForm, passing_score: Number(e.target.value) })}
                    className="text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Scheduled Date
                  </label>
                  <Input
                    type="date"
                    value={assessmentSettingsForm.scheduled_date}
                    onChange={(e) => setAssessmentSettingsForm({ ...assessmentSettingsForm, scheduled_date: e.target.value })}
                    className="text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Start Time - End Time
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="time"
                      value={assessmentSettingsForm.start_time}
                      onChange={(e) => setAssessmentSettingsForm({ ...assessmentSettingsForm, start_time: e.target.value })}
                      className="text-sm"
                    />
                    <Input
                      type="time"
                      value={assessmentSettingsForm.end_time}
                      onChange={(e) => setAssessmentSettingsForm({ ...assessmentSettingsForm, end_time: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 pt-2">
                  <label className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentSettingsForm.requires_sea}
                      onChange={(e) => setAssessmentSettingsForm({ ...assessmentSettingsForm, requires_sea: e.target.checked })}
                      className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Require Secure Evaluation Browser (SEA Proctored Mode)</span>
                      <span className="text-[11px] text-slate-500">Locks full-screen environment and blocks tab switches during assessment execution.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  onClick={handleSaveAssessmentSettings}
                  disabled={isSavingSettings}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs"
                >
                  {isSavingSettings ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                  Save Assessment Settings
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Submissions Dialog */}
      <Dialog
        open={!!selectedAssessmentForSubmissions}
        onOpenChange={(open) => {
          if (!open) setSelectedAssessmentForSubmissions(null)
        }}
      >
        <DialogContent className="max-w-2xl bg-white rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-600" />
              <span>Trainee Submissions — {selectedAssessmentForSubmissions?.title}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-3">
            {(() => {
              if (!selectedAssessmentForSubmissions) return null
              const atts = attemptsByAssessment[selectedAssessmentForSubmissions.id] || []
              if (atts.length === 0) {
                return (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-100">
                    No trainees have submitted this assessment yet.
                  </div>
                )
              }

              return (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold text-left bg-slate-50">
                        <th className="px-3 py-2.5">Trainee</th>
                        <th className="px-3 py-2.5">Submitted</th>
                        <th className="px-3 py-2.5">Score</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5 text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {atts.map((att: any) => {
                        const isPassed = (att.score ?? 0) >= (selectedAssessmentForSubmissions.passing_score ?? 50)
                        return (
                          <tr key={att.id} className="hover:bg-slate-50/80">
                            <td className="px-3 py-2.5">
                              <p className="font-bold text-slate-900">{att.user?.full_name || 'Trainee'}</p>
                              <p className="text-[10px] text-slate-400">{att.user?.email}</p>
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">
                              {att.submitted_at ? format(new Date(att.submitted_at), 'd MMM yyyy, HH:mm') : '—'}
                            </td>
                            <td className="px-3 py-2.5 font-bold text-slate-900">
                              {att.score !== null ? `${att.score}%` : 'Pending'}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                isPassed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {isPassed ? 'Passed' : 'Failed'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  window.open(`/trainee/courses/${selectedAssessmentForSubmissions.course_id}/assessments/${selectedAssessmentForSubmissions.id}/result/${att.id}`, '_blank')
                                }}
                                className="h-7 text-[10px] px-2.5 border-slate-200 text-cyan-700 hover:bg-cyan-50"
                              >
                                View Answers
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
