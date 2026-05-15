import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSales() {
    console.log('--- VENDAS NO BANCO DE DADOS (SIMPLES) ---');
    const { data: sales, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar vendas:', error);
        return;
    }

    console.table(sales.map(s => ({
        id: s.id,
        billing_id: s.billing_id,
        valor: s.price,
        comissao: s.commission,
        data: s.created_at,
        photographer_id: s.photographer_id
    })));

    const total = sales.reduce((acc, s) => acc + (Number(s.price) || 0), 0);
    console.log(`\nTOTAL EM VENDAS: R$ ${total.toFixed(2)} (${sales.length} vendas)`);

    console.log('\n--- COBRANÇAS NO BANCO DE DADOS (abacate_pay_billings) ---');
    const { data: billings } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .order('created_at', { ascending: false });

    console.table(billings?.map(b => ({
        billing_id: b.billing_id,
        status: b.status,
        amount: b.amount,
        customer: b.customer_name,
        data: b.created_at
    })));
}

checkSales();
