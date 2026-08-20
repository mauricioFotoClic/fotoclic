-- ==============================================================================
-- FotoClic: Correção Definitiva de RLS, Recursão Infinita e RPCs
-- ==============================================================================
-- Este script corrige os erros 500 (Internal Server Error) e 400 (Bad Request)
-- no Supabase causados pela recursão na política RLS da tabela 'users'.
-- Execute este script no SQL Editor do seu Dashboard Supabase.
-- ==============================================================================

-- 1. Criar função SECURITY DEFINER is_admin() para checar permissão sem causar recursão RLS
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

-- 2. CORREÇÃO DA TABELA USERS (Elimina a recursão infinita no RLS)
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public users are viewable by everyone." ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.users;
DROP POLICY IF EXISTS "Users can update own profile." ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for all" ON public.users;
DROP POLICY IF EXISTS "Enable update for all" ON public.users;
DROP POLICY IF EXISTS "users_read_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;

-- Todos os visitantes e usuários podem ler dados de perfis (necessário para a Home, Eventos e Fotógrafos)
CREATE POLICY "users_read_policy" ON public.users
FOR SELECT TO anon, authenticated
USING (true);

-- Usuários podem atualizar seu próprio perfil, ou Administradores qualquer um
CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE TO authenticated
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

-- Inserção no registro
CREATE POLICY "users_insert_policy" ON public.users
FOR INSERT TO anon, authenticated
WITH CHECK (auth.uid() = id OR auth.uid() IS NOT NULL);


-- 3. CORREÇÃO DA TABELA SYSTEM_SETTINGS
ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for all" ON public.system_settings;
DROP POLICY IF EXISTS "Enable write for all" ON public.system_settings;
DROP POLICY IF EXISTS "settings_select_policy" ON public.system_settings;
DROP POLICY IF EXISTS "settings_write_policy" ON public.system_settings;

CREATE POLICY "settings_select_policy" ON public.system_settings
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "settings_write_policy" ON public.system_settings
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- 4. CORREÇÃO DA TABELA SALES (Vendas protegidas com is_admin)
ALTER TABLE IF EXISTS public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_select_policy" ON public.sales;

CREATE POLICY "sales_select_policy" ON public.sales
FOR SELECT TO authenticated
USING (
    buyer_id = auth.uid()
    OR photographer_id = auth.uid()
    OR public.is_admin()
);


-- 5. CORREÇÃO DA TABELA PAYOUTS (Saques)
ALTER TABLE IF EXISTS public.payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payouts_select_policy" ON public.payouts;
DROP POLICY IF EXISTS "payouts_insert_policy" ON public.payouts;
DROP POLICY IF EXISTS "payouts_update_policy" ON public.payouts;

CREATE POLICY "payouts_select_policy" ON public.payouts
FOR SELECT TO authenticated
USING (
    photographer_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "payouts_insert_policy" ON public.payouts
FOR INSERT TO authenticated
WITH CHECK (
    photographer_id = auth.uid()
);

CREATE POLICY "payouts_update_policy" ON public.payouts
FOR UPDATE TO authenticated
USING (
    public.is_admin()
);


-- 6. CORREÇÃO DA TABELA COUPONS
ALTER TABLE IF EXISTS public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_select_policy" ON public.coupons;
DROP POLICY IF EXISTS "coupons_insert_policy" ON public.coupons;
DROP POLICY IF EXISTS "coupons_update_policy" ON public.coupons;
DROP POLICY IF EXISTS "coupons_delete_policy" ON public.coupons;

CREATE POLICY "coupons_select_policy" ON public.coupons
FOR SELECT TO anon, authenticated
USING (
    is_active = true 
    OR photographer_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "coupons_insert_policy" ON public.coupons
FOR INSERT TO authenticated
WITH CHECK (
    photographer_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "coupons_update_policy" ON public.coupons
FOR UPDATE TO authenticated
USING (
    photographer_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "coupons_delete_policy" ON public.coupons
FOR DELETE TO authenticated
USING (
    photographer_id = auth.uid()
    OR public.is_admin()
);


-- 7. CORREÇÃO DA TABELA CARTS
ALTER TABLE IF EXISTS public.carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "carts_policy" ON public.carts;

CREATE POLICY "carts_policy" ON public.carts
FOR ALL TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
)
WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
);


-- 8. RECRIAR RPC get_photographers_with_stats DE FORMA ROBUSTA (Sem erro 400)
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
    WHERE u.role = 'photographer' AND u.is_active = true;
END;
$$;

-- Notificar o PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';
