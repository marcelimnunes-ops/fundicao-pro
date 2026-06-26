import { useState, useRef, useCallback } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
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

// ── tipos de log ─────────────────────────────────────────
type LogLevel = 'info' | 'ok' | 'skip' | 'warn' | 'error';

interface LogEntry {
  nivel: LogLevel;
  msg: string;
}

interface ProgressoState {
  total: number;
  atual: number;
  fase: string;
  log: LogEntry[];
  concluido: boolean;
  resumo: { inseridos: number; pulados: number; erros: number };
}

const PROG_VAZIO: ProgressoState = {
  total: 0, atual: 0, fase: '', log: [], concluido: false,
  resumo: { inseridos: 0, pulados: 0, erros: 0 },
};

const ICONE: Record<LogLevel, string> = { info: '→', ok: '✓', skip: '↩', warn: '⚠', error: '✗' };
const COR: Record<LogLevel, string> = {
  info: 'text-slate-400',
  ok: 'text-green-600 font-semibold',
  skip: 'text-yellow-600',
  warn: 'text-orange-500',
  error: 'text-red-600 font-semibold',
};

export default function ImportacaoPage() {
  const { funcionarios: funcsCache, produtos: prodsCache } = useProducao();
  const [tipo, setTipo] = useState<TipoImportacao>('tudo');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [abasDetectadas, setAbasDetectadas] = useState<string[]>([]);
  const [processando, setProcessando] = useState(false);
  const [resultado, setResultado] = useState<ImportacaoResult<unknown> | null>(null);
  const [resultadoTodos, setResultadoTodos] = useState<ImportacaoTodosResult | null>(null);
  const [progresso, setProgresso] = useState<ProgressoState | null>(null);
  const [erroMsg, setErroMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // ── helper para atualizar progresso e auto-scroll ─────
  const atualizarProgresso = useCallback((upd: (prev: ProgressoState) => ProgressoState) => {
    setProgresso((prev) => {
      const next = upd(prev ?? PROG_VAZIO);
      // auto-scroll log
      setTimeout(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
      }, 20);
      return next;
    });
  }, []);

  const addLog = useCallback((nivel: LogLevel, msg: string) => {
    atualizarProgresso((p) => ({ ...p, log: [...p.log, { nivel, msg }] }));
  }, [atualizarProgresso]);

  // ── leitura/validação do arquivo ──────────────────────
  const handleArquivo = async (file: File) => {
    setArquivo(file);
    setResultado(null);
    setResultadoTodos(null);
    setProgresso(null);
    setErroMsg('');
    try {
      const abas = await listarAbas(file);
      setAbasDetectadas(abas);
      await processarArquivo(file, tipo);
    } catch {
      setErroMsg('Erro ao ler arquivo. Verifique se é um arquivo Excel válido (.xlsx, .xls).');
    }
  };

  const processarArquivo = async (file: File, tipoAtual: TipoImportacao) => {
    setProcessando(true);
    setResultado(null);
    setResultadoTodos(null);
    setProgresso(null);
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
    setProgresso(null);
    setErroMsg('');
    if (arquivo) await processarArquivo(arquivo, novoTipo);
  };

  // ── núcleo de importação com progresso ────────────────

  async function importarFuncionariosComProgresso(rows: FuncionarioImportado[]) {
    atualizarProgresso(() => ({
      ...PROG_VAZIO, total: rows.length, fase: 'Funcionários', log: [],
    }));

    // busca nomes existentes
    const { data: existing } = await supabase.from('funcionarios').select('nome');
    const nomeSet = new Set((existing ?? []).map((r: { nome: string }) => r.nome.trim().toLowerCase()));

    let ins = 0, pul = 0, err = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      atualizarProgresso((p) => ({ ...p, atual: i + 1 }));

      if (nomeSet.has(r.nome.trim().toLowerCase())) {
        addLog('skip', `[${i + 1}/${rows.length}] PULOU — já existe: ${r.nome}`);
        pul++;
        continue;
      }

      addLog('info', `[${i + 1}/${rows.length}] Inserindo ${r.nome} (${r.funcao})…`);
      const { error } = await supabase.from('funcionarios').insert({
        nome: r.nome, funcao: r.funcao, salario: r.salario,
        cartao_beneficio: r.cartao_beneficio, ativo: true,
      });

      if (error) {
        addLog('error', `[${i + 1}] ERRO ${r.nome}: ${error.message}`);
        err++;
      } else {
        addLog('ok', `[${i + 1}] OK — ${r.nome}`);
        nomeSet.add(r.nome.trim().toLowerCase());
        ins++;
      }
    }

    atualizarProgresso((p) => ({
      ...p, concluido: true, resumo: { inseridos: ins, pulados: pul, erros: err },
    }));
    return { ins, pul, err };
  }

  async function importarClientesComProgresso(rows: ClienteImportado[]) {
    atualizarProgresso((p) => ({
      ...p, fase: 'Clientes', log: [...p.log, { nivel: 'info', msg: '── Clientes ──' }],
      total: p.total, atual: p.atual,
    }));

    const { data: existing } = await supabase.from('clientes').select('razao_social');
    const nomeSet = new Set((existing ?? []).map((r: { razao_social: string }) => r.razao_social.trim().toLowerCase()));

    let ins = 0, pul = 0, err = 0;
    const baseAtual = (await getCurrentAtual());

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      atualizarProgresso((p) => ({ ...p, atual: baseAtual + i + 1 }));

      if (nomeSet.has(r.razao_social.trim().toLowerCase())) {
        addLog('skip', `[C${i + 1}/${rows.length}] PULOU — já existe: ${r.razao_social}`);
        pul++;
        continue;
      }

      addLog('info', `[C${i + 1}/${rows.length}] Inserindo cliente: ${r.razao_social}…`);
      const { error } = await supabase.from('clientes').insert({
        razao_social: r.razao_social, nome_fantasia: r.nome_fantasia ?? null,
        cnpj: r.cnpj ?? null, email: r.email ?? null, telefone: r.telefone ?? null,
        cidade: r.cidade ?? null, uf: r.uf ?? null, ativo: true,
      });

      if (error) {
        addLog('error', `[C${i + 1}] ERRO ${r.razao_social}: ${error.message}`);
        err++;
      } else {
        addLog('ok', `[C${i + 1}] OK — ${r.razao_social}`);
        nomeSet.add(r.razao_social.trim().toLowerCase());
        ins++;
      }
    }
    return { ins, pul, err };
  }

  async function importarProdutosComProgresso(rows: ProdutoImportado[], baseAtual: number) {
    atualizarProgresso((p) => ({
      ...p, fase: 'Produtos', log: [...p.log, { nivel: 'info', msg: '── Produtos ──' }],
    }));

    // busca clientes para resolver FK
    const { data: clientesDB } = await supabase.from('clientes').select('id, razao_social, nome_fantasia');
    const clienteMap = new Map<string, string>();
    for (const c of clientesDB ?? []) {
      clienteMap.set(c.razao_social.trim().toLowerCase(), c.id);
      if (c.nome_fantasia) clienteMap.set(c.nome_fantasia.trim().toLowerCase(), c.id);
    }

    const { data: existing } = await supabase.from('produtos').select('codigo');
    const codigoSet = new Set((existing ?? []).map((r: { codigo: string }) => r.codigo.trim().toLowerCase()));

    let ins = 0, pul = 0, err = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      atualizarProgresso((p) => ({ ...p, atual: baseAtual + i + 1 }));

      if (codigoSet.has(r.codigo.trim().toLowerCase())) {
        addLog('skip', `[P${i + 1}/${rows.length}] PULOU — código já existe: ${r.codigo}`);
        pul++;
        continue;
      }

      // resolve cliente_id
      let clienteId: string | null = null;
      if ((r as { cliente_nome?: string }).cliente_nome) {
        const cn = ((r as { cliente_nome?: string }).cliente_nome ?? '').trim().toLowerCase();
        clienteId = clienteMap.get(cn) ?? null;
        if (!clienteId) addLog('warn', `[P${i + 1}] Cliente não encontrado: "${(r as { cliente_nome?: string }).cliente_nome}"`);
      }

      addLog('info', `[P${i + 1}/${rows.length}] Inserindo produto: ${r.codigo} — ${r.nome}…`);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { cliente_nome: _cn, ...payload } = r as ProdutoImportado & { cliente_nome?: string };
      const { error } = await supabase.from('produtos').insert({
        ...payload,
        cliente_id: clienteId,
        ativo: true,
      });

      if (error) {
        addLog('error', `[P${i + 1}] ERRO ${r.codigo}: ${error.message}`);
        err++;
      } else {
        addLog('ok', `[P${i + 1}] OK — ${r.codigo} (${r.nome})`);
        codigoSet.add(r.codigo.trim().toLowerCase());
        ins++;
      }
    }
    return { ins, pul, err };
  }

  async function importarApontamentosComProgresso(rows: ApontamentoImportado[], baseAtual: number) {
    atualizarProgresso((p) => ({
      ...p, fase: 'Apontamentos', log: [...p.log, { nivel: 'info', msg: '── Apontamentos ──' }],
    }));

    // busca mapa atualizado pós-inserção
    const [{ data: funcs }, { data: prods }] = await Promise.all([
      supabase.from('funcionarios').select('id, nome'),
      supabase.from('produtos').select('id, codigo, nome'),
    ]);
    const funcMap = new Map((funcs ?? []).map((f: { id: string; nome: string }) => [f.nome.toLowerCase(), f.id]));
    const prodByCodigo = new Map((prods ?? []).map((p: { id: string; codigo: string }) => [p.codigo.toLowerCase(), p.id]));

    let ins = 0, pul = 0, err = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      atualizarProgresso((p) => ({ ...p, atual: baseAtual + i + 1 }));

      const moldadorId = funcMap.get(r.moldador_nome.toLowerCase());
      const produtoId = prodByCodigo.get(r.produto_codigo.toLowerCase());

      if (!moldadorId) {
        addLog('error', `[A${i + 1}] Moldador não encontrado: "${r.moldador_nome}"`);
        err++; continue;
      }
      if (!produtoId) {
        addLog('error', `[A${i + 1}] Produto não encontrado: "${r.produto_codigo}"`);
        err++; continue;
      }

      addLog('info', `[A${i + 1}/${rows.length}] ${r.data} | ${r.moldador_nome} | ${r.produto_codigo} | ${r.qtde_caixas} cx…`);
      const { error } = await supabase.from('producao').insert({
        data: r.data, moldador_id: moldadorId, produto_id: produtoId,
        qtde_caixas: r.qtde_caixas, aluminio_bruto: r.aluminio_bruto,
        peso_retorno: r.peso_retorno, perdas_peca: r.perdas_peca,
        consumo_oleo: r.consumo_oleo, tempo_horas: r.tempo_horas,
      });

      if (error) {
        addLog('error', `[A${i + 1}] ERRO: ${error.message}`);
        err++;
      } else {
        addLog('ok', `[A${i + 1}] OK`);
        ins++;
      }
      pul; // satisfaz eslint
    }
    return { ins, pul, err };
  }

  // helper para leitura assíncrona do state (não funciona direto em setState chain)
  const getCurrentAtual = () =>
    new Promise<number>((res) => setProgresso((p) => { res(p?.atual ?? 0); return p!; }));

  // ── orquestração "salvar tudo" ────────────────────────
  const handleSalvarTodos = async () => {
    if (!resultadoTodos) return;
    const { funcionarios: fRows, clientes: cRows, produtos: pRows, apontamentos: aRows } = resultadoTodos;

    const total = fRows.dados.length + cRows.dados.length + pRows.dados.length + aRows.dados.length;
    setProgresso({ ...PROG_VAZIO, total, fase: 'Iniciando…' });
    setResultadoTodos(null);

    let totalIns = 0, totalPul = 0, totalErr = 0;

    try {
      if (fRows.dados.length > 0) {
        const r = await importarFuncionariosComProgresso(fRows.dados);
        totalIns += r.ins; totalPul += r.pul; totalErr += r.err;
      }

      if (cRows.dados.length > 0) {
        const r = await importarClientesComProgresso(cRows.dados);
        totalIns += r.ins; totalPul += r.pul; totalErr += r.err;
      }

      const baseAntesProd = fRows.dados.length + cRows.dados.length;
      if (pRows.dados.length > 0) {
        const r = await importarProdutosComProgresso(pRows.dados, baseAntesProd);
        totalIns += r.ins; totalPul += r.pul; totalErr += r.err;
      }

      const baseAntesAp = baseAntesProd + pRows.dados.length;
      if (aRows.dados.length > 0) {
        const r = await importarApontamentosComProgresso(aRows.dados, baseAntesAp);
        totalIns += r.ins; totalPul += r.pul; totalErr += r.err;
      }

      addLog('ok', `─────────────────────────────────`);
      addLog('ok', `CONCLUÍDO: ${totalIns} inseridos, ${totalPul} pulados (duplicata), ${totalErr} erros`);
      atualizarProgresso((p) => ({
        ...p, atual: total, concluido: true,
        resumo: { inseridos: totalIns, pulados: totalPul, erros: totalErr },
      }));

      setArquivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      addLog('error', `Erro fatal: ${err instanceof Error ? err.message : String(err)}`);
      setErroMsg(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // ── salvar importação simples (por tipo) ──────────────
  const handleSalvarSimples = async () => {
    if (!resultado || resultado.dados.length === 0) return;
    const rows = resultado.dados;
    const total = rows.length;
    setProgresso({ ...PROG_VAZIO, total, fase: tipo });
    setResultado(null);

    try {
      if (tipo === 'funcionarios') {
        const r = await importarFuncionariosComProgresso(rows as FuncionarioImportado[]);
        addLog('ok', `Fim: ${r.ins} inseridos, ${r.pul} pulados, ${r.err} erros`);
        atualizarProgresso((p) => ({ ...p, concluido: true, resumo: { inseridos: r.ins, pulados: r.pul, erros: r.err } }));

      } else if (tipo === 'clientes') {
        const r = await importarClientesComProgresso(rows as ClienteImportado[]);
        addLog('ok', `Fim: ${r.ins} inseridos, ${r.pul} pulados, ${r.err} erros`);
        atualizarProgresso((p) => ({ ...p, concluido: true, resumo: { inseridos: r.ins, pulados: r.pul, erros: r.err } }));

      } else if (tipo === 'produtos') {
        const r = await importarProdutosComProgresso(rows as (ProdutoImportado & { cliente_nome?: string })[], 0);
        addLog('ok', `Fim: ${r.ins} inseridos, ${r.pul} pulados, ${r.err} erros`);
        atualizarProgresso((p) => ({ ...p, concluido: true, resumo: { inseridos: r.ins, pulados: r.pul, erros: r.err } }));

      } else if (tipo === 'apontamentos') {
        const r = await importarApontamentosComProgresso(rows as ApontamentoImportado[], 0);
        addLog('ok', `Fim: ${r.ins} inseridos, ${r.pul} pulados, ${r.err} erros`);
        atualizarProgresso((p) => ({ ...p, concluido: true, resumo: { inseridos: r.ins, pulados: r.pul, erros: r.err } }));
      }

      setArquivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      addLog('error', `Erro fatal: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // ── resumo exibido antes de salvar ───────────────────
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

  // ── barra de progresso ────────────────────────────────
  const pct = progresso && progresso.total > 0
    ? Math.round((progresso.atual / progresso.total) * 100)
    : 0;

  // supress unused for funcsCache / prodsCache (used in apontamentos)
  void funcsCache; void prodsCache;

  return (
    <Layout title="Importação de Dados">
      <div className="space-y-6 max-w-4xl">

        {erroMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{erroMsg}</div>
        )}

        {/* ── painel de progresso ── */}
        {progresso && (
          <Card title={`Importando: ${progresso.fase}`}>
            <div className="space-y-3">
              {/* barra */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-4 rounded-full transition-all duration-300 ${
                      progresso.concluido
                        ? progresso.resumo.erros > 0 ? 'bg-orange-500' : 'bg-green-500'
                        : 'bg-orange-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-sm font-bold tabular-nums w-12 text-right">{pct}%</span>
              </div>

              {/* contador */}
              <p className="text-xs text-slate-500 tabular-nums">
                {progresso.atual} / {progresso.total} registros
                {!progresso.concluido && (
                  <span className="ml-2 inline-block w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                )}
              </p>

              {/* log */}
              <div
                ref={logRef}
                className="font-mono text-xs bg-slate-900 text-slate-100 rounded-lg p-3 h-64 overflow-y-auto space-y-0.5"
              >
                {progresso.log.map((entry, i) => (
                  <div key={i} className={COR[entry.nivel]}>
                    <span className="select-none mr-1">{ICONE[entry.nivel]}</span>
                    {entry.msg}
                  </div>
                ))}
                {!progresso.concluido && (
                  <div className="text-slate-500 animate-pulse">▋</div>
                )}
              </div>

              {/* resumo final */}
              {progresso.concluido && (
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="p-2 bg-green-50 rounded text-center">
                    <p className="text-xs text-slate-500">Inseridos</p>
                    <p className="text-xl font-bold text-green-700">{progresso.resumo.inseridos}</p>
                  </div>
                  <div className="p-2 bg-yellow-50 rounded text-center">
                    <p className="text-xs text-slate-500">Pulados (duplicata)</p>
                    <p className="text-xl font-bold text-yellow-600">{progresso.resumo.pulados}</p>
                  </div>
                  <div className="p-2 bg-red-50 rounded text-center">
                    <p className="text-xs text-slate-500">Erros</p>
                    <p className="text-xl font-bold text-red-600">{progresso.resumo.erros}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        <Card title="Importar Dados do Excel">
          <div className="space-y-4">
            {/* tipo */}
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

            {/* upload */}
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
                Processando arquivo…
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
                    {item.erros > 0 && <p className="text-xs text-red-500">{item.erros} com erro</p>}
                  </div>
                ))}
              </div>

              {Object.entries(resultadoTodos).some(([, v]) => (v as ImportacaoResult<unknown>).erros.length > 0) && (
                <div>
                  <p className="text-sm font-semibold text-red-700 mb-2">Erros na leitura:</p>
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
                <button className="btn-primary w-full" onClick={handleSalvarTodos}>
                  Salvar tudo — {totalParaSalvar} registros (com verificação de duplicatas)
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
                              <td key={j} className="p-2">{String(v ?? '')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button className="btn-primary w-full" onClick={handleSalvarSimples}>
                    Salvar {resultado.sucesso} registros (com verificação de duplicatas)
                  </button>
                </>
              )}
            </div>
          </Card>
        )}

        {/* guia de colunas */}
        <Card title="Formato das Colunas por Tipo">
          <div className="text-sm text-slate-600 space-y-3">
            {TIPOS.filter((t) => t.value !== 'tudo').map((t) => (
              <div key={t.value} className="flex items-start gap-2">
                <Badge variant="info">{t.label}</Badge>
                <span className="text-xs mt-0.5">{t.descricao}</span>
              </div>
            ))}
            <p className="text-xs text-slate-500 mt-2 p-2 bg-slate-50 rounded">
              💡 A primeira linha deve conter os nomes das colunas. Datas aceitam DD/MM/YYYY, YYYY-MM-DD ou número serial do Excel. Duplicatas são detectadas automaticamente e puladas.
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
