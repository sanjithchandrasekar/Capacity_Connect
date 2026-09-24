-- =========================================================================
-- Capacity Connect: Fix Course Messages RLS & Permissions
-- Migration: 00061_course_messages_fixes.sql
-- =========================================================================

-- Ensure course_messages table has recipient_id and RLS
ALTER TABLE public.course_messages ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Allow Admins to insert messages
DROP POLICY IF EXISTS "Admins can insert course messages" ON public.course_messages;
CREATE POLICY "Admins can insert course messages"
  ON public.course_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Ensure Trainers can read all course messages
DROP POLICY IF EXISTS "Trainers can read all course messages" ON public.course_messages;
CREATE POLICY "Trainers can read all course messages"
  ON public.course_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_messages.course_id 
      AND courses.trainer_id = auth.uid()
    )
  );

-- Ensure Trainees can read public messages, their own sent messages, or messages addressed to them
DROP POLICY IF EXISTS "Trainees can read course messages" ON public.course_messages;
CREATE POLICY "Trainees can read course messages"
  ON public.course_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.course_id = course_messages.course_id
      AND enrollments.user_id = auth.uid()
      AND enrollments.status IN ('enrolled', 'completed', 'in_progress')
    )
    AND (is_private = false OR sender_id = auth.uid() OR recipient_id = auth.uid())
  );

-- Ensure Admins can read all messages
DROP POLICY IF EXISTS "Admins can read all course messages" ON public.course_messages;
CREATE POLICY "Admins can read all course messages"
  ON public.course_messages
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Grant table access
GRANT ALL ON TABLE public.course_messages TO authenticated;
GRANT ALL ON TABLE public.course_messages TO service_role;
