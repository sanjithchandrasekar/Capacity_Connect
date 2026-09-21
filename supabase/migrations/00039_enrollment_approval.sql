-- Add 'pending_approval' and 'rejected' to the enrollments status constraint

DO $$
BEGIN
  -- First, try to drop the existing constraint. We don't know the exact name, so we'll look it up.
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

  -- Add the new constraint with all allowed statuses
  ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_status_check
  CHECK (status IN ('pending_approval', 'enrolled', 'in_progress', 'completed', 'withdrawn', 'rejected'));
END
$$;
