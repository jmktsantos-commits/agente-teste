require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function checkLatestData() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🔍 Verificando últimos dados no Supabase...');

    const { data, error } = await supabase
        .from('crash_history')
        .select('round_time, multiplier, platform')
        .order('round_time', { ascending: false })
        .limit(5);

    if (error) {
        console.error('❌ Erro:', error.message);
        return;
    }

    console.log('\n✅ Últimos 5 registros:');
    data.forEach(d => {
        const time = new Date(d.round_time).toLocaleString('pt-BR');
        console.log(`- [${time}] ${d.platform}: ${d.multiplier}x`);
    });

    console.log('\n💡 Se os horários forem recentes (últimos segundos/minutos), o scraper está funcionando!');
}

checkLatestData();
