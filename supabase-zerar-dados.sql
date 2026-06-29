-- ============================================================
-- ZERAR DADOS — apaga todos os registros das tabelas
-- ATENÇÃO: irreversível! Execute apenas em ambiente de testes.
-- ============================================================

-- Desativa triggers temporariamente para evitar erros de FK
SET session_replication_role = replica;

TRUNCATE TABLE
  producao,
  compras,
  produtos,
  clientes,
  funcionarios,
  estoque_aluminio
RESTART IDENTITY CASCADE;

-- Reativa triggers
SET session_replication_role = DEFAULT;

-- Reinicia sequências de código
DROP SEQUENCE IF EXISTS funcionarios_codigo_seq CASCADE;
DROP SEQUENCE IF EXISTS clientes_codigo_seq CASCADE;
DROP SEQUENCE IF EXISTS produtos_codigo_seq CASCADE;

CREATE SEQUENCE funcionarios_codigo_seq START 1;
CREATE SEQUENCE clientes_codigo_seq START 1;
CREATE SEQUENCE produtos_codigo_seq START 1;

ALTER TABLE funcionarios
  ALTER COLUMN codigo SET DEFAULT 'FUNC-' || LPAD(nextval('funcionarios_codigo_seq')::TEXT, 4, '0');
ALTER TABLE clientes
  ALTER COLUMN codigo SET DEFAULT 'CLI-' || LPAD(nextval('clientes_codigo_seq')::TEXT, 4, '0');
ALTER TABLE produtos
  ALTER COLUMN codigo SET DEFAULT 'PRD-' || LPAD(nextval('produtos_codigo_seq')::TEXT, 4, '0');

-- Recria saldos zerados no estoque
INSERT INTO estoque_aluminio (tipo, saldo, custo_medio)
VALUES ('Lingote', 0, 0), ('Sucata', 0, 0), ('Óleo', 0, 0), ('Galho', 0, 0);

NOTIFY pgrst, 'reload schema';

SELECT 'OK — base zerada' AS status;
