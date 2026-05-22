import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: billings } = await supabase.from('abacate_pay_billings')
        .select('billing_id, status, metadata')
        .order('created_at', { ascending: false })
        .limit(5);
        
    console.log("Últimas billings:");
    console.log(JSON.stringify(billings, null, 2));
}

check();
