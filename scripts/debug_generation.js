require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Mock browser environment for certain libs if needed, but prediction-engine seems pure TS/JS
// We need to implement a mini version of generatePrediction here because importing TS files in Node script is hard without compiling.
// So I will copy the logic relevant to debugging.

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function forceGenerate() {
    const platform = 'bravobet';
    console.log(`Attempting to generate for ${platform}...`);

    // 1. Check history
    const { data: history, error } = await supabase
        .from('crash_history')
        .select('multiplier, round_time, platform')
        .eq('platform', platform)
        .order('round_time', { ascending: false })
        .limit(200);

    if (error) {
        console.error('Error fetching history:', error);
        return;
    }
    console.log(`Found ${history.length} history items.`);
    if (history.length > 0) {
        console.log('Last history item:', history[0]);
    }

    // 2. Check strict deduplication logic
    const now = new Date();
    const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

    console.log(`Checking deduplication between ${hourStart.toISOString()} and ${hourEnd.toISOString()}`);

    const { data: existing } = await supabase
        .from('predictions')
        .select('id, created_at, platform')
        .eq('platform', platform)
        .gte('created_at', hourStart.toISOString())
        .lt('created_at', hourEnd.toISOString());

    if (existing && existing.length > 0) {
        console.log('DEDUPLICATION HIT! Found existing predictions:', existing);
    } else {
        console.log('No existing prediction found for this hour. Generation should proceed.');
    }

}

forceGenerate();
