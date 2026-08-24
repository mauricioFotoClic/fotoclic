-- ==============================================================================
-- FotoClic: Correção Definitiva de Desempenho e Eliminação de Erros 500 no Supabase
-- Execute este script no SQL Editor do seu Dashboard Supabase (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Criar função SECURITY DEFINER is_admin() para checagem rápida sem recursão RLS
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

-- 2. Eliminar recursão RLS na tabela USERS (Corrige o timeout e erros 500 nos eventos e fotógrafos)
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
DROP POLICY IF EXISTS "users_read_all" ON public.users;
DROP POLICY IF EXISTS "users_update_own_or_admin" ON public.users;
DROP POLICY IF EXISTS "users_insert_auth" ON public.users;

-- Permite leitura rápida dos perfis sem auto-subquery recursiva
CREATE POLICY "users_read_policy" ON public.users
FOR SELECT TO anon, authenticated
USING (true);

-- Permite que cada usuário atualize seu próprio perfil (ou admin qualquer um)
CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE TO authenticated
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

-- Permite inserção de novo usuário autenticado
CREATE POLICY "users_insert_policy" ON public.users
FOR INSERT TO anon, authenticated
WITH CHECK (auth.uid() = id OR auth.uid() IS NOT NULL);

-- 3. Índices essenciais para consultas instantâneas (abaixo de 50ms)
CREATE INDEX IF NOT EXISTS idx_users_role_is_active ON public.users (role, is_active);
CREATE INDEX IF NOT EXISTS idx_photos_photographer_moderation ON public.photos (photographer_id, moderation_status, is_public);
CREATE INDEX IF NOT EXISTS idx_events_photographer_id ON public.events (photographer_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date_desc ON public.events (event_date DESC);

-- 4. Recriação da RPC get_photographers_with_stats com assinatura segura e leve
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
SET statement_timeout = '15s'
AS $$
DECLARE
    is_adm boolean := false;
BEGIN
    IF auth.uid() IS NOT NULL THEN
        SELECT (role = 'admin') INTO is_adm
        FROM public.users
        WHERE id = auth.uid();
    END IF;

    RETURN QUERY
    SELECT
        jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'avatar_url', u.avatar_url,
            'bio', u.bio,
            'slug', u.slug,
            'location', u.location,
            'banner_url', u.banner_url,
            'social_instagram', u.social_instagram,
            'is_active', u.is_active,
            'role', u.role,
            'created_at', CASE WHEN is_adm IS TRUE THEN u.created_at ELSE NULL END,
            'email', CASE WHEN is_adm IS TRUE THEN u.email ELSE NULL END,
            'phone', CASE WHEN is_adm IS TRUE THEN u.phone ELSE NULL END,
            'pix_key', CASE WHEN is_adm IS TRUE THEN u.pix_key ELSE NULL END,
            'pix_key_type', CASE WHEN is_adm IS TRUE THEN u.pix_key_type ELSE NULL END,
            'payout_frequency', CASE WHEN is_adm IS TRUE THEN u.payout_frequency ELSE NULL END
        ) as user_data,
        COALESCE(p_stats.p_count, 0) as photo_cnt,
        COALESCE(s_stats.s_count, 0) as sales_cnt,
        CASE WHEN is_adm IS TRUE THEN COALESCE(s_stats.comm_val, 0) ELSE 0 END as comm_val,
        COALESCE(p_stats.l_count, 0) as likes_cnt
    FROM public.users u
    LEFT JOIN (
        SELECT p.photographer_id, COUNT(*) as p_count, SUM(COALESCE(p.likes_count, 0)) as l_count
        FROM public.photos p
        WHERE p.moderation_status = 'approved' AND p.is_public = true
        GROUP BY p.photographer_id
    ) p_stats ON u.id = p_stats.photographer_id
    LEFT JOIN (
        SELECT s.photographer_id, COUNT(*) as s_count, SUM(COALESCE(s.commission, 0)) as comm_val
        FROM public.sales s
        WHERE s.status != 'refunded'
        GROUP BY s.photographer_id
    ) s_stats ON u.id = s_stats.photographer_id
    WHERE u.role = 'photographer' AND u.is_active = true
    ORDER BY u.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_photographers_with_stats() TO anon, authenticated, service_role;
