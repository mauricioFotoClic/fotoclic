import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkPayouts() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching payouts:', error);
        return;
    }

    console.log('Payout sample:', data);
}

checkPayouts();
