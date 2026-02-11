const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function enableRealtime() {
    console.log('🔧 Habilitando Realtime na tabela crash_history...\n');

    try {
        // Enable realtime on the table
        const { error } = await supabase.rpc('enable_realtime_for_table', {
            table_name: 'crash_history'
        });

        if (error) {
            console.log('ℹ️  Função RPC não disponível. Tentando método alternativo...\n');

            console.log('📋 Execute este SQL no Supabase Dashboard:\n');
            console.log('================================================');
            console.log('ALTER PUBLICATION supabase_realtime ADD TABLE crash_history;');
            console.log('================================================\n');

            console.log('📍 Passos:');
            console.log('1. Abra o Supabase Dashboard');
            console.log('2. Vá em Database > Replication');
            console.log('3. Habilite Realtime para a tabela crash_history');
            console.log('   OU');
            console.log('4. Execute o SQL acima no SQL Editor\n');
        } else {
            console.log('✅ Realtime habilitado com sucesso!\n');
        }
    } catch (err) {
        console.error('❌ Erro:', err.message);

        console.log('\n📋 Execute este SQL manualmente no Supabase Dashboard:\n');
        console.log('================================================');
        console.log('ALTER PUBLICATION supabase_realtime ADD TABLE crash_history;');
        console.log('================================================\n');
    }

    process.exit(0);
}

enableRealtime();
