-- ==============================================================================
-- 🛡️ FOTOCLIC SENTINEL AI - MASTER SECURITY & CYBER DEFENSE MIGRATION
-- ==============================================================================

-- 1. Tabela de Logs de Segurança e Incidentes Cibernéticos
CREATE TABLE IF NOT EXISTS public.security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'sql_injection', 'xss_attempt', 'brute_force', 'unauthorized_role_change', 'payment_tampering', 'scanner_detected', 'rate_limit_exceeded', 'suspicious_activity'
    severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    ip_address TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    endpoint TEXT,
    request_method TEXT,
    payload_summary JSONB DEFAULT '{}'::jsonb,
    ai_diagnosis TEXT,
    ai_remediation TEXT,
    action_taken TEXT NOT NULL DEFAULT 'logged', -- 'logged', 'blocked_request', 'auto_banned_ip', 'account_locked', 'reported_telegram'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de performance para busca em tempo real
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON public.security_logs(severity);
CREATE INDEX IF NOT EXISTS idx_security_logs_ip ON public.security_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON public.security_logs(event_type);

-- 2. Tabela de IPs Bloqueados (Lista Negra Ativa)
CREATE TABLE IF NOT EXISTS public.banned_ips (
    ip_address TEXT PRIMARY KEY,
    reason TEXT NOT NULL,
    banned_by TEXT NOT NULL DEFAULT 'Sentinel AI',
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ, -- null significa ban permanente
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banned_ips_active ON public.banned_ips(ip_address) WHERE is_active = true;

-- 3. Tabela de Configuração da Sentinela & Integração Telegram
CREATE TABLE IF NOT EXISTS public.security_settings (
    id INT PRIMARY KEY DEFAULT 1,
    telegram_bot_token TEXT,
    telegram_chat_id TEXT,
    telegram_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    auto_ban_enabled BOOLEAN NOT NULL DEFAULT true,
    max_failed_logins INT NOT NULL DEFAULT 5,
    rate_limit_rpm INT NOT NULL DEFAULT 120,
    notification_min_severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inserir configuração padrão com o Bot "FotoClic AI Assistant"
INSERT INTO public.security_settings (id, telegram_bot_token, telegram_chat_id, telegram_alerts_enabled, auto_ban_enabled, max_failed_logins, rate_limit_rpm, notification_min_severity)
VALUES (1, '8854659202:AAHOiJHH5rjJ1PJPjuDx26UAYcyafm3BEzY', '5525056555', true, true, 5, 120, 'medium')
ON CONFLICT (id) DO UPDATE SET
    telegram_bot_token = COALESCE(public.security_settings.telegram_bot_token, EXCLUDED.telegram_bot_token),
    telegram_chat_id = COALESCE(public.security_settings.telegram_chat_id, EXCLUDED.telegram_chat_id);

-- 4. Habilitar RLS (Segurança Zero-Trust)
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

-- Políticas: Apenas Administradores Autenticados podem ler/gerenciar
DROP POLICY IF EXISTS "Admins can view security logs" ON public.security_logs;
CREATE POLICY "Admins can view security logs"
ON public.security_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Admins can manage banned ips" ON public.banned_ips;
CREATE POLICY "Admins can manage banned ips"
ON public.banned_ips
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Admins can manage security settings" ON public.security_settings;
CREATE POLICY "Admins can manage security settings"
ON public.security_settings
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);

-- Service Role (Backend) tem acesso total para registrar incidentes e verificar bans
GRANT ALL ON public.security_logs TO service_role;
GRANT ALL ON public.banned_ips TO service_role;
GRANT ALL ON public.security_settings TO service_role;

-- 5. Trigger no Supabase para Detectar Tentativas Suspeitas de Alteração de Role
CREATE OR REPLACE FUNCTION notify_suspicious_role_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Se alguém tentar mudar a coluna role para admin sem ser por migration do sistema
    IF NEW.role = 'admin' AND OLD.role IS DISTINCT FROM 'admin' THEN
        INSERT INTO public.security_logs (
            event_type,
            severity,
            user_id,
            payload_summary,
            ai_diagnosis,
            ai_remediation,
            action_taken
        ) VALUES (
            'unauthorized_role_change',
            'critical',
            NEW.id,
            jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role, 'user_email', NEW.email),
            'Detectada tentativa de elevação de privilégios para Administrador no registro do usuário.',
            'Verifique se a alteração foi legítima no painel administrativo.',
            'logged'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_role_change ON public.users;
CREATE TRIGGER trg_audit_role_change
AFTER UPDATE OF role ON public.users
FOR EACH ROW
EXECUTE FUNCTION notify_suspicious_role_change();
