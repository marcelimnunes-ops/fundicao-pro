import { useState, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
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

// ── log ─────────────────────────────────────────────────
type LogLevel = 'info' | 'ok' | 'skip' | 'warn' | 'error' | 'section';
interface LogEntry { nivel: LogLevel; msg: string }
const ICONE: Record<LogLevel, string> = { info: '→', ok: '✓', skip: '↩', warn: '⚠', error: '✗', section: '──' };
const COR: Record<LogLevel, string> = {
  info: 'text-slate-400',
  ok: 'text-green-400 font-semibold',
  skip: 'text-yellow-400',
  warn: 'text-orange-400',
  error: 'text-red-400 font-semibold',
  section: 'text-cyan-400 font-bold',
};

// ── progresso ────────────────────────────────────────────
interface Progresso {
  total: number;
  atual: number;
  fase: string;
  log: LogEntry[];
  concluido: boolean;
  inseridos: number;
  pulados: number;
  erros: number;
}

// ── hook de referência mutável para o log (evita re-renders desnecessários) ──
function useProgressoRef() {
  const ref = useRef<Progresso>({
    total: 0, atual: 0, fase: '', log: [], concluido: false,
    inseridos: 0, pulados: 0, erros: 0,
  });
  const [, forceRender] = useState(0);
  const tick = () => forceRender((n) => n + 1);

  const set = (upd: Partial<Progresso>) => {
    ref.current = { ...ref.current, ...upd };
    tick();
  };

  const log = (nivel: LogLevel, msg: string) => {
    ref.current.log = [...ref.current.log, { nivel, msg }];
    tick();
  };

  return { ref, set, log };
}

export default function ImportacaoPage() {
  const [tipo, setTipo] = useState<TipoImportacao>('tudo');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [abasDetectadas, setAbasDetectadas] = useState<string[]>([]);
  const [processando, setProcessando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<ImportacaoResult<unknown> | null>(null);
  const [resultadoTodos, setResultadoTodos] = useState<ImportacaoTodosResult | null>(null);
  const [showProgresso, setShowProgresso] = useState(false);
  const [erroMsg, setErroMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const prog = useProgressoRef();

  // auto-scroll do log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  });

  // ── leitura do arquivo ───────────────────────────────
  const handleArquivo = async (file: File) => {
    setArquivo(file);
    setResultado(null);
    setResultadoTodos(null);
    setShowProgresso(false);
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
    setShowProgresso(false);
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
    setShowProgresso(false);
    setErroMsg('');
    if (arquivo) await processarArquivo(arquivo, novoTipo);
  };

  // ── núcleo de importação ─────────────────────────────
  // Todas as inserções passam por aqui com controle de progresso

  async function salvarFuncionarios(rows: FuncionarioImportado[]) {
    prog.log('section', `── Funcionários (${rows.length}) ──`);
    const { data: existing } = await supabase.from('funcionarios').select('nome');
    if (!existing) { prog.log('error', 'Falha ao buscar funcionários existentes'); return; }
    const vistos = new Set(existing.map((r: { nome: string }) => r.nome.trim().toLowerCase()));

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      prog.set({ atual: prog.ref.current.atual + 1, fase: `Funcionários ${i + 1}/${rows.length}` });

      if (vistos.has(r.nome.trim().toLowerCase())) {
        prog.log('skip', `[F${i + 1}] Pulado (já existe): ${r.nome}`);
        prog.set({ pulados: prog.ref.current.pulados + 1 });
        continue;
      }

      prog.log('info', `[F${i + 1}] Inserindo: ${r.nome} — ${r.funcao}…`);
      const { error } = await supabase.from('funcionarios').insert({
        nome: r.nome,
        funcao: r.funcao,
        salario: r.salario,
        cartao_beneficio: r.cartao_beneficio ?? 0,
        ativo: true,
      });

      if (error) {
        prog.log('error', `[F${i + 1}] ERRO: ${r.nome} → ${error.message}`);
        prog.set({ erros: prog.ref.current.erros + 1 });
      } else {
        prog.log('ok', `[F${i + 1}] OK — ${r.nome}`);
        prog.set({ inseridos: prog.ref.current.inseridos + 1 });
        vistos.add(r.nome.trim().toLowerCase());
      }
    }
  }

  async function salvarClientes(rows: ClienteImportado[]) {
    prog.log('section', `── Clientes (${rows.length}) ──`);
    const { data: existing } = await supabase.from('clientes').select('razao_social');
    if (!existing) { prog.log('error', 'Falha ao buscar clientes existentes'); return; }
    const vistos = new Set(existing.map((r: { razao_social: string }) => r.razao_social.trim().toLowerCase()));

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      prog.set({ atual: prog.ref.current.atual + 1, fase: `Clientes ${i + 1}/${rows.length}` });

      if (vistos.has(r.razao_social.trim().toLowerCase())) {
        prog.log('skip', `[C${i + 1}] Pulado (já existe): ${r.razao_social}`);
        prog.set({ pulados: prog.ref.current.pulados + 1 });
        continue;
      }

      prog.log('info', `[C${i + 1}] Inserindo: ${r.razao_social}…`);
      const { error } = await supabase.from('clientes').insert({
        razao_social: r.razao_social,
        nome_fantasia: r.nome_fantasia ?? null,
        cnpj: r.cnpj ?? null,
        email: r.email ?? null,
        telefone: r.telefone ?? null,
        cidade: r.cidade ?? null,
        uf: r.uf ?? null,
        ativo: true,
      });

      if (error) {
        prog.log('error', `[C${i + 1}] ERRO: ${r.razao_social} → ${error.message}`);
        prog.set({ erros: prog.ref.current.erros + 1 });
      } else {
        prog.log('ok', `[C${i + 1}] OK — ${r.razao_social}`);
        prog.set({ inseridos: prog.ref.current.inseridos + 1 });
        vistos.add(r.razao_social.trim().toLowerCase());
      }
    }
  }

  async function salvarProdutos(rows: ProdutoImportado[]) {
    prog.log('section', `── Produtos (${rows.length}) ──`);

    // busca clientes para resolver FK
    const { data: clientesDB } = await supabase.from('clientes').select('id, razao_social, nome_fantasia');
    const clienteMap = new Map<string, string>();
    for (const c of clientesDB ?? []) {
      clienteMap.set(c.razao_social.trim().toLowerCase(), c.id);
      if (c.nome_fantasia) clienteMap.set(c.nome_fantasia.trim().toLowerCase(), c.id);
    }

    const { data: existing } = await supabase.from('produtos').select('codigo');
    if (!existing) { prog.log('error', 'Falha ao buscar produtos existentes'); return; }
    const vistos = new Set(existing.map((r: { codigo: string }) => r.codigo.trim().toLowerCase()));

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] as ProdutoImportado & { cliente_nome?: string };
      prog.set({ atual: prog.ref.current.atual + 1, fase: `Produtos ${i + 1}/${rows.length}` });

      if (vistos.has(r.codigo.trim().toLowerCase())) {
        prog.log('skip', `[P${i + 1}] Pulado (já existe): ${r.codigo}`);
        prog.set({ pulados: prog.ref.current.pulados + 1 });
        continue;
      }

      // resolve cliente_id se tiver campo cliente_nome
      let clienteId: string | null = null;
      if (r.cliente_nome) {
        clienteId = clienteMap.get(r.cliente_nome.trim().toLowerCase()) ?? null;
        if (!clienteId) prog.log('warn', `[P${i + 1}] Cliente não encontrado: "${r.cliente_nome}"`);
      }

      prog.log('info', `[P${i + 1}] Inserindo: ${r.codigo} — ${r.nome}…`);
      const { error } = await supabase.from('produtos').insert({
        codigo: r.codigo,
        nome: r.nome,
        descricao: r.descricao ?? null,
        qtd_peca_placa: r.qtd_peca_placa ?? null,
        peso_peca: r.peso_peca ?? null,
        peso_total_galho: r.peso_total_galho ?? null,
        qtd_machos_por_caixa: r.qtd_machos_por_caixa ?? null,
        peso_macho: r.peso_macho ?? null,
        tipo_material: r.tipo_material ?? 'sucata',
        custo_adicional: r.custo_adicional ?? 0,
        cliente_id: clienteId,
        ativo: true,
      });

      if (error) {
        prog.log('error', `[P${i + 1}] ERRO: ${r.codigo} → ${error.message}`);
        prog.set({ erros: prog.ref.current.erros + 1 });
      } else {
        prog.log('ok', `[P${i + 1}] OK — ${r.codigo}`);
        prog.set({ inseridos: prog.ref.current.inseridos + 1 });
        vistos.add(r.codigo.trim().toLowerCase());
      }
    }
  }

  async function salvarApontamentos(rows: ApontamentoImportado[]) {
    prog.log('section', `── Apontamentos (${rows.length}) ──`);

    // busca mapa atualizado pós-inserção de func/produtos
    const [{ data: funcs }, { data: prods }] = await Promise.all([
      supabase.from('funcionarios').select('id, nome'),
      supabase.from('produtos').select('id, codigo, nome'),
    ]);

    const funcMap = new Map<string, string>(
      (funcs ?? []).map((f: { id: string; nome: string }) => [f.nome.toLowerCase(), f.id])
    );
    // índice por código E por nome (apontamentos podem vir com nome, não código)
    const prodMap = new Map<string, string>();
    for (const p of prods ?? []) {
      prodMap.set(p.codigo.toLowerCase(), p.id);
      prodMap.set(p.nome.toLowerCase(), p.id);
    }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      prog.set({ atual: prog.ref.current.atual + 1, fase: `Apontamentos ${i + 1}/${rows.length}` });

      const moldadorId = funcMap.get(r.moldador_nome.toLowerCase());
      const produtoId = prodMap.get(r.produto_codigo.toLowerCase());

      if (!moldadorId) {
        prog.log('error', `[A${i + 1}] Moldador não encontrado: "${r.moldador_nome}"`);
        prog.set({ erros: prog.ref.current.erros + 1 });
        continue;
      }
      if (!produtoId) {
        prog.log('error', `[A${i + 1}] Produto não encontrado: "${r.produto_codigo}"`);
        prog.set({ erros: prog.ref.current.erros + 1 });
        continue;
      }

      prog.log('info', `[A${i + 1}] ${r.data} | ${r.moldador_nome} | ${r.produto_codigo} | ${r.qtde_caixas}cx…`);
      const { error } = await supabase.from('producao').insert({
        data: r.data,
        moldador_id: moldadorId,
        produto_id: produtoId,
        qtde_caixas: r.qtde_caixas,
        aluminio_bruto: r.aluminio_bruto,
        peso_retorno: r.peso_retorno,
        perdas_peca: r.perdas_peca,
        consumo_oleo: r.consumo_oleo,
        tempo_horas: r.tempo_horas,
      });

      if (error) {
        prog.log('error', `[A${i + 1}] ERRO: ${error.message}`);
        prog.set({ erros: prog.ref.current.erros + 1 });
      } else {
        prog.log('ok', `[A${i + 1}] OK`);
        prog.set({ inseridos: prog.ref.current.inseridos + 1 });
      }
    }
  }

  // ── orquestração principal ───────────────────────────
  const iniciarImportacao = async (
    fRows: FuncionarioImportado[],
    cRows: ClienteImportado[],
    pRows: ProdutoImportado[],
    aRows: ApontamentoImportado[],
  ) => {
    const total = fRows.length + cRows.length + pRows.length + aRows.length;

    // inicializa o progresso
    prog.ref.current = {
      total, atual: 0, fase: 'Iniciando…',
      log: [], concluido: false,
      inseridos: 0, pulados: 0, erros: 0,
    };
    setShowProgresso(true);
    setSalvando(true);
    setResultado(null);
    setResultadoTodos(null);

    try {
      if (fRows.length > 0) await salvarFuncionarios(fRows);
      if (cRows.length > 0) await salvarClientes(cRows);
      if (pRows.length > 0) await salvarProdutos(pRows);
      if (aRows.length > 0) await salvarApontamentos(aRows);

      const p = prog.ref.current;
      prog.log('section', '─────────────────────────────────────────');
      prog.log('ok', `CONCLUÍDO: ${p.inseridos} inseridos | ${p.pulados} pulados (duplicata) | ${p.erros} erros`);
      prog.set({ concluido: true, fase: 'Concluído' });

      setArquivo(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      prog.log('error', `Erro fatal: ${err instanceof Error ? err.message : String(err)}`);
      prog.set({ concluido: true, fase: 'Erro' });
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
  const p = prog.ref.current;
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

              {/* contador */}
              <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
                <span>{p.atual} / {p.total} registros</span>
                {!p.concluido && <span className="inline-block w-2 h-2 rounded-full bg-orange-400 animate-pulse" />}
                {!p.concluido && salvando && <span className="text-orange-500 font-semibold">Processando…</span>}
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
