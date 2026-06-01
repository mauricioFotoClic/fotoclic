import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPayouts() {
  console.log('--- Buscando histórico de payouts do Mauricio Val ---');
  try {
    const { data: payouts, error: payoutsError } = await supabase
      .from('payouts')
      .select('*')
      .eq('photographer_id', 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f');

    if (payoutsError) {
      console.error('Erro ao buscar payouts:', payoutsError);
      return;
    }

    console.log('Payouts cadastrados para Mauricio Val:', payouts);

    console.log('\n--- Buscando vendas do Mauricio Val ---');
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('id, available_at, payout_id')
      .eq('photographer_id', 'aa5ea2f0-3548-43f6-b4ea-8270abaeb98f');

    if (salesError) {
      console.error('Erro ao buscar vendas:', salesError);
      return;
    }

    const salesWithoutPayout = sales.filter(s => s.payout_id === null);
    console.log(`Total de vendas: ${sales.length}`);
    console.log(`Vendas sem payout_id: ${salesWithoutPayout.length}`);
    console.log('Algumas vendas sem payout_id:', salesWithoutPayout.slice(0, 5));

  } catch (err) {
    console.error('Erro geral:', err);
  }
}

checkPayouts();
