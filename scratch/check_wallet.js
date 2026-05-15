import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkWallet() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
        .from('photographer_wallet_summary')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Erro:', error);
        return;
    }

    console.log(data);
}

checkWallet();
