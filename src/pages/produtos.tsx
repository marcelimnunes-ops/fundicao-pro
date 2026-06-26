import { useState } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { supabase } from '@/lib/supabase';

export default function ProdutosPage() {
  const { produtos, loading, error } = useProducao();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    peso_peca: '',
    peso_galho: '',
    qtd_pecas_placa: '',
    material: 'Alumínio',
    preco_venda: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await supabase.from('produtos').insert([
        {
          ...formData,
          peso_peca: parseFloat(formData.peso_peca),
          peso_galho: parseFloat(formData.peso_galho),
        },
      ]);

      setFormData({
        codigo: '',
        nome: '',
        peso_peca: '',
        peso_galho: '',
        qtd_pecas_placa: '',
        material: 'Alumínio',
        preco_venda: '',
      });
      setShowForm(false);
      // Trigger refresh aqui se houver hook para refetch
    } catch (err) {
      console.error('Erro ao criar produto:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Produtos">
        <div className="text-center py-12">
          <div className="spinner w-12 h-12 mx-auto mb-4"></div>
          <p>Carregando produtos...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Produtos">
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="subsection-title">Cadastro de Produtos</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary py-2"
          >
            {showForm ? '✕ Cancelar' : '+ Novo Produto'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 p-6 bg-slate-50 rounded-lg border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Código (ex: PCA-001)"
                name="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                className="form-input"
                required
              />
              <input
                type="text"
                placeholder="Nome do Produto"
                name="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="form-input"
                required
              />
              <input
                type="number"
                step="0.1"
                placeholder="Peso Peça (gramas)"
                name="peso_peca"
                value={formData.peso_peca}
                onChange={(e) => setFormData({ ...formData, peso_peca: e.target.value })}
                className="form-input"
                required
              />
              <input
                type="number"
                step="0.1"
                placeholder="Peso Galho (gramas)"
                name="peso_galho"
                value={formData.peso_galho}
                onChange={(e) => setFormData({ ...formData, peso_galho: e.target.value })}
                className="form-input"
                required
              />
              <input
                type="number"
                placeholder="Qtd Peças/Placa"
                name="qtd_pecas_placa"
                onChange={(e) => setFormData({ ...formData, qtd_pecas_placa: e.target.value })}
                className="form-input"
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Preço de Venda (opcional)"
                name="preco_venda"
                onChange={(e) => setFormData({ ...formData, preco_venda: e.target.value })}
                className="form-input"
              />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Salvando...' : 'Salvar Produto'}
            </button>
          </form>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="table-header">Código</th>
                <th className="table-header">Nome</th>
                <th className="table-header">Peso Peça</th>
                <th className="table-header">Peças/Placa</th>
                <th className="table-header">Preço</th>
                <th className="table-header">Status</th>
                <th className="table-header">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id} className="border-b hover:bg-slate-50">
                  <td className="table-cell font-semibold">{p.codigo}</td>
                  <td className="table-cell">{p.nome}</td>
                  <td className="table-cell">{p.peso_peca}g</td>
                  <td className="table-cell">{0}</td>
                  <td className="table-cell">
                    <span className={`badge ${p.ativo ? 'badge-success' : 'badge-danger'}`}>
                      {p.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <button className="text-blue-600 hover:text-blue-800 text-xs font-semibold">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
