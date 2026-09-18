import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gezrhprdrlsswfnuffvf.supabase.co'
const supabaseKey = 'sb_publishable_z4ecljyqj8-oVc8Nv-UsBQ_xzKsnxpG'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'superadmin@capacityconnect.com',
    password: '12345678',
  })
  
  if (error) {
    console.error('Login failed:', error.message)
  } else {
    console.log('Login succeeded!', data.user?.email)
  }
}

testLogin()
