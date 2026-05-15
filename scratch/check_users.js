import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkUsers() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('email', ['ffranfeitosa@gmail.com', 'daiancash@gmail.com']);

    if (error) {
        console.error('Erro:', error);
        return;
    }

    console.log(JSON.stringify(data, null, 2));
}

checkUsers();
