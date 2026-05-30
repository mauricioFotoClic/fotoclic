const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Erro: Credenciais do Supabase ausentes no .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- Buscando Billings Recentes ---');
    const { data: billings, error: bError } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (bError) {
        console.error('Erro ao buscar billings:', bError);
        return;
    }

    billings.forEach(b => {
        console.log(`ID: ${b.billing_id} | Status: ${b.status} | Email: ${b.customer_email} | Criado em: ${b.created_at}`);
        console.log('Metadata:', JSON.stringify(b.metadata));
        console.log('--------------------------------------------------');
    });

    console.log('--- Buscando Vendas Recentes ---');
    const { data: sales, error: sError } = await supabase
        .from('sales')
        .select('*')
        .order('sale_date', { ascending: false })
        .limit(5);

    if (sError) {
        console.error('Erro ao buscar vendas:', sError);
        return;
    }

    sales.forEach(s => {
        console.log(`Venda ID: ${s.id} | Foto ID: ${s.photo_id} | Comprador: ${s.buyer_name} (${s.buyer_id}) | Data: ${s.sale_date} | Billing ID: ${s.billing_id}`);
    });
}

run();
