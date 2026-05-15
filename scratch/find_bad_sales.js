import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function findBadSales() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('commission', 0.3);

    if (error) {
        console.error('Erro:', error);
        return;
    }

    console.log('Vendas com 0.30 encontradas:', data.length);
    if (data.length > 0) {
        console.log(data.map(d => d.id));
    }
}

findBadSales();
