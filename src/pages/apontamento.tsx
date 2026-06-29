import { useState, useMemo, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card } from '@/components/ui';
import type { Produto } from '@/lib/types';

// ── autocomplete de produto ───────────────────────────────────
function ProdutoAutocomplete({
  produtos, value, onChange,
}: {
  produtos: Produto[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [texto, setTexto] = useState('');
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selecionado = produtos.find((p) => p.id === value);

  useEffect(() => {
    if (selecionado) setTexto(selecionado.nome);
  }, [selecionado]);

  useEffect(() => {
    const fechar = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);

  const filtrados = useMemo(() => {
    if (!texto.trim()) return produtos.slice(0, 20);
    const q = texto.toLowerCase();
    return produtos.filter(
      (p) => p.nome.toLowerCase().includes(q) || (p.codigo ?? '').toLowerCase().includes(q)
    ).slice(0, 30);
  }, [texto, produtos]);

  const selecionar = (p: Produto) => {
    onChange(p.id);
    setTexto(p.nome);
    setAberto(false);
  };

  const limpar = () => {
    onChange('');
    setTexto('');
    setAberto(true);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          className="form-input pr-8"
          placeholder="Digite para filtrar produto…"
          value={texto}
          onChange={(e) => { setTexto(e.target.value); onChange(''); setAberto(true); }}
          onFocus={() => setAberto(true)}
          autoComplete="off"
        />
        {value && (
          <button onClick={limpar} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-lg leading-none">×</button>
        )}
      </div>
      {aberto && filtrados.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtrados.map((p) => (
            <button
              key={p.id}
              onMouseDown={() => selecionar(p)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 hover:text-orange-700 border-b border-slate-50 last:border-0"
            >
              <span className="font-mono text-xs text-slate-400 mr-2">{p.codigo ?? '—'}</span>
              {p.nome}
            </button>
          ))}
        </div>
      )}
      {aberto && texto && filtrados.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow p-3 text-sm text-slate-400">
          Nenhum produto encontrado
        </div>
      )}
    </div>
  );
}

// ── tipos do formulário ───────────────────────────────────────
interface FormData {
  data: string;
  moldador_id: string;
  ajudante_id: string;
  produto_id: string;
  modo_entrada: 'caixas' | 'pecas';
  qtde_caixas: string;
  qtde_pecas: string;
  aluminio_bruto: string;
  peso_retorno: string;
  perdas_peca: string;
  consumo_oleo: string;
  tempo_horas: string;
}

const FORM_VAZIO: FormData = {
  data: new Date().toISOString().split('T')[0],
  moldador_id: '',
  ajudante_id: '',
  produto_id: '',
  modo_entrada: 'caixas',
  qtde_caixas: '',
  qtde_pecas: '',
  aluminio_bruto: '',
  peso_retorno: '',
  perdas_peca: '',
  consumo_oleo: '',
  tempo_horas: '',
};

function fmtNum(n: number, dec = 2) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

// ── página principal ──────────────────────────────────────────
export default function ApontamentoPage() {
  const { producoes, funcionarios, produtos, loading, criarProducao } = useProducao();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(FORM_VAZIO);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');

  // produto selecionado para exibir dados
  const produtoSel = produtos.find((p) => p.id === form.produto_id) ?? null;

  // ── conversão caixas ↔ peças ─────────────────────────────
  const qtdPorCaixa = produtoSel?.qtd_peca_placa ?? 1;

  const setQtdCaixas = (val: string) => {
    const caixas = parseInt(val) || 0;
    const pecas = caixas * qtdPorCaixa;
    setForm((f) => ({ ...f, qtde_caixas: val, qtde_pecas: caixas > 0 ? String(pecas) : '', modo_entrada: 'caixas' }));
  };

  const setQtdPecas = (val: string) => {
    const pecas = parseInt(val) || 0;
    const caixas = pecas > 0 ? Math.ceil(pecas / qtdPorCaixa) : 0;
    const pecasAjustadas = caixas * qtdPorCaixa; // ajusta para múltiplo exato
    setForm((f) => ({ ...f, qtde_pecas: caixas > 0 ? String(pecasAjustadas) : val, qtde_caixas: caixas > 0 ? String(caixas) : '', modo_entrada: 'pecas' }));
  };

  // ── pré-relatório ─────────────────────────────────────────
  const preRelatorio = useMemo(() => {
    if (!produtoSel) return null;
    const caixas = parseInt(form.qtde_caixas) || 0;
    if (caixas === 0) return null;
    const totalPecas = caixas * (produtoSel.qtd_peca_placa ?? 1);
    const pesoUtilPecas = totalPecas * (produtoSel.peso_peca ?? 0);
    const pesoGalhoTotal = caixas * (produtoSel.peso_total_galho ?? 0);
    const aluminioEstimado = pesoUtilPecas + pesoGalhoTotal;
    const pesoMachos = caixas * (produtoSel.qtd_machos_por_caixa ?? 0) * (produtoSel.peso_macho ?? 0);
    return { totalPecas, pesoUtilPecas, pesoGalhoTotal, aluminioEstimado, pesoMachos };
  }, [form.qtde_caixas, produtoSel]);

  // ── submit ────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.moldador_id) { setErro('Selecione o Profissional 1'); return; }
    if (!form.produto_id)  { setErro('Selecione o produto'); return; }
    if (!form.qtde_caixas) { setErro('Informe a quantidade de caixas'); return; }
    setSubmitting(true);
    setErro('');
    try {
      await criarProducao({
        data: form.data,
        moldador_id: form.moldador_id,
        ajudante_id: form.ajudante_id || null,
        produto_id: form.produto_id,
        qtde_caixas: parseInt(form.qtde_caixas) || 0,
        qtde_pecas: parseInt(form.qtde_pecas) || null,
        aluminio_bruto: parseFloat(form.aluminio_bruto) || 0,
        peso_retorno: parseFloat(form.peso_retorno) || 0,
        perdas_peca: parseFloat(form.perdas_peca) || 0,
        consumo_oleo: parseFloat(form.consumo_oleo) || 0,
        tempo_horas: parseFloat(form.tempo_horas) || 0,
      });
      setForm(FORM_VAZIO);
      setShowForm(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSubmitting(false);
    }
  };

  const f = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // ── filtro da lista ───────────────────────────────────────
  const lista = useMemo(() => {
    const q = busca.toLowerCase();
    return producoes.filter((p) => {
      if (!q) return true;
      const func = funcionarios.find((fn) => fn.id === p.moldador_id);
      const prod = produtos.find((pr) => pr.id === p.produto_id);
      return func?.nome.toLowerCase().includes(q) || prod?.nome.toLowerCase().includes(q) || p.data.includes(q);
    }).slice(0, 50);
  }, [producoes, busca, funcionarios, produtos]);

  if (loading) {
    return (
      <Layout title="Apontamento de Produção">
        <div className="flex items-center justify-center py-20"><div className="spinner w-10 h-10" /></div>
      </Layout>
    );
  }

  return (
    <Layout title="Apontamento de Produção">
      <div className="space-y-5">

        {/* Toolbar */}
        <div className="flex justify-between items-center">
          <p className="text-slate-600 text-sm">{producoes.length} apontamentos registrados</p>
          <button className="btn-primary" onClick={() => { setShowForm(!showForm); setErro(''); }}>
            {showForm ? '✕ Fechar' : '+ Novo Apontamento'}
          </button>
        </div>

        {/* ── Formulário ── */}
        {showForm && (
          <Card title="Registrar Apontamento">
            <form onSubmit={handleSubmit} className="space-y-5">
              {erro && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{erro}</div>}

              {/* Linha 1: Data + Profissionais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Data <span className="text-red-500">*</span></label>
                  <input type="date" className="form-input" value={form.data} onChange={f('data')} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Profissional 1 — Moldador <span className="text-red-500">*</span></label>
                  <select className="form-select" value={form.moldador_id} onChange={f('moldador_id')} required>
                    <option value="">Selecionar…</option>
                    {funcionarios.filter((fn) => fn.ativo).map((fn) => (
                      <option key={fn.id} value={fn.id}>{fn.nome} — {fn.funcao}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Profissional 2 — Ajudante</label>
                  <select className="form-select" value={form.ajudante_id} onChange={f('ajudante_id')}>
                    <option value="">Nenhum</option>
                    {funcionarios.filter((fn) => fn.ativo && fn.id !== form.moldador_id).map((fn) => (
                      <option key={fn.id} value={fn.id}>{fn.nome} — {fn.funcao}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Linha 2: Produto */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Produto <span className="text-red-500">*</span></label>
                <ProdutoAutocomplete
                  produtos={produtos}
                  value={form.produto_id}
                  onChange={(id) => setForm((prev) => ({ ...prev, produto_id: id, qtde_caixas: '', qtde_pecas: '' }))}
                />
              </div>

              {/* Dados do produto selecionado */}
              {produtoSel && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                  <div><p className="text-xs text-slate-400">Peças/Caixa</p><p className="font-semibold">{produtoSel.qtd_peca_placa ?? '—'}</p></div>
                  <div><p className="text-xs text-slate-400">Peso Peça</p><p className="font-semibold">{produtoSel.peso_peca ? `${produtoSel.peso_peca} kg` : '—'}</p></div>
                  <div><p className="text-xs text-slate-400">Peso Galho/Cx</p><p className="font-semibold">{produtoSel.peso_total_galho ? `${produtoSel.peso_total_galho} kg` : '—'}</p></div>
                  <div><p className="text-xs text-slate-400">% Retorno</p><p className="font-semibold">{produtoSel.percentual_retorno ? `${produtoSel.percentual_retorno}%` : '—'}</p></div>
                  {produtoSel.qtd_machos_por_caixa ? (
                    <div><p className="text-xs text-slate-400">Machos/Cx</p><p className="font-semibold">{produtoSel.qtd_machos_por_caixa}</p></div>
                  ) : null}
                  {produtoSel.peso_macho ? (
                    <div><p className="text-xs text-slate-400">Peso Macho</p><p className="font-semibold">{produtoSel.peso_macho} kg</p></div>
                  ) : null}
                  {produtoSel.tipo_material && (
                    <div><p className="text-xs text-slate-400">Material</p><p className="font-semibold capitalize">{produtoSel.tipo_material}</p></div>
                  )}
                </div>
              )}

              {/* Linha 3: Qtd caixas / peças */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Qtd. Caixas <span className="text-red-500">*</span>
                    {produtoSel?.qtd_peca_placa && <span className="ml-1 text-xs text-slate-400 font-normal">({produtoSel.qtd_peca_placa} peças/caixa)</span>}
                  </label>
                  <input
                    type="number" min="1" step="1" className="form-input"
                    value={form.qtde_caixas}
                    onChange={(e) => setQtdCaixas(e.target.value)}
                    placeholder="Ex: 10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Qtd. Peças
                    {form.modo_entrada === 'pecas' && form.qtde_caixas && (
                      <span className="ml-1 text-xs text-blue-500 font-normal">→ ajustado para {form.qtde_caixas} caixa(s)</span>
                    )}
                  </label>
                  <input
                    type="number" min="1" step="1" className="form-input"
                    value={form.qtde_pecas}
                    onChange={(e) => setQtdPecas(e.target.value)}
                    placeholder={produtoSel?.qtd_peca_placa ? `Múltiplo de ${produtoSel.qtd_peca_placa}` : 'Ex: 200'}
                  />
                </div>
              </div>

              {/* Pré-relatório */}
              {preRelatorio && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">Pré-relatório deste apontamento</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-white rounded p-2 text-center">
                      <p className="text-xs text-slate-400">Total Peças</p>
                      <p className="text-xl font-bold text-slate-800">{preRelatorio.totalPecas}</p>
                    </div>
                    <div className="bg-white rounded p-2 text-center">
                      <p className="text-xs text-slate-400">Peso Útil (peças)</p>
                      <p className="text-xl font-bold text-slate-800">{fmtNum(preRelatorio.pesoUtilPecas)} kg</p>
                    </div>
                    <div className="bg-white rounded p-2 text-center">
                      <p className="text-xs text-slate-400">Peso Galhos</p>
                      <p className="text-xl font-bold text-slate-800">{fmtNum(preRelatorio.pesoGalhoTotal)} kg</p>
                    </div>
                    <div className="bg-white rounded p-2 text-center">
                      <p className="text-xs text-slate-400">Alumínio Total Est.</p>
                      <p className="text-xl font-bold text-orange-600">{fmtNum(preRelatorio.aluminioEstimado)} kg</p>
                    </div>
                    {preRelatorio.pesoMachos > 0 && (
                      <div className="bg-white rounded p-2 text-center">
                        <p className="text-xs text-slate-400">Peso Machos</p>
                        <p className="text-xl font-bold text-slate-800">{fmtNum(preRelatorio.pesoMachos)} kg</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Linha 4: Dados de processo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Alumínio Bruto (kg)</label>
                  <input type="number" step="0.01" min="0" className="form-input" value={form.aluminio_bruto} onChange={f('aluminio_bruto')}
                    placeholder={preRelatorio ? fmtNum(preRelatorio.aluminioEstimado) : '0'} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Peso Retorno (kg)</label>
                  <input type="number" step="0.01" min="0" className="form-input" value={form.peso_retorno} onChange={f('peso_retorno')} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Perdas (peças)</label>
                  <input type="number" step="1" min="0" className="form-input" value={form.perdas_peca} onChange={f('perdas_peca')} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Consumo Óleo (L)</label>
                  <input type="number" step="0.01" min="0" className="form-input" value={form.consumo_oleo} onChange={f('consumo_oleo')} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tempo (horas)</label>
                  <input type="number" step="0.25" min="0" className="form-input" value={form.tempo_horas} onChange={f('tempo_horas')} />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Salvando…' : 'Salvar Apontamento'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setErro(''); }}>
                  Cancelar
                </button>
              </div>
            </form>
          </Card>
        )}

        {/* Lista */}
        <Card title={`Apontamentos Recentes (${producoes.length})`}>
          <div className="mb-3">
            <input className="form-input max-w-xs" placeholder="Buscar por moldador, produto ou data…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Data</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Moldador</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Ajudante</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Produto</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Caixas</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Al. Bruto</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Retorno</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Horas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((p) => {
                  const moldador = funcionarios.find((fn) => fn.id === p.moldador_id);
                  const ajudante = funcionarios.find((fn) => fn.id === p.ajudante_id);
                  const produto = produtos.find((pr) => pr.id === p.produto_id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-mono text-xs">{p.data}</td>
                      <td className="px-3 py-2 font-semibold">{moldador?.nome ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-500">{ajudante?.nome ?? '—'}</td>
                      <td className="px-3 py-2 text-slate-700 max-w-xs truncate" title={produto?.nome}>{produto?.nome ?? '—'}</td>
                      <td className="px-3 py-2 text-right font-mono">{p.qtde_caixas}</td>
                      <td className="px-3 py-2 text-right font-mono">{p.aluminio_bruto.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono">{p.peso_retorno.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono">{p.tempo_horas.toFixed(2)}</td>
                    </tr>
                  );
                })}
                {lista.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-400">Nenhum apontamento encontrado</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
