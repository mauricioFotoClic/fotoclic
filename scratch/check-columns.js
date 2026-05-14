import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkColumns() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('--- Colunas da tabela customers ---');
  // There is no easy way to get columns without a specialized query or a sample record
  const { data, error } = await supabase.from('customers').select('*').limit(1);
  if (error) {
    console.error('Erro ao buscar customers:', error);
  } else {
    console.log('Exemplo de registro:', JSON.stringify(data[0] || {}, null, 2));
    // If no record, we can't see columns easily with JS SDK without a hack
  }
}

checkColumns();
