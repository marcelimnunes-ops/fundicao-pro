import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, Badge, Modal } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Funcionario } from '@/lib/types';

const FUNCOES = ['Moldador', 'Ajudante', 'Operador', 'Supervisor'] as const;

interface FormData {
  nome: string;
  funcao: string;
  salario: string;
  vale: string;
  cartao_custo: string;
  custo_hora: string;
}

const FORM_VAZIO: FormData = {
  nome: '',
  funcao: 'Moldador',
  salario: '0',
  vale: '0',
  cartao_custo: '0',
  custo_hora: '0',
};

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
    const { data } = await supabase.from('funcionarios').select('*').order('nome');
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
      salario: String(f.salario ?? 0),
      vale: String(f.vale ?? 0),
      cartao_custo: String(f.cartao_custo ?? 0),
      custo_hora: String(f.custo_hora ?? 0),
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
      salario: parseFloat(formData.salario) || 0,
      vale: parseFloat(formData.vale) || 0,
      cartao_custo: parseFloat(formData.cartao_custo) || 0,
      custo_hora: parseFloat(formData.custo_hora) || 0,
    };

    try {
      if (editando) {
        const { data, error } = await supabase
          .from('funcionarios')
          .update(payload)
          .eq('id', editando.id)
          .select()
          .single();
        if (error) throw error;
        setFuncionarios((prev) => prev.map((f) => (f.id === editando.id ? (data as Funcionario) : f)));
      } else {
        const { data, error } = await supabase
          .from('funcionarios')
          .insert([payload])
          .select()
          .single();
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

  const handleInativar = async (f: Funcionario) => {
    const novoAtivo = !f.ativo;
    const { data, error } = await supabase
      .from('funcionarios')
      .update({ ativo: novoAtivo })
      .eq('id', f.id)
      .select()
      .single();
    if (error) { alert(`Erro: ${error.message}`); return; }
    setFuncionarios((prev) => prev.map((x) => (x.id === f.id ? (data as Funcionario) : x)));
  };

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  if (loading) {
    return (
      <Layout title="Funcionários">
        <div className="text-center py-12">
          <div className="spinner w-12 h-12 mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Funcionários">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900">
            Funcionários ({funcionarios.length})
          </h3>
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
                  <th className="p-3 text-right">Custo/h</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {funcionarios.map((f) => (
                  <tr key={f.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-semibold">{f.nome}</td>
                    <td className="p-3">{f.funcao}</td>
                    <td className="p-3 text-right">
                      {f.salario != null
                        ? f.salario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : '—'}
                    </td>
                    <td className="p-3 text-right">
                      {f.custo_hora != null
                        ? f.custo_hora.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : '—'}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={f.ativo ? 'success' : 'danger'}>
                        {f.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => abrirEditar(f)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleInativar(f)}
                          className="text-yellow-600 hover:text-yellow-800 text-xs font-semibold"
                        >
                          {f.ativo ? 'Inativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => handleDeletar(f.id)}
                          className="text-red-600 hover:text-red-800 text-xs font-semibold"
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {funcionarios.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Nenhum funcionário cadastrado
                    </td>
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
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {erro && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {erro}
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nome <span className="text-red-500">*</span>
              </label>
              <input className="form-input" value={formData.nome} onChange={set('nome')} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Função</label>
              <select className="form-select" value={formData.funcao} onChange={set('funcao')}>
                {FUNCOES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Salário (R$)</label>
                <input type="number" step="0.01" min="0" className="form-input" value={formData.salario} onChange={set('salario')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Vale (R$)</label>
                <input type="number" step="0.01" min="0" className="form-input" value={formData.vale} onChange={set('vale')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Cartão Custo (R$)</label>
                <input type="number" step="0.01" min="0" className="form-input" value={formData.cartao_custo} onChange={set('cartao_custo')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Custo/Hora (R$)</label>
                <input type="number" step="0.01" min="0" className="form-input" value={formData.custo_hora} onChange={set('custo_hora')} />
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
