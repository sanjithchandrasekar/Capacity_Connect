/**
 * Migration: Convert letter-key answers (A, B, C, D) to full option text values.
 * Run with: node fix-attempt-answers.mjs
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing env vars. Usage:')
  console.error('VITE_SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node fix-attempt-answers.mjs')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const INTERNAL_KEYS = new Set(['_question_type', '_difficulty', '_section'])
const LETTER_PATTERN = /^[A-F]$/

async function main() {
  console.log('Fetching all attempt answers...')
  const { data: attemptAnswers, error: attemptAnswersErr } = await supabase
    .from('attempt_answers')
    .select('id, attempt_id, question_id, selected_answer')

  if (attemptAnswersErr) { console.error('Error fetching attempt_answers:', attemptAnswersErr); process.exit(1) }
  console.log(`Found ${attemptAnswers.length} answers`)

  const allQuestionIds = new Set()
  for (const ans of attemptAnswers) {
    if (ans.question_id) allQuestionIds.add(ans.question_id)
  }

  console.log(`Fetching ${allQuestionIds.size} questions...`)
  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('id, options, correct_answer')
    .in('id', [...allQuestionIds])

  if (qErr) { console.error('Error fetching questions:', qErr); process.exit(1) }

  const qMap = {}
  for (const q of questions) qMap[q.id] = q

  let updatedCount = 0

  for (const ans of attemptAnswers) {
    const qId = ans.question_id
    const rawAnswer = ans.selected_answer
    
    const q = qMap[qId]
    if (!q || !q.options) continue

    const answerStr = String(rawAnswer || '').trim()
    if (!answerStr) continue

    const parts = answerStr.split(',').map(s => s.trim())
    const allLetterKeys = parts.every(p => LETTER_PATTERN.test(p))

    if (allLetterKeys) {
      // Convert letters to text values
      const converted = parts.map(letter => {
        const text = q.options[letter]
        return (text && !INTERNAL_KEYS.has(letter)) ? text : letter
      })
      
      const newAnswer = converted.join('|||')
      
      if (newAnswer !== answerStr) {
        const { error: updateErr } = await supabase
          .from('attempt_answers')
          .update({ selected_answer: newAnswer })
          .eq('id', ans.id)

        if (updateErr) {
          console.error(`❌ Failed answer ${ans.id.slice(0,8)}:`, updateErr.message)
        } else {
          console.log(`✅ Updated answer for Q ${qId.slice(0,8)}: ${answerStr} -> ${newAnswer}`)
          updatedCount++
        }
      }
    }
  }
  
  // Note: we're not recalculating the overall score in the assessment_attempts table in this script
  // because that would require joining attempt_answers by attempt_id.
  // The immediate UI problem is just fixing the stored answer strings.

  console.log(`\nDone. Updated ${updatedCount} answers in DB.`)
}

main().catch(err => { console.error(err); process.exit(1) })
