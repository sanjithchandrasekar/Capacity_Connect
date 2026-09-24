import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Star, MessageSquare, Loader2, CheckCircle2, User, ThumbsUp, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface CourseFeedbackProps {
  courseId: string
  isTrainer?: boolean
}

export function CourseFeedback({ courseId, isTrainer = false }: CourseFeedbackProps) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comments, setComments] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // 1. Trainer Query: Fetch all feedback with trainee names
  const { data: allFeedback = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['course_all_feedback', courseId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('course_feedback')
          .select('*')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false })

        if (error) {
          console.warn('Could not fetch course_feedback:', error.message)
          return []
        }
        if (!data || data.length === 0) return []

        const userIds = Array.from(new Set(data.map(f => f.user_id)))
        const { data: traineesData } = await supabase
          .from('trainees')
          .select('id, full_name, email, department')
          .in('id', userIds)

        const traineeMap = new Map<string, { full_name: string; email: string; department?: string }>()
        traineesData?.forEach(t => traineeMap.set(t.id, { full_name: t.full_name || 'Trainee', email: t.email || '', department: t.department || undefined }))

        return data.map(f => ({
          ...f,
          trainee: traineeMap.get(f.user_id) || { full_name: 'Trainee', email: '' }
        }))
      } catch (err) {
        console.warn('course_feedback error:', err)
        return []
      }
    },
    enabled: !!courseId && isTrainer
  })

  // 2. Trainee Query: Fetch own feedback
  const { data: existingFeedback, isLoading: isLoadingOwn } = useQuery({
    queryKey: ['course_feedback', courseId, profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null
      try {
        const { data, error } = await supabase
          .from('course_feedback')
          .select('*')
          .eq('course_id', courseId)
          .eq('user_id', profile.id)
          .maybeSingle()
        if (error) {
          console.warn('Could not query own course_feedback:', error.message)
          return null
        }
        return data
      } catch (err) {
        console.warn('course_feedback table may not exist yet:', err)
        return null
      }
    },
    enabled: !!profile?.id && !!courseId && !isTrainer
  })

  // Submit/Update Feedback Mutation
  const submitFeedback = useMutation({
    mutationFn: async () => {
      if (!rating) throw new Error('Please select a star rating.')
      if (!profile?.id) throw new Error('User profile not found. Please log in.')

      const payload: any = {
        course_id: courseId,
        user_id: profile.id,
        rating,
        comments: comments.trim() || null,
      }

      const { data, error } = await (supabase.from('course_feedback') as any)
        .upsert(payload, { onConflict: 'course_id,user_id' })
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success(existingFeedback ? 'Feedback updated successfully!' : 'Thank you for your feedback!')
      queryClient.invalidateQueries({ queryKey: ['course_feedback', courseId, profile?.id] })
      queryClient.invalidateQueries({ queryKey: ['course_all_feedback', courseId] })
      setIsEditing(false)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit feedback')
    }
  })

  // ==========================================
  // TRAINER VIEW: Overview & Trainee Reviews List (Dark Theme)
  // ==========================================
  if (isTrainer) {
    if (isLoadingAll) {
      return (
        <Card className="bg-gradient-to-br from-[#0c1322] via-[#090e1a] to-[#040814] border border-slate-800 rounded-3xl shadow-xl">
          <CardContent className="p-8 flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          </CardContent>
        </Card>
      )
    }

    const totalRatings = allFeedback.length
    const averageRating = totalRatings > 0 
      ? (allFeedback.reduce((acc, curr) => acc + curr.rating, 0) / totalRatings).toFixed(1)
      : '0.0'

    const starCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    allFeedback.forEach(f => {
      if (f.rating >= 1 && f.rating <= 5) starCounts[f.rating] = (starCounts[f.rating] || 0) + 1
    })

    return (
      <Card className="bg-gradient-to-br from-[#0c1322] via-[#090e1a] to-[#040814] text-white border border-slate-800/90 rounded-3xl shadow-xl overflow-hidden">
        <CardContent className="p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base tracking-tight">Course Feedback & Ratings</h3>
                <p className="text-xs text-slate-400">Reviews and feedback submitted by enrolled trainees.</p>
              </div>
            </div>
            <Badge className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold px-3 py-1 self-start sm:self-auto rounded-xl">
              {totalRatings} Review{totalRatings !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Rating Summary Breakdown */}
          {totalRatings > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
              {/* Score Box */}
              <div className="flex flex-col items-center justify-center text-center p-4">
                <span className="text-5xl font-black text-white tracking-tight">{averageRating}</span>
                <div className="flex items-center gap-1 my-2.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(Number(averageRating))
                          ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                          : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-400 font-semibold">Course Rating Average</p>
              </div>

              {/* Progress Bars */}
              <div className="md:col-span-2 space-y-2.5 flex flex-col justify-center">
                {[5, 4, 3, 2, 1].map(stars => {
                  const count = starCounts[stars] || 0
                  const pct = totalRatings > 0 ? Math.round((count / totalRatings) * 100) : 0
                  return (
                    <div key={stars} className="flex items-center gap-2.5 text-xs">
                      <span className="w-12 font-bold text-slate-300 flex items-center gap-1 shrink-0">
                        {stars} <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" />
                      </span>
                      <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all shadow-[0_0_8px_rgba(251,191,36,0.3)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-[11px] text-slate-400 font-semibold">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {/* Reviews List */}
          <div className="space-y-3.5 pt-1">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Trainee Reviews ({totalRatings})
            </h4>

            {totalRatings === 0 ? (
              <div className="text-center py-10 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800">
                <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-300">No Feedback Submitted Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Once trainees complete course modules or submit reviews, their ratings and feedback comments will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {allFeedback.map((fb: any) => (
                  <div
                    key={fb.id}
                    className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/90 space-y-3 transition-all hover:border-slate-700"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-xs flex items-center justify-center border border-cyan-500/30">
                          {fb.trainee?.full_name?.charAt(0) || 'T'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-200">{fb.trainee?.full_name || 'Trainee'}</p>
                          <p className="text-[10px] text-slate-400">{fb.trainee?.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= fb.rating
                                  ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.4)]'
                                  : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {fb.created_at ? formatDistanceToNow(new Date(fb.created_at), { addSuffix: true }) : ''}
                        </span>
                      </div>
                    </div>

                    {fb.comments && (
                      <p className="text-xs text-slate-300 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 leading-relaxed">
                        "{fb.comments}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // ==========================================
  // TRAINEE VIEW: Interactive Rating & Submission
  // ==========================================
  if (isLoadingOwn) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
      </div>
    )
  }

  if (existingFeedback && !isEditing) {
    return (
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-3">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>Your Feedback</span>
          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Submitted
          </span>
        </h3>
        
        <div className="p-3.5 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 border border-emerald-100 rounded-2xl text-center space-y-2">
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= existingFeedback.rating ? 'fill-orange-400 text-orange-400' : 'text-slate-300'
                }`}
              />
            ))}
          </div>
          <p className="text-xs font-bold text-slate-800">Rated {existingFeedback.rating} of 5 Stars</p>
          {existingFeedback.comments && (
            <p className="text-xs text-slate-600 bg-white/90 p-2.5 rounded-xl border border-emerald-100 text-left italic leading-relaxed">
              "{existingFeedback.comments}"
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setRating(existingFeedback.rating)
            setComments(existingFeedback.comments || '')
            setIsEditing(true)
          }}
          className="w-full text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-50 rounded-xl h-9"
        >
          Edit Rating & Review
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4">
      <div>
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Course Feedback</h3>
        <p className="text-xs text-slate-500">Rate and share your review for this course.</p>
      </div>

      <div className="space-y-3.5">
        {/* Star Rating Picker */}
        <div className="flex flex-col items-center justify-center py-3 bg-orange-50/40 rounded-2xl border border-orange-100/80">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="p-1 hover:scale-110 transition-transform focus:outline-hidden"
              >
                <Star
                  className={`w-6 h-6 ${
                    star <= (hoverRating || rating)
                      ? 'fill-orange-400 text-orange-400'
                      : 'text-slate-300 hover:text-orange-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <span className="text-[10px] font-bold text-orange-600 mt-1">
            {hoverRating || rating ? `${hoverRating || rating} / 5 Stars` : 'Select your rating'}
          </span>
        </div>

        {/* Optional Comments */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600">
            Comments <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <Textarea
            placeholder="How was your learning experience?"
            className="resize-none border-slate-200 text-slate-900 bg-slate-50 focus:bg-white rounded-xl text-xs"
            rows={2}
            value={comments}
            onChange={e => setComments(e.target.value)}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-2 pt-1">
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditing(false)}
              className="flex-1 border-slate-200 text-slate-700 rounded-xl text-xs font-semibold h-9"
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={() => submitFeedback.mutate()}
            disabled={submitFeedback.isPending || rating === 0}
            className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs h-9 rounded-xl shadow-xs"
          >
            {submitFeedback.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : isEditing ? 'Update Review' : 'Submit Review'}
          </Button>
        </div>
      </div>
    </div>
  )
}
