export interface Funcionario {
  id: string;
  nome: string;
  funcao: 'Moldador' | 'Ajudante' | 'Fusionista' | 'Rebarbador' | 'Usinagem' | 'Pintor' | 'Despacho' | 'Gerente';
  ativo: boolean;
  salario?: number;
  vale?: number;
  cartao_custo?: number;
  custo_hora?: number;
  email?: string;
  telefone?: string;
  criado_em?: string;
  atualizado_em?: string;
}

export interface Produto {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  criado_em?: string;
  atualizado_em?: string;
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
  chave: string;
  valor: string;
  tipo: 'decimal' | 'integer' | 'string';
  descricao?: string;
}
