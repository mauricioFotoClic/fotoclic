import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function testSupabaseInsert() {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    console.log('Url:', supabaseUrl);
    console.log('Key length:', supabaseKey?.length);

    if (!supabaseUrl || !supabaseKey) {
        console.error('Credenciais faltando!');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const testId = 'test_' + Date.now();
    console.log('Tentando inserir registro de teste:', testId);

    const { data, error } = await supabase
        .from('abacate_pay_billings')
        .insert({
            billing_id: testId,
            amount: 1500,
            status: 'PENDING',
            checkout_url: 'https://test.com',
            customer_name: 'Teste Local',
            customer_email: 'teste@local.com',
            customer_cpf: '12345678909',
            metadata: { test: true }
        })
        .select();

    if (error) {
        console.error('ERRO SUPABASE:', JSON.stringify(error, null, 2));
    } else {
        console.log('SUCESSO:', JSON.stringify(data, null, 2));
    }
}

testSupabaseInsert();
