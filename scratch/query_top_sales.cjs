const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const photographerId = 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f'; // Mauricio Val
    
    const { data: sales, error } = await supabase
      .from("sales")
      .select("*, buyer:users!buyer_id(name), photo:photos(title)")
      .eq("photographer_id", photographerId)
      .order("sale_date", { ascending: false });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`=== Top 15 vendas do Mauricio Val ===`);
    sales.slice(0, 15).forEach((s, idx) => {
        console.log(`${idx + 1}. ID: ${s.id} | Comprador: ${s.buyer?.name} (${s.buyer_id}) | Foto: ${s.photo?.title || 'Deletada'} | R$ ${s.price} | Data: ${s.sale_date} | Billing ID: ${s.billing_id}`);
    });
}

run();
