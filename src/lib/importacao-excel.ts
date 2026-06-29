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
  numero_op?: string;
  moldador_nome: string;
  ajudante_nome?: string;
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
  cartao_beneficio: number;
  custo_hora?: number;
}

export interface ProdutoImportado {
  codigo?: string;  // não vem do Excel — gerado pelo banco
  nome: string;
  descricao?: string;
  qtd_peca_placa?: number;
  peso_peca?: number;
  peso_total_galho?: number;
  percentual_retorno?: number;
  qtd_machos_por_caixa?: number;
  peso_macho?: number;
  tipo_material?: string;
  preco_venda_kg?: number;
  custo_adicional?: number;
  cliente_nome?: string;   // coluna "Cliente" do Excel — usado para resolver cliente_id
}

export interface ClienteImportado {
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  uf?: string;
}

export interface CompraImportada {
  data: string;
  material: 'Lingote' | 'Sucata' | 'Óleo';
  quantidade: number;
  preco_unitario: number;
  valor_total?: number;
}

export interface ImportacaoTodosResult {
  funcionarios: ImportacaoResult<FuncionarioImportado>;
  produtos: ImportacaoResult<ProdutoImportado>;
  clientes: ImportacaoResult<ClienteImportado>;
  apontamentos: ImportacaoResult<ApontamentoImportado>;
  compras: ImportacaoResult<CompraImportada>;
}

// Dynamic import do XLSX para funcionar no browser
async function getXLSX() {
  const mod = await import('xlsx');
  return mod.default ?? mod;
}

async function lerExcel(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await getXLSX();
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

async function lerAbaRaw(file: File, abaNome: string): Promise<unknown[][]> {
  const XLSX = await getXLSX();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array' });
        const wsName = workbook.SheetNames.find(
          (n: string) => n.toLowerCase().trim() === abaNome.toLowerCase().trim()
        );
        if (!wsName) { resolve([]); return; }
        const ws = workbook.Sheets[wsName];
        resolve(XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]);
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

async function lerAba(file: File, abaNome: string): Promise<Record<string, unknown>[]> {
  const XLSX = await getXLSX();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target?.result, { type: 'array' });
        const wsName = workbook.SheetNames.find(
          (n: string) => n.toLowerCase().trim() === abaNome.toLowerCase().trim()
        );
        if (!wsName) {
          resolve([]);
          return;
        }
        const ws = workbook.Sheets[wsName];
        resolve(XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[]);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

export async function listarAbas(file: File): Promise<string[]> {
  const XLSX = await getXLSX();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        resolve(wb.SheetNames as string[]);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

// Normaliza keys: remove espaços em branco dos nomes de colunas do Excel
function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[k.trim()] = v;
  return out;
}

function str(val: unknown): string {
  return val != null ? String(val).trim() : '';
}

function num(val: unknown): number {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let s = String(val).trim().replace(/R\$\s*/g, '').replace(/\s/g, '');
  // formato brasileiro: 1.234,56 → tem ponto de milhar e vírgula decimal
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function toDateStr(val: unknown): string {
  if (!val) throw new Error('Data ausente');
  // Excel serial date number
  if (typeof val === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + val * 86400000);
    return d.toISOString().split('T')[0];
  }
  const s = String(val).trim();
  // DD/MM/YYYY
  const ptBr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ptBr) return `${ptBr[3]}-${ptBr[2].padStart(2, '0')}-${ptBr[1].padStart(2, '0')}`;
  // YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
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
      const produto_codigo = str(row['Produto'] ?? row['Código Produto'] ?? row['Codigo']);
      if (!moldador_nome) throw new Error('Coluna "Moldador" ausente');
      if (!produto_codigo) throw new Error('Coluna "Produto" ausente');

      const qtde_caixas = Math.round(num(row['Caixas'] ?? row['Qtde Caixas'] ?? row['Qtde']));
      const aluminio_bruto = num(row['Alumínio Bruto'] ?? row['Aluminio Bruto'] ?? row['Aluminio']);
      if (qtde_caixas <= 0) throw new Error('Caixas deve ser maior que 0');
      if (aluminio_bruto <= 0) throw new Error('Alumínio Bruto deve ser maior que 0');

      result.dados.push({
        data: toDateStr(row['Data']),
        moldador_nome,
        produto_codigo,
        qtde_caixas,
        aluminio_bruto,
        peso_retorno: num(row['Peso Retorno'] ?? row['Retorno']),
        perdas_peca: Math.round(num(row['Perdas'] ?? row['Perda Pçs'] ?? row['Perda Pcs'])),
        consumo_oleo: num(row['Óleo'] ?? row['Oleo'] ?? row['Qtde Oleo']),
        tempo_horas: num(row['Horas'] ?? row['Tempo'] ?? row['Tempo Horas']),
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

  if (rows.length > 0) {
    result.erros.push({ linha: 0, erro: `[DEBUG] colunas: ${Object.keys(rows[0]).join(' | ')}` });
  }

  rows.forEach((row, i) => {
    const linha = i + 2;
    try {
      const nome = str(row['Nome']);
      const funcao = str(row['Função'] ?? row['Funcao'] ?? row['Cargo'] ?? row['CARGO']);
      if (!nome) throw new Error('Coluna "Nome" ausente');
      if (!funcao) throw new Error('Coluna "Função" ausente');

      result.dados.push({
        nome,
        funcao,
        salario: num(
          row['Salário'] ?? row['Salario'] ?? row['Salário Base'] ?? row['Salario Base'] ??
          row['Vl Salario'] ?? row['Vl Salário'] ?? row['Sal Base'] ?? row['SAL']
        ),
        cartao_beneficio: num(
          row['Cartão'] ?? row['Cartao'] ?? row['Cartão Beneficio'] ?? row['Cartao Beneficio'] ??
          row['Cartão Custo'] ?? row['Cartao Custo'] ?? row['Vale'] ?? row['VA'] ??
          row['Beneficio'] ?? row['Benefício']
        ),
        custo_hora: num(row['Custo/h'] ?? row['Custo/Hora'] ?? row['Custo Hora']) || undefined,
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
      const nome = str(row['Cód Placa - Descrição'] ?? row['Nome'] ?? row['Descrição']);
      if (!nome) throw new Error('Nome/Descrição ausente');

      const tipo_raw = str(row['Tipo de Material'] ?? row['Tipo'] ?? '').toLowerCase();
      const tipo_material: 'lingote'|'sucata'|'mistura'|undefined =
        tipo_raw.includes('lingote') ? 'lingote' :
        tipo_raw.includes('sucata')  ? 'sucata'  :
        tipo_raw.includes('mistura') ? 'mistura' : undefined;

      result.dados.push({
        nome,
        qtd_peca_placa:     Math.round(num(row['Qdt Peça Placa'] ?? row['Qtde Pecas'])) || undefined,
        peso_peca:          num(row['Peso Pç'] ?? row['Peso Peca'])  || undefined,
        peso_total_galho:   num(row['Peso Total Galho'] ?? row['Peso Galho']) || undefined,
        percentual_retorno: num(row['Retorno']) || undefined,
        qtd_machos_por_caixa: Math.round(num(row['Qde macho / CX'] ?? row['Qtde Machos'])) || undefined,
        peso_macho:         num(row['Peso Macho'])    || undefined,
        tipo_material,
        preco_venda_kg:     num(row['Prço/Kg'] ?? row['Preço/Kg']) || undefined,
        custo_adicional:    num(row['Usinagem Pintura Outros'] ?? row['Custo Adicional']) || undefined,
        cliente_nome:       str(row['Cliente']) || undefined,
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
      const razao_social = str(row['Nome'] ?? row['Razão Social'] ?? row['Razao Social'] ?? row['Cliente']);
      if (!razao_social) throw new Error('Nome/Razão Social ausente');

      result.dados.push({
        razao_social,
        nome_fantasia: str(row['Nome Fantasia']) || undefined,
        cnpj: str(row['CNPJ']) || undefined,
        email: str(row['Email']) || undefined,
        telefone: str(row['Telefone']) || undefined,
        cidade: str(row['Cidade']) || undefined,
        uf: str(row['Estado'] ?? row['UF']) || undefined,
      });
      result.sucesso++;
    } catch (err) {
      result.erros.push({ linha, erro: err instanceof Error ? err.message : 'Erro desconhecido' });
    }
  });

  return result;
}

// Importa a planilha inteira (todas as abas conhecidas)
export async function importarPlanilhaCompleta(
  file: File
): Promise<ImportacaoTodosResult> {
  const [profRows, prodRows, apontRows] = await Promise.all([
    lerAba(file, 'Profissionais'),
    lerAba(file, 'Produtos'),
    lerAba(file, 'Produção'),
  ]);

  const funcionarios: ImportacaoResult<FuncionarioImportado> = { sucesso: 0, erros: [], dados: [] };
  const produtos: ImportacaoResult<ProdutoImportado> = { sucesso: 0, erros: [], dados: [] };
  const clientes: ImportacaoResult<ClienteImportado> = { sucesso: 0, erros: [], dados: [] };
  const apontamentos: ImportacaoResult<ApontamentoImportado> = { sucesso: 0, erros: [], dados: [] };

  // Profissionais
  profRows.forEach((row, i) => {
    row = normalizeRow(row);
    const linha = i + 2;
    try {
      const nome = str(row['Nome']);
      if (!nome) throw new Error('Nome ausente');
      const salario = num(
        row['Salário'] ?? row['Salario'] ?? row['Salário Base'] ?? row['Salario Base'] ??
        row['Vl Salario'] ?? row['Vl Salário'] ?? row['Sal Base'] ?? row['SAL']
      );
      const cartao = num(
        row['Cartão'] ?? row['Cartao'] ?? row['Cartão Beneficio'] ?? row['Cartao Beneficio'] ??
        row['Cartão de Beneficio'] ?? row['Vale'] ?? row['VA'] ?? row['VR'] ??
        row['Beneficio'] ?? row['Benefício']
      );
      funcionarios.dados.push({
        nome,
        funcao: str(row['Função'] ?? row['Funcao'] ?? row['Cargo'] ?? row['CARGO']) || 'Ajudante',
        salario,
        cartao_beneficio: cartao,
        custo_hora: num(row['Custo/h'] ?? row['Custo/Hora'] ?? row['Custo Hora']) || undefined,
      });
      funcionarios.sucesso++;
    } catch (err) {
      funcionarios.erros.push({ linha, erro: err instanceof Error ? err.message : 'Erro' });
    }
  });

  // Clientes únicos extraídos da coluna "Cliente" dos produtos
  const clientesVistos = new Set<string>();
  prodRows.forEach((rawRow) => {
    const row = normalizeRow(rawRow);
    const nome = str(row['Cliente']);
    if (nome && !clientesVistos.has(nome)) {
      clientesVistos.add(nome);
      clientes.dados.push({ razao_social: nome });
      clientes.sucesso++;
    }
  });

  // Produtos — usa o campo completo como nome; código é gerado pelo banco
  prodRows.forEach((row, i) => {
    row = normalizeRow(row);
    const linha = i + 2;
    try {
      const nome = str(row['Cód Placa - Descrição'] ?? row['Descrição'] ?? row['Nome']);
      if (!nome) throw new Error('Coluna "Cód Placa - Descrição" ausente ou vazia');

      const tipo_raw = str(row['Tipo de Material'] ?? '').toLowerCase();
      const tipo_material: 'lingote'|'sucata'|'mistura' =
        tipo_raw.includes('lingote') ? 'lingote' :
        tipo_raw.includes('sucata')  ? 'sucata'  : 'mistura';

      produtos.dados.push({
        nome,
        qtd_peca_placa:     Math.round(num(row['Qdt Peça Placa'])) || undefined,
        peso_peca:          num(row['Peso Pç'])           || undefined,
        peso_total_galho:   num(row['Peso Total Galho'])  || undefined,
        percentual_retorno: num(row['Retorno'])            || undefined,
        qtd_machos_por_caixa: Math.round(num(row['Qde macho / CX'])) || undefined,
        peso_macho:         num(row['Peso Macho'])         || undefined,
        tipo_material,
        preco_venda_kg:     num(row['Prço/Kg'] ?? row['Preço/Kg']) || undefined,
        custo_adicional:    num(row['Usinagem Pintura Outros']) || undefined,
        cliente_nome:       str(row['Cliente']) || undefined,
      });
      produtos.sucesso++;
    } catch (err) {
      produtos.erros.push({ linha, erro: err instanceof Error ? err.message : 'Erro' });
    }
  });

  // Apontamentos (da aba Produção)
  apontRows.forEach((row, i) => {
    row = normalizeRow(row);
    const linha = i + 2;
    try {
      const moldador_nome = str(row['Moldador']);
      const produto_nome = str(row['Produto']);
      if (!moldador_nome || !produto_nome) throw new Error('Moldador/Produto ausente');
      const qtde_caixas = Math.round(num(row['Qtde Cx Produzida'] ?? row['Qtde']));
      const aluminio_bruto = num(row['Aluminio Bruto'] ?? row['Alumínio Bruto']);
      if (qtde_caixas <= 0) throw new Error('Qtde Caixas deve ser maior que 0');
      // Tempo vem como fração de dia no Excel (ex: 0.1229 = 2h57min → multiplica por 24)
      const tempoRaw = num(row['Tempo']);
      const tempo_horas = tempoRaw > 0 && tempoRaw < 1 ? tempoRaw * 24 : tempoRaw;
      apontamentos.dados.push({
        data: toDateStr(row['Data']),
        numero_op: str(row['O.P.'] ?? row['OP'] ?? row['Op']) || undefined,
        moldador_nome,
        ajudante_nome: str(row['Ajudante']) || undefined,
        produto_codigo: produto_nome,
        qtde_caixas,
        aluminio_bruto: aluminio_bruto || 0,
        peso_retorno: num(row['Retorno Aluminio'] ?? row['Retorno']),
        perdas_peca: Math.round(num(row['Perda Pçs'] ?? row['Perda Pcs'] ?? row['Perdas'])),
        consumo_oleo: num(row['Qtde Oleo'] ?? row['Oleo'] ?? row['Consumo Oleo']),
        tempo_horas,
      });
      apontamentos.sucesso++;
    } catch (err) {
      apontamentos.erros.push({ linha, erro: err instanceof Error ? err.message : 'Erro' });
    }
  });

  // Compras (aba Dados — tabelas laterais por coluna)
  const compras: ImportacaoResult<CompraImportada> = { sucesso: 0, erros: [], dados: [] };
  try {
    const dadosRaw = await lerAbaRaw(file, 'Dados');
    // Estrutura: linha 12+ (índice 11+)
    // Cols A-D (0-3): Lingote | Cols F-I (5-8): Sucata | Cols K-N (10-13): Oleo
    const parseCompraRow = (row: unknown[], colData: number, colQtde: number, colCusto: number, material: CompraImportada['material']) => {
      const rawData = row[colData];
      const qtde = Number(row[colQtde]);
      const custo = Number(row[colCusto]);
      if (!rawData || isNaN(qtde) || qtde <= 0 || isNaN(custo) || custo <= 0) return null;
      // Excel armazena datas como número serial
      let dataStr = '';
      if (typeof rawData === 'number') {
        // Excel date serial: days since 1900-01-01 (with leap year bug: serial 1 = 1900-01-01)
        const d = new Date(Math.round((rawData - 25569) * 86400 * 1000));
        dataStr = d.toISOString().split('T')[0];
      } else {
        dataStr = String(rawData).split('T')[0].substring(0, 10);
      }
      if (!dataStr || dataStr === 'NaN-NaN-NaN') return null;
      return { data: dataStr, material, quantidade: qtde, preco_unitario: custo };
    };
    for (let i = 11; i < dadosRaw.length; i++) {
      const row = dadosRaw[i];
      if (!row || row.length === 0) continue;
      const lingote = parseCompraRow(row, 0, 1, 2, 'Lingote');
      if (lingote) { compras.dados.push(lingote); compras.sucesso++; }
      const sucata = parseCompraRow(row, 5, 6, 7, 'Sucata');
      if (sucata) { compras.dados.push(sucata); compras.sucesso++; }
      const oleo = parseCompraRow(row, 10, 11, 12, 'Óleo');
      if (oleo) { compras.dados.push(oleo); compras.sucesso++; }
    }
  } catch {
    compras.erros.push({ linha: 0, erro: 'Aba Dados nao encontrada ou formato invalido' });
  }

  return { funcionarios, produtos, clientes, apontamentos, compras };
}
