import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listPayouts() {
  console.log('--- Buscando todos os registros da tabela payouts ---');
  try {
    const { data: payouts, error } = await supabase
      .from('payouts')
      .select('*')
      .order('request_date', { ascending: false });

    if (error) {
      console.error('Erro ao buscar payouts:', error);
      return;
    }

    console.log(`Encontrados ${payouts.length} saques.`);
    console.log(JSON.stringify(payouts, null, 2));
  } catch (err) {
    console.error('Erro:', err);
  }
}

listPayouts();
