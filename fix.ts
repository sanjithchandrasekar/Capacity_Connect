import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function fix() {
  const { data: courses } = await supabase.from('courses').select('id, trainer_id');
  const { data: assessments } = await supabase.from('assessments').select('*');
  let count = 0;
  for (const a of assessments) {
    const course = courses.find(c => c.id === a.course_id);
    if (course && course.trainer_id && a.created_by !== course.trainer_id) {
      await supabase.from('assessments').update({ created_by: course.trainer_id }).eq('id', a.id);
      count++;
    }
  }
  console.log('Fixed ' + count + ' assessments');
}
fix();
