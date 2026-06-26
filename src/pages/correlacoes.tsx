import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card } from '@/components/ui';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function CorrelacoesPage() {
  const { producoes, loading } = useProducao();
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  const dadosFiltrados = useMemo(() => {
    let dados = [...producoes];
    if (filtroDataInicio) dados = dados.filter((p) => p.data >= filtroDataInicio);
    if (filtroDataFim) dados = dados.filter((p) => p.data <= filtroDataFim);
    return dados;
  }, [producoes, filtroDataInicio, filtroDataFim]);

  const correlacaoAluminioPerda = useMemo(
    () =>
      dadosFiltrados.map((p) => ({
        data: p.data,
        aluminio: p.aluminio_bruto,
        perdas: p.perdas_peca,
      })),
    [dadosFiltrados]
  );

  const correlacaoHorasCaixas = useMemo(
    () =>
      dadosFiltrados.map((p) => ({
        data: p.data,
        horas: p.tempo_horas,
        caixas: p.qtde_caixas,
      })),
    [dadosFiltrados]
  );

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
        <Card title="Filtros">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Data Início</label>
              <input
                type="date"
                className="form-input"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Data Fim</label>
              <input
                type="date"
                className="form-input"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card title="Correlação: Alumínio vs Perdas">
          {correlacaoAluminioPerda.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Sem dados no período selecionado</p>
          ) : (
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
          )}
        </Card>

        <Card title="Correlação: Horas vs Caixas">
          {correlacaoHorasCaixas.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Sem dados no período selecionado</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={correlacaoHorasCaixas}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="horas" stroke="#8b5cf6" name="Horas" />
                <Line yAxisId="right" type="monotone" dataKey="caixas" stroke="#10b981" name="Caixas" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </Layout>
  );
}
