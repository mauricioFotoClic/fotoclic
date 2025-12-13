-- O problema ocorre porque o sistema de login atual é "personalizado" e não autentica realmente no Supabase.
-- Para o banco de dados, você é um usuário anônimo, e usuários anônimos geralmente não podem deletar dados por segurança.

-- Execute este comando no "SQL Editor" do seu painel Supabase para permitir a exclusão:

-- Opção 1: Desabilitar RLS (Mais fácil para desenvolvimento/protótipo)
ALTER TABLE "public"."users" DISABLE ROW LEVEL SECURITY;

-- OU --

-- Opção 2: Criar uma política que permite tudo (se quiser manter RLS habilitado)
-- CREATE POLICY "Enable all for anon" ON "public"."users"
-- FOR ALL
-- TO anon
-- USING (true)
-- WITH CHECK (true);
