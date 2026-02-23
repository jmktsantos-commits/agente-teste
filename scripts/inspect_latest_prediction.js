require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectLatest() {
    console.log('Fetching latest Bravobet prediction...');
    const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('platform', 'bravobet')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Latest Prediction:', JSON.stringify(data, null, 2));

    // Simulate getActivePrediction check
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    const isActive = data.is_active;

    console.log('--- Simulation ---');
    console.log('Now (UTC):', now.toISOString());
    console.log('Expires At (UTC):', expiresAt.toISOString());
    console.log('Is Active:', isActive);

    if (isActive && expiresAt > now) {
        console.log('RESULT: Should be returned by getActivePrediction.');
    } else {
        console.log('RESULT: Would NOT be returned.');
        if (!isActive) console.log('Reason: is_active is false');
        if (expiresAt <= now) console.log('Reason: Expired');
    }
}

inspectLatest();
