require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPredictions() {
    console.log('Checking recent Bravobet predictions...');
    const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('platform', 'bravobet')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Recent Predictions:', JSON.stringify(data, null, 2));

        // Check current time matches
        console.log('Current Server Time (Node):', new Date().toISOString());
    }
}

checkPredictions();
