-- Adiciona a coluna de senha na tabela de usuários
-- Execute este comando no "SQL Editor" do seu painel Supabase

ALTER TABLE "public"."users" ADD COLUMN IF NOT EXISTS "password" text;

-- Opcional: Definir uma senha padrão para usuários existentes (ex: '123456') para não ficarem bloqueados
-- UPDATE "public"."users" SET "password" = '123456' WHERE "password" IS NULL;
