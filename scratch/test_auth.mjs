import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

async function main() {
  // 1. Sign in
  const { data: { session }, error: signinError } = await supabase.auth.signInWithPassword({
    email: 'admin@example.com',
    password: 'password123'
  })
  
  if (signinError) {
    console.error('SignIn Error:', signinError)
    return
  }
  
  console.log('Logged in as:', session.user.id)
  
  // 2. Fetch profile
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()
    
  if (error) {
    console.error('Fetch Profile Error:', JSON.stringify(error, null, 2))
  } else {
    console.log('Profile Fetched:', data)
  }
}

main()
