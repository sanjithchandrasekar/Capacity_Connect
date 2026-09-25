-- Notification triggers for Course Announcements, Platform Announcements, and Course Sessions

-- 1. Function to notify enrolled trainees when a Course Announcement is created
CREATE OR REPLACE FUNCTION notify_on_course_announcement()
RETURNS TRIGGER AS $$
DECLARE
  v_course_title TEXT;
  v_course_trainer_id UUID;
BEGIN
  -- Get course title and assigned trainer
  SELECT title, trainer_id INTO v_course_title, v_course_trainer_id
  FROM public.courses
  WHERE id = NEW.course_id;

  -- 1. Notify all enrolled trainees for this course
  INSERT INTO public.notifications (user_id, type, title, message)
  SELECT 
    e.user_id,
    'course_announcement:' || NEW.course_id::text,
    '📢 Announcement: ' || NEW.title,
    'New update in "' || COALESCE(v_course_title, 'Course') || '": ' || SUBSTRING(NEW.content FROM 1 FOR 140)
  FROM public.enrollments e
  WHERE e.course_id = NEW.course_id
    AND e.status IN ('enrolled', 'in_progress', 'completed')
    AND e.user_id != NEW.trainer_id;

  -- 2. If announcement created by admin or someone other than assigned trainer, notify trainer too
  IF v_course_trainer_id IS NOT NULL AND v_course_trainer_id != NEW.trainer_id THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      v_course_trainer_id,
      'course_announcement:' || NEW.course_id::text,
      '📢 Announcement Posted: ' || NEW.title,
      'An announcement was posted in your course "' || COALESCE(v_course_title, 'Course') || '".'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_course_announcement ON public.course_announcements;
CREATE TRIGGER trigger_notify_on_course_announcement
AFTER INSERT ON public.course_announcements
FOR EACH ROW
EXECUTE FUNCTION notify_on_course_announcement();


-- 2. Function to notify enrolled trainees & trainers when a Course Session is scheduled or updated
CREATE OR REPLACE FUNCTION notify_on_course_session()
RETURNS TRIGGER AS $$
DECLARE
  v_course_title TEXT;
  v_course_trainer_id UUID;
  v_time_text TEXT;
BEGIN
  -- Get course info
  SELECT title, trainer_id INTO v_course_title, v_course_trainer_id
  FROM public.courses
  WHERE id = NEW.course_id;

  IF NEW.start_time IS NOT NULL THEN
    v_time_text := ' scheduled for ' || TO_CHAR(NEW.start_time, 'Mon DD, YYYY HH12:MI AM');
  ELSE
    v_time_text := '';
  END IF;

  -- Only notify on INSERT or if start_time / title changed significantly
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.start_time IS DISTINCT FROM NEW.start_time OR OLD.title IS DISTINCT FROM NEW.title OR OLD.meet_link IS DISTINCT FROM NEW.meet_link)) THEN
    
    -- Notify all active enrolled trainees
    INSERT INTO public.notifications (user_id, type, title, message)
    SELECT 
      e.user_id,
      'course_session:' || NEW.course_id::text,
      CASE WHEN TG_OP = 'INSERT' THEN '📅 New Session: ' || NEW.title ELSE '📅 Session Updated: ' || NEW.title END,
      'Live session in "' || COALESCE(v_course_title, 'Course') || '"' || v_time_text || '.'
    FROM public.enrollments e
    WHERE e.course_id = NEW.course_id
      AND e.status IN ('enrolled', 'in_progress', 'completed');

    -- If updated/created and assigned trainer exists, also notify trainer (if session was updated by admin)
    IF v_course_trainer_id IS NOT NULL AND auth.uid() != v_course_trainer_id THEN
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (
        v_course_trainer_id,
        'course_session:' || NEW.course_id::text,
        CASE WHEN TG_OP = 'INSERT' THEN '📅 New Session: ' || NEW.title ELSE '📅 Session Updated: ' || NEW.title END,
        'A session was created/updated in your course "' || COALESCE(v_course_title, 'Course') || '"' || v_time_text || '.'
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_course_session ON public.course_sessions;
CREATE TRIGGER trigger_notify_on_course_session
AFTER INSERT OR UPDATE ON public.course_sessions
FOR EACH ROW
EXECUTE FUNCTION notify_on_course_session();


-- 3. Function to notify users when a Platform Announcement is created
CREATE OR REPLACE FUNCTION notify_on_platform_announcement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- If targeting all or trainees
    IF NEW.target_audience IN ('all', 'trainee') THEN
      INSERT INTO public.notifications (user_id, type, title, message)
      SELECT 
        id,
        'platform_announcement',
        '📢 ' || NEW.title,
        SUBSTRING(NEW.content FROM 1 FOR 140)
      FROM public.trainees
      WHERE approval_status = 'approved';
    END IF;

    -- If targeting all or trainers
    IF NEW.target_audience IN ('all', 'trainer') THEN
      INSERT INTO public.notifications (user_id, type, title, message)
      SELECT 
        id,
        'platform_announcement',
        '📢 ' || NEW.title,
        SUBSTRING(NEW.content FROM 1 FOR 140)
      FROM public.trainers
      WHERE approval_status = 'approved';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_platform_announcement ON public.announcements;
CREATE TRIGGER trigger_notify_on_platform_announcement
AFTER INSERT ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION notify_on_platform_announcement();
