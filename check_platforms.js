require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    const { data: bravobet, error: err1 } = await supabase
        .from('crash_history')
        .select('*', { count: 'exact', head: true })
        .eq('platform', 'bravobet');

    const { data: superbet, error: err2 } = await supabase
        .from('crash_history')
        .select('*', { count: 'exact', head: true })
        .eq('platform', 'superbet');

    console.log('--- Database Stats ---');
    console.log(`Bravobet Rows: ${bravobet?.length || 'Count query'} (Count: ${bravobet === null ? 'null' : 'Available'})`);
    // actually head:true returns count in count property, data is null.

    // Let's do a proper count query
    const { count: count1 } = await supabase.from('crash_history').select('*', { count: 'exact', head: true }).eq('platform', 'bravobet');
    const { count: count2 } = await supabase.from('crash_history').select('*', { count: 'exact', head: true }).eq('platform', 'superbet');

    console.log(`Bravobet Count: ${count1}`);
    console.log(`Superbet Count: ${count2}`);

    if (count2 === 0) {
        console.log("⚠️ No Superbet data found. Checking scraper logs recommended.");
    } else {
        console.log("✅ Data exists for both.");
    }
}

check();
