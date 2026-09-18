-- 1. Add common columns to admins, trainers, trainees
ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT 'Admin User',
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS avatar_path TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT 'Trainer User',
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'trainer',
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS avatar_path TEXT,
  ADD COLUMN IF NOT EXISTS proof_path TEXT,
  ADD COLUMN IF NOT EXISTS qualifications TEXT,
  ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.trainees
  ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT 'Trainee User',
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'trainee',
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS avatar_path TEXT,
  ADD COLUMN IF NOT EXISTS proof_path TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Migrate data from profiles to the new tables
-- Admins
INSERT INTO public.admins (id, full_name, email, role, approval_status, avatar_path, created_at, updated_at)
SELECT id, full_name, email, role::text, approval_status::text, avatar_path, created_at, updated_at
FROM public.profiles
WHERE role IN ('admin', 'super_admin')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  approval_status = EXCLUDED.approval_status,
  avatar_path = EXCLUDED.avatar_path,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

-- Trainers
INSERT INTO public.trainers (id, full_name, email, role, approval_status, avatar_path, proof_path, bio, years_of_experience, qualifications, availability, created_at, updated_at)
SELECT id, full_name, email, role::text, approval_status::text, avatar_path, proof_path, biography, years_of_experience, qualifications, availability, created_at, updated_at
FROM public.profiles
WHERE role = 'trainer'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  approval_status = EXCLUDED.approval_status,
  avatar_path = EXCLUDED.avatar_path,
  proof_path = EXCLUDED.proof_path,
  bio = COALESCE(trainers.bio, EXCLUDED.bio),
  years_of_experience = COALESCE(trainers.years_of_experience, EXCLUDED.years_of_experience),
  qualifications = COALESCE(trainers.qualifications, EXCLUDED.qualifications),
  availability = COALESCE(trainers.availability, EXCLUDED.availability),
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

-- Trainees
INSERT INTO public.trainees (id, full_name, email, role, approval_status, avatar_path, proof_path, department, designation, created_at, updated_at)
SELECT id, full_name, email, role::text, approval_status::text, avatar_path, proof_path, department, designation, created_at, updated_at
FROM public.profiles
WHERE role = 'trainee'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  approval_status = EXCLUDED.approval_status,
  avatar_path = EXCLUDED.avatar_path,
  proof_path = EXCLUDED.proof_path,
  department = COALESCE(trainees.department, EXCLUDED.department),
  designation = COALESCE(trainees.designation, EXCLUDED.designation),
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

-- 3. Drop all foreign keys that rely on profiles
ALTER TABLE public.admins DROP CONSTRAINT IF EXISTS admins_id_fkey;
ALTER TABLE public.trainers DROP CONSTRAINT IF EXISTS trainers_id_fkey;
ALTER TABLE public.trainees DROP CONSTRAINT IF EXISTS trainees_id_fkey;

ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_trainer_id_fkey;
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;
ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_uploaded_by_fkey;
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- 4. Re-link foreign keys to auth.users or specific tables
ALTER TABLE public.admins ADD CONSTRAINT admins_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.trainers ADD CONSTRAINT trainers_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.trainees ADD CONSTRAINT trainees_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.courses ADD CONSTRAINT courses_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON DELETE SET NULL;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.materials ADD CONSTRAINT materials_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Drop old triggers and functions that rely on profiles
DROP TRIGGER IF EXISTS trigger_handle_role_tables ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_role_tables() CASCADE;
DROP TRIGGER IF EXISTS protect_profile_fields_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_profile_fields() CASCADE;

-- Update handle_new_user to insert into trainees instead of profiles
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.trainees (id, full_name, email, role, approval_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'New User'),
    NEW.email,
    'trainee',
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update is_admin function to check admins table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins 
    WHERE id = auth.uid()
  );
$$;

-- 6. Re-write policies that directly use profiles
-- Courses
DROP POLICY IF EXISTS "Admins have full access to courses" ON public.courses;
CREATE POLICY "Admins have full access to courses" ON public.courses FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Trainers can create own courses" ON public.courses;
CREATE POLICY "Trainers can create own courses" ON public.courses FOR INSERT WITH CHECK (
  auth.uid() = trainer_id AND EXISTS (SELECT 1 FROM public.trainers WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Trainers can update own non-published courses" ON public.courses;
CREATE POLICY "Trainers can update own non-published courses" ON public.courses FOR UPDATE USING (
  auth.uid() = trainer_id AND EXISTS (SELECT 1 FROM public.trainers WHERE id = auth.uid()) AND status IN ('draft', 'pending_review')
) WITH CHECK (
  auth.uid() = trainer_id AND status IN ('draft', 'pending_review')
);

-- Audit Logs
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT USING (public.is_admin());

-- Materials
DROP POLICY IF EXISTS "Admins can do everything on materials" ON public.materials;
CREATE POLICY "Admins can do everything on materials" ON public.materials FOR ALL USING (public.is_admin());

-- Notifications
DROP POLICY IF EXISTS "Admins can read and write all notifications" ON public.notifications;
CREATE POLICY "Admins can read and write all notifications" ON public.notifications FOR ALL USING (public.is_admin());

-- 7. Rewrite Admin RPCs
CREATE OR REPLACE FUNCTION public.admin_update_user(
  target_user_id UUID,
  new_role TEXT DEFAULT NULL,
  new_status TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_role TEXT;
  old_status TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: only admins can perform this action';
  END IF;

  IF new_status NOT IN ('pending', 'approved', 'rejected', 'suspended') THEN
    RAISE EXCEPTION 'Invalid status value';
  END IF;
  
  IF new_role NOT IN ('trainee', 'trainer', 'admin') THEN
    RAISE EXCEPTION 'Invalid role value';
  END IF;

  -- Find the user's current table and update/move them
  -- Let's check admins
  IF EXISTS (SELECT 1 FROM admins WHERE id = target_user_id) THEN
    SELECT role, approval_status INTO old_role, old_status FROM admins WHERE id = target_user_id;
    IF new_role = 'admin' THEN
      UPDATE admins SET approval_status = new_status, updated_at = now() WHERE id = target_user_id;
    ELSE
      -- Move to another table
      INSERT INTO trainers (id, full_name, email, role, approval_status)
      SELECT id, full_name, email, new_role, new_status FROM admins WHERE id = target_user_id
      WHERE new_role = 'trainer';
      
      INSERT INTO trainees (id, full_name, email, role, approval_status)
      SELECT id, full_name, email, new_role, new_status FROM admins WHERE id = target_user_id
      WHERE new_role = 'trainee';
      
      DELETE FROM admins WHERE id = target_user_id;
    END IF;
  -- Let's check trainers
  ELSIF EXISTS (SELECT 1 FROM trainers WHERE id = target_user_id) THEN
    SELECT role, approval_status INTO old_role, old_status FROM trainers WHERE id = target_user_id;
    IF new_role = 'trainer' THEN
      UPDATE trainers SET approval_status = new_status, updated_at = now() WHERE id = target_user_id;
    ELSE
      INSERT INTO admins (id, full_name, email, role, approval_status)
      SELECT id, full_name, email, new_role, new_status FROM trainers WHERE id = target_user_id
      WHERE new_role = 'admin';
      
      INSERT INTO trainees (id, full_name, email, role, approval_status)
      SELECT id, full_name, email, new_role, new_status FROM trainers WHERE id = target_user_id
      WHERE new_role = 'trainee';
      
      DELETE FROM trainers WHERE id = target_user_id;
    END IF;
  -- Let's check trainees
  ELSIF EXISTS (SELECT 1 FROM trainees WHERE id = target_user_id) THEN
    SELECT role, approval_status INTO old_role, old_status FROM trainees WHERE id = target_user_id;
    IF new_role = 'trainee' THEN
      UPDATE trainees SET approval_status = new_status, updated_at = now() WHERE id = target_user_id;
    ELSE
      INSERT INTO admins (id, full_name, email, role, approval_status)
      SELECT id, full_name, email, new_role, new_status FROM trainees WHERE id = target_user_id
      WHERE new_role = 'admin';
      
      INSERT INTO trainers (id, full_name, email, role, approval_status)
      SELECT id, full_name, email, new_role, new_status FROM trainees WHERE id = target_user_id
      WHERE new_role = 'trainer';
      
      DELETE FROM trainees WHERE id = target_user_id;
    END IF;
  END IF;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    'admin_update_user',
    'user',
    target_user_id,
    jsonb_build_object(
      'old_role', old_role,
      'new_role', new_role,
      'old_status', old_status,
      'new_status', new_status
    )
  );
END;
$$;


CREATE OR REPLACE FUNCTION public.admin_delete_user(
  target_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Prevent deleting super admin
  IF EXISTS (SELECT 1 FROM admins WHERE id = target_user_id AND role = 'super_admin') THEN
    RAISE EXCEPTION 'Cannot delete super admin';
  END IF;

  -- Since cascade deletes exist on auth.users, deleting from auth.users removes from the role tables
  DELETE FROM auth.users WHERE id = target_user_id;

  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'admin_delete_user', 'user', target_user_id, '{"action": "deleted user"}');
END;
$$;


CREATE OR REPLACE FUNCTION public.super_admin_promote_to_admin(
  target_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
BEGIN
  -- Verify caller is super_admin
  SELECT role INTO caller_role FROM admins WHERE id = auth.uid();
  IF caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: only super admins can promote users to admin';
  END IF;

  -- Move user to admins table
  IF EXISTS (SELECT 1 FROM trainers WHERE id = target_user_id) THEN
    INSERT INTO admins (id, full_name, email, role, approval_status)
    SELECT id, full_name, email, 'admin', 'approved' FROM trainers WHERE id = target_user_id;
    DELETE FROM trainers WHERE id = target_user_id;
  ELSIF EXISTS (SELECT 1 FROM trainees WHERE id = target_user_id) THEN
    INSERT INTO admins (id, full_name, email, role, approval_status)
    SELECT id, full_name, email, 'admin', 'approved' FROM trainees WHERE id = target_user_id;
    DELETE FROM trainees WHERE id = target_user_id;
  END IF;
  
  -- If already in admins, just ensure they are 'admin' and approved
  UPDATE admins SET role = 'admin', approval_status = 'approved' WHERE id = target_user_id AND role != 'super_admin';

END;
$$;

-- 8. Drop profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;
