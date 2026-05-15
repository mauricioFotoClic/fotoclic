import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkGuestSales() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { count, error } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .eq('buyer_id', 'guest-id');

    if (error) {
        console.error('Erro:', error);
        return;
    }

    console.log('Vendas guest-id:', count);
}

checkGuestSales();
