const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function intelligentCleanup() {
    console.log('🧠 LIMPEZA INTELIGENTE: Removendo apenas duplicatas EXATAS\n');
    console.log('📋 Critério: Mesmo Multiplier + Platform + Timestamp (até o segundo)\n');

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

    // Group by exact key: multiplier + platform + timestamp to second precision
    const seen = new Map();
    const toDelete = [];

    allRecords.forEach(record => {
        // Create unique key with EXACT timestamp (to the second, without milliseconds)
        const timestamp = new Date(record.round_time);
        const timeKey = timestamp.toISOString().substring(0, 19); // YYYY-MM-DDTHH:MM:SS
        const key = `${record.multiplier.toFixed(2)}-${record.platform}-${timeKey}`;

        if (seen.has(key)) {
            // Exact duplicate found
            toDelete.push(record.id);
            console.log(`  🗑️  Duplicata: ${record.multiplier}x (${record.platform}) às ${timestamp.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
        } else {
            // First occurrence: keep it
            seen.set(key, record.id);
        }
    });

    console.log(`\n🔍 Duplicatas encontradas: ${toDelete.length}`);
    console.log(`✅ Registros únicos: ${seen.size}\n`);

    if (toDelete.length === 0) {
        console.log('✅ Nenhuma duplicata encontrada! Banco já está limpo.\n');
        process.exit(0);
        return;
    }

    // Show sample of what will be kept
    console.log('📝 Exemplo de como ficará (primeiros 20 únicos):\n');
    let count = 0;
    for (const [key, id] of seen) {
        if (count >= 20) break;
        const record = allRecords.find(r => r.id === id);
        if (record) {
            const timestamp = new Date(record.round_time);
            console.log(`  ✓ ${record.multiplier}x (${record.platform}) às ${timestamp.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
        }
        count++;
    }

    // Delete in batches
    console.log(`\n🗑️  Removendo ${toDelete.length} duplicatas...\n`);
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
    console.log(`\n💡 Agora você pode ter múltiplos resultados no mesmo minuto, desde que sejam em segundos diferentes!\n`);

    process.exit(0);
}

intelligentCleanup();
