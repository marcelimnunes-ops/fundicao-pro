import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card, FormInput } from '@/components/ui';
import { useState } from 'react';

export default function ApontamentoPage() {
  const { producoes, funcionarios, produtos, loading } = useProducao();
  const [filtroMoldador, setFiltroMoldador] = useState('');

  if (loading) {
    return (
      <Layout title="Apontamento de Produção">
        <div className="text-center py-12">Carregando...</div>
      </Layout>
    );
  }

  const moldadores = funcionarios.filter((f) => f.funcao === 'Moldador');
  const producaoFiltrada = filtroMoldador
    ? producoes.filter((p) => p.moldador_id === filtroMoldador)
    : producoes;

  return (
    <Layout title="Apontamento de Produção">
      <div className="space-y-6">
        <Card title="📋 Filtrar Apontamentos">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Moldador"
              type="select"
              value={filtroMoldador}
              onChange={(e) => setFiltroMoldador(e.target.value)}
            >
              <option value="">Todos</option>
              {moldadores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </FormInput>
          </div>
        </Card>

        <Card title="📊 Apontamentos Recentes">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left">Data</th>
                <th className="p-2 text-left">Moldador</th>
                <th className="p-2 text-left">Produto</th>
                <th className="p-2 text-right">Caixas</th>
                <th className="p-2 text-right">Alumínio (kg)</th>
                <th className="p-2 text-right">Horas</th>
              </tr>
            </thead>
            <tbody>
              {producaoFiltrada.slice(0, 20).map((p) => {
                const moldador = funcionarios.find((f) => f.id === p.moldador_id);
                const produto = produtos.find((pr) => pr.id === p.produto_id);

                return (
                  <tr key={p.id} className="border-b hover:bg-slate-50">
                    <td className="p-2">{p.data}</td>
                    <td className="p-2">{moldador?.nome || '-'}</td>
                    <td className="p-2">{produto?.codigo || '-'}</td>
                    <td className="p-2 text-right">{p.qtde_caixas}</td>
                    <td className="p-2 text-right">{p.aluminio_bruto.toFixed(2)}</td>
                    <td className="p-2 text-right">{p.tempo_horas.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </Layout>
  );
}
