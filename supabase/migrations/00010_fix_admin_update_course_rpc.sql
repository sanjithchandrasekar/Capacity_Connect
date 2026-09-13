-- Fix admin_update_course to support super_admin and use text instead of enum for caller_role
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
  caller_role TEXT;
  old_status TEXT;
BEGIN
  -- Verify caller is admin or super_admin
  IF NOT public.is_admin() THEN
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
