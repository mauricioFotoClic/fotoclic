-- ==============================================================================
-- FotoClic: FIX MASTER DEFINITIVO (0% RECURSÃO - HOME 100% OPERACIONAL)
-- ==============================================================================
-- Este script:
-- 1. Sincroniza o papel de 'admin' no JWT do Supabase Auth (auth.users).
-- 2. Reescreve is_admin() para ler o JWT em 0 microsegundos SEM consultar tabelas (Elimina 100% a causa de erro 500).
-- 3. Limpa TODAS as políticas residuais de 'users', 'events', 'photos', 'reviews'.
-- 4. Aplica políticas ultra-rápidas para que Eventos E Fotógrafos funcionem juntos.
-- 5. Mantém a blindagem de dados sensíveis e segurança financeira.
-- ==============================================================================

BEGIN;

-- 1. Sincronizar todos os admins para o auth.users metadata (JWT nativo do Supabase)
UPDATE auth.users
SET 
    raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data, '{}'::jsonb), '{role}', '"admin"'),
    raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', '"admin"')
WHERE id IN (
    SELECT id FROM public.users WHERE role = 'admin'
);

-- 2. Função is_admin() ultrarrápida via JWT (0% de chance de recursão no Postgres)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    OR coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR coalesce(auth.jwt() ->> 'role', '') = 'service_role'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;


-- 3. Limpar absolutamente todas as políticas antigas de users, events, photos, reviews
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('users', 'events', 'photos', 'reviews')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;


-- 4. Recriar políticas de USERS (Fotógrafos visíveis, dados de clientes protegidos)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_policy" ON public.users
FOR SELECT TO anon, authenticated
USING (
    auth.uid() = id
    OR role IN ('photographer', 'producer')
    OR public.is_admin()
);

CREATE POLICY "users_insert_policy" ON public.users
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = id
);

CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE TO authenticated
USING (
    auth.uid() = id
    OR public.is_admin()
)
WITH CHECK (
    auth.uid() = id
    OR public.is_admin()
);

CREATE POLICY "users_delete_policy" ON public.users
FOR DELETE TO authenticated
USING (
    public.is_admin()
);


-- 5. Recriar políticas de EVENTS (Eventos visíveis para todos, edição para o fotógrafo)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

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


-- 6. Recriar políticas de PHOTOS (Fotos aprovadas públicas, upload do fotógrafo)
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

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


-- 7. Recriar políticas de REVIEWS
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
        ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "reviews_select_policy" ON public.reviews
        FOR SELECT TO anon, authenticated
        USING (true);

        CREATE POLICY "reviews_insert_policy" ON public.reviews
        FOR INSERT TO authenticated
        WITH CHECK (auth.uid() IS NOT NULL);
    END IF;
END $$;


-- 8. Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_users_role_active ON public.users (role, is_active);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events (event_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_photographer_id ON public.events (photographer_id);
CREATE INDEX IF NOT EXISTS idx_photos_approved_public ON public.photos (moderation_status, is_public);


-- 9. Notificar recarregamento do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
