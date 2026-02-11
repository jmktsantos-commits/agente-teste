const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function aggressiveCleanup() {
    console.log('🗑️  LIMPEZA AGRESSIVA: Removendo TODOS os registros duplicados...\n');

    // Get ALL records
    const { data: allRecords, error: fetchError } = await supabase
        .from('crash_history')
        .select('*')
        .order('round_time', { ascending: false });

    if (fetchError) {
        console.error('❌ Erro ao buscar registros:', fetchError);
        return;
    }

    console.log(`📊 Total de registros: ${allRecords.length}\n`);

    // Group by unique key: multiplier + platform + round_time (to second precision)
    const seen = new Map();
    const toDelete = [];

    allRecords.forEach(record => {
        // Cria chave única usando apenas HH:MM:SS (sem milissegundos)
        const timestamp = new Date(record.round_time);
        const timeKey = `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}-${timestamp.getHours()}-${timestamp.getMinutes()}-${timestamp.getSeconds()}`;
        const key = `${record.multiplier}-${record.platform}-${timeKey}`;

        if (seen.has(key)) {
            // Duplicata encontrada
            toDelete.push(record.id);
        } else {
            // Primeira ocorrência, manter
            seen.set(key, record.id);
        }
    });

    console.log(`🔍 Duplicatas identificadas: ${toDelete.length}`);
    console.log(`✅ Registros únicos: ${seen.size}\n`);

    if (toDelete.length === 0) {
        console.log('✅ Nenhuma duplicata encontrada!');
        return;
    }

    // Delete in batches of 100
    console.log('🗑️  Removendo duplicatas...\n');
    const BATCH_SIZE = 100;
    let deleted = 0;

    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
        const batch = toDelete.slice(i, i + BATCH_SIZE);
        const { error: deleteError } = await supabase
            .from('crash_history')
            .delete()
            .in('id', batch);

        if (deleteError) {
            console.error(`❌ Erro ao deletar lote ${Math.floor(i / BATCH_SIZE) + 1}:`, deleteError.message);
        } else {
            deleted += batch.length;
            console.log(`  ✓ Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} registros removidos (${deleted}/${toDelete.length})`);
        }
    }

    console.log(`\n✅ Limpeza concluída!`);
    console.log(`📊 Registros removidos: ${deleted}`);
    console.log(`📊 Registros únicos mantidos: ${seen.size}`);

    process.exit(0);
}

aggressiveCleanup();
