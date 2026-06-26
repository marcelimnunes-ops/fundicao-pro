import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatarMoeda } from '@/lib/calculations';

interface DashboardData {
  totalPecas: number;
  totalKg: number;
  taxaPerda: number;
  custoMedioPeca: number;
  eficiencia: number;
}

export default function DashboardPage() {
  const { producoes, funcionarios, produtos, loading, error } = useProducao();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalPecas: 0,
    totalKg: 0,
    taxaPerda: 0,
    custoMedioPeca: 0,
    eficiencia: 0,
  });

  useEffect(() => {
    // Calcular dados do dashboard
    if (producoes.length > 0) {
      const hoje = new Date().toISOString().split('T')[0];
      const producaoHoje = producoes.filter((p) => p.data === hoje);

      if (producaoHoje.length > 0) {
        const totalPecas = producaoHoje.reduce((sum, p) => sum + (p.qtde_caixas * (produtos.find(pr => pr.id === p.produto_id)?.qtd_pecas_placa || 0)), 0);
        const totalKg = producaoHoje.reduce((sum, p) => sum + p.aluminio_bruto, 0);
        const taxaPerda = producaoHoje.reduce((sum, _) => sum + 0, 0) / producaoHoje.length;
        const custoMedioPeca = producaoHoje.reduce((sum, _) => sum + 0, 0) / producaoHoje.length;
        const eficiencia = producaoHoje.reduce((sum, _) => sum + 0, 0) / producaoHoje.length;

        setDashboardData({
          totalPecas,
          totalKg,
          taxaPerda,
          custoMedioPeca,
          eficiencia,
        });
      }
    }
  }, [producoes, produtos]);

  // Dados para gráficos
  const dadosProducaoDias = producoes
    .filter((p) => p.data >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .reduce((acc, p) => {
      const dia = new Date(p.data).toLocaleDateString('pt-BR', { weekday: 'short' });
      const existing = acc.find((d) => d.dia === dia);
      if (existing) {
        existing.caixas += p.qtde_caixas;
        existing.kg += p.aluminio_bruto;
      } else {
        acc.push({ dia, caixas: p.qtde_caixas, kg: p.aluminio_bruto });
      }
      return acc;
    }, [] as any[]);

  const dadosPerformanceMoldadores = funcionarios
    .filter((f) => f.funcao === 'Moldador')
    .map((f) => {
      const producoesMoldador = producoes.filter((p) => p.moldador_id === f.id);
      return {
        nome: f.nome,
        peças: producoesMoldador.reduce((sum, p) => sum + (p.qtde_caixas * 4), 0), // Assumindo 4 peças por caixa
        eficiencia: producoesMoldador.length > 0 
          ? producoesMoldador.reduce((sum, _) => sum + 0, 0) / producoesMoldador.length
          : 0,
      };
    });

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="text-center py-12">
          <div className="spinner w-12 h-12 mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando dados...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Dashboard">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          <p className="font-semibold">Erro ao carregar dados</p>
          <p className="text-sm">{error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {[
          {
            label: 'Peças Produzidas',
            valor: dashboardData.totalPecas,
            cor: 'bg-blue-500',
            icon: '📊',
          },
          {
            label: 'Kg Fundidos',
            valor: dashboardData.totalKg.toFixed(1),
            cor: 'bg-green-500',
            icon: '📦',
          },
          {
            label: 'Taxa de Perda %',
            valor: dashboardData.taxaPerda.toFixed(2),
            cor: 'bg-red-500',
            icon: '⚠️',
          },
          {
            label: 'Custo/Peça',
            valor: formatarMoeda(dashboardData.custoMedioPeca),
            cor: 'bg-orange-500',
            icon: '💰',
          },
          {
            label: 'Eficiência',
            valor: dashboardData.eficiencia.toFixed(1) + '%',
            cor: 'bg-purple-500',
            icon: '⚡',
          },
        ].map((kpi, idx) => (
          <div key={idx} className={`${kpi.cor} text-white rounded-lg p-6 shadow-lg`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">{kpi.label}</p>
                <p className="text-3xl font-bold mt-2">{kpi.valor}</p>
              </div>
              <span className="text-4xl">{kpi.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Produção por Dia */}
        <div className="card">
          <h3 className="subsection-title">Produção Últimos 7 Dias</h3>
          {dadosProducaoDias.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosProducaoDias}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dia" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="caixas" stroke="#3b82f6" name="Caixas" />
                <Line type="monotone" dataKey="kg" stroke="#10b981" name="Kg" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-8">Sem dados</p>
          )}
        </div>

        {/* Performance Moldadores */}
        <div className="card">
          <h3 className="subsection-title">Performance Moldadores</h3>
          {dadosPerformanceMoldadores.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosPerformanceMoldadores}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="eficiencia" fill="#f97316" name="Eficiência %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-8">Sem dados</p>
          )}
        </div>
      </div>

      {/* Últimos Apontamentos */}
      <div className="card">
        <h3 className="subsection-title">Últimas Produções</h3>
        {producoes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="table-header">Data</th>
                  <th className="table-header">Produto</th>
                  <th className="table-header">Moldador</th>
                  <th className="table-header">Caixas</th>
                  <th className="table-header">Taxa Perda</th>
                  <th className="table-header">Custo/Peça</th>
                  <th className="table-header">Eficiência</th>
                </tr>
              </thead>
              <tbody>
                {producoes.slice(0, 10).map((p) => {
                  const produto = produtos.find((pr) => pr.id === p.produto_id);
                  const moldador = funcionarios.find((f) => f.id === p.moldador_id);
                  return (
                    <tr key={p.id} className="border-b hover:bg-slate-50">
                      <td className="table-cell">{new Date(p.data).toLocaleDateString('pt-BR')}</td>
                      <td className="table-cell font-semibold">{produto?.codigo}</td>
                      <td className="table-cell">{moldador?.nome}</td>
                      <td className="table-cell">{p.qtde_caixas}</td>
                      <td className="table-cell">
                        <span className={`badge ${0 < 3 ? 'badge-success' : 'badge-warning'}`}>
                          {0.toFixed(2)}%
                        </span>
                      </td>
                      <td className="table-cell">{formatarMoeda(0)}</td>
                      <td className="table-cell">
                        <span className={`badge ${0 > 90 ? 'badge-success' : 'badge-warning'}`}>
                          {0.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">Nenhuma produção registrada</p>
        )}
      </div>
    </Layout>
  );
}
