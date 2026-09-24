-- =========================================================================
-- Capacity Connect: Course Feedback Table & Policies
-- Migration: 00062_course_feedback.sql
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.course_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT course_feedback_course_user_unique UNIQUE (course_id, user_id)
);

-- Enable RLS
ALTER TABLE public.course_feedback ENABLE ROW LEVEL SECURITY;

-- Trainees can insert their own feedback
DROP POLICY IF EXISTS "Trainees can insert own feedback" ON public.course_feedback;
CREATE POLICY "Trainees can insert own feedback"
  ON public.course_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Trainees can update their own feedback
DROP POLICY IF EXISTS "Trainees can update own feedback" ON public.course_feedback;
CREATE POLICY "Trainees can update own feedback"
  ON public.course_feedback
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Authenticated users (Trainers, Trainees, Admins) can read feedback
DROP POLICY IF EXISTS "Anyone can read course feedback" ON public.course_feedback;
CREATE POLICY "Anyone can read course feedback"
  ON public.course_feedback
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage all feedback
DROP POLICY IF EXISTS "Admins can manage feedback" ON public.course_feedback;
CREATE POLICY "Admins can manage feedback"
  ON public.course_feedback
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Grants
GRANT ALL ON TABLE public.course_feedback TO authenticated;
GRANT ALL ON TABLE public.course_feedback TO service_role;
