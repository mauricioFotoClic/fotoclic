-- ==============================================================================
-- CORREÇÃO DA RPC get_photographers_with_stats NO SUPABASE
-- Objetivo: Evitar timeout (57014) e erro 500, garantindo compatibilidade de colunas
-- ==============================================================================

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
    is_admin boolean := false;
BEGIN
    -- 1. Verificar se o chamador é admin autenticado
    IF auth.uid() IS NOT NULL THEN
        SELECT (role = 'admin') INTO is_admin
        FROM public.users
        WHERE id = auth.uid();
    END IF;

    -- 2. Retornar dados públicos de todos os fotógrafos ativos (com campos sigilosos sanitizados para anônimos)
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
            -- Campos privados/financeiros protegidos
            'created_at', CASE WHEN is_admin IS TRUE THEN u.created_at ELSE NULL END,
            'email', CASE WHEN is_admin IS TRUE THEN u.email ELSE NULL END,
            'phone', CASE WHEN is_admin IS TRUE THEN u.phone ELSE NULL END,
            'pix_key', CASE WHEN is_admin IS TRUE THEN u.pix_key ELSE NULL END,
            'pix_key_type', CASE WHEN is_admin IS TRUE THEN u.pix_key_type ELSE NULL END,
            'payout_frequency', CASE WHEN is_admin IS TRUE THEN u.payout_frequency ELSE NULL END
        ) as user_data,
        COALESCE(p_stats.p_count, 0) as photo_cnt,
        COALESCE(s_stats.s_count, 0) as sales_cnt,
        CASE WHEN is_admin IS TRUE THEN COALESCE(s_stats.comm_val, 0) ELSE 0 END as comm_val,
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

-- Conceder permissão de execução da função para anônimos e autenticados
GRANT EXECUTE ON FUNCTION public.get_photographers_with_stats() TO anon, authenticated, service_role;
