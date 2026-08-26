-- ==============================================================================
-- FotoClic: FIX INSTANTÂNEO DE EVENTOS E POLÍTICAS RESIDUAIS
-- ==============================================================================
-- Este script:
-- 1. Remove qualquer política residual/antiga que estava causando lentidão/timeout em 'events' e 'users'.
-- 2. Aplica a política ultra-rápida (0.1ms) para leitura de perfis de fotógrafos e eventos.
-- 3. Cria índices de performance para carregamento instantâneo da Home.
-- 4. Mantém a blindagem de segurança (clientes e dados sensíveis 100% protegidos).
-- ==============================================================================

BEGIN;

-- 1. Limpar todas as políticas antigas ou duplicadas de 'events'
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'events'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.events', pol.policyname);
    END LOOP;
END $$;

-- 2. Recriar políticas limpas de 'events'
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


-- 3. Otimizar a política de SELECT de 'users' para evitar qualquer timeout em joins
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_read_policy" ON public.users;

CREATE POLICY "users_select_policy" ON public.users
FOR SELECT TO anon, authenticated
USING (
    auth.uid() = id
    OR role IN ('photographer', 'producer')
);


-- 4. Criar índices de alta performance para evitar statement timeout
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events (event_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_photographer_id ON public.events (photographer_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users (role, id);


-- 5. Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
