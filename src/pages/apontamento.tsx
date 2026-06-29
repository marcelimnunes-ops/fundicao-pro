import { useState, useMemo, useRef, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card } from '@/components/ui';
import Modal from '@/components/ui/Modal';
import type { Produto, Producao } from '@/lib/types';

function ProdutoAutocomplete({ produtos, value, onChange }: { produtos: Produto[]; value: string; onChange: (id: string) => void }) {
  const [texto, setTexto] = useState('');
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selecionado = produtos.find((p) => p.id === value);
  useEffect(() => { if (selecionado) setTexto(selecionado.nome); }, [selecionado]);
  useEffect(() => {
    const fechar = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false); };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);
  const filtrados = useMemo(() => {
    if (!texto.trim()) return produtos.slice(0, 20);
    const q = texto.toLowerCase();
    return produtos.filter((p) => p.nome.toLowerCase().includes(q) || (p.codigo ?? '').toLowerCase().includes(q)).slice(0, 30);
  }, [texto, produtos]);
  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input className="form-input pr-8" placeholder="Digite para filtrar produto..." value={texto}
          onChange={(e) => { setTexto(e.target.value); onChange(''); setAberto(true); }} onFocus={() => setAberto(true)} autoComplete="off" />
        {value && <button onClick={() => { onChange(''); setTexto(''); setAberto(true); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-lg">x</button>}
      </div>
      {aberto && filtrados.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filtrados.map((p) => (
            <button key={p.id} onMouseDown={() => { onChange(p.id); setTexto(p.nome); setAberto(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 hover:text-orange-700 border-b border-slate-50 last:border-0">
              <span className="font-mono text-xs text-slate-400 mr-2">{p.codigo ?? '--'}</span>{p.nome}
            </button>
          ))}
        </div>
      )}
      {aberto && texto && filtrados.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow p-3 text-sm text-slate-400">Nenhum produto encontrado</div>
      )}
    </div>
  );
}

interface FormData {
  data: string;
  numero_op: string;
  produto_id: string;
  moldador_id: string;
  ajudante_id: string;
  modo_entrada: 'caixas' | 'pecas';
  qtde_caixas: string;
  qtde_pecas: string;
  aluminio_bruto: string;
  perdas_peca: string;
  tempo_horas: string;
}

const hoje = () => new Date().toISOString().split('T')[0];
const FORM_VAZIO: FormData = {
  data: hoje(), numero_op: '', produto_id: '', moldador_id: '', ajudante_id: '',
  modo_entrada: 'caixas', qtde_caixas: '', qtde_pecas: '', aluminio_bruto: '', perdas_peca: '', tempo_horas: '',
};

function horasParaHHMM(h: number): string {
  if (!h) return '';
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}
function hhmmParaHoras(s: string): number {
  const parts = s.split(':').map(Number);
  return (parts[0] || 0) + (parts[1] || 0) / 60;
}
function fmtNum(n: number, dec = 2) { return n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }

function calcRetorno(caixas: number, prod: Produto | null): number {
  if (!prod || !caixas) return 0;
  const canal = (prod.peso_total_galho ?? 0) - ((prod.qtd_peca_placa ?? 1) * (prod.peso_peca ?? 0));
  return Math.max(0, canal * ((prod.percentual_retorno ?? 0) / 100) * caixas);
}
function calcAlBruto(caixas: number, prod: Produto | null): number {
  if (!prod || !caixas) return 0;
  return ((prod.qtd_peca_placa ?? 1) * (prod.peso_peca ?? 0) + (prod.peso_total_galho ?? 0)) * caixas;
}

export default function ApontamentoPage() {
  const { producoes, funcionarios, produtos, loading, criarProducao, atualizarProducao, deletarProducao } = useProducao();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(FORM_VAZIO);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<Producao | null>(null);
  const [editForm, setEditForm] = useState<Partial<FormData>>({});
  const [editErro, setEditErro] = useState('');
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [confirmarDelete, setConfirmarDelete] = useState<string | null>(null);

  const produtoSel = produtos.find((p) => p.id === form.produto_id) ?? null;
  const qtdPorCaixa = produtoSel?.qtd_peca_placa ?? 1;

  const setQtdCaixas = (val: string) => {
    const caixas = parseInt(val) || 0;
    const pecas = caixas * qtdPorCaixa;
    const alBruto = calcAlBruto(caixas, produtoSel);
    setForm((f) => ({
      ...f, qtde_caixas: val, qtde_pecas: caixas > 0 ? String(pecas) : '', modo_entrada: 'caixas',
      aluminio_bruto: alBruto > 0 ? fmtNum(alBruto) : f.aluminio_bruto,
    }));
  };

  const setQtdPecasBlur = (val: string) => {
    const pecas = parseInt(val) || 0;
    if (pecas <= 0) return;
    const caixas = Math.ceil(pecas / qtdPorCaixa);
    const pecasAjustadas = caixas * qtdPorCaixa;
    const alBruto = calcAlBruto(caixas, produtoSel);
    setForm((f) => ({
      ...f, qtde_pecas: String(pecasAjustadas), qtde_caixas: String(caixas), modo_entrada: 'pecas',
      aluminio_bruto: alBruto > 0 ? fmtNum(alBruto) : f.aluminio_bruto,
    }));
  };

  const preRelatorio = useMemo(() => {
    if (!produtoSel) return null;
    const caixas = parseInt(form.qtde_caixas) || 0;
    if (caixas === 0) return null;
    const totalPecas = caixas * (produtoSel.qtd_peca_placa ?? 1);
    const pesoUtilPecas = totalPecas * (produtoSel.peso_peca ?? 0);
    const pesoGalhoTotal = caixas * (produtoSel.peso_total_galho ?? 0);
    const aluminioEstimado = calcAlBruto(caixas, produtoSel);
    const pesoRetornoEst = calcRetorno(caixas, produtoSel);
    return { totalPecas, pesoUtilPecas, pesoGalhoTotal, aluminioEstimado, pesoRetornoEst };
  }, [form.qtde_caixas, produtoSel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.moldador_id) { setErro('Selecione o Moldador'); return; }
    if (!form.produto_id) { setErro('Selecione o produto'); return; }
    if (!form.qtde_caixas) { setErro('Informe a quantidade de caixas'); return; }
    setSubmitting(true); setErro('');
    try {
      const caixas = parseInt(form.qtde_caixas) || 0;
      await criarProducao({
        data: form.data,
        numero_op: form.numero_op || undefined,
        moldador_id: form.moldador_id,
        ajudante_id: form.ajudante_id || null,
        produto_id: form.produto_id,
        qtde_caixas: caixas,
        qtde_pecas: parseInt(form.qtde_pecas) || null,
        aluminio_bruto: parseFloat(form.aluminio_bruto.replace(',', '.')) || calcAlBruto(caixas, produtoSel),
        peso_retorno: calcRetorno(caixas, produtoSel),
        perdas_peca: parseFloat(form.perdas_peca) || 0,
        consumo_oleo: 0,
        tempo_horas: form.tempo_horas ? hhmmParaHoras(form.tempo_horas) : 0,
      });
      setForm({ ...FORM_VAZIO, data: form.data });
      setShowForm(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally { setSubmitting(false); }
  };

  const abrirEditar = (p: Producao) => {
    setEditando(p);
    const extra = p as unknown as Record<string, unknown>;
    setEditForm({
      data: p.data,
      numero_op: String(extra.numero_op ?? ''),
      moldador_id: p.moldador_id,
      ajudante_id: p.ajudante_id ?? '',
      produto_id: p.produto_id,
      qtde_caixas: String(p.qtde_caixas),
      perdas_peca: String(p.perdas_peca ?? ''),
      aluminio_bruto: String(p.aluminio_bruto ?? ''),
      tempo_horas: horasParaHHMM(p.tempo_horas ?? 0),
    });
    setEditErro('');
  };

  const salvarEdit = async () => {
    if (!editando) return;
    setSalvandoEdit(true); setEditErro('');
    try {
      const caixas = parseInt(editForm.qtde_caixas ?? '') || 0;
      const prodEdit = produtos.find((p) => p.id === editForm.produto_id);
      await atualizarProducao(editando.id, {
        data: editForm.data ?? editando.data,
        numero_op: editForm.numero_op || undefined,
        moldador_id: editForm.moldador_id ?? editando.moldador_id,
        ajudante_id: editForm.ajudante_id || null,
        qtde_caixas: caixas,
        aluminio_bruto: parseFloat((editForm.aluminio_bruto ?? '').replace(',', '.')) || calcAlBruto(caixas, prodEdit ?? null),
        peso_retorno: calcRetorno(caixas, prodEdit ?? null),
        perdas_peca: parseFloat(editForm.perdas_peca ?? '') || 0,
        tempo_horas: editForm.tempo_horas ? hhmmParaHoras(editForm.tempo_horas) : 0,
      });
      setEditando(null);
    } catch (err) {
      setEditErro(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally { setSalvandoEdit(false); }
  };

  const f = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const ef = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEditForm((prev) => ({ ...prev, [field]: e.target.value }));

  const lista = useMemo(() => {
    const q = busca.toLowerCase();
    return producoes.filter((p) => {
      if (!q) return true;
      const func = funcionarios.find((fn) => fn.id === p.moldador_id);
      const prod = produtos.find((pr) => pr.id === p.produto_id);
      return func?.nome.toLowerCase().includes(q) || prod?.nome.toLowerCase().includes(q) || p.data.includes(q);
    });
  }, [producoes, busca, funcionarios, produtos]);

  if (loading) return <Layout title="Apontamento de Producao"><div className="flex items-center justify-center py-20"><div className="spinner w-10 h-10" /></div></Layout>;

  return (
    <Layout title="Apontamento de Producao">
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <p className="text-slate-600 text-sm">{producoes.length} apontamentos registrados</p>
          <button className="btn-primary" onClick={() => { setShowForm(!showForm); setErro(''); }}>
            {showForm ? 'Fechar' : '+ Novo Apontamento'}
          </button>
        </div>

        {showForm && (
          <Card title="Registrar Apontamento">
            <form onSubmit={handleSubmit} className="space-y-5">
              {erro && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{erro}</div>}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Data *</label>
                  <input type="date" className="form-input" value={form.data} onChange={f('data')} required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">N. O.P.</label>
                  <input type="text" className="form-input" value={form.numero_op} onChange={f('numero_op')} placeholder="Ex: 5169" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Produto *</label>
                <ProdutoAutocomplete produtos={produtos} value={form.produto_id}
                  onChange={(id) => setForm((prev) => ({ ...prev, produto_id: id, qtde_caixas: '', qtde_pecas: '', aluminio_bruto: '' }))} />
              </div>

              {produtoSel && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                  <div><p className="text-xs text-slate-400">Pecas/Caixa</p><p className="font-semibold">{produtoSel.qtd_peca_placa ?? '--'}</p></div>
                  <div><p className="text-xs text-slate-400">Peso Peca</p><p className="font-semibold">{produtoSel.peso_peca ? produtoSel.peso_peca + ' kg' : '--'}</p></div>
                  <div><p className="text-xs text-slate-400">Peso Galho/Cx</p><p className="font-semibold">{produtoSel.peso_total_galho ? produtoSel.peso_total_galho + ' kg' : '--'}</p></div>
                  <div><p className="text-xs text-slate-400">% Retorno</p><p className="font-semibold">{produtoSel.percentual_retorno ? produtoSel.percentual_retorno + '%' : '--'}</p></div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Moldador *</label>
                  <select className="form-select" value={form.moldador_id} onChange={f('moldador_id')} required>
                    <option value="">Selecionar...</option>
                    {funcionarios.filter((fn) => fn.ativo).map((fn) => (
                      <option key={fn.id} value={fn.id}>{fn.nome} -- {fn.funcao}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Ajudante</label>
                  <select className="form-select" value={form.ajudante_id} onChange={f('ajudante_id')}>
                    <option value="">Nenhum</option>
                    {funcionarios.filter((fn) => fn.ativo && fn.id !== form.moldador_id).map((fn) => (
                      <option key={fn.id} value={fn.id}>{fn.nome} -- {fn.funcao}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Qtd. Caixas *
                    {produtoSel?.qtd_peca_placa && <span className="ml-1 text-xs text-slate-400 font-normal">({produtoSel.qtd_peca_placa} pecas/cx)</span>}
                  </label>
                  <input type="number" min="1" step="1" className="form-input" value={form.qtde_caixas}
                    onChange={(e) => setQtdCaixas(e.target.value)} placeholder="Ex: 10" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Qtd. Pecas
                    {form.modo_entrada === 'pecas' && form.qtde_caixas && (
                      <span className="ml-1 text-xs text-blue-500 font-normal">ajustado para {form.qtde_caixas} cx</span>
                    )}
                  </label>
                  <input type="number" min="1" step="1" className="form-input" value={form.qtde_pecas}
                    onChange={(e) => setForm((prev) => ({ ...prev, qtde_pecas: e.target.value }))}
                    onBlur={(e) => setQtdPecasBlur(e.target.value)}
                    placeholder={produtoSel?.qtd_peca_placa ? 'Multiplo de ' + produtoSel.qtd_peca_placa : 'Ex: 200'} />
                </div>
              </div>

              {preRelatorio && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">Estimativa deste apontamento</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    {[
                      ['Total Pecas', String(preRelatorio.totalPecas), ''],
                      ['Peso Util', fmtNum(preRelatorio.pesoUtilPecas) + ' kg', ''],
                      ['Peso Galhos', fmtNum(preRelatorio.pesoGalhoTotal) + ' kg', ''],
                      ['Al. Bruto Est.', fmtNum(preRelatorio.aluminioEstimado) + ' kg', 'text-orange-600'],
                      ['Retorno Est.', fmtNum(preRelatorio.pesoRetornoEst) + ' kg', 'text-green-600'],
                    ].map(([label, val, cls]) => (
                      <div key={label} className="bg-white rounded p-2 text-center">
                        <p className="text-xs text-slate-400">{label}</p>
                        <p className={'text-lg font-bold text-slate-800 ' + cls}>{val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Aluminio Bruto (kg)</label>
                  <input type="text" className="form-input" value={form.aluminio_bruto} onChange={f('aluminio_bruto')}
                    placeholder={preRelatorio ? fmtNum(preRelatorio.aluminioEstimado) : '0'} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Perdas (pecas)</label>
                  <input type="number" step="1" min="0" className="form-input" value={form.perdas_peca} onChange={f('perdas_peca')} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tempo (HH:MM)</label>
                  <input type="time" className="form-input" value={form.tempo_horas} onChange={f('tempo_horas')} />
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Salvando...' : 'Salvar Apontamento'}</button>
                <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setErro(''); }}>Cancelar</button>
              </div>
            </form>
          </Card>
        )}

        <Card title={'Apontamentos (' + lista.length + ')'}>
          <div className="mb-3">
            <input className="form-input max-w-xs" placeholder="Buscar por moldador, produto ou data..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Data', 'O.P.', 'Moldador', 'Ajudante', 'Produto', 'Caixas', 'Al. Bruto', 'Horas', ''].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((p) => {
                  const moldador = funcionarios.find((fn) => fn.id === p.moldador_id);
                  const ajudante = funcionarios.find((fn) => fn.id === p.ajudante_id);
                  const produto = produtos.find((pr) => pr.id === p.produto_id);
                  const extra = p as unknown as Record<string, unknown>;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-mono text-xs">{p.data}</td>
                      <td className="px-3 py-2 text-slate-400 text-xs">{String(extra.numero_op ?? '--')}</td>
                      <td className="px-3 py-2 font-semibold">{moldador?.nome ?? '--'}</td>
                      <td className="px-3 py-2 text-slate-500">{ajudante?.nome ?? '--'}</td>
                      <td className="px-3 py-2 text-slate-700 max-w-xs truncate" title={produto?.nome}>{produto?.nome ?? '--'}</td>
                      <td className="px-3 py-2 text-right font-mono">{p.qtde_caixas}</td>
                      <td className="px-3 py-2 text-right font-mono">{(p.aluminio_bruto ?? 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono">{horasParaHHMM(p.tempo_horas ?? 0)}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => abrirEditar(p)} className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50">Editar</button>
                          <button onClick={() => setConfirmarDelete(p.id)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">Excluir</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {lista.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-slate-400">Nenhum apontamento encontrado</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <Modal isOpen={!!editando} onClose={() => setEditando(null)} title="Editar Apontamento" size="lg">
          {editando && (
            <div className="space-y-4">
              {editErro && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{editErro}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Data</label>
                  <input type="date" className="form-input" value={editForm.data ?? ''} onChange={ef('data')} /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">N. O.P.</label>
                  <input type="text" className="form-input" value={editForm.numero_op ?? ''} onChange={ef('numero_op')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Moldador</label>
                  <select className="form-select" value={editForm.moldador_id ?? ''} onChange={ef('moldador_id')}>
                    {funcionarios.filter((fn) => fn.ativo).map((fn) => <option key={fn.id} value={fn.id}>{fn.nome}</option>)}
                  </select></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Ajudante</label>
                  <select className="form-select" value={editForm.ajudante_id ?? ''} onChange={ef('ajudante_id')}>
                    <option value="">Nenhum</option>
                    {funcionarios.filter((fn) => fn.ativo).map((fn) => <option key={fn.id} value={fn.id}>{fn.nome}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Qtd. Caixas</label>
                  <input type="number" min="1" className="form-input" value={editForm.qtde_caixas ?? ''} onChange={ef('qtde_caixas')} /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Perdas (pecas)</label>
                  <input type="number" min="0" className="form-input" value={editForm.perdas_peca ?? ''} onChange={ef('perdas_peca')} /></div>
                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Tempo (HH:MM)</label>
                  <input type="time" className="form-input" value={editForm.tempo_horas ?? ''} onChange={ef('tempo_horas')} /></div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={salvarEdit} className="btn-primary" disabled={salvandoEdit}>{salvandoEdit ? 'Salvando...' : 'Salvar'}</button>
                <button onClick={() => setEditando(null)} className="btn-secondary">Cancelar</button>
              </div>
            </div>
          )}
        </Modal>

        <Modal isOpen={!!confirmarDelete} onClose={() => setConfirmarDelete(null)} title="Excluir Apontamento" size="sm">
          <p className="text-slate-700 mb-4">Tem certeza que deseja excluir este apontamento? Esta acao nao pode ser desfeita.</p>
          <div className="flex gap-3">
            <button onClick={async () => { if (confirmarDelete) { await deletarProducao(confirmarDelete); setConfirmarDelete(null); } }} className="btn-danger">Excluir</button>
            <button onClick={() => setConfirmarDelete(null)} className="btn-secondary">Cancelar</button>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
