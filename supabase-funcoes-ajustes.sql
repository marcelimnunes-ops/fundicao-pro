-- ============================================================
-- TABELA FUNCOES + LIMPEZA FUNCIONARIOS
-- Execute no Supabase SQL Editor
-- ============================================================

-- ── Cria tabela de funções ──────────────────────────────────
CREATE TABLE IF NOT EXISTS funcoes (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(60) NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Popula funções padrão
INSERT INTO funcoes (nome) VALUES
  ('Moldador'), ('Ajudante'), ('Forno'), ('Fusionista'), ('Macheiro'),
  ('Rebarbador'), ('Usinagem'), ('Pintor'), ('Expedição'), ('Supervisor'), ('Gerente')
ON CONFLICT (nome) DO NOTHING;

-- Importa funções já existentes nos funcionários cadastrados
INSERT INTO funcoes (nome)
SELECT DISTINCT funcao FROM funcionarios WHERE funcao IS NOT NULL AND funcao <> ''
ON CONFLICT (nome) DO NOTHING;

-- RLS
ALTER TABLE funcoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all ON funcoes;
CREATE POLICY allow_all ON funcoes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── Remove colunas desnecessárias de funcionários ───────────
ALTER TABLE funcionarios
  DROP COLUMN IF EXISTS cpf,
  DROP COLUMN IF EXISTS telefone,
  DROP COLUMN IF EXISTS email;

NOTIFY pgrst, 'reload schema';

-- Verifica
SELECT nome FROM funcoes ORDER BY nome;
