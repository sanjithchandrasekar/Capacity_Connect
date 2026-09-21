-- Migration to add extended schedule details and delivery mode to courses
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS delivery_mode text DEFAULT 'recorded',
ADD COLUMN IF NOT EXISTS live_class_timing text,
ADD COLUMN IF NOT EXISTS mock_test_timing timestamp with time zone,
ADD COLUMN IF NOT EXISTS final_exam_timing timestamp with time zone;
