-- Adicionar coluna para templates de comunicação
ALTER TABLE users ADD COLUMN communication_templates JSONB DEFAULT '{}'::jsonb;
