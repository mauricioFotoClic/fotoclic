import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listAllTables() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const tables = ['users', 'sales', 'photos', 'payouts', 'abacate_pay_billings', 'customers', 'buyers', 'system_settings'];
  for (const table of tables) {
    const { error: err } = await supabase.from(table).select('count', { count: 'exact', head: true });
    if (err) {
      console.log(`Tabela ${table}: ERRO - ${err.message} (${err.code})`);
    } else {
      console.log(`Tabela ${table}: EXISTE`);
    }
  }
}

listAllTables();
