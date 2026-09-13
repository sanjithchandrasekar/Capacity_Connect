-- 00008_seed_skills.sql
-- Seeds the skills table with common training competencies for MoES/IMD

INSERT INTO skills (name, category) VALUES
  ('Weather Warning Interpretation', 'Meteorology'),
  ('Cyclone Communication', 'Emergency'),
  ('Emergency Coordination', 'Emergency'),
  ('Forecast Analysis', 'Meteorology'),
  ('Public Advisory Preparation', 'Communication'),
  ('Disaster Response', 'Emergency'),
  ('Data Analysis', 'Technical'),
  ('Radar Interpretation', 'Meteorology'),
  ('Satellite Imagery Analysis', 'Meteorology'),
  ('Ocean State Forecasting', 'Meteorology'),
  ('Flood Risk Assessment', 'Emergency'),
  ('Climate Monitoring', 'Meteorology'),
  ('Seismic Activity Monitoring', 'Geology'),
  ('Tsunami Warning Systems', 'Emergency'),
  ('Coastal Erosion Assessment', 'Geology'),
  ('GIS Mapping', 'Technical'),
  ('Remote Sensing', 'Technical'),
  ('Report Writing', 'Communication'),
  ('Stakeholder Communication', 'Communication'),
  ('Training & Facilitation', 'Leadership'),
  ('Team Leadership', 'Leadership'),
  ('Incident Command', 'Emergency'),
  ('Risk Assessment', 'Emergency'),
  ('Quality Assurance', 'Technical'),
  ('Public Speaking', 'Communication')
ON CONFLICT DO NOTHING;
