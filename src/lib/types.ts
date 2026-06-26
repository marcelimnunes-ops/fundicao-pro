export interface Funcionario {
  id: string;
  codigo?: string;
  nome: string;
  funcao: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  data_admissao?: string;
  salario: number;
  cartao_beneficio?: number;
  custo_hora?: number;
  pin_tablet?: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Cliente {
  id: string;
  codigo?: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  inscricao_estadual?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  telefone?: string;
  celular?: string;
  email?: string;
  contato_nome?: string;
  prazo_pagamento_dias?: number;
  limite_credito?: number;
  observacoes?: string;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Produto {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  // Características físicas
  qtd_peca_placa?: number;
  peso_peca?: number;
  peso_total_galho?: number;
  percentual_retorno?: number;
  // Machos
  qtd_machos_por_caixa?: number;
  peso_macho?: number;
  // Material e custo
  tipo_material?: 'lingote' | 'sucata' | 'mistura';
  preco_venda_kg?: number;
  custo_adicional?: number;
  // Relacionamentos
  cliente_id?: string;
  cliente?: Cliente;
  // Estoque
  estoque_atual?: number;
  estoque_minimo?: number;
  // Controles
  controle_lote?: boolean;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Producao {
  id: string;
  data: string;
  moldador_id: string;
  produto_id: string;
  qtde_caixas: number;
  aluminio_bruto: number;
  peso_retorno: number;
  perdas_peca: number;
  consumo_oleo: number;
  tempo_horas: number;
  produto?: Produto;
  moldador?: Funcionario;
}

export interface EstoqueAluminio {
  id: string;
  tipo: 'Lingote' | 'Sucata' | 'Óleo';
  saldo: number;
  custo_medio: number;
  atualizado_em: string;
}

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

export interface ConfigSistema {
  id: string;
  chave?: string;
  valor?: string;
  tipo?: string;
  descricao?: string;
  capacidade_forno_kg?: number;
  oleo_por_fornada_litros?: number;
  percentual_perda_fusao?: number;
  dias_uteis_mes?: number;
  horas_dia_padrao?: number;
  empresa_nome?: string;
  tema_padrao?: string;
}
