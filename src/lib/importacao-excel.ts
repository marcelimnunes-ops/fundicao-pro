import * as XLSX from 'xlsx';

export interface ImportacaoErro {
  linha: number;
  erro: string;
}

export interface ImportacaoResult<T> {
  sucesso: number;
  erros: ImportacaoErro[];
  dados: T[];
}

export interface ApontamentoImportado {
  data: string;
  moldador_nome: string;
  produto_codigo: string;
  qtde_caixas: number;
  aluminio_bruto: number;
  peso_retorno: number;
  perdas_peca: number;
  consumo_oleo: number;
  tempo_horas: number;
}

export interface FuncionarioImportado {
  nome: string;
  funcao: string;
  salario: number;
  vale: number;
  cartao_custo: number;
  custo_hora: number;
}

export interface ProdutoImportado {
  codigo: string;
  nome: string;
  descricao: string;
}

export interface ClienteImportado {
  nome: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
}

async function lerExcel(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

function str(val: unknown): string {
  return val != null ? String(val).trim() : '';
}

function num(val: unknown): number {
  const n = parseFloat(String(val ?? 0));
  return isNaN(n) ? 0 : n;
}

function toDateStr(val: unknown): string {
  if (!val) throw new Error('Data ausente');
  const d = new Date(String(val));
  if (isNaN(d.getTime())) throw new Error(`Data inválida: ${val}`);
  return d.toISOString().split('T')[0];
}

export async function importarApontamentos(
  file: File
): Promise<ImportacaoResult<ApontamentoImportado>> {
  const rows = await lerExcel(file);
  const result: ImportacaoResult<ApontamentoImportado> = { sucesso: 0, erros: [], dados: [] };

  rows.forEach((row, i) => {
    const linha = i + 2;
    try {
      const moldador_nome = str(row['Moldador']);
      const produto_codigo = str(row['Produto']);
      if (!moldador_nome) throw new Error('Coluna "Moldador" ausente');
      if (!produto_codigo) throw new Error('Coluna "Produto" ausente');

      const qtde_caixas = Math.round(num(row['Caixas']));
      const aluminio_bruto = num(row['Alumínio Bruto'] ?? row['Aluminio Bruto']);
      if (qtde_caixas <= 0) throw new Error('Caixas deve ser maior que 0');
      if (aluminio_bruto <= 0) throw new Error('Alumínio Bruto deve ser maior que 0');

      result.dados.push({
        data: toDateStr(row['Data']),
        moldador_nome,
        produto_codigo,
        qtde_caixas,
        aluminio_bruto,
        peso_retorno: num(row['Peso Retorno']),
        perdas_peca: Math.round(num(row['Perdas'])),
        consumo_oleo: num(row['Óleo'] ?? row['Oleo']),
        tempo_horas: num(row['Horas']),
      });
      result.sucesso++;
    } catch (err) {
      result.erros.push({ linha, erro: err instanceof Error ? err.message : 'Erro desconhecido' });
    }
  });

  return result;
}

export async function importarFuncionarios(
  file: File
): Promise<ImportacaoResult<FuncionarioImportado>> {
  const rows = await lerExcel(file);
  const result: ImportacaoResult<FuncionarioImportado> = { sucesso: 0, erros: [], dados: [] };
  const funcoesValidas = ['Moldador', 'Ajudante', 'Operador', 'Supervisor'];

  rows.forEach((row, i) => {
    const linha = i + 2;
    try {
      const nome = str(row['Nome']);
      const funcao = str(row['Função'] ?? row['Funcao']);
      if (!nome) throw new Error('Coluna "Nome" ausente');
      if (!funcoesValidas.includes(funcao))
        throw new Error(`Função inválida. Válidas: ${funcoesValidas.join(', ')}`);

      result.dados.push({
        nome,
        funcao,
        salario: num(row['Salário'] ?? row['Salario']),
        vale: num(row['Vale']),
        cartao_custo: num(row['Cartão Custo'] ?? row['Cartao Custo']),
        custo_hora: num(row['Custo/Hora']),
      });
      result.sucesso++;
    } catch (err) {
      result.erros.push({ linha, erro: err instanceof Error ? err.message : 'Erro desconhecido' });
    }
  });

  return result;
}

export async function importarProdutos(
  file: File
): Promise<ImportacaoResult<ProdutoImportado>> {
  const rows = await lerExcel(file);
  const result: ImportacaoResult<ProdutoImportado> = { sucesso: 0, erros: [], dados: [] };

  rows.forEach((row, i) => {
    const linha = i + 2;
    try {
      const codigo = str(row['Código'] ?? row['Codigo']);
      const nome = str(row['Nome']);
      if (!codigo) throw new Error('Coluna "Código" ausente');
      if (!nome) throw new Error('Coluna "Nome" ausente');

      result.dados.push({
        codigo,
        nome,
        descricao: str(row['Descrição'] ?? row['Descricao']),
      });
      result.sucesso++;
    } catch (err) {
      result.erros.push({ linha, erro: err instanceof Error ? err.message : 'Erro desconhecido' });
    }
  });

  return result;
}

export async function importarClientes(
  file: File
): Promise<ImportacaoResult<ClienteImportado>> {
  const rows = await lerExcel(file);
  const result: ImportacaoResult<ClienteImportado> = { sucesso: 0, erros: [], dados: [] };

  rows.forEach((row, i) => {
    const linha = i + 2;
    try {
      const nome = str(row['Nome']);
      if (!nome) throw new Error('Coluna "Nome" ausente');

      const cnpj = str(row['CNPJ']);
      const email = str(row['Email']);
      const telefone = str(row['Telefone']);
      const cidade = str(row['Cidade']);
      const estado = str(row['Estado']);

      result.dados.push({
        nome,
        cnpj: cnpj || undefined,
        email: email || undefined,
        telefone: telefone || undefined,
        cidade: cidade || undefined,
        estado: estado || undefined,
      });
      result.sucesso++;
    } catch (err) {
      result.erros.push({ linha, erro: err instanceof Error ? err.message : 'Erro desconhecido' });
    }
  });

  return result;
}
