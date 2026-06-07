import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("=== CRIANDO TABELA DE SAQUES DO GATEWAY ===");

  const createTableSql = `
    CREATE TABLE IF NOT EXISTS "public"."abacate_pay_withdrawals" (
        "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        "amount" integer NOT NULL, -- Valor em centavos
        "status" text DEFAULT 'completed',
        "withdraw_date" timestamp with time zone DEFAULT now(),
        "external_id" text UNIQUE,
        "note" text
    );
    
    -- Habilitar RLS
    ALTER TABLE "public"."abacate_pay_withdrawals" ENABLE ROW LEVEL SECURITY;
    
    -- Políticas RLS
    -- Permitir leitura para usuários autenticados
    CREATE POLICY "Allow select for authenticated users" ON "public"."abacate_pay_withdrawals"
    FOR SELECT USING (auth.role() = 'authenticated');

    -- Permitir escrita (insert/update/delete) para admins (ou service_role implicitamente já pode)
    CREATE POLICY "Allow all for admin role" ON "public"."abacate_pay_withdrawals"
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
      )
    );
  `;

  // Executar a criação da tabela
  const { data: createData, error: createError } = await supabase.rpc('exec_sql', { sql_query: createTableSql });
  if (createError) {
    console.error("Erro ao criar tabela:", createError);
    // Se a RPC exec_sql falhar por falta de permissão ou não existir, vamos tentar rodar direto ou reportar
    console.log("Tentando criar de forma alternativa...");
  } else {
    console.log("Tabela 'abacate_pay_withdrawals' criada ou já existente.");
  }

  // Inserir o primeiro saque histórico de R$ 100,52 (10052 centavos)
  // ID: tran_FqfLJSQKJCZr6XMCAAjpyDGb
  // Data: 2026-06-01T09:51:00-03:00 (ou fuso de brasília, vamos usar fuso UTC correspondente)
  console.log("Inserindo saque histórico de R$ 100,52...");
  const { data: insertData, error: insertError } = await supabase
    .from('abacate_pay_withdrawals')
    .upsert({
      amount: 10052,
      status: 'completed',
      withdraw_date: '2026-06-01T12:51:00.000Z', // Ajustado para UTC correspondente
      external_id: 'tran_FqfLJSQKJCZr6XMCAAjpyDGb',
      note: 'Saque realizado no painel do Abacate Pay Pix para conta bancária.'
    }, { onConflict: 'external_id' });

  if (insertError) {
    console.error("Erro ao inserir saque histórico:", insertError);
  } else {
    console.log("Saque histórico de R$ 100,52 inserido com sucesso.");
  }
}

run().catch(console.error);
