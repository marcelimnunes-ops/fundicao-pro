-- ============================================================
-- FUNDIÇÃO PRO — SQL SCHEMA COMPLETO
-- Execute no Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ========================
-- CLIENTES
-- ========================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(20),
  razao_social VARCHAR(150) NOT NULL,
  nome_fantasia VARCHAR(100),
  cnpj VARCHAR(18),
  inscricao_estadual VARCHAR(20),
  cep VARCHAR(10),
  logradouro VARCHAR(150),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  uf CHAR(2),
  telefone VARCHAR(20),
  celular VARCHAR(20),
  email VARCHAR(150),
  contato_nome VARCHAR(100),
  prazo_pagamento_dias INT DEFAULT 30,
  limite_credito DECIMAL(12,2),
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Se a tabela já existe mas falta coluna razao_social (migração)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='clientes' AND column_name='nome'
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='razao_social')
  ) THEN
    ALTER TABLE clientes RENAME COLUMN nome TO razao_social;
  END IF;
END $$;

-- Adiciona colunas faltantes se a tabela já existia parcialmente
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nome_fantasia VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(20);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cep VARCHAR(10);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS logradouro VARCHAR(150);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS numero VARCHAR(20);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS complemento VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cidade VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS uf CHAR(2);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS celular VARCHAR(20);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS prazo_pagamento_dias INT DEFAULT 30;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS limite_credito DECIMAL(12,2);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Clientes iniciais do Excel
INSERT INTO clientes (razao_social, nome_fantasia, ativo)
SELECT * FROM (VALUES
  ('Jumil', 'Jumil', true),
  ('Grazmec', 'Grazmec', true),
  ('Senun', 'Senun Metal', true),
  ('Oscar', 'Oscar', true),
  ('MGA', 'MGA', true),
  ('Busa', 'Busa', true),
  ('Danilo', 'Danilo', true),
  ('TPA/TEMPLA', 'TPA/TEMPLA', true),
  ('Marcelo', 'Marcelo', true)
) AS v(razao_social, nome_fantasia, ativo)
WHERE NOT EXISTS (SELECT 1 FROM clientes LIMIT 1);

-- ========================
-- FUNCIONARIOS
-- ========================
CREATE TABLE IF NOT EXISTS funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(10),
  nome VARCHAR(100) NOT NULL,
  funcao VARCHAR(50) NOT NULL DEFAULT 'Ajudante',
  cpf VARCHAR(14),
  data_nascimento DATE,
  telefone VARCHAR(20),
  email VARCHAR(150),
  data_admissao DATE,
  salario DECIMAL(10,2) NOT NULL DEFAULT 0,
  cartao_beneficio DECIMAL(10,2) DEFAULT 0,
  custo_hora DECIMAL(10,2) GENERATED ALWAYS AS (
    CASE WHEN salario + COALESCE(cartao_beneficio, 0) > 0
    THEN (salario + COALESCE(cartao_beneficio, 0)) / 176.0
    ELSE 0 END
  ) STORED,
  pin_tablet VARCHAR(6),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Se a tabela já existia com cartao_custo em vez de cartao_beneficio
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='funcionarios' AND column_name='cartao_custo'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='funcionarios' AND column_name='cartao_beneficio'
  ) THEN
    ALTER TABLE funcionarios RENAME COLUMN cartao_custo TO cartao_beneficio;
  END IF;
END $$;

-- Adiciona colunas faltantes
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS codigo VARCHAR(10);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS cpf VARCHAR(14);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS data_admissao DATE;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS cartao_beneficio DECIMAL(10,2) DEFAULT 0;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS pin_tablet VARCHAR(6);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Recria custo_hora como coluna gerada (só se não existir)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='funcionarios' AND column_name='custo_hora'
  ) THEN
    ALTER TABLE funcionarios ADD COLUMN custo_hora DECIMAL(10,2) GENERATED ALWAYS AS (
      CASE WHEN salario + COALESCE(cartao_beneficio, 0) > 0
      THEN (salario + COALESCE(cartao_beneficio, 0)) / 176.0
      ELSE 0 END
    ) STORED;
  END IF;
END $$;

-- ========================
-- PRODUTOS
-- ========================
CREATE TABLE IF NOT EXISTS produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nome VARCHAR(150) NOT NULL,
  descricao TEXT,
  -- Características físicas da placa
  qtd_peca_placa INT DEFAULT 1,
  peso_peca DECIMAL(10,4),
  peso_total_galho DECIMAL(10,4),
  percentual_retorno DECIMAL(8,6),
  -- Machos
  qtd_machos_por_caixa INT DEFAULT 0,
  peso_macho DECIMAL(10,4),
  -- Material e custo
  tipo_material VARCHAR(20) DEFAULT 'sucata' CHECK (tipo_material IN ('lingote', 'sucata', 'mistura')),
  preco_venda_kg DECIMAL(12,4),
  custo_adicional DECIMAL(12,2) DEFAULT 0,
  -- Cliente
  cliente_id UUID REFERENCES clientes(id),
  -- Estoque de produto acabado
  estoque_atual DECIMAL(12,3) DEFAULT 0,
  estoque_minimo DECIMAL(12,3) DEFAULT 0,
  -- Controles
  controle_lote BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adiciona colunas faltantes se a tabela já existia
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS qtd_peca_placa INT DEFAULT 1;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS peso_peca DECIMAL(10,4);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS peso_total_galho DECIMAL(10,4);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS percentual_retorno DECIMAL(8,6);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS qtd_machos_por_caixa INT DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS peso_macho DECIMAL(10,4);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS tipo_material VARCHAR(20) DEFAULT 'sucata';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS preco_venda_kg DECIMAL(12,4);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS custo_adicional DECIMAL(12,2) DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS estoque_atual DECIMAL(12,3) DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS estoque_minimo DECIMAL(12,3) DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS controle_lote BOOLEAN DEFAULT false;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ========================
-- PRODUCAO (apontamentos)
-- ========================
CREATE TABLE IF NOT EXISTS producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  moldador_id UUID REFERENCES funcionarios(id),
  produto_id UUID REFERENCES produtos(id),
  qtde_caixas INT NOT NULL DEFAULT 0,
  aluminio_bruto DECIMAL(10,3) DEFAULT 0,
  peso_retorno DECIMAL(10,3) DEFAULT 0,
  perdas_peca INT DEFAULT 0,
  consumo_oleo DECIMAL(10,3) DEFAULT 0,
  tempo_horas DECIMAL(8,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- ESTOQUE ALUMINIO
-- ========================
CREATE TABLE IF NOT EXISTS estoque_aluminio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('Lingote', 'Sucata', 'Óleo', 'Galho')),
  saldo DECIMAL(12,3) DEFAULT 0,
  custo_medio DECIMAL(10,4) DEFAULT 0,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO estoque_aluminio (tipo, saldo, custo_medio)
SELECT v.tipo, v.saldo, v.custo_medio
FROM (VALUES
  ('Lingote'::VARCHAR(20), 0::DECIMAL(12,3), 17.60::DECIMAL(10,4)),
  ('Sucata', 0, 15.60),
  ('Óleo', 0, 2.50),
  ('Galho', 0, 0)
) AS v(tipo, saldo, custo_medio)
WHERE NOT EXISTS (SELECT 1 FROM estoque_aluminio LIMIT 1);

-- ========================
-- MOVIMENTACAO ESTOQUE
-- ========================
CREATE TABLE IF NOT EXISTS movimentacao_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_movimento VARCHAR(10) NOT NULL CHECK (tipo_movimento IN ('Entrada', 'Saída')),
  material VARCHAR(30) NOT NULL,
  quantidade DECIMAL(12,3) NOT NULL,
  custo_unitario DECIMAL(10,4),
  referencia VARCHAR(100),
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- CONFIG SISTEMA
-- ========================
CREATE TABLE IF NOT EXISTS config_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_nome VARCHAR(100) DEFAULT 'Fundição PRO',
  empresa_cnpj VARCHAR(18),
  empresa_endereco TEXT,
  empresa_telefone VARCHAR(20),
  empresa_email VARCHAR(100),
  tema_padrao VARCHAR(10) DEFAULT 'light',
  capacidade_forno_kg DECIMAL(10,2) DEFAULT 180.00,
  oleo_por_fornada_litros DECIMAL(10,2) DEFAULT 76.00,
  percentual_perda_fusao DECIMAL(5,2) DEFAULT 2.00,
  dias_uteis_mes INT DEFAULT 22,
  horas_dia_padrao DECIMAL(4,2) DEFAULT 8.00,
  custo_kg_lingote DECIMAL(10,4) DEFAULT 17.60,
  custo_kg_sucata DECIMAL(10,4) DEFAULT 15.60,
  custo_litro_oleo DECIMAL(10,4) DEFAULT 2.50,
  custo_macho_kg DECIMAL(10,4) DEFAULT 1.55,
  kg_aluminio_por_litro_oleo DECIMAL(10,4) DEFAULT 2.38,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO config_sistema DEFAULT VALUES
WHERE NOT EXISTS (SELECT 1 FROM config_sistema LIMIT 1);

-- ========================
-- RLS (desabilita para desenvolvimento)
-- ========================
-- Se quiser habilitar RLS, configure policies adequadas.
-- Por ora, permitir tudo:
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_aluminio ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacao_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_sistema ENABLE ROW LEVEL SECURITY;

-- Policies permissivas (ajuste para produção)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['clientes','funcionarios','produtos','producao','estoque_aluminio','movimentacao_estoque','config_sistema']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS allow_all ON %I', t);
    EXECUTE format('CREATE POLICY allow_all ON %I FOR ALL USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;
