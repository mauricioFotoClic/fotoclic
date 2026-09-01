-- ==============================================================================
-- 🚀 FOTOCLIC - SCRIPT DINÂMICO E SEGURO DE LIMPEZA DO USUÁRIO
-- ==============================================================================

DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'paulodaian@gmail.com';
    
    IF v_user_id IS NOT NULL THEN
        -- 1. Limpar audit_logs (se existir)
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
            DELETE FROM public.audit_logs WHERE user_id = v_user_id;
        END IF;

        -- 2. Limpar storage_requests (se existir)
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'storage_requests') THEN
            DELETE FROM public.storage_requests WHERE photographer_id = v_user_id;
        END IF;

        -- 3. Limpar photos, events, sales (se existirem)
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sales') THEN
            DELETE FROM public.sales WHERE photographer_id = v_user_id OR buyer_id = v_user_id;
        END IF;

        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'photos') THEN
            DELETE FROM public.photos WHERE photographer_id = v_user_id;
        END IF;

        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
            DELETE FROM public.events WHERE photographer_id = v_user_id;
        END IF;

        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
            DELETE FROM public.users WHERE id = v_user_id;
        END IF;

        -- 4. Limpar auth schemas
        DELETE FROM auth.identities WHERE user_id = v_user_id;
        DELETE FROM auth.sessions WHERE user_id = v_user_id;
        DELETE FROM auth.mfa_factors WHERE user_id = v_user_id;

        -- 5. Deletar do auth.users
        DELETE FROM auth.users WHERE id = v_user_id;

        RAISE NOTICE '✅ Usuário paulodaian@gmail.com deletado com sucesso!';
    ELSE
        RAISE NOTICE 'ℹ️ Usuário não encontrado em auth.users.';
    END IF;
END $$;

-- 6. Configurar ON DELETE SET NULL em audit_logs
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
        ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;
