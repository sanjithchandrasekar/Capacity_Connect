-- Automatic Waitlist Upgrade Trigger (Train Seat Reservation Logic)

CREATE OR REPLACE FUNCTION public.process_waitlist_upgrade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_waitlisted record;
  v_course_title text;
  v_trainer_id uuid;
BEGIN
  -- We only care if an active enrollment changes to withdrawn or rejected
  IF (OLD.status = 'enrolled' OR OLD.status = 'in_progress' OR OLD.status = 'pending_approval') AND
     (NEW.status = 'withdrawn' OR NEW.status = 'rejected') THEN
    
    -- Find the oldest waitlisted trainee for this course
    SELECT id, user_id INTO v_next_waitlisted
    FROM public.enrollments
    WHERE course_id = NEW.course_id AND status = 'waitlisted'
    ORDER BY enrolled_at ASC
    LIMIT 1;

    -- If a waitlisted trainee exists, upgrade them to pending_approval
    IF v_next_waitlisted IS NOT NULL THEN
      UPDATE public.enrollments
      SET status = 'pending_approval'
      WHERE id = v_next_waitlisted.id;

      -- Fetch course details for notifications
      SELECT title, trainer_id INTO v_course_title, v_trainer_id
      FROM public.courses
      WHERE id = NEW.course_id;

      -- Notify the trainee
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        v_next_waitlisted.user_id,
        'course_update',
        'Waitlist Upgrade!',
        'A seat opened up in ' || v_course_title || '. Your request is now pending trainer approval.'
      );

      -- Notify the trainer
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        v_trainer_id,
        'enrollment_request',
        'Waitlist Upgraded',
        'A seat opened up in ' || v_course_title || ' and a waitlisted trainee was automatically upgraded to pending approval.'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop the trigger if it already exists
DROP TRIGGER IF EXISTS on_enrollment_dropped ON public.enrollments;

-- Attach the trigger
CREATE TRIGGER on_enrollment_dropped
AFTER UPDATE OF status ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION public.process_waitlist_upgrade();
