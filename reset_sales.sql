-- ⚠️ ATENÇÃO: Este script APAGA TODAS AS VENDAS do banco de dados!
-- Use com cautela. Ideal para limpar dados de teste antes do lançamento.

BEGIN;

-- 1. Limpar tabela de Saques/Pagamentos (tabela dependente ou relacionada financeiramente)
DELETE FROM payouts;

-- 2. Limpar tabela de Vendas
DELETE FROM sales;

-- (Opcional) Se quiser resetar os IDs para começar do 1 novamente,
-- caso suas tabelas usem IDENTITY (Auto Incremento), use os comandos abaixo:
-- TRUNCATE TABLE payouts RESTART IDENTITY CASCADE;
-- TRUNCATE TABLE sales RESTART IDENTITY CASCADE;

COMMIT;

-- Após rodar, o painel de vendas e financeiro deve ficar zerado.
