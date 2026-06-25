-- 1. Adiciona a coluna slug (inicialmente sem UNIQUE para permitir atualização segura)
ALTER TABLE users ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Função auxiliar para gerar slug a partir do nome do fotógrafo
CREATE OR REPLACE FUNCTION generate_slug(name TEXT)
RETURNS TEXT AS $$
DECLARE
    slug_val TEXT;
BEGIN
    IF name IS NULL OR name = '' THEN
        RETURN NULL;
    END IF;
    
    slug_val := lower(name);
    -- Substitui caracteres com acentos comuns do português
    slug_val := translate(slug_val, 'áàâãäéèêëíìîïóòôõöúùûüçñýÿ', 'aaaaaeeeeiiiiooooouuuucnyy');
    -- Substitui caracteres especiais, pontuações e espaços por hífen
    slug_val := regexp_replace(slug_val, '[^a-z0-9\-]+', '-', 'g');
    -- Remove hífens duplicados seguidos
    slug_val := regexp_replace(slug_val, '\-+', '-', 'g');
    -- Remove hífens no início e no final
    slug_val := trim(both '-' from slug_val);
    
    RETURN slug_val;
END;
$$ LANGUAGE plpgsql;

-- 3. Atualiza os fotógrafos existentes que estão com slug nulo
UPDATE users 
SET slug = COALESCE(generate_slug(name), substring(id::text from 1 for 8))
WHERE role = 'photographer' AND (slug IS NULL OR slug = '');

-- 4. Trata possíveis colisões de nomes iguais adicionando sufixo incremental aos duplicados
WITH duplicate_slugs AS (
    SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) as rn
    FROM users
    WHERE role = 'photographer'
)
UPDATE users u
SET slug = u.slug || '-' || d.rn
FROM duplicate_slugs d
WHERE u.id = d.id AND d.rn > 1;

-- 5. Adiciona o constraint UNIQUE e cria um índice para busca de alta performance por slug
ALTER TABLE users ADD CONSTRAINT users_slug_unique UNIQUE (slug);
CREATE INDEX IF NOT EXISTS idx_users_slug ON users(slug);
