export interface AssessmentItem {
  id: string
  course_id: string
  title: string
  assessment_type: 'daily' | 'mock' | 'final' | 'assessment' | string | null
  passing_score?: number | null
  status?: string | null
  scheduled_date?: string | null
  start_time?: string | null
  end_time?: string | null
  duration_minutes?: number | null
}

export interface AssessmentAttemptItem {
  id?: string
  assessment_id: string
  user_id: string
  score?: number | null
  grade_status?: string | null
  submitted_at?: string | null
  created_at?: string | null
}

export interface CourseGradeBreakdown {
  // Course Module Progress (25% max)
  moduleProgressPercent: number
  moduleScore: number // 0 to 25

  // Regular Assessments (25% max, averaged)
  regularAssessmentsTotal: number
  regularAssessmentsCompleted: number
  regularAssessmentAveragePercent: number // 0 to 100
  regularAssessmentScore: number // 0 to 25

  // Final Assessment (50% max)
  hasFinalAssessment: boolean
  finalAssessmentId: string | null
  finalAssessmentTitle: string | null
  finalAssessmentCompleted: boolean
  finalAssessmentScorePercent: number | null // 0 to 100
  finalAssessmentWeightedScore: number // 0 to 50
  isFinalUnlocked: boolean

  // Overall Totals
  totalScore: number // 0 to 100
  passingScore: number // e.g. 50 or 60
  isPassed: boolean
  isCompleted: boolean // 100% modules + final passed (if final exists)
}

export function isPracticeAssessment(type?: string | null): boolean {
  if (!type) return false
  const t = type.toLowerCase()
  return t === 'mock' || t === 'daily' || t === 'practice'
}

export function isRegularAssessment(type?: string | null): boolean {
  if (!type) return false
  const t = type.toLowerCase()
  return t === 'assessment' || t === 'quiz' || t === 'module_test'
}

export function isFinalAssessment(type?: string | null): boolean {
  if (!type) return false
  const t = type.toLowerCase()
  return t === 'final' || t === 'final_exam'
}

export function getAssessmentTypeLabel(type?: string | null): {
  label: string
  weightLabel: string
  isPractice: boolean
  badgeColor: string
} {
  if (isPracticeAssessment(type)) {
    const isMock = type?.toLowerCase() === 'mock'
    return {
      label: isMock ? 'Mock Test' : 'Daily Test',
      weightLabel: 'Practice Only (0% Grade Weight)',
      isPractice: true,
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    }
  }

  if (isFinalAssessment(type)) {
    return {
      label: 'Final Assessment',
      weightLabel: '50% Final Grade Weight',
      isPractice: false,
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    }
  }

  return {
    label: 'Assessment Test',
    weightLabel: '25% Grade Weight (Averaged)',
    isPractice: false,
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  }
}

/**
 * Calculates the complete course grade breakdown according to the rules:
 * - Course completion / modules: 25% mark
 * - Regular assessments average: 25% mark (taking average of all completed regular assessments)
 * - Final assessment: 50% mark
 * - Final assessment unlocks ONLY when modules are 100% complete
 * - Mock & Daily tests are practice only (0% weight)
 */
export function calculateCourseGradeBreakdown({
  moduleProgressPercent = 0,
  courseAssessments = [],
  traineeAttempts = [],
  passingScore = 50,
}: {
  moduleProgressPercent?: number
  courseAssessments?: AssessmentItem[]
  traineeAttempts?: AssessmentAttemptItem[]
  passingScore?: number
}): CourseGradeBreakdown {
  const cleanModuleProgress = Math.min(100, Math.max(0, moduleProgressPercent))
  const isFinalUnlocked = cleanModuleProgress >= 100

  // 1. Course Modules Progress: 25% weight
  const moduleScore = Number(((cleanModuleProgress / 100) * 25).toFixed(1))

  // 2. Regular Assessments: 25% weight (average of assessments)
  const regularAssessments = courseAssessments.filter(a => isRegularAssessment(a.assessment_type))
  const regularAssessmentsTotal = regularAssessments.length

  let regularScoresSum = 0
  let regularAssessmentsCompleted = 0

  regularAssessments.forEach(assessment => {
    // Find best attempt for this assessment
    const attempts = traineeAttempts.filter(
      at => at.assessment_id === assessment.id && at.score !== null && at.score !== undefined
    )
    if (attempts.length > 0) {
      const bestScore = Math.max(...attempts.map(at => Number(at.score) || 0))
      regularScoresSum += Math.min(100, Math.max(0, bestScore))
      regularAssessmentsCompleted++
    }
  })

  let regularAssessmentAveragePercent = 0
  let regularAssessmentScore = 0

  if (regularAssessmentsTotal > 0) {
    if (regularAssessmentsCompleted > 0) {
      regularAssessmentAveragePercent = Math.round(regularScoresSum / regularAssessmentsCompleted)
      regularAssessmentScore = Number(((regularAssessmentAveragePercent / 100) * 25).toFixed(1))
    }
  } else {
    // If the course doesn't have separate regular assessments, award the 25% proportionally based on module completion
    regularAssessmentAveragePercent = cleanModuleProgress
    regularAssessmentScore = Number(((cleanModuleProgress / 100) * 25).toFixed(1))
  }

  // 3. Final Assessment: 50% weight
  const finalAssessments = courseAssessments.filter(a => isFinalAssessment(a.assessment_type))
  const hasFinalAssessment = finalAssessments.length > 0
  const finalAssessment = finalAssessments[0] || null

  let finalAssessmentCompleted = false
  let finalAssessmentScorePercent: number | null = null
  let finalAssessmentWeightedScore = 0

  if (finalAssessment) {
    const finalAttempts = traineeAttempts.filter(
      at => at.assessment_id === finalAssessment.id && at.score !== null && at.score !== undefined
    )
    if (finalAttempts.length > 0) {
      const bestFinalScore = Math.max(...finalAttempts.map(at => Number(at.score) || 0))
      finalAssessmentScorePercent = Math.min(100, Math.max(0, bestFinalScore))
      finalAssessmentCompleted = true
      finalAssessmentWeightedScore = Number(((finalAssessmentScorePercent / 100) * 50).toFixed(1))
    }
  }

  // Calculate Overall Total (out of 100)
  const totalScore = Math.round(moduleScore + regularAssessmentScore + finalAssessmentWeightedScore)
  const isPassed = totalScore >= passingScore

  // Completion requirement: 100% modules + (if final assessment exists, must be completed and passed)
  const isCompleted =
    cleanModuleProgress >= 100 &&
    (hasFinalAssessment ? finalAssessmentCompleted && isPassed : isPassed)

  return {
    moduleProgressPercent: cleanModuleProgress,
    moduleScore,
    regularAssessmentsTotal,
    regularAssessmentsCompleted,
    regularAssessmentAveragePercent,
    regularAssessmentScore,
    hasFinalAssessment,
    finalAssessmentId: finalAssessment?.id || null,
    finalAssessmentTitle: finalAssessment?.title || null,
    finalAssessmentCompleted,
    finalAssessmentScorePercent,
    finalAssessmentWeightedScore,
    isFinalUnlocked,
    totalScore,
    passingScore,
    isPassed,
    isCompleted,
  }
}
