import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function checkRealData() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2);

    if (error) {
        console.error('ERRO:', error);
    } else {
        console.log('DADOS REAIS:', JSON.stringify(data, null, 2));
    }
}

checkRealData();
