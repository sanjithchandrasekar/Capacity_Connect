-- =============================================================
-- Safe migration: Add super_admin role support
-- Run this AFTER the initial schema
-- =============================================================

-- 1. Update the check constraint on the role column to include 'super_admin'
DO $$ 
BEGIN
  -- We drop the existing constraint if it exists. Note: The name of the constraint
  -- is typically generated as profiles_role_check if not explicitly named.
  -- To be safe, we find and drop it dynamically.
  DECLARE
    constraint_name text;
  BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%role%';
    
    IF constraint_name IS NOT NULL THEN
      EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || constraint_name;
    END IF;
  END;

  -- Add the new constraint
  ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('trainee', 'trainer', 'admin', 'super_admin'));
END $$;

-- 2. Create a security definer function to check if the current user is an admin/super_admin
-- Since it is SECURITY DEFINER, it bypasses RLS and won't cause infinite recursion when checking roles!
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

-- 3. Update RLS policy: both admin and super_admin can do everything on profiles
DROP POLICY IF EXISTS "Admins can do everything on profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and Super Admins can do everything on profiles" ON public.profiles;

CREATE POLICY "Admins and Super Admins can do everything on profiles"
ON public.profiles
FOR ALL
USING ( public.is_admin() );

-- 3. Update protect_profile_fields trigger: both admin and super_admin can modify roles
CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    NEW.role = OLD.role;
    NEW.approval_status = OLD.approval_status;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. New RPC: Super Admin only — promote a user to admin
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
  old_role text;
  old_status text;
  json_meta JSONB;
BEGIN
  -- Verify caller is super_admin
  SELECT role INTO caller_role FROM profiles WHERE id = auth.uid();
  IF caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Unauthorized: only super admins can promote users to admin';
  END IF;

  -- Get current state
  SELECT role, approval_status INTO old_role, old_status FROM profiles WHERE id = target_user_id;

  -- Promote to admin
  UPDATE profiles
  SET 
    role = 'admin',
    approval_status = 'approved',
    updated_at = now()
  WHERE id = target_user_id;

END;
$$;
