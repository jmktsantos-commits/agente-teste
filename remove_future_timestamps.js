const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function removeFutureTimestamps() {
    console.log('🔮 REMOVENDO TIMESTAMPS FUTUROS...\n');

    const now = new Date();
    console.log(`⏰ Hora atual: ${now.toISOString()}\n`);

    // Get all records with future timestamps
    const { data: allRecords, error: fetchError } = await supabase
        .from('crash_history')
        .select('*')
        .gte('round_time', now.toISOString());

    if (fetchError) {
        console.error('❌ Erro:', fetchError);
        return;
    }

    if (!allRecords || allRecords.length === 0) {
        console.log('✅ Nenhum registro futuro encontrado!\n');
        process.exit(0);
        return;
    }

    console.log(`⚠️  Encontrados ${allRecords.length} registros FUTUROS:\n`);

    allRecords.forEach(record => {
        const time = new Date(record.round_time);
        console.log(`  ${record.multiplier}x (${record.platform}) - ${time.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })} [ID: ${record.id}]`);
    });

    // Delete all future records
    const idsToDelete = allRecords.map(r => r.id);

    console.log(`\n🗑️  Removendo ${idsToDelete.length} registros futuros...\n`);

    const { error: deleteError } = await supabase
        .from('crash_history')
        .delete()
        .in('id', idsToDelete);

    if (deleteError) {
        console.error('❌ Erro ao deletar:', deleteError.message);
    } else {
        console.log(`✅ ${idsToDelete.length} registros futuros removidos com sucesso!\n`);
    }

    process.exit(0);
}

removeFutureTimestamps();
