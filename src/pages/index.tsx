import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card, Badge } from '@/components/ui';

interface DashboardData {
  totalApontamentos: number;
  totalCaixas: number;
  totalAluminio: number;
  totalPerdas: number;
  totalHoras: number;
  taxaPerdaPercentual: string;
}

export default function DashboardPage() {
  const { producoes, loading } = useProducao();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalApontamentos: 0,
    totalCaixas: 0,
    totalAluminio: 0,
    totalPerdas: 0,
    totalHoras: 0,
    taxaPerdaPercentual: '0',
  });

  useEffect(() => {
    if (producoes.length > 0) {
      const totalApontamentos = producoes.length;
      const totalCaixas = producoes.reduce((sum, p) => sum + p.qtde_caixas, 0);
      const totalAluminio = producoes.reduce((sum, p) => sum + p.aluminio_bruto, 0);
      const totalPerdas = producoes.reduce((sum, p) => sum + p.perdas_peca, 0);
      const totalHoras = producoes.reduce((sum, p) => sum + p.tempo_horas, 0);
      const taxaPerdaPercentual =
        totalAluminio > 0 ? ((totalPerdas / totalAluminio) * 100).toFixed(2) : '0';

      setDashboardData({
        totalApontamentos,
        totalCaixas,
        totalAluminio,
        totalPerdas,
        totalHoras,
        taxaPerdaPercentual,
      });
    }
  }, [producoes]);

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="text-center py-12">Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard de Produção">
      <div className="space-y-6">
        {/* KPIs PRINCIPAIS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <div className="p-4">
              <p className="text-xs text-slate-600">Apontamentos</p>
              <p className="text-2xl font-bold">{dashboardData.totalApontamentos}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-xs text-slate-600">Caixas</p>
              <p className="text-2xl font-bold">{dashboardData.totalCaixas}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-xs text-slate-600">Alumínio (kg)</p>
              <p className="text-2xl font-bold">{dashboardData.totalAluminio.toFixed(0)}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-xs text-slate-600">Perdas</p>
              <p className="text-2xl font-bold">{dashboardData.totalPerdas}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-xs text-slate-600">Taxa Perda</p>
              <p className="text-2xl font-bold">
                <Badge variant={parseFloat(dashboardData.taxaPerdaPercentual) < 5 ? 'success' : 'warning'}>
                  {dashboardData.taxaPerdaPercentual}%
                </Badge>
              </p>
            </div>
          </Card>
        </div>

        {/* RESUMO */}
        <Card title="📋 Resumo Geral">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded">
                <p className="text-xs text-slate-600">Total de Horas</p>
                <p className="text-xl font-bold">{dashboardData.totalHoras.toFixed(2)}h</p>
              </div>
              <div className="p-3 bg-slate-50 rounded">
                <p className="text-xs text-slate-600">Alumínio Total</p>
                <p className="text-xl font-bold">{dashboardData.totalAluminio.toFixed(2)} kg</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded">
                <p className="text-xs text-slate-600">Taxa Média de Perda</p>
                <p className="text-xl font-bold">{dashboardData.taxaPerdaPercentual}%</p>
              </div>
              <div className="p-3 bg-slate-50 rounded">
                <p className="text-xs text-slate-600">Peças Perdidas</p>
                <p className="text-xl font-bold">{dashboardData.totalPerdas}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
