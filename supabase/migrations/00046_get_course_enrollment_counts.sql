-- Function to get course enrollment counts bypassing RLS
CREATE OR REPLACE FUNCTION get_course_enrollment_counts(p_course_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count INT;
  waitlist_count INT;
  my_waitlist_position INT := 0;
  total_count INT;
BEGIN
  -- Get active count
  SELECT count(*) INTO active_count
  FROM enrollments
  WHERE course_id = p_course_id AND status IN ('enrolled', 'in_progress', 'completed', 'pending_approval');
  
  -- Get waitlisted count
  SELECT count(*) INTO waitlist_count
  FROM enrollments
  WHERE course_id = p_course_id AND status = 'waitlisted';
  
  -- Get total count
  SELECT count(*) INTO total_count
  FROM enrollments
  WHERE course_id = p_course_id;

  -- Get my waitlist position if user is provided
  IF p_user_id IS NOT NULL THEN
    SELECT row_number INTO my_waitlist_position
    FROM (
      SELECT user_id, ROW_NUMBER() OVER (ORDER BY enrolled_at ASC) as row_number
      FROM enrollments
      WHERE course_id = p_course_id AND status = 'waitlisted'
    ) AS w
    WHERE user_id = p_user_id;
    
    IF my_waitlist_position IS NULL THEN
      my_waitlist_position := 0;
    END IF;
  END IF;

  RETURN json_build_object(
    'active', active_count,
    'waitlisted', waitlist_count,
    'total', total_count,
    'myWaitlistPosition', my_waitlist_position
  );
END;
$$;
