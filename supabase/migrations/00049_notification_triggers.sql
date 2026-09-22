-- Trigger functions for creating notifications

-- Function to notify admins when a new user registers and is pending
CREATE OR REPLACE FUNCTION notify_admins_on_new_user()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approval_status = 'pending' THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    SELECT id, 'user_registration', 'New User Registration', 'User ' || NEW.full_name || ' has registered as a ' || NEW.role || ' and requires approval.'
    FROM public.admins
    WHERE role IN ('admin', 'super_admin');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to trainers
DROP TRIGGER IF EXISTS trigger_notify_admins_on_new_trainer ON public.trainers;
CREATE TRIGGER trigger_notify_admins_on_new_trainer
AFTER INSERT ON public.trainers
FOR EACH ROW
EXECUTE FUNCTION notify_admins_on_new_user();

-- Apply trigger to trainees
DROP TRIGGER IF EXISTS trigger_notify_admins_on_new_trainee ON public.trainees;
CREATE TRIGGER trigger_notify_admins_on_new_trainee
AFTER INSERT ON public.trainees
FOR EACH ROW
EXECUTE FUNCTION notify_admins_on_new_user();


-- Function to notify admins when a course is submitted for review
CREATE OR REPLACE FUNCTION notify_admins_on_course_submitted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending_review' AND (OLD.status IS NULL OR OLD.status != 'pending_review') THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    SELECT id, 'course_submission', 'Course Submitted', 'Trainer submitted course "' || NEW.title || '" for review.'
    FROM public.admins
    WHERE role IN ('admin', 'super_admin');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admins_on_course_submitted ON public.courses;
CREATE TRIGGER trigger_notify_admins_on_course_submitted
AFTER UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION notify_admins_on_course_submitted();


-- Function to notify trainer when course is approved/rejected/assigned
CREATE OR REPLACE FUNCTION notify_trainer_on_course_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If course status changed to published or rejected
  IF NEW.status IN ('published', 'rejected') AND (OLD.status IS NULL OR OLD.status = 'pending_review') THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (NEW.trainer_id, 'course_status', 'Course ' || INITCAP(NEW.status), 'Your course "' || NEW.title || '" has been ' || NEW.status || '.');
  END IF;
  
  -- If admin created a course directly as published and assigned to trainer
  IF NEW.status = 'published' AND OLD.status IS NULL AND auth.uid() != NEW.trainer_id THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (NEW.trainer_id, 'course_assigned', 'New Course Assigned', 'An admin has assigned you to teach the course: "' || NEW.title || '"');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_trainer_on_course_status ON public.courses;
CREATE TRIGGER trigger_notify_trainer_on_course_status
AFTER INSERT OR UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION notify_trainer_on_course_status();


-- Function to notify trainee when enrollment is approved/rejected
CREATE OR REPLACE FUNCTION notify_trainee_on_enrollment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('approved', 'rejected') AND OLD.status != NEW.status THEN
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (NEW.user_id, 'enrollment_status', 'Enrollment ' || INITCAP(NEW.status), 'Your enrollment in a course has been ' || NEW.status || '.');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_trainee_on_enrollment_status ON public.enrollments;
CREATE TRIGGER trigger_notify_trainee_on_enrollment_status
AFTER UPDATE ON public.enrollments
FOR EACH ROW
EXECUTE FUNCTION notify_trainee_on_enrollment_status();
