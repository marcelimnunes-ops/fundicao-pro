-- ============================================================
-- CÓDIGOS AUTOMÁTICOS — sequências para funcionarios, clientes, produtos
-- Execute no Supabase SQL Editor
-- ============================================================

-- ── FUNCIONARIOS ──────────────────────────────────────────
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS codigo_erp VARCHAR(30);

-- Sequência para código automático
CREATE SEQUENCE IF NOT EXISTS funcionarios_codigo_seq START 1;

ALTER TABLE funcionarios
  ALTER COLUMN codigo DROP NOT NULL,
  ALTER COLUMN codigo SET DEFAULT 'FUNC-' || LPAD(nextval('funcionarios_codigo_seq')::TEXT, 4, '0');

-- Preenche registros existentes sem código
UPDATE funcionarios
SET codigo = 'FUNC-' || LPAD(nextval('funcionarios_codigo_seq')::TEXT, 4, '0')
WHERE codigo IS NULL OR codigo = '';

-- ── CLIENTES ──────────────────────────────────────────────
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS codigo_erp VARCHAR(30);

CREATE SEQUENCE IF NOT EXISTS clientes_codigo_seq START 1;

ALTER TABLE clientes
  ALTER COLUMN codigo DROP NOT NULL,
  ALTER COLUMN codigo SET DEFAULT 'CLI-' || LPAD(nextval('clientes_codigo_seq')::TEXT, 4, '0');

UPDATE clientes
SET codigo = 'CLI-' || LPAD(nextval('clientes_codigo_seq')::TEXT, 4, '0')
WHERE codigo IS NULL OR codigo = '';

-- ── PRODUTOS ──────────────────────────────────────────────
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS codigo_erp VARCHAR(30);

-- Remove unique constraint se existir (nome será o identificador durante importação)
ALTER TABLE produtos DROP CONSTRAINT IF EXISTS produtos_codigo_key;
ALTER TABLE produtos DROP CONSTRAINT IF EXISTS produtos_codigo_unique;

CREATE SEQUENCE IF NOT EXISTS produtos_codigo_seq START 1;

ALTER TABLE produtos
  ALTER COLUMN codigo DROP NOT NULL,
  ALTER COLUMN codigo SET DEFAULT 'PRD-' || LPAD(nextval('produtos_codigo_seq')::TEXT, 4, '0');

-- Adiciona unique em nome para evitar duplicatas na importação
-- (trim + lower para comparação case-insensitive é feito no app)
ALTER TABLE produtos DROP CONSTRAINT IF EXISTS produtos_nome_unique;
-- Não colocamos UNIQUE em nome pois pode haver produtos com mesmo nome de clientes diferentes

UPDATE produtos
SET codigo = 'PRD-' || LPAD(nextval('produtos_codigo_seq')::TEXT, 4, '0')
WHERE codigo IS NULL OR codigo = '';

-- ── RELOAD ────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- Verifica
SELECT 'funcionarios' AS tabela, COUNT(*) AS registros,
  COUNT(codigo) AS com_codigo, COUNT(codigo_erp) AS com_codigo_erp
FROM funcionarios
UNION ALL
SELECT 'clientes', COUNT(*), COUNT(codigo), COUNT(codigo_erp) FROM clientes
UNION ALL
SELECT 'produtos', COUNT(*), COUNT(codigo), COUNT(codigo_erp) FROM produtos;
