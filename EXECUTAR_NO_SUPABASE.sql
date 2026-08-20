-- ==============================================================================
-- FotoClic: Script Definitivo de Desbloqueio e Blindagem RLS (Supabase)
-- ==============================================================================
-- Este script resolve definitivamente todos os erros 500 no Supabase
-- limpando as políticas recursivas antigas e aplicando a proteção definitiva.
-- Copie e cole no SQL Editor do seu Dashboard Supabase e clique em RUN.
-- ==============================================================================

-- 1. Criar função de verificação segura de admin (sem recursão de RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 2. Tabela USERS (Elimina a recursão infinita e restaura a visualização)
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "users_read_all" ON public.users
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "users_update_own_or_admin" ON public.users
FOR UPDATE TO authenticated
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

CREATE POLICY "users_insert_auth" ON public.users
FOR INSERT TO anon, authenticated
WITH CHECK (auth.uid() = id OR auth.uid() IS NOT NULL);


-- 3. Tabela SALES (Proteção contra compras manuais e leitura indevida)
ALTER TABLE IF EXISTS public.sales ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'sales' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.sales', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "sales_select_allowed" ON public.sales
FOR SELECT TO authenticated
USING (
    buyer_id = auth.uid() 
    OR photographer_id = auth.uid() 
    OR public.is_admin()
);

-- Ninguém insere vendas pelo frontend (apenas os webhooks via service_role)
REVOKE INSERT, UPDATE, DELETE ON public.sales FROM anon, authenticated;


-- 4. Tabela SYSTEM_SETTINGS (Configurações)
ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'system_settings' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.system_settings', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "settings_select_all" ON public.system_settings
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "settings_update_admin" ON public.system_settings
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- 5. Tabela PAYOUTS (Saques)
ALTER TABLE IF EXISTS public.payouts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'payouts' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.payouts', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "payouts_select_owner" ON public.payouts
FOR SELECT TO authenticated
USING (photographer_id = auth.uid() OR public.is_admin());

CREATE POLICY "payouts_insert_owner" ON public.payouts
FOR INSERT TO authenticated
WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "payouts_update_admin" ON public.payouts
FOR UPDATE TO authenticated
USING (public.is_admin());


-- 6. Tabela COUPONS (Cupons)
ALTER TABLE IF EXISTS public.coupons ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'coupons' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.coupons', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "coupons_select_active" ON public.coupons
FOR SELECT TO anon, authenticated
USING (is_active = true OR photographer_id = auth.uid() OR public.is_admin());

CREATE POLICY "coupons_manage_owner" ON public.coupons
FOR ALL TO authenticated
USING (photographer_id = auth.uid() OR public.is_admin())
WITH CHECK (photographer_id = auth.uid() OR public.is_admin());


-- 7. Tabela CARTS (Carrinho)
ALTER TABLE IF EXISTS public.carts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'carts' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.carts', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "carts_manage_user" ON public.carts
FOR ALL TO authenticated
USING (user_id = auth.uid() OR public.is_admin())
WITH CHECK (user_id = auth.uid() OR public.is_admin());


-- 8. Recriar RPC get_photographers_with_stats para listar TODOS os fotógrafos
DROP FUNCTION IF EXISTS public.get_photographers_with_stats();

CREATE OR REPLACE FUNCTION public.get_photographers_with_stats()
RETURNS TABLE (
    user_data jsonb,
    photo_cnt bigint,
    sales_cnt bigint,
    comm_val numeric,
    likes_cnt bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        to_jsonb(u.*) as user_data,
        COALESCE(p_stats.p_count, 0) as photo_cnt,
        COALESCE(s_stats.s_count, 0) as sales_cnt,
        COALESCE(s_stats.comm_val, 0) as comm_val,
        COALESCE(p_stats.l_count, 0) as likes_cnt
    FROM public.users u
    LEFT JOIN (
        SELECT p.photographer_id, COUNT(*) as p_count, SUM(COALESCE(p.likes_count, 0)) as l_count
        FROM public.photos p
        WHERE p.moderation_status = 'approved' AND p.is_public = true
        GROUP BY p.photographer_id
    ) p_stats ON u.id = p_stats.photographer_id
    LEFT JOIN (
        SELECT s.photographer_id, COUNT(*) as s_count, SUM(s.commission) as comm_val
        FROM public.sales s
        WHERE s.status != 'refunded'
        GROUP BY s.photographer_id
    ) s_stats ON u.id = s_stats.photographer_id
    WHERE u.role = 'photographer';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_photographers_with_stats() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- 9. Notificar recarregamento de schema
NOTIFY pgrst, 'reload schema';
