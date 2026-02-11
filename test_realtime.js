const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRealtime() {
    console.log('🔍 Testando Supabase Realtime...\n');

    console.log('📡 Criando canal de teste...');

    const channel = supabase
        .channel('test_channel')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'crash_history'
        }, (payload) => {
            console.log('\n✅ EVENTO RECEBIDO!');
            console.log('📦 Payload:', JSON.stringify(payload.new, null, 2));
        })
        .subscribe((status) => {
            console.log(`📊 Status da subscrição: ${status}`);

            if (status === 'SUBSCRIBED') {
                console.log('\n✅ Canal inscrito com sucesso!');
                console.log('⏳ Aguardando novos registros...');
                console.log('💡 Execute o scraper para testar\n');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('\n❌ Erro ao se inscrever no canal!');
                console.error('Verifique se o Realtime está habilitado na tabela crash_history\n');
            }
        });

    // Keep running
    console.log('🔄 Monitorando eventos (Ctrl+C para parar)...\n');
}

testRealtime();

// Keep process alive
setInterval(() => { }, 1000);
