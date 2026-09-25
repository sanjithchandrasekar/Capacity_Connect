-- Migration 00068: Add enroll_trainee and drop_enrollment database functions + RLS policies

-- 1. Ensure Trainees can update their own enrollment records (e.g. progress, withdrawal)
DROP POLICY IF EXISTS "Trainees can update own enrollments" ON public.enrollments;
CREATE POLICY "Trainees can update own enrollments"
ON public.enrollments FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2. Ensure Trainees can delete/withdraw their own enrollment records
DROP POLICY IF EXISTS "Trainees can delete own enrollments" ON public.enrollments;
CREATE POLICY "Trainees can delete own enrollments"
ON public.enrollments FOR DELETE TO authenticated 
USING (user_id = auth.uid());

-- 3. Function: public.enroll_trainee
CREATE OR REPLACE FUNCTION public.enroll_trainee(p_course_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_course RECORD;
  v_enrolled_count INT;
  v_initial_status TEXT;
  v_enrollment_id UUID;
BEGIN
  -- Fetch course info
  SELECT id, title, trainer_id, max_trainees, status INTO v_course
  FROM public.courses
  WHERE id = p_course_id;

  IF v_course.id IS NULL THEN
    RAISE EXCEPTION 'Course not found';
  END IF;

  -- Check current enrolled count
  SELECT COUNT(*) INTO v_enrolled_count
  FROM public.enrollments
  WHERE course_id = p_course_id AND status IN ('enrolled', 'in_progress', 'completed');

  IF v_course.max_trainees IS NOT NULL AND v_enrolled_count >= v_course.max_trainees THEN
    v_initial_status := 'waitlisted';
  ELSE
    v_initial_status := 'pending_approval';
  END IF;

  -- Upsert enrollment
  INSERT INTO public.enrollments (course_id, user_id, status, enrolled_at, progress_percent)
  VALUES (p_course_id, p_user_id, v_initial_status, now(), 0)
  ON CONFLICT (course_id, user_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    enrolled_at = now(),
    progress_percent = 0
  RETURNING id INTO v_enrollment_id;

  -- Notify Trainer
  IF v_course.trainer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      v_course.trainer_id,
      'enrollment_request:' || p_course_id,
      'New Enrollment Request',
      'A trainee requested to enroll in ' || v_course.title
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'enrollment_id', v_enrollment_id,
    'status', v_initial_status
  );
END;
$$;

-- 4. Function: public.drop_enrollment
CREATE OR REPLACE FUNCTION public.drop_enrollment(p_course_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.enrollments
  SET status = 'withdrawn'
  WHERE course_id = p_course_id AND user_id = p_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.enroll_trainee(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.drop_enrollment(UUID, UUID) TO authenticated, anon, service_role;
