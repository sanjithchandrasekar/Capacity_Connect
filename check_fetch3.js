import fs from 'fs'

const envStr = fs.readFileSync('.env.local', 'utf-8')
const envObj = {}
envStr.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [k, ...v] = line.split('=')
    envObj[k.trim()] = v.join('=').trim()
  }
})

const url = envObj['VITE_SUPABASE_URL']
const key = envObj['VITE_SUPABASE_PUBLISHABLE_KEY']

async function check() {
  const res = await fetch(`${url}/rest/v1/assessment_attempts?select=id,assessment_id,user_id,score,submitted_at`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  })
  const attempts = await res.json()
  console.log('Attempts:')
  console.log(JSON.stringify(attempts, null, 2))
  
  const res2 = await fetch(`${url}/rest/v1/assessments?select=id,title`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  })
  const assessments = await res2.json()
  console.log('\nAssessments:')
  console.log(JSON.stringify(assessments, null, 2))
}

check()
