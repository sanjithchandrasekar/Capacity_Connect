import { createClient } from '@supabase/supabase-js'; 
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey); 
supabase.from('admins').select('*').eq('email', 'admin@example.com')
  .then(r => console.log('Admins table:', JSON.stringify(r, null, 2)))
  .catch(console.error);
