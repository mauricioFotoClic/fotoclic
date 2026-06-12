-- Adiciona a coluna allow_discounts na tabela events com padrão true
ALTER TABLE events ADD COLUMN IF NOT EXISTS allow_discounts BOOLEAN DEFAULT true;
