-- ==============================================================================
-- FotoClic: Migração de Banco de Dados para Appmax (API v4 & Split de Pagamentos)
-- ==============================================================================
-- Este script adiciona as colunas necessárias para suportar a Appmax,
-- identificação de recebedores (fotógrafos) e rastreamento de pedidos e split.
-- Execute no SQL Editor do seu Dashboard Supabase.
-- ==============================================================================

-- 1. Extensão da tabela de usuários para recebedores Appmax
ALTER TABLE IF EXISTS public.users 
ADD COLUMN IF NOT EXISTS appmax_recipient_id TEXT,
ADD COLUMN IF NOT EXISTS appmax_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS appmax_document TEXT,
ADD COLUMN IF NOT EXISTS appmax_bank_code TEXT,
ADD COLUMN IF NOT EXISTS appmax_bank_agency TEXT,
ADD COLUMN IF NOT EXISTS appmax_bank_account TEXT,
ADD COLUMN IF NOT EXISTS appmax_bank_account_digit TEXT;

-- 2. Extensão da tabela de vendas para identificar gateway e pedido Appmax
ALTER TABLE IF EXISTS public.sales 
ADD COLUMN IF NOT EXISTS appmax_order_id TEXT,
ADD COLUMN IF NOT EXISTS gateway TEXT DEFAULT 'appmax',
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'pix',
ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1;

-- 3. Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_users_appmax_recipient ON public.users(appmax_recipient_id);
CREATE INDEX IF NOT EXISTS idx_sales_appmax_order ON public.sales(appmax_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_gateway ON public.sales(gateway);

-- 4. Inserção de configuração padrão da Appmax em system_settings se não existir
INSERT INTO public.system_settings (key, value)
VALUES ('appmax_config', '{
  "environment": "sandbox",
  "active_gateway": "appmax",
  "default_commission_rate": 6.0,
  "max_installments": 21
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
