const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkTimestamps() {
    console.log('⏰ Verificando sincronização de horários...\n');

    const { data, error } = await supabase
        .from('crash_history')
        .select('*')
        .order('round_time', { ascending: false })
        .limit(50);

    if (error) {
        console.error('❌ Erro:', error);
        return;
    }

    console.log('📋 Últimos 20 registros (ordenados por round_time DESC):\n');

    data.slice(0, 20).forEach((record, index) => {
        const date = new Date(record.round_time);
        const localTime = date.toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit'
        });

        console.log(`${index + 1}. ${record.multiplier.toFixed(2)}x (${record.platform}) - ${localTime} - ${record.id.substring(0, 8)}`);
    });

    // Check for time jumps
    console.log('\n🔍 Verificando saltos temporais anormais...\n');
    let issues = 0;

    for (let i = 0; i < data.length - 1; i++) {
        const current = new Date(data[i].round_time);
        const next = new Date(data[i + 1].round_time);
        const diffMinutes = (current - next) / 1000 / 60;

        // If current is older than next (wrong order) OR huge time jump
        if (diffMinutes < -1 || diffMinutes > 60) {
            issues++;
            if (issues <= 5) {
                const currentTime = current.toLocaleTimeString('pt-BR');
                const nextTime = next.toLocaleTimeString('pt-BR');
                console.log(`  ⚠️ Posição ${i}→${i + 1}: ${currentTime} → ${nextTime} (${diffMinutes.toFixed(1)} min)`);
            }
        }
    }

    if (issues === 0) {
        console.log('✅ Nenhum problema de ordenação encontrado!');
    } else {
        console.log(`\n⚠️ Total de ${issues} problemas de ordenação encontrados`);
    }

    process.exit(0);
}

checkTimestamps();
