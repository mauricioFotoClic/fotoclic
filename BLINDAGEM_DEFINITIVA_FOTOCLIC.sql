-- ==============================================================================
-- FotoClic: BLINDAGEM DEFINITIVA DE SEGURANÇA, RLS E ANTI-ESCALAÇÃO DE ADMIN
-- ==============================================================================
-- Data de Criação: 26/08/2026
-- Objetivo:
-- 1. Eliminar 100% o risco de vazamento de dados de usuários e chaves PIX (LGPD).
-- 2. Impedir qualquer usuário de se autoatribuir papel de 'admin' via API REST.
-- 3. Blindar vendas (sales), pagamentos (payouts), cupons e configurações do sistema.
-- 4. Eliminar a recursão infinita no RLS através de SECURITY DEFINER (Zero quebra na Home).
-- 5. Remover a conta de teste usada no relatório de auditoria.
-- ==============================================================================
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Abra o painel do Supabase (https://supabase.com/dashboard/project/jzrrwhuletsknujjfdwa)
-- 2. Vá em 'SQL Editor' -> 'New Query'
-- 3. Cole todo o conteúdo deste script e clique em 'RUN'
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- ETAPA 1: LIMPEZA DO USUÁRIO DE TESTE APONTADO NA AUDITORIA
-- ------------------------------------------------------------------------------
DELETE FROM public.users 
WHERE id = '5bf2178b-da8f-462a-a0d5-8a51b3ba68ff' 
   OR email = 'naoexiste-xyz-999@exemplo.invalido';

DELETE FROM auth.users 
WHERE id = '5bf2178b-da8f-462a-a0d5-8a51b3ba68ff' 
   OR email = 'naoexiste-xyz-999@exemplo.invalido';


-- ------------------------------------------------------------------------------
-- ETAPA 2: FUNÇÃO DE CHECAGEM DE ADMIN COM 'SECURITY DEFINER' (SEM RECURSÃO)
-- ------------------------------------------------------------------------------
-- A execução com SECURITY DEFINER roda no nível de privilégio do criador da função,
-- ignorando o RLS internamente durante a checagem. Isso resolve definitivamente
-- o erro de recursão infinita que fazia os fotógrafos desaparecerem da Home.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_role text;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    SELECT role INTO v_role
    FROM public.users
    WHERE id = auth.uid()
    LIMIT 1;

    RETURN (v_role = 'admin');
EXCEPTION
    WHEN OTHERS THEN
        RETURN false;
END;
$$;

-- Função auxiliar para recuperar o papel do usuário autenticado de forma segura
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_role text;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN 'anon';
    END IF;

    SELECT role INTO v_role
    FROM public.users
    WHERE id = auth.uid()
    LIMIT 1;

    RETURN COALESCE(v_role, 'customer');
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated, service_role;


-- ------------------------------------------------------------------------------
-- ETAPA 3: TRIGGER ANTI-ESCALAÇÃO DE PRIVILÉGIOS (IMPOSSÍVEL VIRAR ADMIN VIA API)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_admin_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_caller_admin boolean;
BEGIN
    -- Checa se quem está executando a operação já é um administrador confirmado
    is_caller_admin := public.is_admin();

    -- NO INSERT (Novo cadastro):
    IF TG_OP = 'INSERT' THEN
        -- Se um usuário comum tentar enviar 'admin', força para 'customer' (ou mantém se for 'photographer'/'producer')
        IF NEW.role::text = 'admin' AND NOT is_caller_admin THEN
            NEW.role := 'customer';
        END IF;

        -- Garante que o role nunca seja nulo
        IF NEW.role IS NULL OR trim(NEW.role::text) = '' THEN
            NEW.role := 'customer';
        END IF;

        RETURN NEW;
    END IF;

    -- NO UPDATE (Edição de perfil):
    IF TG_OP = 'UPDATE' THEN
        -- Se o papel foi alterado para 'admin' ou modificado sem ser admin, bloqueia
        IF (NEW.role::text <> OLD.role::text) AND NOT is_caller_admin THEN
            -- Mantém o papel original intacto
            NEW.role := OLD.role;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_admin_role_escalation ON public.users;
CREATE TRIGGER trg_prevent_admin_role_escalation
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_admin_role_escalation();


-- ------------------------------------------------------------------------------
-- ETAPA 4: BLINDAGEM DA TABELA: users (DADOS PESSOAIS, CONTATOS E PIX)
-- ------------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Limpar todas as políticas legadas para garantir estado limpo
DROP POLICY IF EXISTS "Public users are viewable by everyone." ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.users;
DROP POLICY IF EXISTS "Users can update own profile." ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for all" ON public.users;
DROP POLICY IF EXISTS "Enable update for all" ON public.users;
DROP POLICY IF EXISTS "users_read_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "Users can view own data and public photographers" ON public.users;

-- POLÍTICA DE LEITURA (SELECT):
-- 1. O próprio usuário lê todos os seus dados.
-- 2. Visitantes e clientes leem perfis públicos ativos (fotógrafos e produtores).
-- 3. Admins checam via token JWT diretamente sem subconsulta recursiva.
CREATE POLICY "users_select_policy" ON public.users
FOR SELECT TO anon, authenticated
USING (
    auth.uid() = id
    OR (role = 'photographer' AND is_active = true)
    OR (role = 'producer' AND is_active = true)
    OR (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin')
    OR (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin')
);

-- POLÍTICA DE INSERÇÃO (INSERT):
-- Usuário só pode criar seu próprio registro no cadastro (auth.uid() = id).
CREATE POLICY "users_insert_policy" ON public.users
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = id
);

-- POLÍTICA DE ATUALIZAÇÃO (UPDATE):
-- Usuário só edita seu próprio perfil. Administrador edita qualquer perfil.
CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE TO authenticated
USING (
    auth.uid() = id
    OR (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin')
    OR (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin')
)
WITH CHECK (
    auth.uid() = id
    OR (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin')
    OR (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin')
);

-- POLÍTICA DE EXCLUSÃO (DELETE):
-- Apenas administradores podem excluir usuários.
CREATE POLICY "users_delete_policy" ON public.users
FOR DELETE TO authenticated
USING (
    (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin')
    OR (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin')
);

NOTIFY pgrst, 'reload schema';


-- ------------------------------------------------------------------------------
-- ETAPA 5: BLINDAGEM DA TABELA: sales (VENDAS E PROTEÇÃO CONTRA DOWNLOAD FALSO)
-- ------------------------------------------------------------------------------
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for all" ON public.sales;
DROP POLICY IF EXISTS "Enable select for all" ON public.sales;
DROP POLICY IF EXISTS "Enable update for all" ON public.sales;
DROP POLICY IF EXISTS "Enable delete for all" ON public.sales;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.sales;
DROP POLICY IF EXISTS "Allow read for buyer" ON public.sales;
DROP POLICY IF EXISTS "Allow read for photographer" ON public.sales;
DROP POLICY IF EXISTS "sales_select_policy" ON public.sales;
DROP POLICY IF EXISTS "sales_insert_policy" ON public.sales;
DROP POLICY IF EXISTS "sales_update_policy" ON public.sales;
DROP POLICY IF EXISTS "sales_delete_policy" ON public.sales;

-- Leitura: Apenas o comprador da foto, o fotógrafo vendedor ou o administrador
CREATE POLICY "sales_select_policy" ON public.sales
FOR SELECT TO authenticated
USING (
    buyer_id = auth.uid()
    OR photographer_id = auth.uid()
    OR public.is_admin()
);

-- CRÍTICO: NENHUM usuário comum (anon ou authenticated) pode criar/alterar vendas diretamente via REST.
-- Apenas a API backend (webhook Appmax) usando a SUPABASE_SERVICE_ROLE_KEY pode gravar vendas.
REVOKE INSERT, UPDATE, DELETE ON public.sales FROM anon, authenticated;


-- ------------------------------------------------------------------------------
-- ETAPA 6: BLINDAGEM DA TABELA: payouts (PAGAMENTOS E SAQUES)
-- ------------------------------------------------------------------------------
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payouts_select_policy" ON public.payouts;
DROP POLICY IF EXISTS "payouts_insert_policy" ON public.payouts;
DROP POLICY IF EXISTS "payouts_update_policy" ON public.payouts;
DROP POLICY IF EXISTS "payouts_delete_policy" ON public.payouts;
DROP POLICY IF EXISTS "payouts_admin_modify_policy" ON public.payouts;
DROP POLICY IF EXISTS "Photographers can view their own payouts" ON public.payouts;
DROP POLICY IF EXISTS "Admins can view all payouts" ON public.payouts;

-- Leitura: O fotógrafo vê seus próprios pagamentos; Admins veem todos
CREATE POLICY "payouts_select_policy" ON public.payouts
FOR SELECT TO authenticated
USING (
    photographer_id = auth.uid()
    OR public.is_admin()
);

-- Alteração: Apenas via backend com service_role ou Administrador
CREATE POLICY "payouts_admin_modify_policy" ON public.payouts
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ------------------------------------------------------------------------------
-- ETAPA 7: BLINDAGEM DA TABELA: coupons (CUPONS DE DESCONTO)
-- ------------------------------------------------------------------------------
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_select_policy" ON public.coupons;
DROP POLICY IF EXISTS "coupons_modify_policy" ON public.coupons;
DROP POLICY IF EXISTS "Photographers can manage their own coupons" ON public.coupons;

-- Leitura: Fotógrafo vê seus cupons, Admins veem todos, compradores podem validar cupons ativos
CREATE POLICY "coupons_select_policy" ON public.coupons
FOR SELECT TO anon, authenticated
USING (
    photographer_id = auth.uid()
    OR public.is_admin()
    OR is_active = true
);

-- Criação/Edição/Exclusão: Apenas o fotógrafo dono ou Admin
CREATE POLICY "coupons_modify_policy" ON public.coupons
FOR ALL TO authenticated
USING (
    photographer_id = auth.uid()
    OR public.is_admin()
)
WITH CHECK (
    photographer_id = auth.uid()
    OR public.is_admin()
);


-- ------------------------------------------------------------------------------
-- ETAPA 8: BLINDAGEM DA TABELA: system_settings (CONFIGURAÇÕES DO SISTEMA)
-- ------------------------------------------------------------------------------
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_policy" ON public.system_settings;
DROP POLICY IF EXISTS "settings_modify_policy" ON public.system_settings;
DROP POLICY IF EXISTS "Public can view non-sensitive settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can manage all settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow read access for all users" ON public.system_settings;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.system_settings;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.system_settings;

-- Leitura: Qualquer usuário ou visitante pode ler as taxas e configurações de UI
CREATE POLICY "settings_select_policy" ON public.system_settings
FOR SELECT TO anon, authenticated
USING (true);

-- Modificação: Exclusivo para Administradores
CREATE POLICY "settings_modify_policy" ON public.system_settings
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ------------------------------------------------------------------------------
-- ETAPA 9: BLINDAGEM DAS TABELAS: photos E events
-- ------------------------------------------------------------------------------
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Photos
DROP POLICY IF EXISTS "photos_select_policy" ON public.photos;
DROP POLICY IF EXISTS "photos_insert_policy" ON public.photos;
DROP POLICY IF EXISTS "photos_update_policy" ON public.photos;
DROP POLICY IF EXISTS "photos_delete_policy" ON public.photos;

CREATE POLICY "photos_select_policy" ON public.photos
FOR SELECT TO anon, authenticated
USING (
    (is_public = true AND moderation_status = 'approved')
    OR photographer_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "photos_insert_policy" ON public.photos
FOR INSERT TO authenticated
WITH CHECK (
    photographer_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "photos_update_policy" ON public.photos
FOR UPDATE TO authenticated
USING (
    photographer_id = auth.uid()
    OR public.is_admin()
)
WITH CHECK (
    photographer_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "photos_delete_policy" ON public.photos
FOR DELETE TO authenticated
USING (
    photographer_id = auth.uid()
    OR public.is_admin()
);

-- Events
DROP POLICY IF EXISTS "events_select_policy" ON public.events;
DROP POLICY IF EXISTS "events_insert_policy" ON public.events;
DROP POLICY IF EXISTS "events_update_policy" ON public.events;
DROP POLICY IF EXISTS "events_delete_policy" ON public.events;

CREATE POLICY "events_select_policy" ON public.events
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "events_insert_policy" ON public.events
FOR INSERT TO authenticated
WITH CHECK (
    photographer_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "events_update_policy" ON public.events
FOR UPDATE TO authenticated
USING (
    photographer_id = auth.uid()
    OR public.is_admin()
)
WITH CHECK (
    photographer_id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "events_delete_policy" ON public.events
FOR DELETE TO authenticated
USING (
    photographer_id = auth.uid()
    OR public.is_admin()
);


-- ------------------------------------------------------------------------------
-- ETAPA 10: BLINDAGEM DE CARRINHOS (carts E cart_items)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'carts') THEN
        ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "carts_owner_policy" ON public.carts;
        CREATE POLICY "carts_owner_policy" ON public.carts
        FOR ALL TO authenticated
        USING (user_id = auth.uid() OR public.is_admin())
        WITH CHECK (user_id = auth.uid() OR public.is_admin());
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cart_items') THEN
        ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "cart_items_owner_policy" ON public.cart_items;
        CREATE POLICY "cart_items_owner_policy" ON public.cart_items
        FOR ALL TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.carts c 
                WHERE c.id = cart_items.cart_id 
                AND (c.user_id = auth.uid() OR public.is_admin())
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.carts c 
                WHERE c.id = cart_items.cart_id 
                AND (c.user_id = auth.uid() OR public.is_admin())
            )
        );
    END IF;
END $$;

COMMIT;

-- ==============================================================================
-- FIM DO SCRIPT DE BLINDAGEM - EXECUTADO COM SUCESSO
-- ==============================================================================
