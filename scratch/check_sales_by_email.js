import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkUserSalesByEmail() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const email = 'ffranfeitosa@gmail.com';
    const { data: users } = await supabase.from('users').select('id').eq('email', email);
    
    if (users && users.length > 0) {
        const userId = users[0].id;
        const { data: sales } = await supabase.from('sales').select('*').eq('buyer_id', userId);
        console.log(`Vendas para o usuário ${userId} (${email}):`, sales?.length);
    } else {
        console.log('Usuário não encontrado.');
    }
}

checkUserSalesByEmail();
