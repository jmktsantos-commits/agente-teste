const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearDatabase() {
    console.log('🗑️  Limpando banco de dados...\n');

    const { error } = await supabase
        .from('crash_history')
        .delete()
        .gte('id', 0);

    if (error) {
        console.error('❌ Erro:', error.message);
    } else {
        console.log('✅ Banco de dados totalmente limpo!\n');
    }

    process.exit(0);
}

clearDatabase();
