const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function nuclearCleanup() {
    console.log('☢️  LIMPEZA NUCLEAR: Removendo TODAS as duplicatas de uma vez!\n');

    // Get ALL records from the table
    let allRecords = [];
    let from = 0;
    const BATCH = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('crash_history')
            .select('*')
            .order('round_time', { ascending: false })
            .range(from, from + BATCH - 1);

        if (error) {
            console.error('❌ Erro:', error);
            break;
        }

        if (!data || data.length === 0) break;
        allRecords = allRecords.concat(data);
        from += BATCH;
        if (data.length < BATCH) break;
    }

    console.log(`📊 Total de registros no banco: ${allRecords.length}\n`);

    // Group by multiplier + platform + day + hour + minute (allowing multiple per minute if different seconds)
    const keep = new Map();
    const toDelete = [];

    allRecords.forEach(record => {
        const timestamp = new Date(record.round_time);
        // Key that allows ONE instance per multiplier per minute
        const key = `${record.multiplier.toFixed(2)}-${record.platform}-${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}-${timestamp.getMinutes()}`;

        if (!keep.has(key)) {
            // Keep the FIRST occurrence (most recent due to our sort)
            keep.set(key, record.id);
        } else {
            // Delete all subsequent occurrences
            toDelete.push(record.id);
        }
    });

    console.log(`✅ Registros únicos a manter: ${keep.size}`);
    console.log(`🗑️  Duplicatas a remover: ${toDelete.length}\n`);

    if (toDelete.length === 0) {
        console.log('✅ Nenhuma duplicata encontrada!\n');
        process.exit(0);
    }

    // Delete in batches
    console.log('🗑️  Removendo duplicatas em lotes...\n');
    const DELETE_BATCH = 100;
    let deleted = 0;

    for (let i = 0; i < toDelete.length; i += DELETE_BATCH) {
        const batch = toDelete.slice(i, i + DELETE_BATCH);
        const { error } = await supabase
            .from('crash_history')
            .delete()
            .in('id', batch);

        if (error) {
            console.error(`❌ Erro no lote ${Math.floor(i / DELETE_BATCH) + 1}:`, error.message);
        } else {
            deleted += batch.length;
            console.log(`  ✓ Lote ${Math.floor(i / DELETE_BATCH) + 1}: ${batch.length} removidos (${deleted}/${toDelete.length})`);
        }
    }

    console.log(`\n✅ Limpeza finalizadaada!`);
    console.log(`📊 Removidos: ${deleted}`);
    console.log(`📊 Mantidos: ${keep.size}\n`);

    process.exit(0);
}

nuclearCleanup();
