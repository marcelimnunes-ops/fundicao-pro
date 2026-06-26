import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, Badge, Modal } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Cliente } from '@/lib/types';

interface FormData {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  email: string;
  telefone: string;
  celular: string;
  contato_nome: string;
  cidade: string;
  uf: string;
  prazo_pagamento_dias: string;
  observacoes: string;
}

const FORM_VAZIO: FormData = {
  razao_social: '',
  nome_fantasia: '',
  cnpj: '',
  email: '',
  telefone: '',
  celular: '',
  contato_nome: '',
  cidade: '',
  uf: '',
  prazo_pagamento_dias: '30',
  observacoes: '',
};

function nomeCurto(c: Cliente) {
  return c.nome_fantasia ?? c.razao_social;
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<FormData>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase.from('clientes').select('*').order('razao_social');
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
      razao_social: c.razao_social,
      nome_fantasia: c.nome_fantasia ?? '',
      cnpj: c.cnpj ?? '',
      email: c.email ?? '',
      telefone: c.telefone ?? '',
      celular: c.celular ?? '',
      contato_nome: c.contato_nome ?? '',
      cidade: c.cidade ?? '',
      uf: c.uf ?? '',
      prazo_pagamento_dias: String(c.prazo_pagamento_dias ?? 30),
      observacoes: c.observacoes ?? '',
    });
    setErro('');
    setShowModal(true);
  };

  const handleSalvar = async () => {
    if (!formData.razao_social.trim()) { setErro('Razão Social é obrigatória'); return; }
    setSalvando(true);
    setErro('');

    const payload = {
      razao_social: formData.razao_social.trim(),
      nome_fantasia: formData.nome_fantasia.trim() || null,
      cnpj: formData.cnpj.trim() || null,
      email: formData.email.trim() || null,
      telefone: formData.telefone.trim() || null,
      celular: formData.celular.trim() || null,
      contato_nome: formData.contato_nome.trim() || null,
      cidade: formData.cidade.trim() || null,
      uf: formData.uf.trim().toUpperCase() || null,
      prazo_pagamento_dias: parseInt(formData.prazo_pagamento_dias) || 30,
      observacoes: formData.observacoes.trim() || null,
    };

    try {
      if (editando) {
        const { data, error } = await supabase
          .from('clientes').update(payload).eq('id', editando.id).select().single();
        if (error) throw error;
        setClientes((prev) => prev.map((c) => (c.id === editando.id ? (data as Cliente) : c)));
        setSuccess('Cliente atualizado!');
      } else {
        const { data, error } = await supabase
          .from('clientes').insert([{ ...payload, ativo: true }]).select().single();
        if (error) throw error;
        setClientes((prev) => [...prev, data as Cliente]);
        setSuccess('Cliente criado!');
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
  };

  const handleToggleAtivo = async (c: Cliente) => {
    const { data, error } = await supabase
      .from('clientes').update({ ativo: !c.ativo }).eq('id', c.id).select().single();
    if (error) { alert(`Erro: ${error.message}`); return; }
    setClientes((prev) => prev.map((x) => (x.id === c.id ? (data as Cliente) : x)));
  };

  const setF = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
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

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm font-semibold">{success}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientes.map((c) => (
            <Card key={c.id} title={nomeCurto(c)}>
              <div className="space-y-2 text-sm">
                {c.nome_fantasia && c.razao_social !== c.nome_fantasia && (
                  <p className="text-xs text-slate-500">{c.razao_social}</p>
                )}
                {c.cnpj && (
                  <div>
                    <p className="text-slate-500 text-xs">CNPJ</p>
                    <p className="font-mono text-xs">{c.cnpj}</p>
                  </div>
                )}
                {c.email && <p className="text-xs text-slate-600">{c.email}</p>}
                {c.telefone && <p className="text-xs text-slate-600">{c.telefone}</p>}
                {c.cidade && (
                  <p className="text-xs text-slate-500">{c.cidade}{c.uf ? ` — ${c.uf}` : ''}</p>
                )}
                <div className="pt-2 border-t flex items-center justify-between">
                  <p className="text-xs text-slate-500">Prazo: {c.prazo_pagamento_dias ?? 30} dias</p>
                  <Badge variant={c.ativo ? 'success' : 'danger'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => abrirEditar(c)} className="flex-1 btn-secondary text-xs py-1">Editar</button>
                  <button onClick={() => handleToggleAtivo(c)} className="text-yellow-600 hover:text-yellow-800 text-xs font-semibold px-2">{c.ativo ? 'Inativar' : 'Ativar'}</button>
                  <button onClick={() => handleDeletar(c.id)} className="text-red-600 hover:text-red-800 text-xs font-semibold px-2">✕</button>
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
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Razão Social / Nome <span className="text-red-500">*</span>
              </label>
              <input className="form-input" value={formData.razao_social} onChange={setF('razao_social')} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Fantasia / Apelido</label>
              <input className="form-input" value={formData.nome_fantasia} onChange={setF('nome_fantasia')} placeholder="Como é conhecido internamente" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">CNPJ</label>
                <input className="form-input" value={formData.cnpj} onChange={setF('cnpj')} placeholder="XX.XXX.XXX/XXXX-XX" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Prazo Pagamento (dias)</label>
                <input type="number" min="0" className="form-input" value={formData.prazo_pagamento_dias} onChange={setF('prazo_pagamento_dias')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                <input type="email" className="form-input" value={formData.email} onChange={setF('email')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Telefone</label>
                <input className="form-input" value={formData.telefone} onChange={setF('telefone')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Celular</label>
                <input className="form-input" value={formData.celular} onChange={setF('celular')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Contato (nome)</label>
                <input className="form-input" value={formData.contato_nome} onChange={setF('contato_nome')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Cidade</label>
                <input className="form-input" value={formData.cidade} onChange={setF('cidade')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">UF</label>
                <input maxLength={2} className="form-input" value={formData.uf} onChange={setF('uf')} placeholder="SP" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Observações</label>
              <textarea className="form-input" rows={2} value={formData.observacoes} onChange={setF('observacoes')} />
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
