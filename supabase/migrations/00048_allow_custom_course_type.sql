-- Migration to drop check constraint on course_type to allow custom types
DO $$ 
DECLARE 
  constraint_name text;
BEGIN
  -- Find the exact name of the constraint for course_type
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.courses'::regclass
  AND pg_get_constraintdef(oid) LIKE '%course_type%';
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.courses DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;
