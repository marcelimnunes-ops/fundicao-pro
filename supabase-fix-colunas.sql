-- ============================================================
-- FUNDIÇÃO PRO — CORREÇÃO DE COLUNAS FALTANTES
-- Execute no Supabase SQL Editor
-- Execute TUDO de uma vez (selecione tudo, Run)
-- ============================================================

-- ── 1. FUNCIONARIOS ─────────────────────────────────────
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS codigo         VARCHAR(10);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS cpf            VARCHAR(14);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS data_admissao  DATE;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS telefone       VARCHAR(20);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS email          VARCHAR(150);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS pin_tablet     VARCHAR(6);
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS ativo          BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

-- cartao_beneficio (pode já existir como cartao_custo)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funcionarios' AND column_name = 'cartao_custo'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funcionarios' AND column_name = 'cartao_beneficio'
  ) THEN
    ALTER TABLE funcionarios RENAME COLUMN cartao_custo TO cartao_beneficio;
  END IF;
END $$;

ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS cartao_beneficio DECIMAL(10,2) DEFAULT 0;

-- custo_hora: coluna GERADA (calculada automaticamente, nunca inserir valor)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funcionarios' AND column_name = 'custo_hora'
  ) THEN
    ALTER TABLE funcionarios ADD COLUMN custo_hora DECIMAL(10,4)
      GENERATED ALWAYS AS (
        CASE WHEN COALESCE(salario,0) + COALESCE(cartao_beneficio,0) > 0
        THEN (COALESCE(salario,0) + COALESCE(cartao_beneficio,0)) / 176.0
        ELSE 0 END
      ) STORED;
  END IF;
END $$;

-- ── 2. CLIENTES ──────────────────────────────────────────
-- Renomeia 'nome' para 'razao_social' se ainda não foi feito
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'nome'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clientes' AND column_name = 'razao_social'
  ) THEN
    ALTER TABLE clientes RENAME COLUMN nome TO razao_social;
  END IF;
END $$;

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS razao_social         VARCHAR(150);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nome_fantasia        VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cnpj                 VARCHAR(18);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS inscricao_estadual   VARCHAR(20);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cep                  VARCHAR(10);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS logradouro           VARCHAR(150);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS numero               VARCHAR(20);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS complemento          VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS bairro               VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cidade               VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS uf                   CHAR(2);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS telefone             VARCHAR(20);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS celular              VARCHAR(20);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email                VARCHAR(150);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS contato_nome         VARCHAR(100);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS prazo_pagamento_dias INT DEFAULT 30;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS limite_credito        DECIMAL(12,2);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS observacoes           TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ativo                 BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS created_at            TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ DEFAULT NOW();

-- garante NOT NULL em razao_social (sem quebrar linhas existentes)
UPDATE clientes SET razao_social = 'SEM NOME' WHERE razao_social IS NULL OR razao_social = '';
ALTER TABLE clientes ALTER COLUMN razao_social SET NOT NULL;

-- ── 3. PRODUTOS ──────────────────────────────────────────
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS codigo                VARCHAR(30);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS nome                  VARCHAR(150);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS descricao             TEXT;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS qtd_peca_placa        INT DEFAULT 1;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS peso_peca             DECIMAL(10,4);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS peso_total_galho      DECIMAL(10,4);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS percentual_retorno    DECIMAL(8,6);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS qtd_machos_por_caixa  INT DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS peso_macho            DECIMAL(10,4);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS tipo_material         VARCHAR(20) DEFAULT 'sucata';
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS preco_venda_kg        DECIMAL(12,4);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS custo_adicional       DECIMAL(12,2) DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS cliente_id            UUID;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS estoque_atual         DECIMAL(12,3) DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS estoque_minimo        DECIMAL(12,3) DEFAULT 0;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS controle_lote         BOOLEAN DEFAULT false;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS ativo                 BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS created_at            TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ DEFAULT NOW();

-- FK clientes (só adiciona se ainda não existe)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'produtos'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'cliente_id'
  ) THEN
    ALTER TABLE produtos
      ADD CONSTRAINT produtos_cliente_id_fkey
      FOREIGN KEY (cliente_id) REFERENCES clientes(id);
  END IF;
END $$;

-- CHECK de tipo_material (adiciona se não existir)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'produtos' AND constraint_name = 'produtos_tipo_material_check'
  ) THEN
    ALTER TABLE produtos
      ADD CONSTRAINT produtos_tipo_material_check
      CHECK (tipo_material IN ('lingote','sucata','mistura'));
  END IF;
END $$;

-- ── 4. PRODUCAO ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS producao (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data          DATE NOT NULL DEFAULT CURRENT_DATE,
  moldador_id   UUID REFERENCES funcionarios(id),
  produto_id    UUID REFERENCES produtos(id),
  qtde_caixas   INT NOT NULL DEFAULT 0,
  aluminio_bruto DECIMAL(10,3) DEFAULT 0,
  peso_retorno  DECIMAL(10,3) DEFAULT 0,
  perdas_peca   INT DEFAULT 0,
  consumo_oleo  DECIMAL(10,3) DEFAULT 0,
  tempo_horas   DECIMAL(8,4) DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. ESTOQUE ALUMINIO ──────────────────────────────────
CREATE TABLE IF NOT EXISTS estoque_aluminio (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo         VARCHAR(20) NOT NULL,
  saldo        DECIMAL(12,3) DEFAULT 0,
  custo_medio  DECIMAL(10,4) DEFAULT 0,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO estoque_aluminio (tipo, saldo, custo_medio)
SELECT * FROM (VALUES
  ('Lingote'::TEXT, 0::DECIMAL(12,3), 17.60::DECIMAL(10,4)),
  ('Sucata',        0, 15.60),
  ('Óleo',          0,  2.50),
  ('Galho',         0,  0.00)
) AS v(tipo, saldo, custo_medio)
WHERE NOT EXISTS (SELECT 1 FROM estoque_aluminio LIMIT 1);

-- ── 6. CONFIG SISTEMA ────────────────────────────────────
CREATE TABLE IF NOT EXISTS config_sistema (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_nome               VARCHAR(100) DEFAULT 'Fundição PRO',
  empresa_cnpj               VARCHAR(18),
  capacidade_forno_kg        DECIMAL(10,2) DEFAULT 180.00,
  oleo_por_fornada_litros    DECIMAL(10,2) DEFAULT 76.00,
  percentual_perda_fusao     DECIMAL(5,2)  DEFAULT 2.00,
  dias_uteis_mes             INT           DEFAULT 22,
  horas_dia_padrao           DECIMAL(4,2)  DEFAULT 8.00,
  custo_kg_lingote           DECIMAL(10,4) DEFAULT 17.60,
  custo_kg_sucata            DECIMAL(10,4) DEFAULT 15.60,
  custo_litro_oleo           DECIMAL(10,4) DEFAULT 2.50,
  custo_macho_kg             DECIMAL(10,4) DEFAULT 1.55,
  kg_aluminio_por_litro_oleo DECIMAL(10,4) DEFAULT 2.38,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO config_sistema (empresa_nome)
SELECT 'Fundição PRO'
WHERE NOT EXISTS (SELECT 1 FROM config_sistema LIMIT 1);

-- ── 7. RLS — POLICIES ABERTAS (desenvolvimento) ─────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clientes','funcionarios','produtos','producao',
    'estoque_aluminio','config_sistema'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS allow_all ON %I', t);
    EXECUTE format(
      'CREATE POLICY allow_all ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

-- ── 8. RECARREGA CACHE DO POSTGREST ──────────────────────
-- (obrigatório após ADD COLUMN para o Supabase reconhecer os novos campos)
NOTIFY pgrst, 'reload schema';

-- ── Verificação rápida ───────────────────────────────────
SELECT
  table_name,
  COUNT(*) AS total_colunas
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('funcionarios','clientes','produtos','producao','estoque_aluminio')
GROUP BY table_name
ORDER BY table_name;
