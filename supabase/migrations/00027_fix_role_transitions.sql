-- 1. Drop dangerous triggers that cause circular deletions
DROP TRIGGER IF EXISTS on_trainee_delete ON public.trainees;
DROP TRIGGER IF EXISTS on_trainer_delete ON public.trainers;
DROP TRIGGER IF EXISTS on_admin_delete ON public.admins;

-- 2. Drop and recreate foreign keys properly just in case
ALTER TABLE public.admins DROP CONSTRAINT IF EXISTS admins_id_fkey;
ALTER TABLE public.trainers DROP CONSTRAINT IF EXISTS trainers_id_fkey;
ALTER TABLE public.trainees DROP CONSTRAINT IF EXISTS trainees_id_fkey;

-- Delete any zombie rows that might be causing constraint violations
DELETE FROM public.admins WHERE id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.trainers WHERE id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.trainees WHERE id NOT IN (SELECT id FROM auth.users);

ALTER TABLE public.admins ADD CONSTRAINT admins_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.trainers ADD CONSTRAINT trainers_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.trainees ADD CONSTRAINT trainees_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Update admin_update_user to be more robust
CREATE OR REPLACE FUNCTION public.admin_update_user(
  target_user_id UUID,
  new_role TEXT DEFAULT NULL,
  new_status TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_role TEXT;
  old_status TEXT;
  v_full_name TEXT;
  v_email TEXT;
  v_mobile TEXT;
BEGIN
  -- Verify the executing user is an admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can perform this action';
  END IF;

  -- Get user info to transfer (try all tables)
  SELECT full_name, email, role, approval_status INTO v_full_name, v_email, old_role, old_status FROM public.trainees WHERE id = target_user_id;
  IF v_full_name IS NULL THEN
    SELECT full_name, email, role, approval_status INTO v_full_name, v_email, old_role, old_status FROM public.trainers WHERE id = target_user_id;
  END IF;
  IF v_full_name IS NULL THEN
    SELECT full_name, email, role, approval_status INTO v_full_name, v_email, old_role, old_status FROM public.admins WHERE id = target_user_id;
  END IF;

  IF v_full_name IS NULL THEN
    RAISE EXCEPTION 'User not found in any role table';
  END IF;

  IF new_role = old_role THEN
    -- Just update status in current table
    IF new_role = 'trainee' THEN
      UPDATE trainees SET approval_status = new_status, updated_at = now() WHERE id = target_user_id;
    ELSIF new_role = 'trainer' THEN
      UPDATE trainers SET approval_status = new_status, updated_at = now() WHERE id = target_user_id;
    ELSIF new_role = 'admin' THEN
      UPDATE admins SET approval_status = new_status, updated_at = now() WHERE id = target_user_id;
    END IF;
  ELSE
    -- Move to another table
    -- 1. Insert into new table
    IF new_role = 'admin' THEN
      INSERT INTO admins (id, full_name, email, role, approval_status) VALUES (target_user_id, v_full_name, v_email, new_role, new_status) ON CONFLICT (id) DO UPDATE SET approval_status = EXCLUDED.approval_status;
    ELSIF new_role = 'trainer' THEN
      INSERT INTO trainers (id, full_name, email, role, approval_status) VALUES (target_user_id, v_full_name, v_email, new_role, new_status) ON CONFLICT (id) DO UPDATE SET approval_status = EXCLUDED.approval_status;
    ELSIF new_role = 'trainee' THEN
      INSERT INTO trainees (id, full_name, email, role, approval_status) VALUES (target_user_id, v_full_name, v_email, new_role, new_status) ON CONFLICT (id) DO UPDATE SET approval_status = EXCLUDED.approval_status;
    END IF;
    
    -- 2. Delete from old table
    IF old_role = 'trainee' THEN
      DELETE FROM trainees WHERE id = target_user_id;
    ELSIF old_role = 'trainer' THEN
      DELETE FROM trainers WHERE id = target_user_id;
    ELSIF old_role = 'admin' THEN
      DELETE FROM admins WHERE id = target_user_id;
    END IF;
  END IF;

  -- Log action
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
