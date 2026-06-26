import { useState } from 'react';
import Layout from '@/components/Layout';
import { useClientes } from '@/hooks/useClientes';
import { Button, Card, FormInput, Alert } from '@/components/ui';

export default function ClientesPage() {
  const { clientes, criarCliente, loading, error } = useClientes();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    email: '',
    telefone: '',
    contato_nome: '',
    margem_padrao: '20',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await criarCliente({
        ...formData,
        margem_padrao: parseFloat(formData.margem_padrao),
      });

      setFormData({
        nome: '',
        cnpj: '',
        email: '',
        telefone: '',
        contato_nome: '',
        margem_padrao: '20',
      });
      setShowForm(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao criar cliente:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Clientes">
        <div className="text-center py-12">
          <p>Carregando clientes...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Gestão de Clientes">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold">Clientes</h3>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancelar' : '+ Novo Cliente'}
          </Button>
        </div>

        {/* Success Alert */}
        {success && (
          <Alert type="success" message="Cliente criado com sucesso!" />
        )}

        {error && (
          <Alert type="error" message={error} />
        )}

        {/* Form Modal */}
        {showForm && (
          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
                <FormInput
                  label="CNPJ"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="XX.XXX.XXX/XXXX-XX"
                />
                <FormInput
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <FormInput
                  label="Telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
                <FormInput
                  label="Contato Nome"
                  value={formData.contato_nome}
                  onChange={(e) => setFormData({ ...formData, contato_nome: e.target.value })}
                />
                <FormInput
                  label="Margem Padrão (%)"
                  type="number"
                  value={formData.margem_padrao}
                  onChange={(e) => setFormData({ ...formData, margem_padrao: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={submitting} variant="primary">
                {submitting ? 'Salvando...' : 'Salvar Cliente'}
              </Button>
            </form>
          </Card>
        )}

        {/* Clientes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientes.map((cliente) => (
            <Card key={cliente.id} title={cliente.nome} className="cursor-pointer hover:shadow-lg">
              <div className="space-y-3 text-sm">
                {cliente.cnpj && (
                  <div>
                    <p className="text-slate-600">CNPJ</p>
                    <p className="font-semibold">{cliente.cnpj}</p>
                  </div>
                )}
                {cliente.email && (
                  <div>
                    <p className="text-slate-600">Email</p>
                    <p className="font-semibold">{cliente.email}</p>
                  </div>
                )}
                {cliente.telefone && (
                  <div>
                    <p className="text-slate-600">Telefone</p>
                    <p className="font-semibold">{cliente.telefone}</p>
                  </div>
                )}
                <div className="pt-3 border-t">
                  <p className="text-slate-600 text-xs">Margem Padrão</p>
                  <p className="font-bold text-lg">{cliente.margem_padrao}%</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {clientes.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-600 mb-4">Nenhum cliente cadastrado</p>
            <Button onClick={() => setShowForm(true)}>Criar Primeiro Cliente</Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
