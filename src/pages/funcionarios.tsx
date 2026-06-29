import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, Badge, Modal } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Funcionario } from '@/lib/types';

interface Funcao { id: string; nome: string }

interface FormData {
  nome: string;
  funcao: string;
  data_admissao: string;
  salario: string;
  cartao_beneficio: string;
  pin_tablet: string;
  codigo_erp: string;
}

const FORM_VAZIO: FormData = {
  nome: '',
  funcao: '',
  data_admissao: '',
  salario: '',
  cartao_beneficio: '',
  pin_tablet: '',
  codigo_erp: '',
};

function fmtBrl(n?: number | null) {
  if (n == null || n === 0) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtCusto(n?: number | null) {
  if (!n) return '—';
  return `R$ ${n.toFixed(2)}/h`;
}

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroFuncao, setFiltroFuncao] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFuncaoModal, setShowFuncaoModal] = useState(false);
  const [editando, setEditando] = useState<Funcionario | null>(null);
  const [formData, setFormData] = useState<FormData>(FORM_VAZIO);
  const [novaFuncao, setNovaFuncao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    setLoading(true);
    const [{ data: f }, { data: fn }] = await Promise.all([
      supabase.from('funcionarios').select('*').order('nome'),
      supabase.from('funcoes').select('id, nome').eq('ativo', true).order('nome'),
    ]);
    setFuncionarios((f as Funcionario[]) || []);
    setFuncoes((fn as Funcao[]) || []);
    setLoading(false);
  };

  const abrirNovo = () => {
    setEditando(null);
    setFormData({ ...FORM_VAZIO, funcao: funcoes[0]?.nome ?? '' });
    setErro('');
    setShowModal(true);
  };

  const abrirEditar = (f: Funcionario) => {
    setEditando(f);
    setFormData({
      nome: f.nome,
      funcao: f.funcao ?? '',
      data_admissao: f.data_admissao ?? '',
      salario: f.salario ? String(f.salario) : '',
      cartao_beneficio: f.cartao_beneficio ? String(f.cartao_beneficio) : '',
      pin_tablet: f.pin_tablet ?? '',
      codigo_erp: f.codigo_erp ?? '',
    });
    setErro('');
    setShowModal(true);
  };

  const handleSalvar = async () => {
    if (!formData.nome.trim()) { setErro('Nome é obrigatório'); return; }
    if (!formData.funcao) { setErro('Selecione uma função'); return; }
    setSalvando(true);
    setErro('');

    const payload = {
      nome: formData.nome.trim(),
      funcao: formData.funcao,
      data_admissao: formData.data_admissao || null,
      salario: parseFloat(formData.salario.replace(',', '.')) || 0,
      cartao_beneficio: parseFloat(formData.cartao_beneficio.replace(',', '.')) || 0,
      pin_tablet: formData.pin_tablet.trim() || null,
      codigo_erp: formData.codigo_erp.trim() || null,
    };

    try {
      if (editando) {
        const { data, error } = await supabase.from('funcionarios').update(payload).eq('id', editando.id).select().single();
        if (error) throw error;
        setFuncionarios((prev) => prev.map((f) => (f.id === editando.id ? (data as Funcionario) : f)));
      } else {
        const { data, error } = await supabase.from('funcionarios').insert([{ ...payload, ativo: true }]).select().single();
        if (error) throw error;
        setFuncionarios((prev) => [...prev, data as Funcionario]);
      }
      setShowModal(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const handleSalvarFuncao = async () => {
    if (!novaFuncao.trim()) return;
    const { data, error } = await supabase.from('funcoes').insert({ nome: novaFuncao.trim() }).select().single();
    if (error) { alert(error.message); return; }
    setFuncoes((prev) => [...prev, data as Funcao].sort((a, b) => a.nome.localeCompare(b.nome)));
    setFormData((prev) => ({ ...prev, funcao: (data as Funcao).nome }));
    setNovaFuncao('');
    setShowFuncaoModal(false);
  };

  const handleDeletar = async (id: string) => {
    if (!confirm('Remover funcionário?')) return;
    const { error } = await supabase.from('funcionarios').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    setFuncionarios((prev) => prev.filter((f) => f.id !== id));
  };

  const handleToggleAtivo = async (f: Funcionario) => {
    const { data, error } = await supabase.from('funcionarios').update({ ativo: !f.ativo }).eq('id', f.id).select().single();
    if (error) { alert(error.message); return; }
    setFuncionarios((prev) => prev.map((x) => (x.id === f.id ? (data as Funcionario) : x)));
  };

  const setF = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const custoCalc = (() => {
    const s = parseFloat(formData.salario.replace(',', '.')) || 0;
    const c = parseFloat(formData.cartao_beneficio.replace(',', '.')) || 0;
    return s + c > 0 ? ((s + c) / 176).toFixed(2) : null;
  })();

  const lista = funcionarios.filter((f) => {
    const q = busca.toLowerCase();
    const matchBusca = !q || f.nome.toLowerCase().includes(q) || (f.codigo ?? '').toLowerCase().includes(q) || (f.codigo_erp ?? '').toLowerCase().includes(q);
    const matchFuncao = !filtroFuncao || f.funcao === filtroFuncao;
    return matchBusca && matchFuncao;
  });

  const ativos = funcionarios.filter((f) => f.ativo).length;

  if (loading) {
    return (
      <Layout title="Funcionários">
        <div className="flex items-center justify-center py-20">
          <div className="spinner w-10 h-10" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Funcionários">
      <div className="space-y-5">

        {/* Sumário */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: funcionarios.length, color: 'text-slate-700' },
            { label: 'Ativos', value: ativos, color: 'text-green-600' },
            { label: 'Inativos', value: funcionarios.length - ativos, color: 'text-red-500' },
            { label: 'Funções', value: funcoes.length, color: 'text-blue-600' },
          ].map((s) => (
            <Card key={s.label}>
              <p className="text-xs text-slate-500 uppercase tracking-wide">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </Card>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-3 flex-1">
            <input
              className="form-input flex-1 max-w-xs"
              placeholder="Buscar por nome ou código…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <select className="form-select w-44" value={filtroFuncao} onChange={(e) => setFiltroFuncao(e.target.value)}>
              <option value="">Todas as funções</option>
              {funcoes.map((fn) => <option key={fn.id} value={fn.nome}>{fn.nome}</option>)}
            </select>
          </div>
          <button className="btn-primary whitespace-nowrap" onClick={abrirNovo}>+ Novo Funcionário</button>
        </div>

        {/* Tabela */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Função</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Salário</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Cartão</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Custo/h</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lista.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{f.codigo ?? '—'}</span>
                      {f.codigo_erp && <span className="ml-1 font-mono text-xs text-slate-400">({f.codigo_erp})</span>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{f.nome}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {f.funcao}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{fmtBrl(f.salario)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{fmtBrl(f.cartao_beneficio)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-slate-700">{fmtCusto(f.custo_hora)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={f.ativo ? 'success' : 'danger'}>{f.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => abrirEditar(f)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline">Editar</button>
                        <button onClick={() => handleToggleAtivo(f)} className="text-xs text-amber-600 hover:text-amber-800 font-semibold hover:underline">{f.ativo ? 'Inativar' : 'Ativar'}</button>
                        <button onClick={() => handleDeletar(f.id)} className="text-xs text-red-600 hover:text-red-800 font-semibold hover:underline">Remover</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {lista.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      {busca || filtroFuncao ? 'Nenhum resultado para o filtro atual' : 'Nenhum funcionário cadastrado'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Modal funcionário */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editando ? 'Editar Funcionário' : 'Novo Funcionário'}
        size="md"
        footer={
          <div className="flex gap-3">
            <button className="btn-primary" onClick={handleSalvar} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
          </div>
        }
      >
        <div className="space-y-4">
          {erro && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{erro}</div>}

          <div className="grid grid-cols-2 gap-4">
            {/* Nome */}
            <div className="col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nome completo <span className="text-red-500">*</span></label>
              <input className="form-input" value={formData.nome} onChange={setF('nome')} placeholder="Ex: João da Silva" autoFocus />
            </div>

            {/* Função */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Função <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <select className="form-select flex-1" value={formData.funcao} onChange={setF('funcao')}>
                  <option value="">Selecione…</option>
                  {funcoes.map((fn) => <option key={fn.id} value={fn.nome}>{fn.nome}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => { setNovaFuncao(''); setShowFuncaoModal(true); }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-semibold transition-colors"
                  title="Nova função"
                >+</button>
              </div>
            </div>

            {/* Admissão */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Data Admissão</label>
              <input type="date" className="form-input" value={formData.data_admissao} onChange={setF('data_admissao')} />
            </div>

            {/* Salário */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Salário (R$)</label>
              <input type="number" step="0.01" min="0" className="form-input" value={formData.salario} onChange={setF('salario')} placeholder="0,00" />
            </div>

            {/* Cartão */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Cartão Benefício (R$)</label>
              <input type="number" step="0.01" min="0" className="form-input" value={formData.cartao_beneficio} onChange={setF('cartao_beneficio')} placeholder="0,00" />
            </div>

            {/* PIN */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">PIN Tablet</label>
              <input maxLength={6} className="form-input" value={formData.pin_tablet} onChange={setF('pin_tablet')} placeholder="6 dígitos" />
            </div>

            {/* ERP */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Código ERP</label>
              <input className="form-input" value={formData.codigo_erp} onChange={setF('codigo_erp')} placeholder="Código externo (opcional)" />
            </div>
          </div>

          {/* Preview custo/hora */}
          {custoCalc && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
              <span>🧮</span>
              <span>Custo/hora calculado: <strong>R$ {custoCalc}/h</strong></span>
              <span className="text-blue-500 text-xs ml-1">= (salário + cartão) ÷ 176 h</span>
            </div>
          )}

          {/* Código auto (modo edição) */}
          {editando?.codigo && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
              <span>Código automático:</span>
              <span className="font-mono font-semibold text-slate-700">{editando.codigo}</span>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal nova função */}
      <Modal
        isOpen={showFuncaoModal}
        onClose={() => setShowFuncaoModal(false)}
        title="Nova Função"
        size="sm"
        footer={
          <div className="flex gap-3">
            <button className="btn-primary" onClick={handleSalvarFuncao}>Salvar</button>
            <button className="btn-secondary" onClick={() => setShowFuncaoModal(false)}>Cancelar</button>
          </div>
        }
      >
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Nome da função</label>
          <input
            className="form-input"
            value={novaFuncao}
            onChange={(e) => setNovaFuncao(e.target.value)}
            placeholder="Ex: Operador CNC"
            onKeyDown={(e) => e.key === 'Enter' && handleSalvarFuncao()}
            autoFocus
          />
        </div>
      </Modal>
    </Layout>
  );
}
