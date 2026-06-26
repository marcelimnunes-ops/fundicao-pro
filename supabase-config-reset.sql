-- ============================================================
-- RECRIA config_sistema como tabela chave/valor
-- Execute no Supabase SQL Editor
-- ============================================================

-- Remove tabela antiga (colunas individuais) e recria como chave/valor
DROP TABLE IF EXISTS config_sistema CASCADE;

CREATE TABLE config_sistema (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave      VARCHAR(60) NOT NULL UNIQUE,
  valor      TEXT NOT NULL,
  tipo       VARCHAR(20) NOT NULL DEFAULT 'number', -- number | text | boolean
  descricao  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Valores padrão
INSERT INTO config_sistema (chave, valor, tipo, descricao) VALUES
  ('HORAS_UTEIS_MES',      '176',    'number', 'Horas úteis trabalhadas por mês (dias úteis × horas/dia)'),
  ('DIAS_UTEIS_MES',       '22',     'number', 'Dias úteis por mês'),
  ('HORAS_DIA_PADRAO',     '8',      'number', 'Horas trabalhadas por dia'),
  ('ENCARGOS_TRABALHISTAS','1.45',   'number', 'Multiplicador de encargos (ex: 1.45 = 45% encargos)'),
  ('MARKUP_CUSTO',         '1.30',   'number', 'Markup aplicado ao custo total (ex: 1.30 = 30% margem)'),
  ('MARGEM_ALUMINIO',      '1.055',  'number', 'Fator de alumínio bruto por kg fundido (perdas de forno)'),
  ('APROVEIT_RETORNO',     '0.90',   'number', 'Aproveitamento do retorno/galho (ex: 0.90 = 90%)'),
  ('RENDIMENTO_LINGOTE',   '97',     'number', 'Rendimento do lingote em % (ex: 97)'),
  ('RENDIMENTO_SUCATA',    '93',     'number', 'Rendimento da sucata em % (ex: 93)'),
  ('CAPACIDADE_FORNO_KG',  '180',    'number', 'Capacidade do forno em kg por fornada'),
  ('OLEO_POR_FORNADA_L',   '76',     'number', 'Consumo de óleo por fornada em litros'),
  ('KG_ALUM_POR_LITRO_OLEO','2.38', 'number', 'Kg de alumínio fundido por litro de óleo'),
  ('CUSTO_KG_LINGOTE',     '17.60',  'number', 'Custo do kg de lingote de alumínio (R$)'),
  ('CUSTO_KG_SUCATA',      '15.60',  'number', 'Custo do kg de sucata de alumínio (R$)'),
  ('CUSTO_LITRO_OLEO',     '2.50',   'number', 'Custo do litro de óleo combustível (R$)'),
  ('CUSTO_MACHO_KG',       '1.55',   'number', 'Custo por kg de macho de areia (R$)'),
  ('ESTOQUE_MIN_LINGOTE',  '500',    'number', 'Estoque mínimo de lingote em kg'),
  ('ESTOQUE_MIN_SUCATA',   '500',    'number', 'Estoque mínimo de sucata em kg'),
  ('EMPRESA_NOME',         'Fundição PRO', 'text', 'Nome da empresa'),
  ('EMPRESA_CNPJ',         '',       'text', 'CNPJ da empresa')
ON CONFLICT (chave) DO NOTHING;

-- RLS
ALTER TABLE config_sistema ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_all ON config_sistema;
CREATE POLICY allow_all ON config_sistema FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

-- Verifica
SELECT chave, valor, descricao FROM config_sistema ORDER BY chave;
