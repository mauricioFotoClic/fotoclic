import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkBillings() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: billings, error } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .eq('status', 'PAID');

    if (error) {
        console.error('Erro:', error);
        return;
    }

    console.log(JSON.stringify(billings, null, 2));
}

checkBillings();
