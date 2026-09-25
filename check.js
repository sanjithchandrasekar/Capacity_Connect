import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envStr = fs.readFileSync('.env.local', 'utf-8')
const envObj = {}
envStr.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [k, ...v] = line.split('=')
    envObj[k.trim()] = v.join('=').trim()
  }
})

const supabase = createClient(envObj['VITE_SUPABASE_URL'], envObj['VITE_SUPABASE_ANON_KEY'])

async function check() {
  const { data, error } = await supabase.from('assessment_attempts').select('id, assessment_id, user_id, score, created_at, submitted_at, grade_status')
  console.log('Attempts:', data)
  
  const { data: aData, error: aError } = await supabase.from('assessments').select('id, title')
  console.log('Assessments:', aData)
}

check()
