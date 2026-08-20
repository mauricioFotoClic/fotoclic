-- ==============================================================================
-- FotoClic: Script de Blindagem de Segurança, RLS e RPCs (P0 / Crítico)
-- ==============================================================================
-- Este script resolve as vulnerabilidades C1 (RLS aberto), C2 (RPCs públicas)
-- e C4 (Bypass de pagamento / inserção direta em vendas).
-- Execute este script no SQL Editor do seu Dashboard Supabase.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BLINDAGEM DA TABELA: sales (VENDAS E GATE DE DOWNLOAD)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.sales ENABLE ROW LEVEL SECURITY;

-- Remover quaisquer políticas permissivas legadas
DROP POLICY IF EXISTS "Enable insert for all" ON public.sales;
DROP POLICY IF EXISTS "Enable select for all" ON public.sales;
DROP POLICY IF EXISTS "Enable update for all" ON public.sales;
DROP POLICY IF EXISTS "Enable delete for all" ON public.sales;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.sales;
DROP POLICY IF EXISTS "Allow read for buyer" ON public.sales;
DROP POLICY IF EXISTS "Allow read for photographer" ON public.sales;
DROP POLICY IF EXISTS "sales_select_policy" ON public.sales;
DROP POLICY IF EXISTS "sales_insert_policy" ON public.sales;

-- Política de Leitura: Apenas o comprador, o fotógrafo vendedor ou o administrador
CREATE POLICY "sales_select_policy" ON public.sales
FOR SELECT TO authenticated
USING (
    buyer_id = auth.uid()
    OR photographer_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);

-- CRÍTICO: NENHUMA política de INSERT/UPDATE/DELETE para 'anon' ou 'authenticated'.
-- Vendas só podem ser criadas e atualizadas pelo backend através da SUPABASE_SERVICE_ROLE_KEY (webhook).
REVOKE INSERT, UPDATE, DELETE ON public.sales FROM anon, authenticated;


-- ------------------------------------------------------------------------------
-- 2. BLINDAGEM DA TABELA: users (DADOS PESSOAIS, CHAVES PIX E FINANCEIRO)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- Remover políticas legadas
DROP POLICY IF EXISTS "Public users are viewable by everyone." ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.users;
DROP POLICY IF EXISTS "Users can update own profile." ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for all" ON public.users;
DROP POLICY IF EXISTS "Enable update for all" ON public.users;
DROP POLICY IF EXISTS "users_read_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;

-- Leitura: Qualquer usuário (inclusive anônimo) pode ver perfis públicos de fotógrafos/usuários
-- mas campos sensíveis devem ser protegidos. A policy permite leitura de perfis ativos.
CREATE POLICY "users_read_policy" ON public.users
FOR SELECT TO anon, authenticated
USING (
    -- O próprio usuário pode ler seu registro completo
    auth.uid() = id
    -- Administradores podem ler tudo
    OR EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
    -- Visitantes podem ver dados públicos (fotógrafos e perfis)
    OR role = 'photographer'
);

-- Inserção no cadastro (apenas para o próprio ID autenticado via Supabase Auth)
CREATE POLICY "users_insert_policy" ON public.users
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = id
);

-- Atualização: Usuário só pode editar seu próprio perfil (admins podem editar qualquer um)
CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE TO authenticated
USING (
    auth.uid() = id
    OR EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
)
WITH CHECK (
    auth.uid() = id
    OR EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);


-- ------------------------------------------------------------------------------
-- 3. BLINDAGEM DA TABELA: payouts (SAQUES E TRANSFERÊNCIAS PIX)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for all" ON public.payouts;
DROP POLICY IF EXISTS "Enable insert for all" ON public.payouts;
DROP POLICY IF EXISTS "Enable update for all" ON public.payouts;
DROP POLICY IF EXISTS "payouts_select_policy" ON public.payouts;
DROP POLICY IF EXISTS "payouts_insert_policy" ON public.payouts;

-- Leitura: Apenas o fotógrafo dono do saque ou administrador
CREATE POLICY "payouts_select_policy" ON public.payouts
FOR SELECT TO authenticated
USING (
    photographer_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);

-- Inserção de solicitação de saque pelo próprio fotógrafo
CREATE POLICY "payouts_insert_policy" ON public.payouts
FOR INSERT TO authenticated
WITH CHECK (
    photographer_id = auth.uid()
);

-- Atualização/Deleção de saques: Apenas Administrador ou Service Role
CREATE POLICY "payouts_update_policy" ON public.payouts
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);


-- ------------------------------------------------------------------------------
-- 4. BLINDAGEM DA TABELA: coupons (CUPONS DE DESCONTO)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for all" ON public.coupons;
DROP POLICY IF EXISTS "Enable write for all" ON public.coupons;
DROP POLICY IF EXISTS "coupons_select_policy" ON public.coupons;
DROP POLICY IF EXISTS "coupons_insert_policy" ON public.coupons;
DROP POLICY IF EXISTS "coupons_update_policy" ON public.coupons;
DROP POLICY IF EXISTS "coupons_delete_policy" ON public.coupons;

-- Leitura: Cupons ativos podem ser lidos para validação, e fotógrafo pode ver seus cupons
CREATE POLICY "coupons_select_policy" ON public.coupons
FOR SELECT TO anon, authenticated
USING (
    is_active = true 
    OR photographer_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);

-- Gerenciamento de cupons pelo fotógrafo dono ou admin
CREATE POLICY "coupons_insert_policy" ON public.coupons
FOR INSERT TO authenticated
WITH CHECK (
    photographer_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);

CREATE POLICY "coupons_update_policy" ON public.coupons
FOR UPDATE TO authenticated
USING (
    photographer_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);

CREATE POLICY "coupons_delete_policy" ON public.coupons
FOR DELETE TO authenticated
USING (
    photographer_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);


-- ------------------------------------------------------------------------------
-- 5. BLINDAGEM DA TABELA: carts (CARRINHO DE COMPRAS)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for all" ON public.carts;
DROP POLICY IF EXISTS "Enable all for all" ON public.carts;
DROP POLICY IF EXISTS "carts_policy" ON public.carts;

CREATE POLICY "carts_policy" ON public.carts
FOR ALL TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
)
WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);


-- ------------------------------------------------------------------------------
-- 6. BLINDAGEM DA TABELA: system_settings (CONFIGURAÇÕES DO SISTEMA)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for all" ON public.system_settings;
DROP POLICY IF EXISTS "Enable write for all" ON public.system_settings;
DROP POLICY IF EXISTS "settings_select_policy" ON public.system_settings;
DROP POLICY IF EXISTS "settings_write_policy" ON public.system_settings;

-- Qualquer um pode ler configurações gerais (comissões públicas)
CREATE POLICY "settings_select_policy" ON public.system_settings
FOR SELECT TO anon, authenticated
USING (true);

-- Apenas Administradores podem atualizar configurações
CREATE POLICY "settings_write_policy" ON public.system_settings
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);


-- ------------------------------------------------------------------------------
-- 7. BLINDAGEM DAS RPCs SECURITY DEFINER (get_admin_stats e get_photographers_with_stats)
-- ------------------------------------------------------------------------------

-- Remover versões anteriores para permitir alteração de assinatura sem erro 42P13
DROP FUNCTION IF EXISTS public.get_admin_stats();
DROP FUNCTION IF EXISTS public.get_photographers_with_stats();

-- Atualizar get_admin_stats para exigir papel de administrador
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin boolean;
    result json;
BEGIN
    -- 1. Validar se o chamador é administrador
    SELECT (role = 'admin') INTO is_admin
    FROM public.users
    WHERE id = auth.uid();

    IF is_admin IS NOT TRUE THEN
        RAISE EXCEPTION 'Acesso negado: Requer privilégios de administrador.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Coleta segura de métricas
    WITH metrics AS (
        SELECT
            (SELECT COALESCE(SUM(price), 0) FROM public.sales WHERE status != 'refunded') as total_revenue,
            (SELECT COALESCE(SUM(commission), 0) FROM public.sales WHERE status != 'refunded') as total_commission,
            (SELECT COUNT(*) FROM public.sales WHERE status != 'refunded') as total_sales,
            (SELECT COUNT(*) FROM public.photos WHERE moderation_status = 'approved') as total_photos,
            (SELECT COUNT(*) FROM public.users WHERE role = 'photographer' AND is_active = true) as total_photographers,
            (SELECT COUNT(*) FROM public.users WHERE role = 'customer') as total_customers,
            (SELECT COUNT(*) FROM public.photos WHERE moderation_status = 'pending') as pending_photos_count
    )
    SELECT row_to_json(metrics.*) INTO result FROM metrics;

    RETURN result;
END;
$$;

-- Atualizar get_photographers_with_stats com sanitização de campos sigilosos (sem vazar PIX/telefone/emails)
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
AS $$
DECLARE
    is_admin boolean;
BEGIN
    -- Verificar se o usuário autenticado é admin
    SELECT (role = 'admin') INTO is_admin
    FROM public.users
    WHERE id = auth.uid();

    RETURN QUERY
    SELECT
        jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'avatar_url', u.avatar_url,
            'bio', u.bio,
            'slug', u.slug,
            'city', u.city,
            'state', u.state,
            'instagram_url', u.instagram_url,
            'portfolio_url', u.portfolio_url,
            'is_active', u.is_active,
            'role', u.role,
            'created_at', u.created_at,
            -- E-mail, telefone e chave PIX só são retornados se o solicitante for Administrador
            'email', CASE WHEN is_admin IS TRUE THEN u.email ELSE NULL END,
            'phone', CASE WHEN is_admin IS TRUE THEN u.phone ELSE NULL END,
            'pix_key', CASE WHEN is_admin IS TRUE THEN u.pix_key ELSE NULL END,
            'pix_key_type', CASE WHEN is_admin IS TRUE THEN u.pix_key_type ELSE NULL END,
            'payout_frequency', CASE WHEN is_admin IS TRUE THEN u.payout_frequency ELSE NULL END
        ) as user_data,
        COALESCE(p_stats.p_count, 0) as photo_cnt,
        COALESCE(s_stats.s_count, 0) as sales_cnt,
        -- Volume de comissão/faturamento só é visível para Administradores
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
        SELECT s.photographer_id, COUNT(*) as s_count, SUM(s.commission) as comm_val
        FROM public.sales s
        WHERE s.status != 'refunded'
        GROUP BY s.photographer_id
    ) s_stats ON u.id = s_stats.photographer_id
    WHERE u.role = 'photographer' AND u.is_active = true;
END;
$$;
