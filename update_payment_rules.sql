-- 1. ATUALIZAÇÃO DA TABELA DE COBRANÇAS
ALTER TABLE "public"."abacate_pay_billings" 
ADD COLUMN IF NOT EXISTS "terms_accepted" boolean DEFAULT false;

-- 2. ATUALIZAÇÃO DA TABELA DE VENDAS PARA SUPORTE A REEMBOLSO (ANTI-FRAUDE)
ALTER TABLE "public"."sales" 
ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS "billing_id" text;

-- Comentário para documentação
COMMENT ON COLUMN "public"."sales"."status" IS 'Status da venda: completed ou refunded';
COMMENT ON COLUMN "public"."sales"."billing_id" IS 'ID do checkout do AbacatePay vinculado à venda';

-- 3. REMOÇÃO DA REGRA DE 7 DIAS (DISPONIBILIDADE IMEDIATA)
-- Vamos atualizar a trigger para que a data de liberação seja a data da venda (agora)
CREATE OR REPLACE FUNCTION public.set_sale_available_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Agora vendeu, já está disponível (available_at = sale_date)
    NEW.available_at = COALESCE(NEW.sale_date, now());
    NEW.is_available = true; -- Já inicia como disponível
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Atualizar vendas existentes que ainda estão presas nos 7 dias (opcional, mas recomendado)
UPDATE public.sales SET is_available = true, available_at = sale_date WHERE is_available = false AND status = 'completed';

-- 4. NOVA VIEW DE SALDO COM LÓGICA DE SALDO NEGATIVO (ANTI-FRAUDE)
-- O saldo disponível agora considera: Vendas Completas - Comissões - Saques Realizados - Reembolsos
CREATE OR REPLACE VIEW public.photographer_wallet_summary AS
SELECT 
    u.id as photographer_id,
    u.name as photographer_name,
    -- Saldo pendente (não existe mais por tempo, apenas se houver algum erro de sistema)
    0::numeric as balance_pending,
    
    -- CÁLCULO DO SALDO DISPONÍVEL REAL:
    -- (Soma de tudo que vendeu com sucesso) - (Soma de tudo que foi estornado) - (Soma de tudo que já sacou)
    (
      COALESCE(SUM(CASE WHEN s.status = 'completed' THEN (s.price - s.commission) ELSE 0 END), 0) -- Vendas Reais
      - 
      COALESCE(SUM(CASE WHEN s.status = 'refunded' THEN (s.price - s.commission) ELSE 0 END), 0)  -- Reembolsos (Dedução)
      -
      COALESCE((SELECT SUM(amount) FROM public.payouts WHERE photographer_id = u.id AND status = 'paid'), 0) -- Saques já feitos
    ) as balance_available,

    -- Total já pago via saques concluídos
    COALESCE((SELECT SUM(amount) FROM public.payouts WHERE photographer_id = u.id AND status = 'paid'), 0) as total_withdrawn,

    -- Total de Reembolsos para auditoria
    COALESCE(SUM(CASE WHEN s.status = 'refunded' THEN (s.price - s.commission) ELSE 0 END), 0) as total_refunded
FROM 
    public.users u
LEFT JOIN 
    public.sales s ON s.photographer_id = u.id
WHERE 
    u.role = 'photographer'
GROUP BY 
    u.id, u.name;
