import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkRecentSales() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
        .from('sales')
        .select('*, photos(title), users:buyer_id(email, name)')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Erro:', error);
        return;
    }

    console.log(JSON.stringify(data, null, 2));
}

checkRecentSales();
