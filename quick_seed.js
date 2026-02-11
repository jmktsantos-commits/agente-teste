const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
    console.log("Attempting to insert mock data...");
    const { error } = await supabase.from('crash_history').insert([
        { multiplier: 2.50, round_time: new Date(), platform: 'simulated' },
        { multiplier: 1.20, round_time: new Date(Date.now() - 60000), platform: 'simulated' },
        { multiplier: 10.5, round_time: new Date(Date.now() - 120000), platform: 'simulated' }
    ]);

    if (error) {
        console.error("❌ Insert failed:", error.message);
    } else {
        console.log("✅ Insert successful! Dashboard should show data.");
    }
}

run();
