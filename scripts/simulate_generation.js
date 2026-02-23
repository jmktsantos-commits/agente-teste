require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function simulateGeneration() {
    const platform = 'bravobet';
    console.log(`[SIMULATION] Attempting to generate for ${platform}...`);

    const now = new Date();
    // Simulate the hour window logic
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

    console.log(`Checking deduplication between ${hourStart.toISOString()} and ${hourEnd.toISOString()}`);

    // THIS IS THE FIXED QUERY LOGIC
    const { data: existing, error } = await supabase
        .from('predictions')
        .select('id, created_at, platform, analysis_data')
        .eq('platform', platform)
        .gte('created_at', hourStart.toISOString())
        .lt('created_at', hourEnd.toISOString())
        // NEW: Ignore error predictions during deduplication check
        // Note: analysis_data is jsonb, so we use ->> for text comparison
        .not('analysis_data->>status', 'eq', 'erro')
        .limit(1);

    if (error) {
        console.error('Error fetching existing:', error);
        return;
    }

    if (existing && existing.length > 0) {
        console.log('DEDUPLICATION HIT! Found VALID existing predictions:', existing);
        console.log('RESULT: Would NOT generate new prediction.');
    } else {
        console.log('No valid existing prediction found for this hour.');
        console.log('Checking if "error" prediction exists (just for confirmation)...');

        const { data: errorPred } = await supabase
            .from('predictions')
            .select('id, analysis_data')
            .eq('platform', platform)
            .gte('created_at', hourStart.toISOString())
            .lt('created_at', hourEnd.toISOString())
            .limit(1);

        if (errorPred && errorPred.length > 0) {
            console.log('Found "error" prediction:', errorPred[0].analysis_data?.status);
            console.log('RESULT: Logic works! It ignored the error prediction and would proceed to generate.');
        } else {
            console.log('No prediction at all found.');
            console.log('RESULT: Would generate new prediction.');
        }
    }
}

simulateGeneration();
