import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function run() {
  const { data: assessments, error: aErr } = await supabase.from('assessments').select('id, title, status').eq('title', 'Demo-01')
  if (aErr) console.error('Assessments Error:', aErr)
  console.log('Assessments:', assessments)

  if (assessments && assessments.length > 0) {
    const id = assessments[0].id
    const { data: questions, error: qErr } = await supabase.from('questions').select('id, approved, position').eq('assessment_id', id)
    if (qErr) console.error('Questions Error:', qErr)
    console.log(`Questions for ${id}:`, questions?.length)
  }
}

run()
