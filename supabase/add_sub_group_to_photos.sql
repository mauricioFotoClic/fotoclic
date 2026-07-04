-- Adicionar coluna 'sub_group' para permitir divisão de fotos por pastas/dias nos eventos
ALTER TABLE photos ADD COLUMN IF NOT EXISTS sub_group text DEFAULT NULL;
