import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE URL or KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("=== EXECUTANDO MIGRAÇÃO: ADD allow_discounts TO events ===");

  const sql = `
    ALTER TABLE events ADD COLUMN IF NOT EXISTS allow_discounts BOOLEAN DEFAULT true;
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error("Erro ao aplicar migração:", error);
    process.exit(1);
  } else {
    console.log("Migração aplicada com sucesso! Coluna 'allow_discounts' adicionada ou já existente.");
  }
}

run().catch(console.error);
