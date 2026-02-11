const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deepCleanup() {
    console.log('🧹 LIMPEZA PROFUNDA DE DUPLICATAS\n');

    // Get all records ordered by time
    const { data: all, error } = await supabase
        .from('crash_history')
        .select('*')
        .order('round_time', { ascending: true }); // oldest first

    if (error) {
        console.error('❌ Erro:', error.message);
        return;
    }

    console.log(`📊 Total de registros: ${all.length}\n`);

    // Group by multiplier + platform + time (to second)
    const seen = new Map();
    const toDelete = [];

    all.forEach(record => {
        const time = new Date(record.round_time);
        // Create key: multiplier-platform-YYYY-MM-DD-HH-MM-SS
        const timeKey = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}-${String(time.getHours()).padStart(2, '0')}-${String(time.getMinutes()).padStart(2, '0')}-${String(time.getSeconds()).padStart(2, '0')}`;
        const key = `${record.multiplier}-${record.platform}-${timeKey}`;

        if (seen.has(key)) {
            // Duplicate! Keep the first one (oldest), delete this one
            toDelete.push(record.id);
            console.log(`❌ Duplicata: ${record.multiplier}x (${record.platform}) - ${time.toLocaleString('pt-BR')}`);
        } else {
            seen.set(key, record.id);
        }
    });

    console.log(`\n🔍 Duplicatas encontradas: ${toDelete.length}\n`);

    if (toDelete.length > 0) {
        console.log('🗑️  Removendo...\n');

        // Delete in batches of 100
        for (let i = 0; i < toDelete.length; i += 100) {
            const batch = toDelete.slice(i, i + 100);
            const { error: deleteError } = await supabase
                .from('crash_history')
                .delete()
                .in('id', batch);

            if (deleteError) {
                console.error(`❌ Erro no batch ${i}:`, deleteError.message);
            } else {
                console.log(`✅ Deletados ${batch.length} registros (${i + batch.length}/${toDelete.length})`);
            }
        }

        console.log(`\n✅ Limpeza concluída! ${toDelete.length} duplicatas removidas!`);
    } else {
        console.log('✅ Nenhuma duplicata encontrada! Banco limpo!');
    }

    // Final count
    const { count } = await supabase
        .from('crash_history')
        .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Total final: ${count} registros únicos\n`);

    process.exit(0);
}

deepCleanup();
