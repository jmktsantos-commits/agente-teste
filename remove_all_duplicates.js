const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function removeDuplicates() {
    console.log('🗑️  Removendo duplicatas...\n');

    // Get all records
    const { data: all, error } = await supabase
        .from('crash_history')
        .select('*')
        .order('round_time', { ascending: false });

    if (error) {
        console.error('❌ Erro:', error.message);
        return;
    }

    console.log(`📊 Total de registros: ${all.length}\n`);

    // Group by multiplier + platform + round_time (to second)
    const seen = new Set();
    const duplicateIds = [];

    all.forEach(record => {
        const time = new Date(record.round_time);
        const timeKey = `${time.getFullYear()}-${time.getMonth()}-${time.getDate()}-${time.getHours()}-${time.getMinutes()}-${time.getSeconds()}`;
        const key = `${record.multiplier}-${record.platform}-${timeKey}`;

        if (seen.has(key)) {
            duplicateIds.push(record.id);
        } else {
            seen.add(key);
        }
    });

    console.log(`🔍 Duplicatas encontradas: ${duplicateIds.length}\n`);

    if (duplicateIds.length > 0) {
        // Delete in batches
        for (let i = 0; i < duplicateIds.length; i += 100) {
            const batch = duplicateIds.slice(i, i + 100);
            const { error: deleteError } = await supabase
                .from('crash_history')
                .delete()
                .in('id', batch);

            if (deleteError) {
                console.error(`❌ Erro ao deletar batch ${i}:`, deleteError.message);
            } else {
                console.log(`✅ Deletados ${batch.length} registros (${i + batch.length}/${duplicateIds.length})`);
            }
        }

        console.log(`\n✅ ${duplicateIds.length} duplicatas removidas!`);
    } else {
        console.log('✅ Nenhuma duplicata encontrada!');
    }

    process.exit(0);
}

removeDuplicates();
