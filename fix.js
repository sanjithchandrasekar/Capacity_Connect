import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
);

async function fix() {
  const { data: courses } = await supabase.from('courses').select('id, trainer_id');
  const { data: assessments, error: err2 } = await supabase.from('assessments').select('*');
  
  if (err2) {
    console.error('Error fetching assessments', err2);
    return;
  }
  
  let count = 0;
  for (const a of assessments) {
    const course = courses.find(c => c.id === a.course_id);
    if (course && course.trainer_id && a.created_by !== course.trainer_id) {
      console.log('Fixing assessment', a.id, 'setting created_by to', course.trainer_id);
      const { error } = await supabase.from('assessments').update({ created_by: course.trainer_id }).eq('id', a.id);
      if (error) console.error('Update error', error);
      else count++;
    }
  }
  console.log('Fixed ' + count + ' orphaned assessments!');
}
fix();
