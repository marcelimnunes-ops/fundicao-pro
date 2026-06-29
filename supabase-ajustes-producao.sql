-- ============================================================
-- AJUSTES TABELA PRODUCAO — ajudante_id opcional
-- Execute no Supabase SQL Editor
-- ============================================================

-- Adiciona ajudante_id como coluna opcional (nullable)
ALTER TABLE producao ADD COLUMN IF NOT EXISTS ajudante_id UUID REFERENCES funcionarios(id) ON DELETE SET NULL;

-- Garante que ajudante_id NÃO é NOT NULL (caso já exista com constraint)
ALTER TABLE producao ALTER COLUMN ajudante_id DROP NOT NULL;

-- Adiciona qtde_pecas calculado (opcional — para relatórios)
ALTER TABLE producao ADD COLUMN IF NOT EXISTS qtde_pecas INTEGER;

NOTIFY pgrst, 'reload schema';
