import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listAllTables() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Generic query to list tables from information_schema
  const { data, error } = await supabase.rpc('get_tables'); 
  
  if (error) {
     // If RPC fails, try a direct query to pg_catalog or just try common names
     console.log('RPC get_tables falhou. Tentando busca manual...');
     const tables = ['users', 'sales', 'photos', 'payouts', 'abacate_pay_billings', 'customers', 'buyers', 'system_settings'];
     for (const table of tables) {
       const { error: err } = await supabase.from(table).select('count', { count: 'exact', head: true });
       console.log(`Tabela ${table}: ${err ? 'ERRO (' + err.message + ')' : 'EXISTE'}`);
     }
  } else {
    console.log('Tabelas encontradas:', data);
  }
}

listAllTables();
