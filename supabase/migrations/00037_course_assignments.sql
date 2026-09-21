-- course_assignments: tracks when admin assigns a course to a trainer
CREATE TABLE IF NOT EXISTS public.course_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL,           -- admin's user id
  message text,                        -- optional note from admin
  is_read boolean NOT NULL DEFAULT false,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, trainer_id)
);

-- RLS
ALTER TABLE public.course_assignments ENABLE ROW LEVEL SECURITY;

-- Trainers can read their own assignments
CREATE POLICY "trainers_read_own_assignments"
  ON public.course_assignments FOR SELECT
  USING (trainer_id = auth.uid());

-- Admins (including super_admins) can insert assignments
CREATE POLICY "admins_insert_assignments"
  ON public.course_assignments FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );

-- Trainers can mark their own assignments as read
CREATE POLICY "trainers_update_own_assignments"
  ON public.course_assignments FOR UPDATE
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

-- Admins can see all assignments
CREATE POLICY "admins_read_all_assignments"
  ON public.course_assignments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
  );

