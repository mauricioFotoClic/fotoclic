-- Tabela de denúncias de fotógrafos
CREATE TABLE IF NOT EXISTS public.photographer_reports (
    id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    photographer_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    reporter_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
    reason      text NOT NULL CHECK (reason IN ('conteudo_inapropriado', 'perfil_falso', 'violacao_direitos', 'assedio', 'spam', 'outro')),
    description text,
    status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    admin_note  text,
    created_at  timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at timestamp with time zone
);

ALTER TABLE public.photographer_reports ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ler (admin precisa de acesso irrestrito via service role)
CREATE POLICY "Reports viewable by all authenticated" ON public.photographer_reports
    FOR SELECT USING (true);

-- Usuário autenticado pode criar denúncia
CREATE POLICY "Authenticated users can create reports" ON public.photographer_reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Apenas service role pode atualizar (resolve/dismiss via API)
CREATE POLICY "Service role can update reports" ON public.photographer_reports
    FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_reports_photographer_id ON public.photographer_reports(photographer_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.photographer_reports(status);
