require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLatest() {
  console.log('Checking latest 3 Bravobet predictions...');
  const { data, error } = await supabase
    .from('predictions')
    .select('*')
    .eq('platform', 'bravobet')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error:', error);
    return;
  }

  data.forEach((p, i) => {
      console.log(`[${i}] ID: ${p.id}, Created: ${p.created_at}, Status: ${p.analysis_data?.status || 'OK'}`);
  });
}

checkLatest();
