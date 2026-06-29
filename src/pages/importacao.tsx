import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import Layout from '@/components/Layout';
import { Card, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { importacaoState } from '@/lib/importacaoState';
import {
  importarApontamentos,
  importarFuncionarios,
  importarProdutos,
  importarClientes,
  importarPlanilhaCompleta,
  listarAbas,
  type ApontamentoImportado,
  type FuncionarioImportado,
  type ProdutoImportado,
  type ClienteImportado,
  type ImportacaoResult,
  type ImportacaoTodosResult,
} from '@/lib/importacao-excel';

type TipoImportacao = 'tudo' | 'apontamentos' | 'funcionarios' | 'produtos' | 'clientes';

const TIPOS: { value: TipoImportacao; label: string; descricao: string }[] = [
  { value: 'tudo', label: '📦 Importar Planilha Completa', descricao: 'Lê todas as abas: Profissionais, Produtos, Clientes e Produção de uma vez' },
  { value: 'apontamentos', label: 'Apontamentos de Produção', descricao: 'Data | Moldador | Produto | Caixas | Alumínio Bruto | Peso Retorno | Perdas | Óleo | Horas' },
  { value: 'funcionarios', label: 'Funcionários', descricao: 'Nome | Função | Salário | Cartão | Custo/h' },
  { value: 'produtos', label: 'Produtos', descricao: 'Código | Nome | Qtde Pçs/Placa | Peso Pç | Peso Galho | Machos | Tipo Material' },
  { value: 'clientes', label: 'Clientes', descricao: 'Nome | CNPJ | Email | Telefone | Cidade | Estado' },
];

// ── log ─────────────────────────────────────────────────
type LogLevel = 'info' | 'ok' | 'skip' | 'warn' | 'error' | 'section';
const ICONE: Record<LogLevel, string> = { info: '→', ok: '✓', skip: '↩', warn: '⚠', error: '✗', section: '──' };
const COR: Record<LogLevel, string> = {
  info: 'text-slate-400',
  ok: 'text-green-400 font-semibold',
  skip: 'text-yellow-400',
  warn: 'text-orange-400',
  error: 'text-red-400 font-semibold',
  section: 'text-cyan-400 font-bold',
};


// Hook que lê o estado singleton e re-renderiza quando muda
function useImportacaoState() {
  return useSyncExternalStore(
    importacaoState.subscribe,
    importacaoState.get,
    importacaoState.get,
  );
}

export default function ImportacaoPage() {
  const [tipo, setTipo] = useState<TipoImportacao>('tudo');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [abasDetectadas, setAbasDetectadas] = useState<string[]>([]);
  const [processando, setProcessando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [zerando, setZerando] = useState(false);
  const [resultado, setResultado] = useState<ImportacaoResult<unknown> | null>(null);
  const [resultadoTodos, setResultadoTodos] = useState<ImportacaoTodosResult | null>(null);
  const [erroMsg, setErroMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Estado de progresso — singleton sobrevive à navegação
  const p = useImportacaoState();
  const showProgresso = p.ativo;

  // auto-scroll do log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  });

  // ── leitura do arquivo ───────────────────────────────
  const handleArquivo = async (file: File) => {
    setArquivo(file);
    setResultado(null);
    setResultadoTodos(null);
    // showProgresso vem do singleton
    setErroMsg('');
    try {
      const abas = await listarAbas(file);
      setAbasDetectadas(abas);
      await processarArquivo(file, tipo);
    } catch {
      setErroMsg('Erro ao ler arquivo. Verifique se é um arquivo Excel válido.');
    }
  };

  const processarArquivo = async (file: File, tipoAtual: TipoImportacao) => {
    setProcessando(true);
    setResultado(null);
    setResultadoTodos(null);
    // showProgresso vem do singleton
    setErroMsg('');
    try {
      if (tipoAtual === 'tudo') {
        const res = await importarPlanilhaCompleta(file);
        setResultadoTodos(res);
      } else {
        let res: ImportacaoResult<unknown>;
        if (tipoAtual === 'apontamentos') res = await importarApontamentos(file);
        else if (tipoAtual === 'funcionarios') res = await importarFuncionarios(file);
        else if (tipoAtual === 'produtos') res = await importarProdutos(file);
        else res = await importarClientes(file);
        setResultado(res);
      }
    } catch (err) {
      setErroMsg(`Erro ao processar: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setProcessando(false);
    }
  };

  const handleTipoChange = async (novoTipo: TipoImportacao) => {
    setTipo(novoTipo);
    setResultado(null);
    setResultadoTodos(null);
    // showProgresso vem do singleton
    setErroMsg('');
    if (arquivo) await processarArquivo(arquivo, novoTipo);
  };

  // ── núcleo de importação ─────────────────────────────
  // Todas as inserções passam por aqui com controle de progresso

  // ── atalho para o singleton ─────────────────────────
  const ist = importacaoState;

  // Insere em lotes para performance — reduz N+1 queries
  async function batchInsert(
    tabela: string,
    items: Record<string, unknown>[],
    fase: string,
    labelFn: (r: Record<string, unknown>) => string,
  ) {
    const LOTE = 50;
    for (let i = 0; i < items.length; i += LOTE) {
      if (ist.get().cancelado) { ist.log('warn', '⛔ Importação cancelada pelo usuário'); return false; }
      const lote = items.slice(i, Math.min(i + LOTE, items.length));
      ist.set({ atual: ist.get().atual + lote.length, fase: `${fase} ${Math.min(i + LOTE, items.length)}/${items.length}` });
      const { error } = await supabase.from(tabela).insert(lote);
      if (error) {
        ist.log('error', `ERRO lote ${i / LOTE + 1} (${fase}): ${error.message}`);
        ist.set({ erros: ist.get().erros + lote.length });
      } else {
        lote.forEach((r) => ist.log('ok', `✓ ${labelFn(r)}`));
        ist.set({ inseridos: ist.get().inseridos + lote.length });
      }
    }
    return true;
  }

  async function salvarFuncionarios(rows: FuncionarioImportado[]) {
    ist.log('section', `── Funcionários (${rows.length}) ──`);
    const { data: existing, error: errEx } = await supabase.from('funcionarios').select('nome');
    if (errEx || !existing) {
      ist.log('error', `Falha ao consultar funcionários: ${errEx?.message ?? 'sem dados'}`);
      ist.set({ erros: ist.get().erros + rows.length, atual: ist.get().atual + rows.length });
      return;
    }
    const vistos = new Set(existing.map((r: { nome: string }) => r.nome.trim().toLowerCase()));
    const novos: Array<Record<string, unknown>> = [];
    for (const r of rows) {
      if (vistos.has(r.nome.trim().toLowerCase())) {
        ist.log('skip', `Pulado (já existe): ${r.nome}`);
        ist.set({ pulados: ist.get().pulados + 1, atual: ist.get().atual + 1 });
      } else {
        novos.push({ nome: r.nome, funcao: r.funcao, salario: r.salario, cartao_beneficio: r.cartao_beneficio ?? 0, ativo: true });
      }
    }
    if (novos.length > 0) await batchInsert(
      'funcionarios', novos, 'Funcionários', (r) => String(r.nome)
    );
  }

  async function salvarClientes(rows: ClienteImportado[]) {
    ist.log('section', `── Clientes (${rows.length}) ──`);
    const { data: existing, error: errEx } = await supabase.from('clientes').select('razao_social');
    if (errEx || !existing) {
      ist.log('error', `Falha ao consultar clientes: ${errEx?.message ?? 'sem dados'}`);
      ist.set({ erros: ist.get().erros + rows.length, atual: ist.get().atual + rows.length });
      return;
    }
    const vistos = new Set(existing.map((r: { razao_social: string }) => r.razao_social.trim().toLowerCase()));
    const novos: Array<Record<string, unknown>> = [];
    for (const r of rows) {
      if (vistos.has(r.razao_social.trim().toLowerCase())) {
        ist.log('skip', `Pulado: ${r.razao_social}`);
        ist.set({ pulados: ist.get().pulados + 1, atual: ist.get().atual + 1 });
      } else {
        novos.push({ razao_social: r.razao_social, nome_fantasia: r.nome_fantasia ?? null, cnpj: r.cnpj ?? null, cidade: r.cidade ?? null, uf: r.uf ?? null, ativo: true });
      }
    }
    if (novos.length > 0) await batchInsert('clientes', novos, 'Clientes', (r) => String(r.razao_social));
  }

  async function salvarProdutos(rows: ProdutoImportado[]) {
    ist.log('section', `── Produtos (${rows.length}) ──`);
    const { data: clientesDB } = await supabase.from('clientes').select('id, razao_social, nome_fantasia');
    const clienteMap = new Map<string, string>();
    for (const c of clientesDB ?? []) {
      clienteMap.set(c.razao_social.trim().toLowerCase(), c.id);
      if (c.nome_fantasia) clienteMap.set(c.nome_fantasia.trim().toLowerCase(), c.id);
    }
    const { data: existing, error: errExP } = await supabase.from('produtos').select('nome');
    if (errExP || !existing) {
      ist.log('error', `Falha ao consultar produtos: ${errExP?.message ?? 'sem dados'}`);
      ist.set({ erros: ist.get().erros + rows.length, atual: ist.get().atual + rows.length }); return;
    }
    const vistos = new Set(existing.map((r: { nome: string }) => r.nome.trim().toLowerCase()));
    const novos: Array<Record<string, unknown>> = [];
    for (const r of rows) {
      if (vistos.has(r.nome.trim().toLowerCase())) {
        ist.log('skip', `Pulado: ${r.nome}`);
        ist.set({ pulados: ist.get().pulados + 1, atual: ist.get().atual + 1 }); continue;
      }
      const clienteId = r.cliente_nome ? (clienteMap.get(r.cliente_nome.trim().toLowerCase()) ?? null) : null;
      if (r.cliente_nome && !clienteId) ist.log('warn', `Cliente não encontrado: "${r.cliente_nome}" para ${r.nome}`);
      novos.push({
        nome: r.nome, qtd_peca_placa: r.qtd_peca_placa ?? 1,
        peso_peca: r.peso_peca ?? 0, peso_total_galho: r.peso_total_galho ?? 0,
        percentual_retorno: r.percentual_retorno ?? null,
        qtd_machos_por_caixa: r.qtd_machos_por_caixa ?? 0, peso_macho: r.peso_macho ?? null,
        tipo_material: r.tipo_material ?? 'sucata', preco_venda_kg: r.preco_venda_kg ?? null,
        custo_adicional: r.custo_adicional ?? 0, cliente_id: clienteId, ativo: true,
      });
    }
    if (novos.length > 0) await batchInsert('produtos', novos, 'Produtos', (r) => String(r.nome));
  }

  async function salvarApontamentos(rows: ApontamentoImportado[]) {
    ist.log('section', `── Apontamentos (${rows.length}) ──`);
    const [{ data: funcs }, { data: prods }] = await Promise.all([
      supabase.from('funcionarios').select('id, nome'),
      supabase.from('produtos').select('id, codigo, nome'),
    ]);
    const funcMap = new Map<string, string>(
      (funcs ?? []).map((f: { id: string; nome: string }) => [f.nome.toLowerCase(), f.id])
    );
    const prodMap = new Map<string, string>();
    for (const prod of prods ?? []) {
      if (prod.codigo) prodMap.set(prod.codigo.toLowerCase(), prod.id);
      prodMap.set(prod.nome.toLowerCase(), prod.id);
    }

    const novos: Array<Record<string, unknown>> = [];
    let erroLocal = 0;
    for (const r of rows) {
      const moldadorId = funcMap.get(r.moldador_nome.toLowerCase());
      const ajudanteId = r.ajudante_nome ? (funcMap.get(r.ajudante_nome.toLowerCase()) ?? null) : null;
      const produtoId = prodMap.get(r.produto_codigo.toLowerCase());
      if (!moldadorId) { ist.log('error', `Moldador não encontrado: "${r.moldador_nome}" (${r.data})`); erroLocal++; continue; }
      if (!produtoId) { ist.log('error', `Produto não encontrado: "${r.produto_codigo}" (${r.data})`); erroLocal++; continue; }
      if (r.ajudante_nome && !ajudanteId) ist.log('warn', `Ajudante não encontrado: "${r.ajudante_nome}" — sem ajudante`);
      novos.push({
        data: r.data, numero_op: r.numero_op ?? null,
        moldador_id: moldadorId, ajudante_id: ajudanteId, produto_id: produtoId,
        qtde_caixas: r.qtde_caixas, aluminio_bruto: r.aluminio_bruto,
        peso_retorno: r.peso_retorno, perdas_peca: r.perdas_peca,
        consumo_oleo: r.consumo_oleo, tempo_horas: r.tempo_horas,
      });
    }
    if (erroLocal > 0) ist.set({ erros: ist.get().erros + erroLocal, atual: ist.get().atual + erroLocal });
    if (novos.length > 0) await batchInsert('producao', novos, 'Apontamentos', (r) => `${r.data} | ${String(r.moldador_id).slice(0,8)}`);
  }

  // ── orquestração principal ───────────────────────────
  const iniciarImportacao = async (
    fRows: FuncionarioImportado[],
    cRows: ClienteImportado[],
    pRows: ProdutoImportado[],
    aRows: ApontamentoImportado[],
  ) => {
    const total = fRows.length + cRows.length + pRows.length + aRows.length;
    ist.iniciar(total);
    setSalvando(true);
    setResultado(null);
    setResultadoTodos(null);
    try {
      if (fRows.length > 0) await salvarFuncionarios(fRows);
      if (cRows.length > 0) await salvarClientes(cRows);
      if (pRows.length > 0) await salvarProdutos(pRows);
      if (aRows.length > 0) await salvarApontamentos(aRows);
      const st = ist.get();
      ist.log('section', '─────────────────────────────────────────');
      ist.log('ok', `CONCLUÍDO: ${st.inseridos} inseridos | ${st.pulados} pulados | ${st.erros} erros`);
      ist.set({ concluido: true, fase: 'Concluído' });
      setArquivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      ist.log('error', `Erro fatal: ${err instanceof Error ? err.message : String(err)}`);
      ist.set({ concluido: true, fase: 'Erro' });
    } finally {
      setSalvando(false);
    }
  };

  const handleSalvarTodos = () => {
    if (!resultadoTodos) return;
    iniciarImportacao(
      resultadoTodos.funcionarios.dados,
      resultadoTodos.clientes.dados,
      resultadoTodos.produtos.dados,
      resultadoTodos.apontamentos.dados,
    );
  };

  const handleZerarBanco = async () => {
    if (!confirm('⚠️ ATENÇÃO: Isso irá apagar TODOS os dados (funcionários, clientes, produtos, produção, compras, estoque). Esta ação é irreversível!\n\nDeseja continuar?')) return;
    if (!confirm('Confirma o ZERAMENTO TOTAL da base de dados?')) return;

    setZerando(true);
    setErroMsg('');
    const tabelas = ['producao', 'compras', 'produtos', 'clientes', 'funcionarios', 'estoque_aluminio'];
    const erros: string[] = [];

    for (const tabela of tabelas) {
      const { error } = await supabase.from(tabela).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) erros.push(`${tabela}: ${error.message}`);
    }

    // Recria saldos zerados no estoque
    if (!erros.some(e => e.startsWith('estoque_aluminio'))) {
      await supabase.from('estoque_aluminio').insert([
        { tipo: 'Lingote', saldo: 0, custo_medio: 0 },
        { tipo: 'Sucata',  saldo: 0, custo_medio: 0 },
        { tipo: 'Óleo',    saldo: 0, custo_medio: 0 },
        { tipo: 'Galho',   saldo: 0, custo_medio: 0 },
      ]);
    }

    if (erros.length > 0) {
      setErroMsg('Erros ao zerar: ' + erros.join('; '));
    } else {
      setErroMsg('');
      alert('✅ Base de dados zerada com sucesso! Agora você pode fazer a importação.');
    }
    setZerando(false);
  };

  const handleSalvarSimples = () => {
    if (!resultado || resultado.dados.length === 0) return;
    const empty: never[] = [];
    if (tipo === 'funcionarios') {
      iniciarImportacao(resultado.dados as FuncionarioImportado[], empty, empty, empty);
    } else if (tipo === 'clientes') {
      iniciarImportacao(empty, resultado.dados as ClienteImportado[], empty, empty);
    } else if (tipo === 'produtos') {
      iniciarImportacao(empty, empty, resultado.dados as ProdutoImportado[], empty);
    } else if (tipo === 'apontamentos') {
      iniciarImportacao(empty, empty, empty, resultado.dados as ApontamentoImportado[]);
    }
  };

  // ── cálculo da barra ─────────────────────────────────
  const pct = p.total > 0 ? Math.min(100, Math.round((p.atual / p.total) * 100)) : 0;

  // ── resumo da leitura ────────────────────────────────
  const resumoTodos = resultadoTodos
    ? {
        funcionarios: { sucesso: resultadoTodos.funcionarios.sucesso, erros: resultadoTodos.funcionarios.erros.length },
        clientes: { sucesso: resultadoTodos.clientes.sucesso, erros: resultadoTodos.clientes.erros.length },
        produtos: { sucesso: resultadoTodos.produtos.sucesso, erros: resultadoTodos.produtos.erros.length },
        apontamentos: { sucesso: resultadoTodos.apontamentos.sucesso, erros: resultadoTodos.apontamentos.erros.length },
      }
    : null;

  const totalParaSalvar = resumoTodos
    ? resumoTodos.funcionarios.sucesso + resumoTodos.clientes.sucesso +
      resumoTodos.produtos.sucesso + resumoTodos.apontamentos.sucesso
    : 0;

  return (
    <Layout title="Importação de Dados">
      <div className="space-y-6 max-w-4xl">

        {/* ── botão zerar banco ── */}
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
          <div>
            <p className="font-semibold text-red-800 text-sm">Zerar Base de Dados</p>
            <p className="text-xs text-red-600">Apaga todos os registros antes de uma nova importação limpa.</p>
          </div>
          <button
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
            onClick={handleZerarBanco}
            disabled={zerando || salvando}
          >
            {zerando ? '⏳ Zerando…' : '🗑️ Zerar Todos os Dados'}
          </button>
        </div>

        {erroMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{erroMsg}</div>
        )}

        {/* ── painel de progresso ── */}
        {showProgresso && (
          <Card title={`Importando — ${p.fase}`}>
            <div className="space-y-3">
              {/* barra */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-200 rounded-full h-5 overflow-hidden">
                  <div
                    className={`h-5 rounded-full transition-all duration-200 ${
                      p.concluido
                        ? p.erros > 0 ? 'bg-orange-500' : 'bg-green-500'
                        : 'bg-orange-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-sm font-bold tabular-nums w-14 text-right">{pct}%</span>
              </div>

              {/* contador + botão parar */}
              <div className="flex items-center gap-3 text-xs text-slate-500 tabular-nums">
                <span>{p.atual} / {p.total} registros</span>
                {!p.concluido && <span className="inline-block w-2 h-2 rounded-full bg-orange-400 animate-pulse" />}
                {!p.concluido && salvando && <span className="text-orange-500 font-semibold">Processando…</span>}
                {!p.concluido && salvando && (
                  <button
                    onClick={() => importacaoState.cancelar()}
                    className="ml-auto px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded text-xs transition-colors"
                  >
                    ⛔ Parar Importação
                  </button>
                )}
              </div>

              {/* log terminal */}
              <div
                ref={logRef}
                className="font-mono text-xs bg-slate-900 text-slate-100 rounded-lg p-3 h-72 overflow-y-auto"
              >
                {p.log.map((entry, i) => (
                  <div key={i} className={`leading-5 ${COR[entry.nivel]}`}>
                    <span className="select-none mr-1 opacity-60">{ICONE[entry.nivel]}</span>
                    {entry.msg}
                  </div>
                ))}
                {!p.concluido && <div className="text-slate-500 animate-pulse mt-1">▋</div>}
              </div>

              {/* resumo final */}
              {p.concluido && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 bg-green-50 rounded-lg text-center">
                    <p className="text-xs text-slate-500 mb-1">Inseridos</p>
                    <p className="text-2xl font-bold text-green-700">{p.inseridos}</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg text-center">
                    <p className="text-xs text-slate-500 mb-1">Pulados (duplicata)</p>
                    <p className="text-2xl font-bold text-yellow-600">{p.pulados}</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg text-center">
                    <p className="text-xs text-slate-500 mb-1">Erros</p>
                    <p className="text-2xl font-bold text-red-600">{p.erros}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ── config: tipo + arquivo ── */}
        <Card title="Importar Dados do Excel">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              {TIPOS.map((t) => (
                <label
                  key={t.value}
                  className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    tipo === t.value ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input type="radio" name="tipo" value={t.value} checked={tipo === t.value}
                    onChange={() => handleTipoChange(t.value)} className="mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm">{t.label}</p>
                    <p className="text-xs text-slate-500">{t.descricao}</p>
                  </div>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Arquivo Excel (.xlsx, .xls)
              </label>
              <input
                ref={fileInputRef} type="file" accept=".xlsx,.xls" className="form-input"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleArquivo(f); }}
              />
              {arquivo && (
                <p className="text-xs text-green-600 mt-1 font-semibold">
                  📄 {arquivo.name}
                  {abasDetectadas.length > 0 && (
                    <span className="text-slate-500 font-normal ml-2">
                      — Abas: {abasDetectadas.join(', ')}
                    </span>
                  )}
                </p>
              )}
            </div>

            {processando && (
              <div className="flex items-center gap-2 text-orange-600 text-sm">
                <div className="spinner w-4 h-4" />
                Lendo arquivo…
              </div>
            )}
          </div>
        </Card>

        {/* ── resultado leitura: importar tudo ── */}
        {resultadoTodos && resumoTodos && (
          <Card title="Resultado da Leitura — Planilha Completa">
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(
                  [
                    { label: '👥 Funcionários', ...resumoTodos.funcionarios },
                    { label: '🤝 Clientes', ...resumoTodos.clientes },
                    { label: '📦 Produtos', ...resumoTodos.produtos },
                    { label: '📝 Apontamentos', ...resumoTodos.apontamentos },
                  ] as Array<{ label: string; sucesso: number; erros: number }>
                ).map((item) => (
                  <div key={item.label} className="p-3 bg-slate-50 rounded-lg text-center">
                    <p className="text-xs font-semibold text-slate-600">{item.label}</p>
                    <p className="text-2xl font-bold text-green-700">{item.sucesso}</p>
                    {item.erros > 0 && <p className="text-xs text-red-500">{item.erros} com erro de leitura</p>}
                  </div>
                ))}
              </div>

              {Object.entries(resultadoTodos).some(([, v]) => (v as ImportacaoResult<unknown>).erros.length > 0) && (
                <div>
                  <p className="text-sm font-semibold text-red-700 mb-2">Erros na leitura do Excel:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {Object.entries(resultadoTodos).flatMap(([modulo, v]) =>
                      (v as ImportacaoResult<unknown>).erros.map((e, i) => (
                        <div key={`${modulo}-${i}`} className="text-xs text-red-600 p-2 bg-red-50 rounded">
                          <span className="font-semibold">[{modulo}] Linha {e.linha}:</span> {e.erro}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {totalParaSalvar > 0 && (
                <button
                  className="btn-primary w-full py-3 text-base"
                  onClick={handleSalvarTodos}
                  disabled={salvando}
                >
                  {salvando ? 'Importando…' : `▶ Iniciar Importação — ${totalParaSalvar} registros`}
                </button>
              )}
            </div>
          </Card>
        )}

        {/* ── resultado leitura: importação simples ── */}
        {resultado && (
          <Card title="Resultado da Validação">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="p-3 bg-green-50 rounded-lg flex-1 text-center">
                  <p className="text-xs text-slate-600">Válidos</p>
                  <p className="text-2xl font-bold text-green-700">{resultado.sucesso}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg flex-1 text-center">
                  <p className="text-xs text-slate-600">Erros de leitura</p>
                  <p className="text-2xl font-bold text-red-700">{resultado.erros.length}</p>
                </div>
              </div>
              {resultado.erros.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {resultado.erros.map((e, i) => (
                    <div key={i} className="text-xs text-red-600 p-2 bg-red-50 rounded">
                      <span className="font-semibold">Linha {e.linha}:</span> {e.erro}
                    </div>
                  ))}
                </div>
              )}
              {resultado.sucesso > 0 && (
                <>
                  <div className="overflow-x-auto">
                    <p className="text-xs text-slate-500 mb-1">Prévia ({Math.min(resultado.dados.length, 5)} de {resultado.dados.length}):</p>
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100">
                        <tr>{Object.keys(resultado.dados[0] as object).map((k) => (
                          <th key={k} className="p-2 text-left">{k}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {(resultado.dados as Record<string, unknown>[]).slice(0, 5).map((row, i) => (
                          <tr key={i} className="border-b">
                            {Object.values(row).map((v, j) => (
                              <td key={j} className="p-2 max-w-32 truncate">{String(v ?? '')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    className="btn-primary w-full py-3 text-base"
                    onClick={handleSalvarSimples}
                    disabled={salvando}
                  >
                    {salvando ? 'Importando…' : `▶ Iniciar Importação — ${resultado.sucesso} registros`}
                  </button>
                </>
              )}
            </div>
          </Card>
        )}

        {/* guia */}
        <Card title="Formato das Colunas por Tipo">
          <div className="text-sm text-slate-600 space-y-3">
            {TIPOS.filter((t) => t.value !== 'tudo').map((t) => (
              <div key={t.value} className="flex items-start gap-2">
                <Badge variant="info">{t.label}</Badge>
                <span className="text-xs mt-0.5">{t.descricao}</span>
              </div>
            ))}
            <p className="text-xs text-slate-500 mt-2 p-2 bg-slate-50 rounded">
              💡 Primeira linha = nomes das colunas. Datas: DD/MM/YYYY, YYYY-MM-DD ou serial Excel.
              Duplicatas (funcionário por nome, cliente por razão social, produto por código) são puladas automaticamente.
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
