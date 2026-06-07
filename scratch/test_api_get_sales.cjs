const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const photographerId = 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f'; // Mauricio Val
    
    // We replicate the join query from api.ts:
    const { data: salesWithBuyer, error: joinError } = await supabase
      .from("sales")
      .select("*, buyer:users!buyer_id(name)")
      .eq("photographer_id", photographerId)
      .order("sale_date", { ascending: false });

    if (joinError) {
        console.error('Erro no join query:', joinError);
        return;
    }

    console.log(`Total de vendas retornadas: ${salesWithBuyer.length}`);
    const felipeSales = salesWithBuyer.filter(s => s.billing_id === 'bill_nXcsh3shmSJFSazTbwC4wwCR');
    console.log(`Vendas correspondentes ao felipevalgames: ${felipeSales.length}`);
    
    felipeSales.forEach((s, idx) => {
        console.log(`\n[Venda ${idx+1}]`);
        console.log(`ID: ${s.id}`);
        console.log(`Buyer ID: ${s.buyer_id}`);
        console.log(`Buyer Name de users join:`, s.buyer ? s.buyer.name : 'NÃO RETORNADO PELO JOIN');
        console.log(`Valor: ${s.price}`);
        console.log(`Data: ${s.sale_date}`);
        console.log(`buyer_name (mapeado como na API):`, s.buyer?.name || "Cliente");
    });
}

run();
