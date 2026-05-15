import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkOrphan() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .eq('billing_id', 'bill_cauyuZSTLkChywNfGy3uPUCR');

    if (error) {
        console.error('Erro:', error);
        return;
    }

    console.log(JSON.stringify(data, null, 2));
}

checkOrphan();
