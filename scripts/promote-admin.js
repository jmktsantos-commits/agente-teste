require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function promote() {
    console.log('Promoting user to admin...');
    const { data, error } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('email', 'teste@teste.com')
        .select();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success:', data);
    }
}

promote();
