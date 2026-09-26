import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { DashboardShell } from '@/pages/Dashboards'
import { BookOpen, Compass, BookMarked, PlayCircle, CheckCircle2, Clock, Sparkles, FileCheck, User, BarChart3, Award, Loader2, Bell } from 'lucide-react'
import { Thumbnail } from '@/components/ui/Thumbnail'
import { toast } from 'sonner'
import { generateTraineeCertificate, triggerFileDownload } from '@/lib/certificateGenerator'

import { calculateCourseGradeBreakdown } from '@/lib/courseGrading'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }

export function TraineeMyLearning() {
  const { user, profile } = useAuth()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const { data: enrollments, isLoading: isEnrollmentsLoading } = useQuery({
    queryKey: ['my_learning', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          status,
          progress_percent,
          enrolled_at,
          course:courses!enrollments_course_id_fkey(
            id,
            title,
            status,
            course_type,
            thumbnail_path,
            duration_minutes,
            passing_score,
            certificate_template_url,
            has_certificate,
            trainer:trainers!courses_trainer_id_fkey(full_name)
          )
        `)
        .eq('user_id', profile!.id)
        .order('enrolled_at', { ascending: false })

      if (error) throw error
      return ((data || []) as any[]).filter((e: any) => e.course && e.course.status !== 'archived')
    },
    enabled: !!profile?.id
  })

  const courseIds = (enrollments as any[])?.map((e: any) => e.course?.id).filter(Boolean) || []

  const { data: allAssessments = [] } = useQuery({
    queryKey: ['my_learning_assessments', courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return []
      const { data, error } = await supabase
        .from('assessments')
        .select('id, title, assessment_type, course_id, passing_score')
        .in('course_id', courseIds)
        .eq('status', 'published')
      if (error) return []
      return data || []
    },
    enabled: courseIds.length > 0,
  })

  const { data: allAttempts = [] } = useQuery({
    queryKey: ['my_learning_attempts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('assessment_attempts' as any)
        .select('*')
        .eq('user_id', profile.id)
      if (error) return []
      return (data || []) as any[]
    },
    enabled: !!profile?.id,
  })

  const isLoading = isEnrollmentsLoading

  const handleDownloadCertificate = async (enrollment: any, totalPercentage?: number) => {
    if (!profile || !enrollment.course) return
    const courseAssessments = allAssessments.filter((a: any) => a.course_id === enrollment.course?.id)
    const gradeBreakdown = calculateCourseGradeBreakdown({
      moduleProgressPercent: enrollment.progress_percent ?? 0,
      courseAssessments: courseAssessments as any,
      traineeAttempts: allAttempts as any,
      passingScore: enrollment.course?.passing_score ?? 50,
    })
    if (!gradeBreakdown.isCompleted) {
      if (gradeBreakdown.hasFinalAssessment && !gradeBreakdown.finalAssessmentCompleted) {
        toast.error('You must take and pass the Final Assessment before downloading the certificate.')
      } else if (!gradeBreakdown.isPassed) {
        toast.error(`Your total score (${gradeBreakdown.totalScore}%) is below the passing criteria (${gradeBreakdown.passingScore}%).`)
      } else {
        toast.error('Please complete all course requirements before downloading the certificate.')
      }
      return
    }

    setDownloadingId(enrollment.id)
    try {
      const traineeName = profile.full_name || user?.email?.split('@')[0] || 'Trainee'
      const percentage = totalPercentage ? `${totalPercentage}%` : `${gradeBreakdown.totalScore}%`

      const { blob, fileName } = await generateTraineeCertificate(
        enrollment.course.certificate_template_url,
        {
          traineeName,
          traineeEmail: profile.email || user?.email,
          traineeId: user!.id,
          courseId: enrollment.course.id,
          courseTitle: enrollment.course.title,
          trainerName: enrollment.course.trainer?.full_name || 'Lead Trainer',
          percentage,
          completedAt: new Date().toISOString(),
        }
      )

      triggerFileDownload(blob, fileName)
      toast.success('Certificate downloaded successfully! 🎉')
    } catch (err: any) {
      console.error('Certificate generation error:', err)
      toast.error(err.message || 'Failed to download certificate')
    } finally {
      setDownloadingId(null)
    }
  }

  const inProgressCount = enrollments?.filter(e => e.status === 'in_progress' || e.status === 'enrolled').length || 0
  const completedCount = enrollments?.filter(e => e.status === 'completed').length || 0

  return (
    <DashboardShell
      title="My Learning"
      icon={BookOpen}
      navLinks={[
        { to: '/trainee', label: 'Dashboard', icon: BarChart3 },
        { to: '/trainee/courses', label: 'Course Catalog', icon: Compass },
        { to: '/trainee/my-learning', label: 'My Learning', icon: BookOpen },
        { to: '/trainee/assessments', label: 'Assessments', icon: FileCheck },
        { to: '/trainee/notifications', label: 'Notifications', icon: Bell },
        { to: '/trainee/profile', label: 'Profile', icon: User },
      ]}
    >
      <div className="max-w-6xl space-y-6">
        {/* Header (Midnight Banner) */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#040814] via-[#07132a] to-[#0a1e3f] text-white p-6 rounded-3xl border border-cyan-500/30 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1 border border-white/15">
                <Sparkles className="w-3 h-3 text-amber-300" /> Learning Roadmap
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">My Learning Journey</h2>
            <p className="text-slate-300 text-sm">Track your progress and continue where you left off.</p>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl">
              <span className="text-xs text-slate-300 font-medium">In Progress: </span>
              <span className="text-sm font-extrabold text-cyan-400">{inProgressCount}</span>
            </div>
            <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl">
              <span className="text-xs text-emerald-200 font-medium">Completed: </span>
              <span className="text-sm font-extrabold text-emerald-400">{completedCount}</span>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-white animate-pulse rounded-3xl border border-slate-200" />
            ))}
          </div>
        ) : enrollments?.length === 0 ? (
          <div className="p-16 text-center bg-white border border-slate-200 rounded-3xl shadow-sm">
            <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-200">
              <BookOpen className="w-8 h-8 text-cyan-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Not enrolled in any courses yet</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">Explore the catalog to find a course and kickstart your learning journey.</p>
            <Link to="/trainee/courses">
              <button className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 text-white font-bold text-sm shadow-md shadow-cyan-600/20 hover:scale-105 transition-all">
                Browse Courses
              </button>
            </Link>
          </div>
        ) : (
          <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-4">
            {enrollments?.map((enrollment: any) => {
              const courseAssessments = allAssessments.filter((a: any) => a.course_id === enrollment.course?.id)
              const gradeBreakdown = calculateCourseGradeBreakdown({
                moduleProgressPercent: enrollment.progress_percent ?? 0,
                courseAssessments: courseAssessments as any,
                traineeAttempts: allAttempts as any,
                passingScore: enrollment.course?.passing_score ?? 50,
              })

              const isCourseDone = Boolean(gradeBreakdown.isCompleted)
              const isFinalPending = Boolean(gradeBreakdown.hasFinalAssessment && !gradeBreakdown.finalAssessmentCompleted && gradeBreakdown.isFinalUnlocked)

              return (
                <motion.div 
                  key={enrollment.id} 
                  variants={fadeUp} 
                  className="group bg-white border border-slate-200/90 hover:border-cyan-300 rounded-3xl p-5 flex flex-col md:flex-row md:items-center gap-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 hover:-translate-y-0.5"
                >
                  {/* Thumbnail */}
                  <div className="w-full md:w-48 h-32 md:h-28 rounded-2xl bg-slate-100 border border-slate-200 relative overflow-hidden shrink-0">
                    <Thumbnail path={enrollment.course?.thumbnail_path || null} alt={enrollment.course?.title || 'Course'} type={enrollment.course?.course_type} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        isCourseDone
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isFinalPending
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                      }`}>
                        {isCourseDone ? 'Completed' : isFinalPending ? 'Final Exam Pending' : enrollment.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{enrollment.course?.course_type || 'Standard'}</span>
                      {enrollment.course?.duration_minutes && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" /> {enrollment.course.duration_minutes}m
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 truncate group-hover:text-cyan-600 transition-colors">
                      {enrollment.course?.title}
                    </h3>
                    
                    {/* Progress Bar & Grade stats */}
                    <div className="w-full max-w-md space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>Modules Progress: <strong className="text-cyan-700">{enrollment.progress_percent}%</strong> (25% wt)</span>
                        <span>Overall Grade: <strong className="text-slate-900 font-black">{gradeBreakdown.totalScore}%</strong></span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                        <div 
                          className={`h-full rounded-full transition-all duration-700 ${
                            isCourseDone
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-600'
                              : isFinalPending
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
                              : 'bg-gradient-to-r from-cyan-600 to-blue-600'
                          }`}
                          style={{ width: `${enrollment.progress_percent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span>Assessments Avg: {gradeBreakdown.regularAssessmentAveragePercent}% (25% wt)</span>
                        <span>Final Exam: {gradeBreakdown.finalAssessmentScorePercent !== null ? `${gradeBreakdown.finalAssessmentScorePercent}%` : gradeBreakdown.isFinalUnlocked ? 'Ready' : 'Locked'} (50% wt)</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex flex-wrap items-center gap-2.5 pt-4 md:pt-0 md:pl-4 md:border-l border-slate-100">
                    {isCourseDone ? (
                      <>
                        <button
                          onClick={() => handleDownloadCertificate(enrollment, gradeBreakdown.totalScore)}
                          disabled={downloadingId === enrollment.id}
                          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-sm hover:scale-105 transition-all flex items-center gap-1.5"
                        >
                          {downloadingId === enrollment.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Award className="w-3.5 h-3.5 text-amber-300" />}
                          {downloadingId === enrollment.id ? 'Generating...' : 'Certificate'}
                        </button>
                        <Link to={`/trainee/courses/${enrollment.course?.id}`}>
                          <button className="px-4 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Review
                          </button>
                        </Link>
                      </>
                    ) : isFinalPending && gradeBreakdown.finalAssessmentId ? (
                      <>
                        <Link to={`/trainee/courses/${enrollment.course?.id}/assessments/${gradeBreakdown.finalAssessmentId}`}>
                          <button className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 hover:scale-105 transition-all flex items-center gap-1.5 animate-pulse">
                            <FileCheck className="w-4 h-4 text-amber-300" /> Take Final Exam
                          </button>
                        </Link>
                        <Link to={`/trainee/courses/${enrollment.course?.id}`}>
                          <button className="px-3.5 py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-cyan-600" /> Details
                          </button>
                        </Link>
                      </>
                    ) : (
                      <Link to={`/trainee/courses/${enrollment.course?.id}`}>
                        <button className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-cyan-600/20 hover:scale-105 transition-all flex items-center gap-2">
                          <PlayCircle className="w-4 h-4" /> Continue Lesson
                        </button>
                      </Link>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </DashboardShell>
  )
}
