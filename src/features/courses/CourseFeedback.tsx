import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Star, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

export function CourseFeedback({ courseId }: { courseId: string }) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comments, setComments] = useState('')

  const { data: existingFeedback, isLoading } = useQuery({
    queryKey: ['course_feedback', courseId, profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_feedback')
        .select('*')
        .eq('course_id', courseId)
        .eq('user_id', profile!.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!profile?.id && !!courseId
  })

  const submitFeedback = useMutation({
    mutationFn: async () => {
      if (!rating) throw new Error('Please select a star rating.')
      const { error } = await supabase.from('course_feedback').insert({
        course_id: courseId,
        user_id: profile!.id,
        rating,
        comments: comments.trim() || null
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Thank you for your feedback!')
      queryClient.invalidateQueries({ queryKey: ['course_feedback', courseId, profile?.id] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit feedback')
    }
  })

  if (isLoading) {
    return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
  }

  if (existingFeedback) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100 overflow-hidden">
        <CardContent className="p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-green-900 text-lg">Feedback Submitted</h3>
          <p className="text-green-700/80 text-sm max-w-md mx-auto">
            Thank you for rating this course {existingFeedback.rating} stars! Your feedback helps us improve.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-slate-200 overflow-hidden shadow-sm">
      <CardContent className="p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Leave Feedback</h3>
            <p className="text-sm text-slate-500">How was your learning experience?</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col items-center gap-2 py-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Rate this Course</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || rating)
                        ? 'fill-orange-400 text-orange-400'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Review Comments <span className="font-normal text-slate-400">(Optional)</span></p>
            <Textarea 
              placeholder="What did you like? What could be improved?"
              className="resize-none border-slate-200 rounded-xl focus:border-orange-500"
              rows={3}
              value={comments}
              onChange={e => setComments(e.target.value)}
            />
          </div>

          <Button 
            onClick={() => submitFeedback.mutate()} 
            disabled={submitFeedback.isPending || rating === 0}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12 text-md font-bold rounded-xl"
          >
            {submitFeedback.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : 'Submit Feedback'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
