-- Add seat_limit and waitlist_limit to courses
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS seat_limit INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS waitlist_limit INTEGER DEFAULT 10;

DO $$
BEGIN
  -- Drop existing enrollment status constraint
  DECLARE
    constraint_name text;
  BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.enrollments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%';

    IF constraint_name IS NOT NULL THEN
      EXECUTE 'ALTER TABLE public.enrollments DROP CONSTRAINT ' || quote_ident(constraint_name);
    END IF;
  END;

  -- Add the new constraint with all allowed statuses including 'waitlisted'
  ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_status_check
  CHECK (status IN ('pending_approval', 'enrolled', 'in_progress', 'completed', 'withdrawn', 'rejected', 'waitlisted'));
END
$$;
