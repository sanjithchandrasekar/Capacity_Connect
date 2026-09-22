-- ============================================================
-- Fix 1: Add missing columns to assessments table
-- ============================================================
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS assessment_type text DEFAULT 'daily';
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS requires_sea boolean DEFAULT true;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS scheduled_date date;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS start_time time without time zone;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS end_time time without time zone;
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS duration_minutes integer;

-- Add CHECK constraint for assessment_type
ALTER TABLE public.assessments
DROP CONSTRAINT IF EXISTS assessments_assessment_type_check;

ALTER TABLE public.assessments
ADD CONSTRAINT assessments_assessment_type_check
CHECK (assessment_type IN ('mock', 'daily', 'final', 'assessment'));

-- ============================================================
-- Fix 2: Insert 5 questions into the empty assessment
-- Assessment: Ocean_Observation_and_Marine_Data_Analysis.pdf Test
-- ID: a828a2cc-21d7-41b3-bc78-b5464b31562f
-- ============================================================
INSERT INTO public.questions (assessment_id, question_text, options, correct_answer, explanation, position, approved)
VALUES
(
  'a828a2cc-21d7-41b3-bc78-b5464b31562f',
  'What primary oceanographic parameters does a standard CTD sensor directly measure?',
  '{"A":"Salinity, pH, and dissolved oxygen","B":"Conductivity, temperature, and depth (pressure)","C":"Turbidity, chlorophyll, and current velocity","D":"Light attenuation, nutrients, and alkalinity"}',
  'B',
  'CTD stands for Conductivity, Temperature, and Depth — the three parameters it directly measures.',
  1,
  true
),
(
  'a828a2cc-21d7-41b3-bc78-b5464b31562f',
  'How do standard profiling Argo floats gather temperature and salinity data?',
  '{"A":"They are towed behind research vessels","B":"They are anchored to the seafloor with sensors","C":"They drift at depth, then rise to the surface collecting a vertical profile of data","D":"They are deployed from aircraft and sink slowly"}',
  'C',
  'Argo floats drift at a target depth, then ascend to the surface collecting a vertical profile of data.',
  2,
  true
),
(
  'a828a2cc-21d7-41b3-bc78-b5464b31562f',
  'Satellite radar altimeters allow oceanographers to estimate which ocean parameter?',
  '{"A":"Sea surface temperature","B":"Sea surface height (SSH)","C":"Ocean color and chlorophyll","D":"Surface wind speed only"}',
  'B',
  'Radar altimeters measure the height of the ocean surface, enabling estimates of currents and heat content.',
  3,
  true
),
(
  'a828a2cc-21d7-41b3-bc78-b5464b31562f',
  'An Acoustic Doppler Current Profiler (ADCP) measures water current velocities using which principle?',
  '{"A":"The Doppler shift of acoustic signals reflected from particles in the water","B":"Pressure differences between two depth levels","C":"Electrical resistance changes in the water column","D":"Temperature gradient between surface and deep water"}',
  'A',
  'ADCPs transmit acoustic pulses and measure the Doppler shift of echoes from suspended particles to calculate current velocity.',
  4,
  true
),
(
  'a828a2cc-21d7-41b3-bc78-b5464b31562f',
  'In marine data analysis, what is the primary purpose of quality control (QC) flagging?',
  '{"A":"To categorize data by geographic region","B":"To compress large datasets for storage","C":"To identify and mark suspect or erroneous data points","D":"To convert raw voltages into physical units"}',
  'C',
  'QC flagging marks data as good, suspect, or bad so analysts can filter unreliable measurements.',
  5,
  true
)
ON CONFLICT DO NOTHING;
