-- ============================================================================
-- FUNDIÇÃO PRO - SCHEMA SQL COMPLETO
-- ============================================================================
-- Este arquivo deve ser executado no SQL Editor do Supabase
-- Cria todas as tabelas, functions, triggers e dados iniciais
-- ============================================================================

-- 1. TABELA: config_sistema (Parâmetros configuráveis)
-- ============================================================================
CREATE TABLE IF NOT EXISTS config_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave VARCHAR(50) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    tipo VARCHAR(20), -- 'decimal', 'integer', 'string'
    descricao TEXT,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);

INSERT INTO config_sistema (chave, valor, tipo, descricao) VALUES
('ENCARGOS_TRABALHISTAS', '1.45', 'decimal', 'Multiplicador de encargos (45%)'),
('HORAS_UTEIS_MES', '180', 'integer', 'Horas úteis por mês'),
('MARKUP_CUSTO', '1.05', 'decimal', 'Markup sobre custo'),
('MARGEM_ALUMINIO', '1.055', 'decimal', 'Margem bruto de alumínio'),
('APROVEIT_RETORNO', '0.90', 'decimal', 'Aproveitamento de retorno (90%)'),
('RENDIMENTO_LINGOTE', '0.90', 'decimal', 'Rendimento lingote (90%)'),
('RENDIMENTO_SUCATA', '0.65', 'decimal', 'Rendimento sucata (65%)'),
('CAPACIDADE_FORNO', '180', 'decimal', 'Capacidade do forno (kg)'),
('OLEO_POR_KG', '2.38', 'decimal', 'Consumo óleo por kg de alumínio'),
('CUSTO_OLEO_LITRO', '2.50', 'decimal', 'Custo do óleo por litro'),
('ESTOQUE_MIN_LINGOTE', '500', 'decimal', 'Estoque mínimo lingote (kg)'),
('ESTOQUE_MIN_SUCATA', '300', 'decimal', 'Estoque mínimo sucata (kg)'),
('ESTOQUE_MIN_OLEO', '100', 'decimal', 'Estoque mínimo óleo (L)');

-- 2. TABELA: funcionarios
-- ============================================================================
CREATE TABLE IF NOT EXISTS funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(120) NOT NULL,
    funcao VARCHAR(50) NOT NULL, -- 'Moldador', 'Ajudante', 'Fusionista', etc
    salario DECIMAL(10,2) NOT NULL,
    vale DECIMAL(10,2) DEFAULT 0,
    cartao_custo DECIMAL(10,2) DEFAULT 0,
    custo_hora DECIMAL(10,2), -- Calculado automaticamente
    email VARCHAR(100),
    telefone VARCHAR(20),
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW(),
    CONSTRAINT funcao_valida CHECK (funcao IN ('Moldador', 'Ajudante', 'Fusionista', 'Rebarbador', 'Usinagem', 'Pintor', 'Despacho', 'Gerente'))
);

-- 3. TABELA: clientes
-- ============================================================================
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    cnpj VARCHAR(14) UNIQUE,
    email VARCHAR(100),
    telefone VARCHAR(20),
    endereco TEXT,
    cidade VARCHAR(50),
    estado VARCHAR(2),
    contato_nome VARCHAR(100),
    contato_telefone VARCHAR(20),
    margem_padrao DECIMAL(5,2) DEFAULT 20, -- Margem padrão em %
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);

-- 4. TABELA: produtos
-- ============================================================================
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    material VARCHAR(50) DEFAULT 'Alumínio', -- 'Alumínio', etc
    peso_peca DECIMAL(10,3) NOT NULL, -- em gramas
    peso_galho DECIMAL(10,3) NOT NULL, -- peso do galho para calculo de bruto
    qtd_pecas_placa INTEGER NOT NULL DEFAULT 1,
    rendimento_esperado DECIMAL(5,2) DEFAULT 90, -- em %
    preco_venda DECIMAL(10,2),
    custo_minimo DECIMAL(10,2),
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);

-- 5. TABELA: compras_aluminio
-- ============================================================================
CREATE TABLE IF NOT EXISTS compras_aluminio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_compra DATE NOT NULL,
    tipo VARCHAR(20) NOT NULL, -- 'Lingote', 'Sucata'
    quantidade DECIMAL(10,2) NOT NULL, -- em kg
    custo_unitario DECIMAL(10,2) NOT NULL, -- por kg
    custo_total DECIMAL(12,2) GENERATED ALWAYS AS (quantidade * custo_unitario) STORED,
    fornecedor VARCHAR(100),
    nota_fiscal VARCHAR(50),
    criado_em TIMESTAMP DEFAULT NOW(),
    CONSTRAINT tipo_valido CHECK (tipo IN ('Lingote', 'Sucata'))
);

-- 6. TABELA: estoque_aluminio
-- ============================================================================
CREATE TABLE IF NOT EXISTS estoque_aluminio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(20) UNIQUE NOT NULL, -- 'Lingote', 'Sucata', 'Óleo'
    saldo DECIMAL(12,2) DEFAULT 0,
    custo_medio DECIMAL(10,2) DEFAULT 0,
    atualizado_em TIMESTAMP DEFAULT NOW(),
    CONSTRAINT tipo_estoque CHECK (tipo IN ('Lingote', 'Sucata', 'Óleo'))
);

INSERT INTO estoque_aluminio (tipo, saldo, custo_medio) VALUES
('Lingote', 2500, 18.50),
('Sucata', 1200, 8.00),
('Óleo', 500, 2.50);

-- 7. TABELA: producao (Apontamentos de Moldagem)
-- ============================================================================
CREATE TABLE IF NOT EXISTS producao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
    moldador_id UUID NOT NULL REFERENCES funcionarios(id) ON DELETE RESTRICT,
    ajudante_id UUID NOT NULL REFERENCES funcionarios(id) ON DELETE RESTRICT,
    qtde_caixas INTEGER NOT NULL,
    tempo_horas DECIMAL(10,2) NOT NULL,
    perdas_peca INTEGER DEFAULT 0,
    peso_retorno DECIMAL(10,2) DEFAULT 0,
    
    -- Cálculos derivados (calculados por trigger)
    aluminio_util DECIMAL(12,2),
    aluminio_bruto DECIMAL(12,2),
    retorno_calculado DECIMAL(12,2),
    consumo_oleo DECIMAL(10,2),
    custo_mo DECIMAL(12,2),
    custo_aluminio DECIMAL(12,2),
    custo_oleo DECIMAL(12,2),
    custo_total DECIMAL(12,2),
    custo_por_peca DECIMAL(10,2),
    taxa_perda DECIMAL(5,2),
    eficiencia DECIMAL(5,2),
    caixas_por_hora DECIMAL(10,2),
    
    sincronizado BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);

-- 8. TABELA: apontamentos_fusao
-- ============================================================================
CREATE TABLE IF NOT EXISTS apontamentos_fusao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    fusionista_id UUID REFERENCES funcionarios(id),
    
    lingote_kg DECIMAL(10,2) DEFAULT 0,
    sucata_kg DECIMAL(10,2) DEFAULT 0,
    peso_total DECIMAL(10,2),
    
    rendimento_lingote DECIMAL(5,2),
    rendimento_sucata DECIMAL(5,2),
    peso_fundido DECIMAL(10,2),
    
    escoria_kg DECIMAL(10,2) DEFAULT 0,
    oleo_consumido DECIMAL(10,2),
    
    tempo_horas DECIMAL(10,2),
    observacoes TEXT,
    
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);

-- 9. TABELA: apontamentos_rebarbacao
-- ============================================================================
CREATE TABLE IF NOT EXISTS apontamentos_rebarbacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    rebarbador_id UUID REFERENCES funcionarios(id),
    
    peca_id UUID REFERENCES produtos(id),
    quantidade_processada INTEGER,
    quantidade_rejeito INTEGER DEFAULT 0,
    tempo_horas DECIMAL(10,2),
    
    taxa_rejeito DECIMAL(5,2),
    observacoes TEXT,
    
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW()
);

-- 10. TABELA: movimentacoes_estoque
-- ============================================================================
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data DATE NOT NULL,
    tipo_movimento VARCHAR(20) NOT NULL, -- 'Entrada', 'Saída'
    material VARCHAR(50) NOT NULL, -- 'Lingote', 'Sucata', 'Óleo', etc
    quantidade DECIMAL(12,2) NOT NULL,
    custo_unitario DECIMAL(10,2),
    referencia VARCHAR(100), -- Op, NF, etc
    observacoes TEXT,
    criado_em TIMESTAMP DEFAULT NOW(),
    CONSTRAINT tipo_mov_valido CHECK (tipo_movimento IN ('Entrada', 'Saída'))
);

-- 11. TABELA: tabelas_preco (Preços customizados por cliente)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tabelas_preco (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    preco_venda DECIMAL(10,2) NOT NULL,
    margem DECIMAL(5,2),
    ativo BOOLEAN DEFAULT TRUE,
    vigencia_inicio DATE DEFAULT CURRENT_DATE,
    vigencia_fim DATE,
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW(),
    UNIQUE(cliente_id, produto_id, vigencia_inicio)
);

-- ============================================================================
-- FUNCTIONS (Cálculos automáticos)
-- ============================================================================

-- Function: Calcular custo hora do funcionário
CREATE OR REPLACE FUNCTION calcular_custo_hora(p_salario DECIMAL, p_vale DECIMAL, p_cartao DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
    v_encargos DECIMAL;
    v_horas_mes DECIMAL;
    v_markup DECIMAL;
BEGIN
    SELECT valor::DECIMAL INTO v_encargos FROM config_sistema WHERE chave = 'ENCARGOS_TRABALHISTAS';
    SELECT valor::DECIMAL INTO v_horas_mes FROM config_sistema WHERE chave = 'HORAS_UTEIS_MES';
    SELECT valor::DECIMAL INTO v_markup FROM config_sistema WHERE chave = 'MARKUP_CUSTO';
    
    RETURN ROUND(((p_salario * v_encargos + p_vale + p_cartao) / v_horas_mes) * v_markup, 2);
END;
$$ LANGUAGE plpgsql;

-- Function: Calcular cálculos de produção
CREATE OR REPLACE FUNCTION calcular_producao()
RETURNS TRIGGER AS $$
DECLARE
    v_peso_peca DECIMAL;
    v_peso_galho DECIMAL;
    v_qtd_pecas_placa INTEGER;
    v_custo_hora DECIMAL;
    v_margem_aluminio DECIMAL;
    v_oleo_por_kg DECIMAL;
    v_custo_oleo_litro DECIMAL;
    v_rendimento_lingote DECIMAL;
    v_custo_aluminio DECIMAL;
    v_pecas_uteis INTEGER;
BEGIN
    -- Buscar dados do produto
    SELECT peso_peca, peso_galho, qtd_pecas_placa 
    INTO v_peso_peca, v_peso_galho, v_qtd_pecas_placa
    FROM produtos WHERE id = NEW.produto_id;
    
    -- Buscar parâmetros
    SELECT valor::DECIMAL INTO v_margem_aluminio FROM config_sistema WHERE chave = 'MARGEM_ALUMINIO';
    SELECT valor::DECIMAL INTO v_oleo_por_kg FROM config_sistema WHERE chave = 'OLEO_POR_KG';
    SELECT valor::DECIMAL INTO v_custo_oleo_litro FROM config_sistema WHERE chave = 'CUSTO_OLEO_LITRO';
    SELECT valor::DECIMAL INTO v_rendimento_lingote FROM config_sistema WHERE chave = 'RENDIMENTO_LINGOTE';
    
    -- Buscar custo hora do moldador
    SELECT custo_hora INTO v_custo_hora FROM funcionarios WHERE id = NEW.moldador_id;
    
    -- CÁLCULOS
    -- Alumínio útil = peso_peça × qtd_peça_placa × caixas
    NEW.aluminio_util := ROUND((v_peso_peca / 1000.0) * v_qtd_pecas_placa * NEW.qtde_caixas, 2);
    
    -- Alumínio bruto = peso_galho × caixas × MARGEM
    NEW.aluminio_bruto := ROUND((v_peso_galho / 1000.0) * NEW.qtde_caixas * v_margem_aluminio, 2);
    
    -- Retorno = (peso_galho - peso_util) × caixas
    NEW.retorno_calculado := ROUND(((v_peso_galho - (v_peso_peca * v_qtd_pecas_placa)) / 1000.0) * NEW.qtde_caixas, 2);
    
    -- Consumo óleo = alumínio_bruto / LITROS_POR_KG
    NEW.consumo_oleo := ROUND(NEW.aluminio_bruto / v_oleo_por_kg, 2);
    
    -- Custo M.O. = custo_hora × tempo_horas
    NEW.custo_mo := ROUND(v_custo_hora * NEW.tempo_horas, 2);
    
    -- Custo alumínio (usar custo médio do estoque)
    SELECT custo_medio INTO v_custo_aluminio FROM estoque_aluminio WHERE tipo = 'Lingote';
    NEW.custo_aluminio := ROUND(NEW.aluminio_bruto * v_custo_aluminio, 2);
    
    -- Custo óleo
    NEW.custo_oleo := ROUND(NEW.consumo_oleo * v_custo_oleo_litro, 2);
    
    -- Custo total (M.O. + Alumínio + Óleo)
    NEW.custo_total := ROUND(NEW.custo_mo + NEW.custo_aluminio + NEW.custo_oleo, 2);
    
    -- Peças úteis = (caixas × qtd_pecas_placa) - perdas
    v_pecas_uteis := (NEW.qtde_caixas * v_qtd_pecas_placa) - NEW.perdas_peca;
    
    -- Custo/peça
    IF v_pecas_uteis > 0 THEN
        NEW.custo_por_peca := ROUND(NEW.custo_total / v_pecas_uteis, 2);
    END IF;
    
    -- Taxa perda % = (perdas / (caixas × qtd_pecas_placa)) × 100
    IF (NEW.qtde_caixas * v_qtd_pecas_placa) > 0 THEN
        NEW.taxa_perda := ROUND((NEW.perdas_peca::DECIMAL / (NEW.qtde_caixas * v_qtd_pecas_placa)) * 100, 2);
    END IF;
    
    -- Eficiência % = (peças_úteis / (caixas × qtd_pecas_placa)) × 100
    NEW.eficiencia := ROUND(((NEW.qtde_caixas * v_qtd_pecas_placa - NEW.perdas_peca)::DECIMAL / (NEW.qtde_caixas * v_qtd_pecas_placa)) * 100, 2);
    
    -- Caixas/hora
    IF NEW.tempo_horas > 0 THEN
        NEW.caixas_por_hora := ROUND(NEW.qtde_caixas / NEW.tempo_horas, 2);
    END IF;
    
    NEW.atualizado_em := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular produção antes de INSERT/UPDATE
CREATE TRIGGER trigger_calcular_producao
BEFORE INSERT OR UPDATE ON producao
FOR EACH ROW
EXECUTE FUNCTION calcular_producao();

-- Function: Atualizar custo_hora do funcionário
CREATE OR REPLACE FUNCTION atualizar_custo_hora()
RETURNS TRIGGER AS $$
BEGIN
    NEW.custo_hora := calcular_custo_hora(NEW.salario, NEW.vale, NEW.cartao_custo);
    NEW.atualizado_em := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar custo_hora
CREATE TRIGGER trigger_atualizar_custo_hora
BEFORE INSERT OR UPDATE ON funcionarios
FOR EACH ROW
EXECUTE FUNCTION atualizar_custo_hora();

-- ============================================================================
-- DADOS INICIAIS
-- ============================================================================

-- Funcionários
INSERT INTO funcionarios (nome, funcao, salario, vale, cartao_custo) VALUES
('João Silva', 'Moldador', 3500.00, 200.00, 50.00),
('Carlos Santos', 'Moldador', 3200.00, 200.00, 50.00),
('Pedro Oliveira', 'Moldador', 2800.00, 200.00, 50.00),
('Ronaldo Ferreira', 'Ajudante', 2100.00, 150.00, 30.00),
('Lucas Martins', 'Ajudante', 2000.00, 150.00, 30.00),
('Bruno Costa', 'Ajudante', 1900.00, 150.00, 30.00),
('Roberto Silva', 'Fusionista', 3800.00, 200.00, 50.00),
('Fabio Gomes', 'Rebarbador', 2400.00, 150.00, 30.00)
ON CONFLICT DO NOTHING;

-- Clientes
INSERT INTO clientes (nome, cnpj, email, telefone, contato_nome, margem_padrao) VALUES
('XYZ Industria LTDA', '12345678901234', 'contato@xyz.com', '16-3333-4444', 'João Pereira', 22),
('ABC Motors Ltda', '98765432101234', 'vendas@abcmotors.com', '11-4444-5555', 'Maria Silva', 18),
('Tech Parts Ind', '11223344556677', 'compras@techparts.com', '19-5555-6666', 'Carlos Mendes', 15)
ON CONFLICT DO NOTHING;

-- Produtos
INSERT INTO produtos (codigo, nome, cliente_id, peso_peca, peso_galho, qtd_pecas_placa, preco_venda) 
SELECT 'PCA-001', 'Peça Alumínio', id, 105, 450, 4, 15.50 FROM clientes WHERE nome = 'XYZ Industria LTDA'
UNION ALL
SELECT 'ALM-045', 'Alumínio Especial', id, 220, 920, 3, 28.00 FROM clientes WHERE nome = 'ABC Motors Ltda'
UNION ALL
SELECT 'FLA-012', 'Flange Alumínio', id, 180, 750, 5, 22.50 FROM clientes WHERE nome = 'Tech Parts Ind'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Resumo diário de produção
CREATE OR REPLACE VIEW v_producao_diaria AS
SELECT 
    DATE(p.data) as dia,
    COUNT(p.id) as total_apontamentos,
    SUM(p.qtde_caixas) as total_caixas,
    SUM(p.aluminio_bruto) as total_aluminio_bruto,
    ROUND(AVG(p.taxa_perda), 2) as taxa_perda_media,
    ROUND(AVG(p.eficiencia), 2) as eficiencia_media,
    SUM(p.custo_total) as custo_total_dia,
    ROUND(AVG(p.custo_por_peca), 2) as custo_medio_peca,
    SUM(p.consumo_oleo) as oleo_consumido
FROM producao p
GROUP BY DATE(p.data)
ORDER BY dia DESC;

-- View: Performance de moldadores
CREATE OR REPLACE VIEW v_performance_moldadores AS
SELECT 
    f.id,
    f.nome,
    COUNT(p.id) as total_apontamentos,
    SUM(p.qtde_caixas) as total_caixas,
    ROUND(AVG(p.taxa_perda), 2) as taxa_perda_media,
    ROUND(AVG(p.eficiencia), 2) as eficiencia_media,
    ROUND(AVG(p.caixas_por_hora), 2) as caixas_por_hora_media,
    ROUND(AVG(p.custo_por_peca), 2) as custo_peca_media,
    MAX(p.atualizado_em) as ultimo_apontamento
FROM funcionarios f
LEFT JOIN producao p ON f.id = p.moldador_id AND p.data >= CURRENT_DATE - INTERVAL '30 days'
WHERE f.funcao = 'Moldador'
GROUP BY f.id, f.nome
ORDER BY eficiencia_media DESC;

-- ============================================================================
-- ÍNDICES (para performance)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_producao_data ON producao(data);
CREATE INDEX IF NOT EXISTS idx_producao_moldador ON producao(moldador_id);
CREATE INDEX IF NOT EXISTS idx_producao_produto ON producao(produto_id);
CREATE INDEX IF NOT EXISTS idx_compras_data ON compras_aluminio(data_compra);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes_estoque(data);

-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================
-- Executar este arquivo completo no Supabase SQL Editor
-- Depois de executar, o sistema estará pronto para receber dados
-- ============================================================================
