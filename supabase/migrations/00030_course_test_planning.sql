-- Add test planning fields to courses table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS planned_assessments_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS planned_mock_tests_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_test_date date,
ADD COLUMN IF NOT EXISTS final_test_start_time time without time zone,
ADD COLUMN IF NOT EXISTS final_test_end_time time without time zone;
