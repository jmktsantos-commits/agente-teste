const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function deepAnalysis() {
    console.log('🔍 ANÁLISE PROFUNDA: Verificando duplicatas e ordenação\n');

    // Get latest 200 records like frontend does
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

    // Check for duplicates by multiplier only (visual duplicates)
    const visualDuplicates = new Map();
    data.forEach((record, idx) => {
        const key = `${record.multiplier.toFixed(2)}x`;
        if (!visualDuplicates.has(key)) {
            visualDuplicates.set(key, []);
        }
        visualDuplicates.get(key).push({ idx, record });
    });

    console.log('🔄 DUPLICATAS VISUAIS (mesmo multiplicador):\n');
    let visualDupCount = 0;
    for (const [key, instances] of visualDuplicates) {
        if (instances.length > 1) {
            visualDupCount++;
            console.log(`  ${key}: ${instances.length} ocorrências`);
            instances.forEach(inst => {
                const time = new Date(inst.record.round_time);
                console.log(`    - ${inst.record.platform} às ${time.toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                })} (ID: ${inst.record.id})`);
            });
        }
    }

    if (visualDupCount === 0) {
        console.log('  ✅ Nenhuma duplicata visual encontrada!\n');
    } else {
        console.log(`\n  Total de multiplicadores duplicados: ${visualDupCount}\n`);
    }

    // Check chronological order
    console.log('📅 VERIFICANDO ORDENAÇÃO CRONOLÓGICA:\n');
    console.log('Primeiros 20 registros:\n');

    const now = new Date();
    data.slice(0, 20).forEach((record, i) => {
        const time = new Date(record.round_time);
        const dayDiff = Math.floor((now - time) / (1000 * 60 * 60 * 24));
        const dayLabel = dayDiff === 0 ? 'HOJE' : dayDiff === 1 ? 'ONTEM' : `${dayDiff} dias atrás`;

        console.log(`${i + 1}. ${record.multiplier.toFixed(2)}x (${record.platform}) - ${time.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })} [${dayLabel}]`);
    });

    // Check for ordering issues
    let orderIssues = 0;
    for (let i = 0; i < data.length - 1; i++) {
        const current = new Date(data[i].round_time);
        const next = new Date(data[i + 1].round_time);
        if (current < next) {
            orderIssues++;
            if (orderIssues <= 3) {
                console.log(`\n⚠️ PROBLEMA DE ORDEM na posição ${i}:`);
                console.log(`   Atual: ${current.toISOString()}`);
                console.log(`   Próximo: ${next.toISOString()}`);
            }
        }
    }

    if (orderIssues > 0) {
        console.log(`\n❌ ${orderIssues} problemas de ordenação encontrados!`);
    } else {
        console.log(`\n✅ Ordenação está correta!`);
    }

    process.exit(0);
}

deepAnalysis();
