const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const photographerId = 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f'; // Mauricio Val

    const { data: sales, error } = await supabase
        .from('sales')
        .select('id, price, commission, status, sale_date, billing_id')
        .eq('photographer_id', photographerId);

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Vendas e comissões do Mauricio:`);
    sales.forEach((s, idx) => {
        console.log(`${idx + 1}. ID: ${s.id} | Preço: R$ ${s.price} | Comissão: R$ ${s.commission} | Líquido: R$ ${s.price - s.commission} | Billing: ${s.billing_id} | Status: ${s.status}`);
    });
}

run();
