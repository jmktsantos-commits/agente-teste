const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDuplicates() {
    console.log('🔍 Verificando duplicatas no banco de dados...\n');

    // Get recent records
    const { data, error } = await supabase
        .from('crash_history')
        .select('*')
        .order('round_time', { ascending: false })
        .limit(300);

    if (error) {
        console.error('❌ Erro:', error);
        return;
    }

    console.log(`📊 Total de registros analisados: ${data.length}\n`);

    // Find duplicates by multiplier + platform + round_time
    const seen = new Map();
    const duplicates = [];

    data.forEach(record => {
        const key = `${record.multiplier}-${record.platform}-${record.round_time}`;
        if (seen.has(key)) {
            duplicates.push({
                id: record.id,
                duplicate_of: seen.get(key),
                multiplier: record.multiplier,
                platform: record.platform,
                round_time: record.round_time
            });
        } else {
            seen.set(key, record.id);
        }
    });

    console.log(`🔄 Duplicatas encontradas: ${duplicates.length}\n`);

    if (duplicates.length > 0) {
        console.log('📋 Primeiras 10 duplicatas:');
        duplicates.slice(0, 10).forEach(dup => {
            console.log(`  ID ${dup.id}: ${dup.multiplier}x (${dup.platform}) às ${new Date(dup.round_time).toLocaleTimeString()}`);
        });

        console.log('\n💡 Deseja remover as duplicatas? Execute: node remove_duplicates.js');
    } else {
        console.log('✅ Nenhuma duplicata encontrada no banco!');
        console.log('🔍 O problema pode estar na lógica de exibição do frontend.');
    }

    // Check time ordering
    console.log('\n⏰ Verificando ordenação temporal...');
    let outOfOrder = 0;
    for (let i = 0; i < data.length - 1; i++) {
        const current = new Date(data[i].round_time);
        const next = new Date(data[i + 1].round_time);
        if (current < next) {
            outOfOrder++;
            if (outOfOrder <= 3) {
                console.log(`  ⚠️ Fora de ordem: ${current.toLocaleString()} < ${next.toLocaleString()}`);
            }
        }
    }

    if (outOfOrder > 0) {
        console.log(`\n⚠️ ${outOfOrder} registros fora de ordem encontrados`);
    } else {
        console.log('✅ Ordenação temporal está correta!');
    }

    process.exit(0);
}

checkDuplicates();
