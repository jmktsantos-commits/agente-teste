const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyOrder() {
    console.log('🔍 VERIFICANDO ORDEM E HORÁRIOS\n');

    const { data, error } = await supabase
        .from('crash_history')
        .select('*')
        .eq('platform', 'bravobet')
        .order('round_time', { ascending: false })
        .limit(15);

    if (error) {
        console.error('❌ Erro:', error.message);
        return;
    }

    console.log('📊 Últimos 15 registros (mais recente primeiro):\n');

    data.forEach((record, i) => {
        const time = new Date(record.round_time);
        console.log(`${i + 1}. ${record.multiplier.toString().padStart(6)}x - ${time.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })}`);
    });

    console.log('\n✅ Compare com TipMiner:');
    console.log('   - Multiplicadores devem ser EXATAMENTE iguais');
    console.log('   - Horários devem ser IDÊNTICOS');
    console.log('   - Ordem: mais recente no TOPO\n');

    process.exit(0);
}

verifyOrder();
