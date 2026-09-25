import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function run() {
  const { data: attempts, error: attemptsErr } = await supabase
    .from('assessment_attempts')
    .select('*, attempt_answers(*)')
    .order('created_at', { ascending: false })
    .limit(1)

  if (attemptsErr) { console.error(attemptsErr); return }
  const attempt = attempts[0]
  if (!attempt) return console.log("No attempts")
  
  console.log("Attempt score in DB:", attempt.score)
  
  const questionIds = attempt.attempt_answers.map(a => a.question_id)
  const { data: questions } = await supabase.from('questions').select('*').in('id', questionIds)
  
  let correctCount = 0;
  for (const q of questions) {
    const ans = attempt.attempt_answers.find(a => a.question_id === q.id)
    if (!ans) continue;
    
    let studentAns = ans.selected_answer || ''
    if (typeof studentAns !== 'string' && Array.isArray(studentAns)) studentAns = studentAns.join(',')
    else studentAns = String(studentAns)
    studentAns = studentAns.trim()
    
    const correctKeys = (q.correct_answer || '').split(',').map(k => k.trim())
    const correctTexts = correctKeys.map(k => (q.options || {})[k] || k).filter(Boolean).sort().join('|||')
    const studentTexts = studentAns.split('|||').map(s => s.trim()).filter(Boolean).sort().join('|||')
    
    console.log(`Q: ${q.id.slice(0,5)}`)
    console.log(`  q.correct_answer:`, q.correct_answer)
    console.log(`  correctTexts: "${correctTexts}"`)
    console.log(`  studentAns: "${studentAns}"`)
    console.log(`  studentTexts: "${studentTexts}"`)
    
    if (studentTexts && correctTexts && studentTexts === correctTexts) {
      console.log(`  => MATCH!`)
      correctCount++
    } else {
      // fallback
      const studentKey = studentAns.split(',').map(s => s.trim()).sort().join(',')
      const correctKey = correctKeys.sort().join(',')
      if (studentKey !== '' && studentKey === correctKey) {
         console.log(`  => MATCH BY KEY!`)
         correctCount++
      } else {
         console.log(`  => WRONG`)
      }
    }
  }
  
  console.log("Total correct computed by Result logic:", correctCount)
  console.log("Total questions:", questions.length)
}

run()
