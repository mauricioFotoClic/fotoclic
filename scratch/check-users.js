import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkUsers() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('--- Exemplo de registro na tabela users ---');
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error('Erro ao buscar users:', error);
  } else {
    console.log('Campos na tabela users:', Object.keys(data[0] || {}).join(', '));
    console.log('Exemplo:', JSON.stringify(data[0], null, 2));
  }
}

checkUsers();
