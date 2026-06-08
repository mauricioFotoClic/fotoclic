import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSales() {
  console.log('--- Buscando vendas para Mauricio Val ---');
  try {
    const { data: sales, error } = await supabase
      .from('sales')
      .select('id, sale_date, price, commission, status, payout_id')
      .eq('photographer_id', 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f')
      .order('sale_date', { ascending: false });

    if (error) {
      console.error('Erro:', error);
      return;
    }

    console.log(`Encontradas ${sales.length} vendas.`);
    sales.forEach(s => {
      console.log(`Venda ID: ${s.id} | Data: ${s.sale_date} | Preço: R$ ${s.price.toFixed(2)} | Líquido: R$ ${(s.price - s.commission).toFixed(2)} | Status: ${s.status} | PayoutID: ${s.payout_id}`);
    });
  } catch (err) {
    console.error('Erro:', err);
  }
}

checkSales();
