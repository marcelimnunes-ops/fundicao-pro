-- ============================================================
-- MÓDULO COMPRAS — tabela de entradas de material
-- Execute no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS compras (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data            DATE NOT NULL DEFAULT CURRENT_DATE,
  material        VARCHAR(20) NOT NULL CHECK (material IN ('Lingote','Sucata','Óleo','Galho')),
  fornecedor      VARCHAR(150),
  nota_fiscal     VARCHAR(50),
  quantidade      DECIMAL(12,3) NOT NULL CHECK (quantidade > 0),
  preco_unitario  DECIMAL(10,4) NOT NULL CHECK (preco_unitario > 0),
  valor_total     DECIMAL(14,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
  observacoes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Garante que estoque_aluminio tem todos os tipos
INSERT INTO estoque_aluminio (tipo, saldo, custo_medio)
SELECT tipo, 0, 0
FROM (VALUES ('Lingote'::TEXT),('Sucata'),('Óleo'),('Galho')) AS t(tipo)
WHERE NOT EXISTS (SELECT 1 FROM estoque_aluminio WHERE estoque_aluminio.tipo = t.tipo);

-- RLS
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all ON compras;
CREATE POLICY allow_all ON compras FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
