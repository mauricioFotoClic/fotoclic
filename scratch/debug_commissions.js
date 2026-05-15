import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function debugCommissions() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
        .from('sales')
        .select('id, commission, price, billing_id');

    if (error) {
        console.error('Erro:', error);
        return;
    }

    console.log('Todas as vendas no banco:');
    data.forEach(s => {
        console.log(`ID: ${s.id}, Price: ${s.price}, Comm: ${s.commission}, Billing: ${s.billing_id}`);
    });
}

debugCommissions();
