-- Course Announcements Table
CREATE TABLE IF NOT EXISTS public.course_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course Messages (Chat/Q&A) Table
CREATE TABLE IF NOT EXISTS public.course_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.course_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_messages ENABLE ROW LEVEL SECURITY;

-- Add realtime publication for chat
-- Check if course_messages is already in realtime publication, if not, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'course_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.course_messages;
  END IF;
END
$$;

-------------------------------------------------------------
-- Policies for course_announcements
-------------------------------------------------------------

-- Trainers can insert/update announcements for their courses
CREATE POLICY "Trainers can manage course announcements"
  ON public.course_announcements
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = trainer_id 
    AND 
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND trainer_id = auth.uid())
  );

-- Admins can manage all announcements
CREATE POLICY "Admins can manage course announcements"
  ON public.course_announcements
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Enrolled trainees can view announcements for their courses
CREATE POLICY "Trainees can view course announcements"
  ON public.course_announcements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.course_id = course_announcements.course_id
      AND enrollments.user_id = auth.uid()
      AND enrollments.status IN ('enrolled', 'completed', 'in_progress')
    )
  );

-- Also allow Trainers to view announcements for their courses
CREATE POLICY "Trainers can view course announcements"
  ON public.course_announcements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND trainer_id = auth.uid())
  );

-------------------------------------------------------------
-- Policies for course_messages
-------------------------------------------------------------

-- Anyone enrolled can read public messages or their own private messages
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
    AND (is_private = false OR sender_id = auth.uid())
  );

-- Trainers can read ALL messages for their courses
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

-- Admins can read all messages
CREATE POLICY "Admins can read all course messages"
  ON public.course_messages
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Trainees can insert messages for courses they are enrolled in
CREATE POLICY "Trainees can insert course messages"
  ON public.course_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.course_id = course_messages.course_id
      AND enrollments.user_id = auth.uid()
      AND enrollments.status IN ('enrolled', 'completed', 'in_progress')
    )
  );

-- Trainers can insert messages for their courses
CREATE POLICY "Trainers can insert course messages"
  ON public.course_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = course_messages.course_id 
      AND courses.trainer_id = auth.uid()
    )
  );
