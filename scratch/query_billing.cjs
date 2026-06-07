const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const billingId = 'bill_nXcsh3shmSJFSazTbwC4wwCR';
    
    console.log(`--- Buscando Billing ${billingId} ---`);
    const { data: billing, error: bError } = await supabase
        .from('abacate_pay_billings')
        .select('*')
        .eq('billing_id', billingId)
        .maybeSingle();

    if (bError) {
        console.error('Erro ao buscar billing:', bError);
    } else if (billing) {
        console.log('Billing encontrado:', JSON.stringify(billing, null, 2));
    } else {
        console.log('Billing não encontrado na tabela abacate_pay_billings.');
    }

    console.log(`\n--- Buscando Vendas vinculadas ao Billing ${billingId} ---`);
    const { data: sales, error: sError } = await supabase
        .from('sales')
        .select('*, photos(*)')
        .eq('billing_id', billingId);

    if (sError) {
        console.error('Erro ao buscar vendas:', sError);
    } else {
        console.log(`Total de vendas encontradas: ${sales.length}`);
        sales.forEach((s, idx) => {
            console.log(`\n[Venda ${idx + 1}]`);
            console.log(`ID: ${s.id}`);
            console.log(`Foto ID: ${s.photo_id}`);
            console.log(`Fotógrafo ID: ${s.photographer_id}`);
            console.log(`Comprador ID: ${s.buyer_id}`);
            console.log(`Comprador Nome: ${s.buyer_name}`);
            console.log(`Preço: R$ ${s.price}`);
            console.log(`Status: ${s.status}`);
            console.log(`Data: ${s.sale_date}`);
            console.log(`Foto Detalhes:`, s.photos ? { title: s.photos.title, price: s.photos.price, deleted: false } : 'Não encontrada (pode ter sido deletada)');
        });
    }

    console.log(`\n--- Buscando dados do fotógrafo Mauricio ---`);
    const { data: mauricio, error: mError } = await supabase
        .from('users')
        .select('*')
        .eq('email', 'mauricio@fvimagem.com')
        .maybeSingle();

    if (mError) {
        console.error('Erro ao buscar Mauricio:', mError);
    } else if (mauricio) {
        console.log('Mauricio Val:', { id: mauricio.id, name: mauricio.name, email: mauricio.email, role: mauricio.role });
    } else {
        console.log('Mauricio não encontrado por e-mail.');
    }
}

run();
