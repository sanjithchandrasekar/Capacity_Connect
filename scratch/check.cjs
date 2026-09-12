const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('profiles')
    .select('email, role, approval_status');
    
  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log('Profiles:');
    console.table(data);
  }
}

main();
