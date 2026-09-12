-- Courses table
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  course_type TEXT NOT NULL DEFAULT 'standard' CHECK (course_type IN ('standard', 'scenario')),
  trainer_id UUID REFERENCES public.profiles(id),
  department TEXT,
  duration_minutes INTEGER,
  passing_score INTEGER DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'archived')),
  thumbnail_path TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Trainers can see their own courses (all statuses)
CREATE POLICY "Trainers can view own courses"
ON public.courses FOR SELECT
USING (auth.uid() = trainer_id);

-- Trainees can view published courses
CREATE POLICY "Trainees can view published courses"
ON public.courses FOR SELECT
USING (status = 'published');

-- Admins can view and manage all courses
CREATE POLICY "Admins have full access to courses"
ON public.courses FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Trainers can insert courses for themselves
CREATE POLICY "Trainers can create own courses"
ON public.courses FOR INSERT
WITH CHECK (
  auth.uid() = trainer_id AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer')
);

-- Trainers can update their own courses (only if not published/archived)
CREATE POLICY "Trainers can update own non-published courses"
ON public.courses FOR UPDATE
USING (
  auth.uid() = trainer_id AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'trainer') AND
  status IN ('draft', 'pending_review')
)
WITH CHECK (
  auth.uid() = trainer_id AND
  -- Trainers cannot set status to published or archived themselves
  status IN ('draft', 'pending_review')
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_courses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER courses_updated_at_trigger
BEFORE UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION update_courses_updated_at();

-- RPC for admin to publish/archive a course and log it
CREATE OR REPLACE FUNCTION public.admin_update_course(
  target_course_id UUID,
  new_status TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role user_role;
  old_status TEXT;
BEGIN
  -- Verify caller is admin
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: only admins can perform this action';
  END IF;

  -- Validate new status
  IF new_status NOT IN ('draft', 'pending_review', 'published', 'archived') THEN
    RAISE EXCEPTION 'Invalid status value';
  END IF;

  -- Get old status
  SELECT status INTO old_status FROM courses WHERE id = target_course_id;

  -- Update course
  UPDATE courses
  SET 
    status = new_status,
    published_at = CASE WHEN new_status = 'published' THEN now() ELSE published_at END,
    updated_at = now()
  WHERE id = target_course_id;

  -- Audit log
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    'admin_update_course',
    'course',
    target_course_id,
    jsonb_build_object('old_status', old_status, 'new_status', new_status)
  );
END;
$$;
