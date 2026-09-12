-- Notifications table (if not exists from types)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_certificate_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can mark their own as read
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins and Super Admins can read all notifications
CREATE POLICY "Admins can read all notifications"
ON public.notifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Notifications are inserted only by server-side (Edge Functions / SECURITY DEFINER)
-- No public INSERT policy needed.

-- Assessments RLS (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Trainers can manage own assessments'
  ) THEN
    ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Trainers can manage own assessments"
    ON public.assessments FOR ALL
    USING (
      auth.uid() = created_by AND
      EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer'
      )
    );

    CREATE POLICY "Trainees can view published assessments"
    ON public.assessments FOR SELECT
    USING (status = 'published');

    CREATE POLICY "Admins can manage all assessments"
    ON public.assessments FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
      )
    );
  END IF;
END
$$;

-- Questions RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Trainers can manage questions for own assessments'
  ) THEN
    ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Trainers can manage questions for own assessments"
    ON public.questions FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.assessments a
        WHERE a.id = questions.assessment_id AND a.created_by = auth.uid()
      )
    );

    CREATE POLICY "Trainees can view safe questions"
    ON public.questions FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.assessments a
        WHERE a.id = questions.assessment_id AND a.status = 'published'
      )
    );

    CREATE POLICY "Admins can manage all questions"
    ON public.questions FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
      )
    );
  END IF;
END
$$;

-- Enrollments RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Trainers can view enrollments for own courses'
  ) THEN
    ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Trainers can view enrollments for own courses"
    ON public.enrollments FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = enrollments.course_id AND trainer_id = auth.uid()
      )
    );

    CREATE POLICY "Trainees can view own enrollments"
    ON public.enrollments FOR SELECT
    USING (auth.uid() = user_id);

    CREATE POLICY "Trainees can enroll in published courses"
    ON public.enrollments FOR INSERT
    WITH CHECK (
      auth.uid() = user_id AND
      EXISTS (
        SELECT 1 FROM public.courses WHERE id = course_id AND status = 'published'
      )
    );

    CREATE POLICY "Admins can manage all enrollments"
    ON public.enrollments FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
      )
    );
  END IF;
END
$$;

-- Assessment attempts RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Trainers can view attempts for own course assessments'
  ) THEN
    ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Trainers can view attempts for own course assessments"
    ON public.assessment_attempts FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.assessments a
        JOIN public.courses c ON c.id = a.course_id
        WHERE a.id = assessment_attempts.assessment_id AND c.trainer_id = auth.uid()
      )
    );

    CREATE POLICY "Trainees can view own attempts"
    ON public.assessment_attempts FOR SELECT
    USING (auth.uid() = user_id);

    CREATE POLICY "Trainees can create own attempts"
    ON public.assessment_attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Admins can manage all attempts"
    ON public.assessment_attempts FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
      )
    );
  END IF;
END
$$;

-- Attempt answers RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Trainers can view answers for own course attempts'
  ) THEN
    ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Trainers can view answers for own course attempts"
    ON public.attempt_answers FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.assessment_attempts aa
        JOIN public.assessments a ON a.id = aa.assessment_id
        JOIN public.courses c ON c.id = a.course_id
        WHERE aa.id = attempt_answers.attempt_id AND c.trainer_id = auth.uid()
      )
    );

    CREATE POLICY "Trainees can view own answers"
    ON public.attempt_answers FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.assessment_attempts aa
        WHERE aa.id = attempt_answers.attempt_id AND aa.user_id = auth.uid()
      )
    );

    CREATE POLICY "Trainees can insert own answers"
    ON public.attempt_answers FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.assessment_attempts aa
        WHERE aa.id = attempt_answers.attempt_id AND aa.user_id = auth.uid()
      )
    );

    CREATE POLICY "Admins can manage all answers"
    ON public.attempt_answers FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
      )
    );
  END IF;
END
$$;

-- Skills RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'All authenticated can read skills'
  ) THEN
    ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "All authenticated can read skills"
    ON public.skills FOR SELECT
    TO authenticated USING (true);

    CREATE POLICY "Admins can manage skills"
    ON public.skills FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
      )
    );
  END IF;
END
$$;

-- User skills RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own skills'
  ) THEN
    ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can manage own skills"
    ON public.user_skills FOR ALL
    USING (auth.uid() = user_id);

    CREATE POLICY "Admins can manage all user skills"
    ON public.user_skills FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
      )
    );
  END IF;
END
$$;

-- Course skills RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Trainers can manage own course skills'
  ) THEN
    ALTER TABLE public.course_skills ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Trainers can manage own course skills"
    ON public.course_skills FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.courses
        WHERE id = course_skills.course_id AND trainer_id = auth.uid()
      )
    );

    CREATE POLICY "All authenticated can read course skills"
    ON public.course_skills FOR SELECT
    TO authenticated USING (true);
  END IF;
END
$$;
