import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, Badge, Modal } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Funcionario } from '@/lib/types';

const FUNCOES = [
  'Moldador', 'Ajudante', 'Forno', 'Fusionista', 'Macheiro',
  'Rebarbador', 'Usinagem', 'Pintor', 'Expedição', 'Supervisor', 'Gerente',
];

interface FormData {
  nome: string;
  funcao: string;
  cpf: string;
  telefone: string;
  email: string;
  data_admissao: string;
  salario: string;
  cartao_beneficio: string;
  pin_tablet: string;
}

const FORM_VAZIO: FormData = {
  nome: '',
  funcao: 'Moldador',
  cpf: '',
  telefone: '',
  email: '',
  data_admissao: '',
  salario: '0',
  cartao_beneficio: '0',
  pin_tablet: '',
};

function fmtBrl(n?: number | null) {
  if (n == null) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Funcionario | null>(null);
  const [formData, setFormData] = useState<FormData>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('funcionarios')
      .select('*')
      .order('nome');
    if (error) console.error('Erro ao carregar:', error.message);
    setFuncionarios((data as Funcionario[]) || []);
    setLoading(false);
  };

  const abrirNovo = () => {
    setEditando(null);
    setFormData(FORM_VAZIO);
    setErro('');
    setShowModal(true);
  };

  const abrirEditar = (f: Funcionario) => {
    setEditando(f);
    setFormData({
      nome: f.nome,
      funcao: f.funcao,
      cpf: f.cpf ?? '',
      telefone: f.telefone ?? '',
      email: f.email ?? '',
      data_admissao: f.data_admissao ?? '',
      salario: String(f.salario ?? 0),
      cartao_beneficio: String(f.cartao_beneficio ?? 0),
      pin_tablet: f.pin_tablet ?? '',
    });
    setErro('');
    setShowModal(true);
  };

  const handleSalvar = async () => {
    if (!formData.nome.trim()) { setErro('Nome é obrigatório'); return; }
    setSalvando(true);
    setErro('');

    const payload = {
      nome: formData.nome.trim(),
      funcao: formData.funcao,
      cpf: formData.cpf.trim() || null,
      telefone: formData.telefone.trim() || null,
      email: formData.email.trim() || null,
      data_admissao: formData.data_admissao || null,
      salario: parseFloat(formData.salario) || 0,
      cartao_beneficio: parseFloat(formData.cartao_beneficio) || 0,
      pin_tablet: formData.pin_tablet.trim() || null,
    };

    try {
      if (editando) {
        const { data, error } = await supabase
          .from('funcionarios').update(payload).eq('id', editando.id).select().single();
        if (error) throw error;
        setFuncionarios((prev) => prev.map((f) => (f.id === editando.id ? (data as Funcionario) : f)));
      } else {
        const { data, error } = await supabase
          .from('funcionarios').insert([{ ...payload, ativo: true }]).select().single();
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

  const handleDeletar = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este funcionário?')) return;
    const { error } = await supabase.from('funcionarios').delete().eq('id', id);
    if (error) { alert(`Erro: ${error.message}`); return; }
    setFuncionarios((prev) => prev.filter((f) => f.id !== id));
  };

  const handleToggleAtivo = async (f: Funcionario) => {
    const { data, error } = await supabase
      .from('funcionarios').update({ ativo: !f.ativo }).eq('id', f.id).select().single();
    if (error) { alert(`Erro: ${error.message}`); return; }
    setFuncionarios((prev) => prev.map((x) => (x.id === f.id ? (data as Funcionario) : x)));
  };

  const setF = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const custoHoraCalc = (formData.salario && formData.cartao_beneficio)
    ? ((parseFloat(formData.salario) + parseFloat(formData.cartao_beneficio)) / 176).toFixed(2)
    : null;

  if (loading) {
    return (
      <Layout title="Funcionários">
        <div className="text-center py-12"><div className="spinner w-12 h-12 mx-auto mb-4"></div><p>Carregando...</p></div>
      </Layout>
    );
  }

  return (
    <Layout title="Funcionários">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900">Funcionários ({funcionarios.length})</h3>
          <button className="btn-primary" onClick={abrirNovo}>+ Novo Funcionário</button>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-left">Nome</th>
                  <th className="p-3 text-left">Função</th>
                  <th className="p-3 text-right">Salário</th>
                  <th className="p-3 text-right">Cartão</th>
                  <th className="p-3 text-right">Custo/h</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {funcionarios.map((f) => (
                  <tr key={f.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-semibold">{f.nome}</td>
                    <td className="p-3 text-slate-600">{f.funcao}</td>
                    <td className="p-3 text-right font-mono">{fmtBrl(f.salario)}</td>
                    <td className="p-3 text-right font-mono">{fmtBrl(f.cartao_beneficio)}</td>
                    <td className="p-3 text-right font-mono">{fmtBrl(f.custo_hora)}</td>
                    <td className="p-3 text-center">
                      <Badge variant={f.ativo ? 'success' : 'danger'}>{f.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => abrirEditar(f)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Editar</button>
                        <button onClick={() => handleToggleAtivo(f)} className="text-yellow-600 hover:text-yellow-800 text-xs font-semibold">{f.ativo ? 'Inativar' : 'Ativar'}</button>
                        <button onClick={() => handleDeletar(f.id)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Remover</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {funcionarios.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">Nenhum funcionário cadastrado</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editando ? 'Editar Funcionário' : 'Novo Funcionário'}
          size="md"
          footer={
            <div className="flex gap-3">
              <button className="btn-primary" onClick={handleSalvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
            </div>
          }
        >
          <div className="space-y-4">
            {erro && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{erro}</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome <span className="text-red-500">*</span></label>
                <input className="form-input" value={formData.nome} onChange={setF('nome')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Função</label>
                <select className="form-select" value={formData.funcao} onChange={setF('funcao')}>
                  {FUNCOES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Data Admissão</label>
                <input type="date" className="form-input" value={formData.data_admissao} onChange={setF('data_admissao')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Salário (R$)</label>
                <input type="number" step="0.01" min="0" className="form-input" value={formData.salario} onChange={setF('salario')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Cartão Benefício (R$)</label>
                <input type="number" step="0.01" min="0" className="form-input" value={formData.cartao_beneficio} onChange={setF('cartao_beneficio')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">CPF</label>
                <input className="form-input" value={formData.cpf} onChange={setF('cpf')} placeholder="000.000.000-00" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Telefone</label>
                <input className="form-input" value={formData.telefone} onChange={setF('telefone')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                <input type="email" className="form-input" value={formData.email} onChange={setF('email')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">PIN Tablet (6 dígitos)</label>
                <input maxLength={6} className="form-input" value={formData.pin_tablet} onChange={setF('pin_tablet')} placeholder="123456" />
              </div>
            </div>
            {custoHoraCalc && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                Custo/hora calculado: <strong>R$ {custoHoraCalc}</strong>
                <span className="text-blue-600 text-xs ml-1">= (salário + cartão) ÷ 176h</span>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
