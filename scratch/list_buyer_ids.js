import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function listAllBuyerIds() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
        .from('sales')
        .select('buyer_id');

    if (error) {
        console.error('Erro:', error);
        return;
    }

    const ids = data.map(d => d.buyer_id);
    const uniqueIds = [...new Set(ids)];
    console.log('IDs de compradores únicos nas vendas:', uniqueIds);
}

listAllBuyerIds();
