import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkSales() {
    const supabase = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const billingId = 'bill_0j2cujyqHUZzcCXWBsgbDHJA';
    const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('billing_id', billingId);

    if (error) {
        console.error('Error fetching sales:', error);
        return;
    }

    console.log(`Sales found for ${billingId}:`, data.length);
    console.log(JSON.stringify(data, null, 2));
}

checkSales();
