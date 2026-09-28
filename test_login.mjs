import { createClient } from '@supabase/supabase-js'; 
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
console.log({supabaseUrl, supabaseKey});
const supabase = createClient(supabaseUrl, supabaseKey); 
supabase.auth.signInWithPassword({email: 'admin@example.com', password: 'password123'})
  .then(r => console.log(JSON.stringify(r, null, 2)))
  .catch(console.error);
