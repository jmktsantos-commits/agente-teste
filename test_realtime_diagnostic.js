const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRealtime() {
    console.log('📡 Iniciando teste de Realtime...');
    console.log(`URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

    const channel = supabase
        .channel('test_realtime_channel')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'crash_history'
        }, (payload) => {
            console.log('🔥 EVENTO RECEBIDO:', JSON.stringify(payload, null, 2));
        })
        .subscribe((status, err) => {
            console.log('📊 Status da Inscrição:', status);
            if (err) console.error('❌ Erro na inscrição:', err);

            if (status === 'SUBSCRIBED') {
                console.log('✅ Inscrito com sucesso! Aguardando novos dados...');
                console.log('💡 Dica: Insira uma linha na tabela crash_history para testar.');

                // Keep the script running for a bit to wait for events
                setTimeout(() => {
                    console.log('⏱️ Tempo de teste esgotado. Saindo...');
                    process.exit(0);
                }, 30000);
            }
        });

    channel.on('error', (err) => {
        console.error('❌ Canal com erro:', err);
    });
}

testRealtime();
