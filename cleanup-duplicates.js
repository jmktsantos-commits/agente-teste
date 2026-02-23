require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const PLATFORMS = ['bravobet', 'esportivabet', 'superbet'];
const msRegex = /\.\d+/;

async function cleanPlatform(platform) {
    console.log(`\n[${platform}] Starting FULL TABLE scan...`);

    // Step 1: Fetch ALL ids with their dedup keys (paginated)
    const allRows = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('crash_history')
            .select('id, multiplier, round_time')
            .eq('platform', platform)
            .order('round_time', { ascending: false })
            .range(from, from + pageSize - 1);

        if (error) { console.error(`Error:`, error.message); break; }
        if (!data || data.length === 0) break;

        allRows.push(...data);
        from += pageSize;

        process.stdout.write(`  Fetched ${allRows.length} rows...\r`);

        if (data.length < pageSize) break; // Last page
    }

    console.log(`\n[${platform}] Total rows fetched: ${allRows.length}`);

    // Step 2: Find all duplicates (keep first occurrence = most recent since sorted desc)
    const seen = new Set();
    const toDelete = [];

    for (const r of allRows) {
        const timeStr = r.round_time.replace(msRegex, '');
        const key = `${r.multiplier}_${timeStr}`;
        if (seen.has(key)) {
            toDelete.push(r.id);
        } else {
            seen.add(key);
        }
    }

    if (toDelete.length === 0) {
        console.log(`[${platform}] CLEAN ✅ — no duplicates found`);
        return;
    }

    console.log(`[${platform}] Found ${toDelete.length} duplicates to delete`);

    // Step 3: Delete in chunks of 100
    let deleted = 0;
    for (let i = 0; i < toDelete.length; i += 100) {
        const chunk = toDelete.slice(i, i + 100);
        const { error } = await supabase
            .from('crash_history')
            .delete()
            .in('id', chunk);
        if (error) {
            console.error(`  Delete error:`, error.message);
        } else {
            deleted += chunk.length;
            process.stdout.write(`  Deleted ${deleted}/${toDelete.length}...\r`);
        }
    }

    console.log(`\n[${platform}] ✅ Deleted ${deleted} duplicates`);
}

async function main() {
    console.log('=== FULL TABLE DEDUPLICATION ===');
    for (const p of PLATFORMS) {
        await cleanPlatform(p);
    }
    console.log('\n\n=== DONE — NOW RUN CREATE INDEX IN SUPABASE ===');
}

main();
