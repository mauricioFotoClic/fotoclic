import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkAllCommissions() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
        .from('sales')
        .select('commission, price, billing_id');

    if (error) {
        console.error('Erro:', error);
        return;
    }

    console.log('Vendas encontradas:', data);
}

checkAllCommissions();
