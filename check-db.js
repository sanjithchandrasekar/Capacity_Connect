import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gezrhprdrlsswfnuffvf.supabase.co';
const supabaseKey = 'sb_publishable_z4ecljyqj8-oVc8Nv-UsBQ_xzKsnxpG';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('courses').select('session_flow_text, session_flow_document_path').limit(1);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Success, data:', data);
  }
}
check();
