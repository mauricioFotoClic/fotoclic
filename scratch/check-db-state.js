import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// If dotenv/config doesn't work with .env.local automatically
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkSettings() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('--- Verificando system_settings ---');
  const { data, error } = await supabase.from('system_settings').select('*');
  if (error) {
    console.error('Erro ao buscar system_settings:', error);
  } else {
    console.log('Resultados system_settings:', JSON.stringify(data, null, 2));
  }

  console.log('\n--- Verificando tabelas no schema public ---');
  const { data: infoSchema, error: infoError } = await supabase.rpc('get_tables_list'); // checking if I can use a generic query
  
  // Alternative way to check if tables exist
  const { data: tables, error: tablesErr } = await supabase.from('abacate_pay_billings').select('count', { count: 'exact', head: true });
  console.log('Tabela abacate_pay_billings existe:', !tablesErr);

  const { data: customers, error: customersErr } = await supabase.from('customers').select('count', { count: 'exact', head: true });
  console.log('Tabela customers existe:', !customersErr);
  
  const { data: users, error: usersErr } = await supabase.from('users').select('count', { count: 'exact', head: true });
  console.log('Tabela users existe:', !usersErr);
}

checkSettings();
