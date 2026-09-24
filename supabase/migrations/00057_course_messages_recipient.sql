-- Add recipient_id to course_messages to allow private messages to specific users
ALTER TABLE public.course_messages ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update RLS for course_messages so trainees can read messages sent TO them
DROP POLICY IF EXISTS "Trainees can read course messages" ON public.course_messages;
CREATE POLICY "Trainees can read course messages"
  ON public.course_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments
      WHERE enrollments.course_id = course_messages.course_id
      AND enrollments.user_id = auth.uid()
      AND enrollments.status IN ('enrolled', 'completed', 'in_progress')
    )
    AND (is_private = false OR sender_id = auth.uid() OR recipient_id = auth.uid())
  );

-- Trigger for Course Chat Notifications
CREATE OR REPLACE FUNCTION notify_on_course_message()
RETURNS TRIGGER AS $$
DECLARE
  v_course_title TEXT;
  v_sender_name TEXT;
BEGIN
  -- Get course title
  SELECT title INTO v_course_title FROM public.courses WHERE id = NEW.course_id;
  
  -- Get sender name
  SELECT full_name INTO v_sender_name FROM public.trainers WHERE id = NEW.sender_id;
  IF v_sender_name IS NULL THEN
    SELECT full_name INTO v_sender_name FROM public.trainees WHERE id = NEW.sender_id;
  END IF;
  IF v_sender_name IS NULL THEN
    SELECT full_name INTO v_sender_name FROM public.admins WHERE id = NEW.sender_id;
  END IF;
  IF v_sender_name IS NULL THEN
    v_sender_name := 'Someone';
  END IF;

  IF NEW.is_private = true THEN
    -- If it's private, it's either going to the trainer or to a specific trainee
    IF NEW.recipient_id IS NOT NULL THEN
      -- Notify the specific recipient
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (NEW.recipient_id, 'new_message', 'Private Message in ' || v_course_title, v_sender_name || ' sent you a private message.');
    ELSE
      -- If no recipient_id but private, it usually means it's to the trainer
      INSERT INTO public.notifications (user_id, type, title, message)
      SELECT trainer_id, 'new_message', 'Private Message in ' || v_course_title, v_sender_name || ' sent you a private message.'
      FROM public.courses WHERE id = NEW.course_id;
    END IF;
  ELSE
    -- Group broadcast: notify all enrolled trainees EXCEPT the sender
    INSERT INTO public.notifications (user_id, type, title, message)
    SELECT user_id, 'new_message', 'New Message in ' || v_course_title, v_sender_name || ': ' || substring(NEW.content from 1 for 50)
    FROM public.enrollments 
    WHERE course_id = NEW.course_id AND status IN ('enrolled', 'completed', 'in_progress') AND user_id != NEW.sender_id;
    
    -- Also notify the trainer if they aren't the sender
    INSERT INTO public.notifications (user_id, type, title, message)
    SELECT trainer_id, 'new_message', 'New Message in ' || v_course_title, v_sender_name || ': ' || substring(NEW.content from 1 for 50)
    FROM public.courses 
    WHERE id = NEW.course_id AND trainer_id != NEW.sender_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_course_message ON public.course_messages;
CREATE TRIGGER trigger_notify_on_course_message
AFTER INSERT ON public.course_messages
FOR EACH ROW
EXECUTE FUNCTION notify_on_course_message();
