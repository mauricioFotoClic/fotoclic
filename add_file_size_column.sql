-- Migration: add_file_size_bytes
ALTER TABLE photos ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;

-- Adiciona a coluna se ainda nao tiver
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='photos' AND column_name='file_size_bytes') THEN
        ALTER TABLE photos ADD COLUMN file_size_bytes BIGINT;
    END IF;
END $$;
