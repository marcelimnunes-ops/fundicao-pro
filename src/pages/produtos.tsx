import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, Badge, Modal } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Produto } from '@/lib/types';

interface FormData {
  codigo: string;
  nome: string;
  descricao: string;
}

const FORM_VAZIO: FormData = { codigo: '', nome: '', descricao: '' };

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [formData, setFormData] = useState<FormData>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase.from('produtos').select('*').order('codigo');
    setProdutos((data as Produto[]) || []);
    setLoading(false);
  };

  const abrirNovo = () => {
    setEditando(null);
    setFormData(FORM_VAZIO);
    setErro('');
    setShowModal(true);
  };

  const abrirEditar = (p: Produto) => {
    setEditando(p);
    setFormData({ codigo: p.codigo, nome: p.nome, descricao: p.descricao ?? '' });
    setErro('');
    setShowModal(true);
  };

  const handleSalvar = async () => {
    if (!formData.codigo.trim()) { setErro('Código é obrigatório'); return; }
    if (!formData.nome.trim()) { setErro('Nome é obrigatório'); return; }
    setSalvando(true);
    setErro('');

    const payload = {
      codigo: formData.codigo.trim().toUpperCase(),
      nome: formData.nome.trim(),
      descricao: formData.descricao.trim() || null,
    };

    try {
      if (editando) {
        const { data, error } = await supabase
          .from('produtos').update(payload).eq('id', editando.id).select().single();
        if (error) throw error;
        setProdutos((prev) => prev.map((p) => (p.id === editando.id ? (data as Produto) : p)));
      } else {
        const { data, error } = await supabase
          .from('produtos').insert([payload]).select().single();
        if (error) throw error;
        setProdutos((prev) => [...prev, data as Produto]);
      }
      setShowModal(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletar = async (id: string) => {
    if (!confirm('Remover este produto?')) return;
    const { error } = await supabase.from('produtos').delete().eq('id', id);
    if (error) { alert(`Erro: ${error.message}`); return; }
    setProdutos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleToggleAtivo = async (p: Produto) => {
    const { data, error } = await supabase
      .from('produtos').update({ ativo: !p.ativo }).eq('id', p.id).select().single();
    if (error) { alert(`Erro: ${error.message}`); return; }
    setProdutos((prev) => prev.map((x) => (x.id === p.id ? (data as Produto) : x)));
  };

  const set = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const produtosFiltrados = busca
    ? produtos.filter(
        (p) =>
          p.codigo.toLowerCase().includes(busca.toLowerCase()) ||
          p.nome.toLowerCase().includes(busca.toLowerCase())
      )
    : produtos;

  if (loading) {
    return (
      <Layout title="Produtos">
        <div className="text-center py-12">Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Produtos">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900">Produtos ({produtos.length})</h3>
          <button className="btn-primary" onClick={abrirNovo}>+ Novo Produto</button>
        </div>

        <Card>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar por código ou nome..."
              className="form-input max-w-sm"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-left">Código</th>
                  <th className="p-3 text-left">Nome</th>
                  <th className="p-3 text-left">Descrição</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-mono font-semibold text-orange-600">{p.codigo}</td>
                    <td className="p-3 font-semibold">{p.nome}</td>
                    <td className="p-3 text-slate-600">{p.descricao ?? '—'}</td>
                    <td className="p-3 text-center">
                      <Badge variant={p.ativo ? 'success' : 'danger'}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => abrirEditar(p)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Editar</button>
                        <button onClick={() => handleToggleAtivo(p)} className="text-yellow-600 hover:text-yellow-800 text-xs font-semibold">{p.ativo ? 'Inativar' : 'Ativar'}</button>
                        <button onClick={() => handleDeletar(p.id)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Remover</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {produtosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      {busca ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
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
          title={editando ? 'Editar Produto' : 'Novo Produto'}
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
                Código <span className="text-red-500">*</span>
              </label>
              <input className="form-input" value={formData.codigo} onChange={set('codigo')} placeholder="Ex: PROD001" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nome <span className="text-red-500">*</span>
              </label>
              <input className="form-input" value={formData.nome} onChange={set('nome')} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Descrição</label>
              <input className="form-input" value={formData.descricao} onChange={set('descricao')} />
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
