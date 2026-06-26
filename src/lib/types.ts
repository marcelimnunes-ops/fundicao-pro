/**
 * Tipos TypeScript para o Sistema de Gestão de Fundição
 */

// Auth
export interface Usuario {
  id: string;
  email: string;
  nome: string;
  avatar_url?: string;
}

// Configuração
export interface ConfigSistema {
  id: string;
  chave: string;
  valor: string;
  tipo: 'decimal' | 'integer' | 'string';
  descricao?: string;
}

// Funcionários
export interface Funcionario {
  id: string;
  nome: string;
  funcao: 'Moldador' | 'Ajudante' | 'Fusionista' | 'Rebarbador' | 'Usinagem' | 'Pintor' | 'Despacho' | 'Gerente';
  salario: number;
  vale: number;
  cartao_custo: number;
  custo_hora: number;
  email?: string;
  telefone?: string;
  criado_em: string;
  atualizado_em: string;
}

// Clientes
export interface Cliente {
  id: string;
  nome: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  contato_nome?: string;
  contato_telefone?: string;
  margem_padrao: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

// Produtos
export interface Produto {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  cliente_id?: string;
  material: string;
  peso_peca: number; // em gramas
  peso_galho: number; // em gramas
  qtd_pecas_placa: number;
  rendimento_esperado: number;
  preco_venda?: number;
  custo_minimo?: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  cliente?: Cliente;
}

// Estoque
export interface EstoqueAluminio {
  id: string;
  tipo: 'Lingote' | 'Sucata' | 'Óleo';
  saldo: number;
  custo_medio: number;
  atualizado_em: string;
}

// Compras
export interface CompraAluminio {
  id: string;
  data_compra: string;
  tipo: 'Lingote' | 'Sucata';
  quantidade: number;
  custo_unitario: number;
  custo_total: number;
  fornecedor?: string;
  nota_fiscal?: string;
  criado_em: string;
}

// Produção
export interface Producao {
  id: string;
  data: string;
  produto_id: string;
  moldador_id: string;
  ajudante_id: string;
  qtde_caixas: number;
  tempo_horas: number;
  perdas_peca: number;
  peso_retorno: number;

  // Cálculos derivados
  aluminio_util: number;
  aluminio_bruto: number;
  retorno_calculado: number;
  consumo_oleo: number;
  custo_mo: number;
  custo_aluminio: number;
  custo_oleo: number;
  custo_total: number;
  custo_por_peca: number;
  taxa_perda: number;
  eficiencia: number;
  caixas_por_hora: number;

  sincronizado: boolean;
  criado_em: string;
  atualizado_em: string;

  // Relações
  produto?: Produto;
  moldador?: Funcionario;
  ajudante?: Funcionario;
}

// Apontamento Fusão
export interface ApontamentoFusao {
  id: string;
  data: string;
  fusionista_id?: string;
  lingote_kg: number;
  sucata_kg: number;
  peso_total: number;
  rendimento_lingote: number;
  rendimento_sucata: number;
  peso_fundido: number;
  escoria_kg: number;
  oleo_consumido: number;
  tempo_horas: number;
  observacoes?: string;
  criado_em: string;
}

// Apontamento Rebarbação
export interface ApontamentoRebarbacao {
  id: string;
  data: string;
  rebarbador_id?: string;
  peca_id: string;
  quantidade_processada: number;
  quantidade_rejeito: number;
  tempo_horas: number;
  taxa_rejeito: number;
  observacoes?: string;
  criado_em: string;
}

// Movimentação de Estoque
export interface MovimentacaoEstoque {
  id: string;
  data: string;
  tipo_movimento: 'Entrada' | 'Saída';
  material: string;
  quantidade: number;
  custo_unitario?: number;
  referencia?: string;
  observacoes?: string;
  criado_em: string;
}

// Tabela de Preço
export interface TabelaPreco {
  id: string;
  cliente_id: string;
  produto_id: string;
  preco_venda: number;
  margem: number;
  ativo: boolean;
  vigencia_inicio: string;
  vigencia_fim?: string;
  criado_em: string;
  atualizado_em: string;
}

// ============================================================================
// TIPOS PARA VIEWS E DASHBOARDS
// ============================================================================

export interface ProducaoDiaria {
  dia: string;
  total_apontamentos: number;
  total_caixas: number;
  total_aluminio_bruto: number;
  taxa_perda_media: number;
  eficiencia_media: number;
  custo_total_dia: number;
  custo_medio_peca: number;
  oleo_consumido: number;
}

export interface PerformanceMoldador {
  id: string;
  nome: string;
  total_apontamentos: number;
  total_caixas: number;
  taxa_perda_media: number;
  eficiencia_media: number;
  caixas_por_hora_media: number;
  custo_peca_media: number;
  ultimo_apontamento: string;
}

// Resposta genérica de API
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: 'success' | 'error';
}
