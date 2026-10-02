-- ==============================================================================
-- FotoClic: Adicionar colunas de CPF e Data de Nascimento na tabela public.users
-- ==============================================================================
-- Execute este script no SQL Editor do seu Dashboard Supabase.
-- ==============================================================================

-- 1. Adiciona as colunas cpf e birth_date se não existirem
ALTER TABLE IF EXISTS public.users 
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 2. Comentários explicativos
COMMENT ON COLUMN public.users.cpf IS 'CPF do usuário (apenas dígitos numéricos)';
COMMENT ON COLUMN public.users.birth_date IS 'Data de nascimento do usuário (formato YYYY-MM-DD)';

-- 3. Índices opcionais para busca rápida por CPF
CREATE INDEX IF NOT EXISTS idx_users_cpf ON public.users(cpf);
