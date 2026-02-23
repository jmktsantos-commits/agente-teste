require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log('Fetching most recent 30 insertions...');
    const { data: all, error: err } = await supabase.from('crash_history').select('id, platform, multiplier, round_time').order('id', { ascending: false }).limit(30);

    if (err) { console.error(err); return; }
    if (!all) return;

    const dups = [];
    const seen = new Set();

    // Sort chronologically ascending to see the exact insertion order
    all.sort((a, b) => a.id - b.id);

    for (const r of all) {
        const msRegex = /\.\d+Z|\.\d+\+/;
        const timeStr = r.round_time.replace(msRegex, '');
        const key = r.platform + '_' + r.multiplier + '_' + timeStr;
        if (seen.has(key)) {
            dups.push({ ...r, ID_DIFF: r.id - Array.from(seen).length });
        } else {
            seen.add(key);
        }
    }

    console.log('Total Duplicates in last 30: ' + dups.length);
    console.log('Latest 15 insertions (chronological order):');
    console.table(all.slice(-15).map(x => ({ id: x.id, p: x.platform, m: x.multiplier, t: x.round_time })));
}
run();
