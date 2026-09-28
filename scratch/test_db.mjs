import fs from 'fs'

const envPath = '.env.local'
let VITE_SUPABASE_URL = ''
let VITE_SUPABASE_PUBLISHABLE_KEY = ''

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    if (line.startsWith('VITE_SUPABASE_URL=')) VITE_SUPABASE_URL = line.split('=')[1].trim()
    if (line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) VITE_SUPABASE_PUBLISHABLE_KEY = line.split('=')[1].trim()
  }
}

async function run() {
  const url = `${VITE_SUPABASE_URL}/rest/v1/?apikey=${VITE_SUPABASE_PUBLISHABLE_KEY}`
  const response = await fetch(url)
  const data = await response.json()
  
  if (data && data.definitions) {
      if (data.definitions.attendance_runs) {
          console.log('attendance_runs:', JSON.stringify(data.definitions.attendance_runs, null, 2))
      }
      if (data.definitions.attendance_results) {
          console.log('attendance_results:', JSON.stringify(data.definitions.attendance_results, null, 2))
      }
  } else {
      console.log('No definitions found.')
  }
}

run()
