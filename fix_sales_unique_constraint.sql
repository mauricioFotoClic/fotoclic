-- ============================================================
-- FIX: Adicionar constraint UNIQUE em (photo_id, buyer_id)
-- para prevenir vendas duplicadas via condição de corrida
-- entre sync-purchases.js e abacate-webhook.js
-- ============================================================

-- 1. Primeiro, remover duplicatas existentes (manter apenas o registro mais antigo)
DELETE FROM public.sales
WHERE id NOT IN (
    SELECT DISTINCT ON (photo_id, buyer_id) id
    FROM public.sales
    ORDER BY photo_id, buyer_id, sale_date ASC
);

-- 2. Criar o índice único
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_photo_buyer_unique
ON public.sales (photo_id, buyer_id);

-- 3. (Opcional) Verificar resultado
-- SELECT photo_id, buyer_id, COUNT(*) FROM public.sales GROUP BY photo_id, buyer_id HAVING COUNT(*) > 1;
