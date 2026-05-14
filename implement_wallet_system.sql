-- 1. ATUALIZAÇÃO DA TABELA DE USUÁRIOS (FOTÓGRAFOS)
-- Adiciona campos para configuração de saque e PIX
ALTER TABLE "public"."users" 
ADD COLUMN IF NOT EXISTS "payout_frequency" text DEFAULT 'diario',
ADD COLUMN IF NOT EXISTS "pix_key" text,
ADD COLUMN IF NOT EXISTS "pix_key_type" text,
ADD COLUMN IF NOT EXISTS "payout_blocked" boolean DEFAULT false;

-- Comentários para documentação
COMMENT ON COLUMN "public"."users"."payout_frequency" IS 'Frequência de saque: diario, semanal ou mensal';
COMMENT ON COLUMN "public"."users"."pix_key" IS 'Chave PIX do fotógrafo para recebimento';
COMMENT ON COLUMN "public"."users"."pix_key_type" IS 'Tipo da chave PIX: cpf, cnpj, email, phone, random';

-- 2. ATUALIZAÇÃO DA TABELA DE VENDAS
-- Adiciona campos para controle de saldo e retenção
ALTER TABLE "public"."sales" 
ADD COLUMN IF NOT EXISTS "available_at" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "is_available" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "payout_id" uuid REFERENCES "public"."payouts"("id");

-- Trigger para definir automaticamente a data de liberação (Venda + 7 dias)
CREATE OR REPLACE FUNCTION public.set_sale_available_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Define a data de liberação para 7 dias após a venda
    NEW.available_at = COALESCE(NEW.sale_date, now()) + interval '7 days';
    NEW.is_available = false; -- Garante que inicia como pendente
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_sale_available_date ON "public"."sales";
CREATE TRIGGER trigger_set_sale_available_date
BEFORE INSERT ON "public"."sales"
FOR EACH ROW
EXECUTE PROCEDURE public.set_sale_available_date();

-- 3. ATUALIZAÇÃO DA TABELA DE PAYOUTS (SAQUES)
-- Adiciona campos para auditoria da AbacatePay
ALTER TABLE "public"."payouts" 
ADD COLUMN IF NOT EXISTS "external_id" text, -- ID da transferência na AbacatePay
ADD COLUMN IF NOT EXISTS "pix_data_used" jsonb, -- Log dos dados PIX usados no momento do saque
ADD COLUMN IF NOT EXISTS "error_message" text; -- Mensagem de erro caso o PIX falhe

-- 4. FUNÇÃO PARA CALCULAR SALDO (AUXILIAR)
-- Útil para o painel do fotógrafo
CREATE OR REPLACE VIEW public.photographer_wallet_summary AS
SELECT 
    u.id as photographer_id,
    u.name as photographer_name,
    -- Saldo que ainda está no período de 7 dias
    COALESCE(SUM(CASE WHEN s.is_available = false AND s.payout_id IS NULL THEN (s.price - s.commission) ELSE 0 END), 0) as balance_pending,
    -- Saldo já liberado mas ainda não pago
    COALESCE(SUM(CASE WHEN s.is_available = true AND s.payout_id IS NULL THEN (s.price - s.commission) ELSE 0 END), 0) as balance_available,
    -- Total já pago via saques concluídos
    COALESCE((SELECT SUM(amount) FROM public.payouts WHERE photographer_id = u.id AND status = 'paid'), 0) as total_withdrawn
FROM 
    public.users u
LEFT JOIN 
    public.sales s ON s.photographer_id = u.id
WHERE 
    u.role = 'photographer'
GROUP BY 
    u.id, u.name;
