-- Create a function that runs with elevated privileges to delete from auth.users
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete the user from the authentication system
  DELETE FROM auth.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$;

-- Add trigger for trainees
DROP TRIGGER IF EXISTS on_trainee_delete ON public.trainees;
CREATE TRIGGER on_trainee_delete
  AFTER DELETE ON public.trainees
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

-- Add trigger for trainers
DROP TRIGGER IF EXISTS on_trainer_delete ON public.trainers;
CREATE TRIGGER on_trainer_delete
  AFTER DELETE ON public.trainers
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

-- Add trigger for admins
DROP TRIGGER IF EXISTS on_admin_delete ON public.admins;
CREATE TRIGGER on_admin_delete
  AFTER DELETE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();
