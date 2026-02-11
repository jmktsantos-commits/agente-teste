const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function verifyAll() {
    console.log("🔍 Starting Comprehensive Verification...\n");

    const n8nUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL?.replace(/\/$/, '');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Check Data (Workflow 01 or Seed)
    const { count, error } = await supabase
        .from('crash_history')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.log(`❌ W01 (Data): Error checking table - ${error.message}`);
    } else {
        console.log(`📊 W01 (Data): Found ${count} entries in 'crash_history'.`);
        if (count > 0) console.log("   ✅ Data is present (Mock or Real).");
        else console.log("   ⚠️ Table is empty. Workflow 01 not active yet.");
    }

    // 2. Check Bankroll (Workflow 03)
    try {
        const res = await fetch(`${n8nUrl}/atualizar-banca`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: 'test', balance: 100, risk_profile: 'moderado' })
        });
        if (res.ok) console.log("✅ W03 (Bankroll): Active and working (200 OK).");
        else console.log(`❌ W03 (Bankroll): Failed with ${res.status} ${res.statusText} (Likely Inactive).`);
    } catch (e) {
        console.log(`❌ W03 (Bankroll): Connection error - ${e.message}`);
    }

    // 3. Check Chat (Workflow 04)
    try {
        const res = await fetch(`${n8nUrl}/chat-moderation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: 'test', content: 'hello' })
        });
        // 500 means connected but logic failed (credentials), 404/403 means connection failed
        if (res.ok) console.log("✅ W04 (Chat): Active and working (200 OK).");
        else if (res.status === 500) console.log("🟠 W04 (Chat): Connected but internal error (Check Supabase Credentials).");
        else console.log(`❌ W04 (Chat): Failed with ${res.status} ${res.statusText}.`);
    } catch (e) {
        console.log(`❌ W04 (Chat): Connection error - ${e.message}`);
    }
}

verifyAll();
