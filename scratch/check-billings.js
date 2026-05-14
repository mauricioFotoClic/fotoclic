import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkBillings() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('--- Colunas da tabela abacate_pay_billings ---');
  const { data, error } = await supabase.from('abacate_pay_billings').select('*').limit(1);
  if (error) {
    console.error('Erro:', error);
  } else {
    console.log('Registro exemplo:', JSON.stringify(data[0] || {}, null, 2));
  }
}

checkBillings();
