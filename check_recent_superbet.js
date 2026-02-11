require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRecent() {
    console.log("🔍 Checking latest Superbet entries...");

    const { data, error } = await supabase
        .from('crash_history')
        .select('*')
        .eq('platform', 'superbet')
        .order('round_time', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error:", error);
        return;
    }

    console.log("Recent Superbet Data:");
    console.table(data.map(d => ({
        ...d,
        round_time: new Date(d.round_time).toLocaleString('pt-BR')
    })));
}

checkRecent();
