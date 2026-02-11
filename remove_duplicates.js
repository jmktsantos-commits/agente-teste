const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function removeDuplicates() {
    console.log('🔄 Iniciando limpeza de duplicatas...\n');

    // Get all records
    const { data, error } = await supabase
        .from('crash_history')
        .select('*')
        .order('round_time', { ascending: false }); // Most recent first

    if (error) {
        console.error('❌ Erro ao buscar registros:', error);
        return;
    }

    console.log(`📊 Total de registros no banco: ${data.length}\n`);

    // Track unique entries and duplicates
    const seen = new Map();
    const duplicateIds = [];

    data.forEach(record => {
        const key = `${record.multiplier}-${record.platform}-${record.round_time}`;
        if (!seen.has(key)) {
            seen.set(key, record.id); // Keep first (most recent)
        } else {
            duplicateIds.push(record.id); // Delete this one
        }
    });

    console.log(`🔍 Duplicatas identificadas: ${duplicateIds.length}\n`);

    if (duplicateIds.length === 0) {
        console.log('✅ Nenhuma duplicata encontrada!');
        process.exit(0);
        return;
    }

    console.log('🗑️  Removendo duplicatas em lotes...');

    // Delete in batches of 100
    const batchSize = 100;
    let deleted = 0;

    for (let i = 0; i < duplicateIds.length; i += batchSize) {
        const batch = duplicateIds.slice(i, i + batchSize);

        const { error: deleteError } = await supabase
            .from('crash_history')
            .delete()
            .in('id', batch);

        if (deleteError) {
            console.error(`❌ Erro ao deletar lote ${Math.floor(i / batchSize) + 1}:`, deleteError);
        } else {
            deleted += batch.length;
            console.log(`  ✓ Lote ${Math.floor(i / batchSize) + 1}: ${batch.length} registros removidos (${deleted}/${duplicateIds.length})`);
        }
    }

    console.log(`\n✅ Limpeza concluída!`);
    console.log(`📊 Registros removidos: ${deleted}`);
    console.log(`📊 Registros únicos mantidos: ${data.length - deleted}\n`);

    process.exit(0);
}

removeDuplicates();
