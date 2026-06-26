import { useState } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card, FormInput, Button, Badge } from '@/components/ui';

export default function ProdutosPage() {
  const { produtos, loading } = useProducao();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ codigo: '', nome: '', descricao: '' });

  if (loading) {
    return (
      <Layout title="Produtos">
        <div className="text-center py-12">Carregando...</div>
      </Layout>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowForm(false);
    setFormData({ codigo: '', nome: '', descricao: '' });
  };

  return (
    <Layout title="Produtos">
      <div className="space-y-6">
        <Card title="📦 Produtos Cadastrados">
          <div className="mb-4">
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancelar' : '+ Novo Produto'}
            </Button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-50 rounded-lg space-y-4">
              <FormInput
                label="Código"
                name="codigo"
                value={formData.codigo}
                onChange={handleChange}
                placeholder="Ex: PROD001"
              />
              <FormInput
                label="Nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                placeholder="Ex: Peça de Alumínio"
              />
              <FormInput
                label="Descrição"
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                placeholder="Descrição do produto"
              />
              <Button type="submit">Salvar</Button>
            </form>
          )}

          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left">Código</th>
                <th className="p-2 text-left">Nome</th>
                <th className="p-2 text-left">Descrição</th>
                <th className="p-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id} className="border-b hover:bg-slate-50">
                  <td className="p-2 font-semibold">{p.codigo}</td>
                  <td className="p-2">{p.nome}</td>
                  <td className="p-2 text-slate-600">{p.descricao || '-'}</td>
                  <td className="p-2 text-center">
                    <Badge variant="success">Ativo</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </Layout>
  );
}
