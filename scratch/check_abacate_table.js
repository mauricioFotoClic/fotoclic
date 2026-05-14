import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkTable() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase config');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error checking abacate_pay_billings:', error);
    } else {
        console.log('Table abacate_pay_billings exists. Columns:', Object.keys(data[0] || {}));
    }
}

checkTable();
