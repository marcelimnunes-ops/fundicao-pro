import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card, FormInput } from '@/components/ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function CorrelacoesPage() {
  const { producoes, loading } = useProducao();
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  const dadosFiltrados = useMemo(() => {
    let dados = [...producoes];
    if (filtroDataInicio) {
      dados = dados.filter((p) => new Date(p.data) >= new Date(filtroDataInicio));
    }
    if (filtroDataFim) {
      dados = dados.filter((p) => new Date(p.data) <= new Date(filtroDataFim));
    }
    return dados;
  }, [producoes, filtroDataInicio, filtroDataFim]);

  const correlacaoAluminioPerda = useMemo(() => {
    return dadosFiltrados.map((p) => ({
      data: p.data,
      aluminio: p.aluminio_bruto,
      perdas: p.perdas_peca,
    }));
  }, [dadosFiltrados]);

  if (loading) {
    return (
      <Layout title="Correlações">
        <div className="text-center py-12">Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Correlações">
      <div className="space-y-6">
        <Card title="🔍 Filtros">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Data Início"
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
            />
            <FormInput
              label="Data Fim"
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
            />
          </div>
        </Card>

        <Card title="📈 Correlação: Alumínio vs Perdas">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={correlacaoAluminioPerda}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="aluminio" stroke="#3b82f6" name="Alumínio (kg)" />
              <Line yAxisId="right" type="monotone" dataKey="perdas" stroke="#ef4444" name="Perdas (peças)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </Layout>
  );
}
