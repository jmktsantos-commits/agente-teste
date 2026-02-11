const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkFrontendQuery() {
    console.log('🔍 Simulando query do frontend...\n');

    // Simulate what frontend does
    const { data, error } = await supabase
        .from('crash_history')
        .select('*')
        .order('round_time', { ascending: false })
        .limit(200);

    if (error) {
        console.error('❌ Erro:', error);
        return;
    }

    console.log(`📊 Total de registros retornados: ${data.length}\n`);

    // Check for duplicates in result
    const seen = new Map();
    const dupsInQuery = [];

    data.forEach((record, idx) => {
        const key = `${record.multiplier}-${record.platform}-${record.round_time}`;
        if (seen.has(key)) {
            dupsInQuery.push({ idx, record, original: seen.get(key) });
        } else {
            seen.set(key, idx);
        }
    });

    if (dupsInQuery.length > 0) {
        console.log(`❌ DUPLICATAS NA QUERY: ${dupsInQuery.length}\n`);
        dupsInQuery.slice(0, 10).forEach(dup => {
            console.log(`  Posição ${dup.idx}: ${dup.record.multiplier}x (${dup.record.platform}) às ${new Date(dup.record.round_time).toLocaleString()}`);
            console.log(`    ID: ${dup.record.id}`);
        });
    } else {
        console.log('✅ Nenhuma duplicata na query!\n');
    }

    // Check ordering
    console.log('📋 Primeiros 30 registros (verificando ordem):\n');
    data.slice(0, 30).forEach((record, i) => {
        const time = new Date(record.round_time);
        const timeStr = time.toLocaleString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit'
        });
        console.log(`${i + 1}. ${record.multiplier.toFixed(2)}x (${record.platform.padEnd(8)}) - ${timeStr}`);
    });

    // Check for ordering issues
    let orderIssues = 0;
    for (let i = 0; i < data.length - 1; i++) {
        const current = new Date(data[i].round_time);
        const next = new Date(data[i + 1].round_time);
        if (current < next) {
            orderIssues++;
        }
    }

    if (orderIssues > 0) {
        console.log(`\n❌ ${orderIssues} problemas de ordenação encontrados!`);
    } else {
        console.log('\n✅ Ordenação perfeita!');
    }

    process.exit(0);
}

checkFrontendQuery();
