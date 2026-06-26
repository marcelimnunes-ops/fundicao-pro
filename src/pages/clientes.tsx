import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, Badge, Modal, Alert } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Cliente } from '@/lib/types';

interface FormData {
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  contato_nome: string;
  margem_padrao: string;
}

const FORM_VAZIO: FormData = {
  nome: '',
  cnpj: '',
  email: '',
  telefone: '',
  contato_nome: '',
  margem_padrao: '20',
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<FormData>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase.from('clientes').select('*').order('nome');
    setClientes((data as Cliente[]) || []);
    setLoading(false);
  };

  const abrirNovo = () => {
    setEditando(null);
    setFormData(FORM_VAZIO);
    setErro('');
    setShowModal(true);
  };

  const abrirEditar = (c: Cliente) => {
    setEditando(c);
    setFormData({
      nome: c.nome,
      cnpj: c.cnpj ?? '',
      email: c.email ?? '',
      telefone: c.telefone ?? '',
      contato_nome: c.contato_nome ?? '',
      margem_padrao: String(c.margem_padrao),
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
      cnpj: formData.cnpj.trim() || null,
      email: formData.email.trim() || null,
      telefone: formData.telefone.trim() || null,
      contato_nome: formData.contato_nome.trim() || null,
      margem_padrao: parseFloat(formData.margem_padrao) || 20,
    };

    try {
      if (editando) {
        const { data, error } = await supabase
          .from('clientes').update(payload).eq('id', editando.id).select().single();
        if (error) throw error;
        setClientes((prev) => prev.map((c) => (c.id === editando.id ? (data as Cliente) : c)));
        setSuccess('Cliente atualizado com sucesso!');
      } else {
        const { data, error } = await supabase
          .from('clientes').insert([payload]).select().single();
        if (error) throw error;
        setClientes((prev) => [...prev, data as Cliente]);
        setSuccess('Cliente criado com sucesso!');
      }
      setShowModal(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletar = async (id: string) => {
    if (!confirm('Remover este cliente?')) return;
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) { alert(`Erro: ${error.message}`); return; }
    setClientes((prev) => prev.filter((c) => c.id !== id));
    setSuccess('Cliente removido.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const set = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  if (loading) {
    return (
      <Layout title="Clientes">
        <div className="text-center py-12">Carregando clientes...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Gestão de Clientes">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900">Clientes ({clientes.length})</h3>
          <button className="btn-primary" onClick={abrirNovo}>+ Novo Cliente</button>
        </div>

        {success && <Alert type="success" message={success} />}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientes.map((c) => (
            <Card key={c.id} title={c.nome}>
              <div className="space-y-2 text-sm">
                {c.cnpj && (
                  <div>
                    <p className="text-slate-500 text-xs">CNPJ</p>
                    <p className="font-semibold">{c.cnpj}</p>
                  </div>
                )}
                {c.email && (
                  <div>
                    <p className="text-slate-500 text-xs">Email</p>
                    <p className="font-semibold">{c.email}</p>
                  </div>
                )}
                {c.telefone && (
                  <div>
                    <p className="text-slate-500 text-xs">Telefone</p>
                    <p className="font-semibold">{c.telefone}</p>
                  </div>
                )}
                <div className="pt-2 border-t flex items-center justify-between">
                  <div>
                    <p className="text-slate-500 text-xs">Margem Padrão</p>
                    <p className="font-bold text-lg text-orange-600">{c.margem_padrao}%</p>
                  </div>
                  <Badge variant={c.ativo ? 'success' : 'danger'}>
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => abrirEditar(c)} className="flex-1 btn-secondary text-xs py-1">Editar</button>
                  <button onClick={() => handleDeletar(c.id)} className="flex-1 btn-danger text-xs py-1">Remover</button>
                </div>
              </div>
            </Card>
          ))}
          {clientes.length === 0 && (
            <div className="col-span-3 text-center py-12">
              <p className="text-slate-500 mb-4">Nenhum cliente cadastrado</p>
              <button className="btn-primary" onClick={abrirNovo}>Criar Primeiro Cliente</button>
            </div>
          )}
        </div>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editando ? 'Editar Cliente' : 'Novo Cliente'}
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
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nome <span className="text-red-500">*</span>
              </label>
              <input className="form-input" value={formData.nome} onChange={set('nome')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">CNPJ</label>
                <input className="form-input" value={formData.cnpj} onChange={set('cnpj')} placeholder="XX.XXX.XXX/XXXX-XX" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                <input type="email" className="form-input" value={formData.email} onChange={set('email')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Telefone</label>
                <input className="form-input" value={formData.telefone} onChange={set('telefone')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Contato</label>
                <input className="form-input" value={formData.contato_nome} onChange={set('contato_nome')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Margem Padrão (%)</label>
                <input type="number" step="0.5" min="0" className="form-input" value={formData.margem_padrao} onChange={set('margem_padrao')} />
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
