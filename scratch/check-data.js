import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkData() {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('--- Dados na tabela customers ---');
  const { data: cust, error: custErr } = await supabase.from('customers').select('*').limit(1);
  if (custErr) console.error('Customers Err:', custErr.message);
  else console.log('Customer sample:', cust[0]);

  console.log('--- Dados na tabela buyers ---');
  const { data: buy, error: buyErr } = await supabase.from('buyers').select('*').limit(1);
  if (buyErr) console.error('Buyers Err:', buyErr.message);
  else console.log('Buyer sample:', buy[0]);
}

checkData();
