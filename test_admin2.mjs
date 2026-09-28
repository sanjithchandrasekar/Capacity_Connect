import { createClient } from '@supabase/supabase-js'; 
const supabaseUrl = process.env.VITE_SUPABASE_URL;
// We need SERVICE_ROLE_KEY to query auth.users
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey); 
supabase.auth.admin.listUsers()
  .then(r => console.log('Users:', r.data.users.map(u => u.email)))
  .catch(console.error);
