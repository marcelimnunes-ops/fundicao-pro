-- ============================================================
-- AJUSTES TABELA PRODUCAO
-- Execute no Supabase SQL Editor
-- ============================================================

-- ajudante_id opcional (nullable)
ALTER TABLE producao ADD COLUMN IF NOT EXISTS ajudante_id UUID REFERENCES funcionarios(id) ON DELETE SET NULL;
ALTER TABLE producao ALTER COLUMN ajudante_id DROP NOT NULL;

-- número da OP do ERP externo
ALTER TABLE producao ADD COLUMN IF NOT EXISTS numero_op VARCHAR(30);

-- qtde de peças produzidas (calculado no app, salvo para relatórios)
ALTER TABLE producao ADD COLUMN IF NOT EXISTS qtde_pecas INTEGER;

-- campos calculados salvos para performance nos relatórios
ALTER TABLE producao ADD COLUMN IF NOT EXISTS aluminio_util DECIMAL(10,3);
ALTER TABLE producao ADD COLUMN IF NOT EXISTS custo_mo_total DECIMAL(10,2);
ALTER TABLE producao ADD COLUMN IF NOT EXISTS custo_aluminio DECIMAL(10,2);
ALTER TABLE producao ADD COLUMN IF NOT EXISTS custo_oleo DECIMAL(10,2);
ALTER TABLE producao ADD COLUMN IF NOT EXISTS custo_machos DECIMAL(10,2);
ALTER TABLE producao ADD COLUMN IF NOT EXISTS custo_total DECIMAL(10,2);
ALTER TABLE producao ADD COLUMN IF NOT EXISTS custo_kg_util DECIMAL(10,4);
ALTER TABLE producao ADD COLUMN IF NOT EXISTS custo_peca DECIMAL(10,4);

NOTIFY pgrst, 'reload schema';
