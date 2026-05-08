import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function testMinimalInsert() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const testId = 'min_' + Date.now();
    const { data, error } = await supabase
        .from('abacate_pay_billings')
        .insert({
            billing_id: testId,
            amount: 1500,
            status: 'PENDING'
        })
        .select();

    if (error) {
        console.error('ERRO MINIMO:', error.message);
    } else {
        console.log('MINIMO SUCESSO! Registro:', data[0]);
    }
}

testMinimalInsert();
