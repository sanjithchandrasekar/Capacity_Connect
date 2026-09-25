import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

// Use service_role key if available (bypasses RLS)
const s = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function run() {
  const tables = ['assessments', 'questions', 'assessment_attempts', 'attempt_answers', 'enrollments']

  console.log('\n=== TABLE COLUMNS VIA information_schema ===\n')

  for (const tableName of tables) {
    const { data, error } = await s
      .from('information_schema.columns' as any)
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position' as any)

    if (error) {
      console.log(`❌ ${tableName}: cannot query columns — ${error.message}`)
    } else if (!data || data.length === 0) {
      console.log(`⚠️  ${tableName}: table may NOT EXIST in public schema (no columns found)`)
    } else {
      console.log(`✅ ${tableName} (${data.length} columns):`)
      data.forEach((col: any) => {
        console.log(`   ${col.column_name} (${col.data_type})${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`)
      })
    }
    console.log()
  }

  // Try direct row counts ignoring RLS 
  console.log('\n=== ROW COUNTS ===\n')
  for (const tableName of tables) {
    const { count, error } = await s
      .from(tableName as any)
      .select('*', { count: 'exact', head: true })
    if (error) {
      console.log(`❌ ${tableName}: ${error.message}`)
    } else {
      console.log(`📊 ${tableName}: ${count} rows`)
    }
  }

  // Check recent assessment_attempts
  console.log('\n=== RECENT ASSESSMENT ATTEMPTS (last 5) ===\n')
  const { data: recent, error: recErr } = await s
    .from('assessment_attempts' as any)
    .select('id, assessment_id, user_id, score, passed, grade_status, submitted_at, answers')
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .limit(5)

  if (recErr) {
    console.log('❌', recErr.message)
  } else {
    console.log(`Found ${recent.length} attempt(s):`)
    recent.forEach((r: any) => {
      const hasAnswers = r.answers && Object.keys(r.answers || {}).length > 0
      console.log(`  [${r.id.slice(0,8)}] score=${r.score} | passed=${r.passed} | status=${r.grade_status} | submitted=${r.submitted_at?.slice(0,16)} | answers_col=${hasAnswers ? 'HAS DATA' : 'empty/null'}`)
    })
  }

  // Check attempt_answers
  console.log('\n=== RECENT ATTEMPT_ANSWERS (last 5) ===\n')
  const { data: ans, error: ansErr } = await s
    .from('attempt_answers' as any)
    .select('*')
    .limit(5)
  
  if (ansErr) {
    console.log('❌', ansErr.message)
  } else {
    console.log(`Found ${ans.length} answer(s):`)
    ans.forEach((a: any) => console.log('  ', JSON.stringify(a)))
  }

  // Verify questions have correct_answer and options
  console.log('\n=== QUESTIONS SAMPLE ===\n')
  const { data: qs, error: qsErr } = await s
    .from('questions' as any)
    .select('id, assessment_id, question_text, correct_answer, options')
    .limit(3)

  if (qsErr) {
    console.log('❌', qsErr.message)
  } else {
    console.log(`Found ${qs.length} question(s):`)
    qs.forEach((q: any) => {
      const optKeys = Object.keys(q.options || {}).filter(k => !['_question_type','_difficulty','_section'].includes(k))
      const correctExists = q.correct_answer && q.options && q.correct_answer in q.options
      console.log(`  [${q.id.slice(0,6)}] correct_answer="${q.correct_answer}" | option_keys=[${optKeys.join(',')}] | correct_in_options=${correctExists}`)
    })
  }
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1) })
