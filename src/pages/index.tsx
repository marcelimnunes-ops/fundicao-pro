import { useMemo } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card, Badge } from '@/components/ui';

export default function DashboardPage() {
  const { producoes, loading } = useProducao();

  const kpis = useMemo(() => {
    const totalApontamentos = producoes.length;
    const totalCaixas = producoes.reduce((s, p) => s + p.qtde_caixas, 0);
    const totalAluminio = producoes.reduce((s, p) => s + p.aluminio_bruto, 0);
    const totalPerdas = producoes.reduce((s, p) => s + p.perdas_peca, 0);
    const totalHoras = producoes.reduce((s, p) => s + p.tempo_horas, 0);
    const taxaPerda = totalAluminio > 0 ? (totalPerdas / totalAluminio) * 100 : 0;
    return { totalApontamentos, totalCaixas, totalAluminio, totalPerdas, totalHoras, taxaPerda };
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <div className="p-2">
              <p className="text-xs text-slate-600">Apontamentos</p>
              <p className="text-2xl font-bold">{kpis.totalApontamentos}</p>
            </div>
          </Card>
          <Card>
            <div className="p-2">
              <p className="text-xs text-slate-600">Caixas</p>
              <p className="text-2xl font-bold">{kpis.totalCaixas}</p>
            </div>
          </Card>
          <Card>
            <div className="p-2">
              <p className="text-xs text-slate-600">Alumínio (kg)</p>
              <p className="text-2xl font-bold">{kpis.totalAluminio.toFixed(0)}</p>
            </div>
          </Card>
          <Card>
            <div className="p-2">
              <p className="text-xs text-slate-600">Perdas (peças)</p>
              <p className="text-2xl font-bold">{kpis.totalPerdas}</p>
            </div>
          </Card>
          <Card>
            <div className="p-2">
              <p className="text-xs text-slate-600">Taxa Perda</p>
              <p className="text-2xl font-bold">
                <Badge variant={kpis.taxaPerda < 5 ? 'success' : 'warning'}>
                  {kpis.taxaPerda.toFixed(2)}%
                </Badge>
              </p>
            </div>
          </Card>
        </div>

        <Card title="Resumo Geral">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded">
                <p className="text-xs text-slate-600">Total de Horas</p>
                <p className="text-xl font-bold">{kpis.totalHoras.toFixed(2)}h</p>
              </div>
              <div className="p-3 bg-slate-50 rounded">
                <p className="text-xs text-slate-600">Alumínio Total</p>
                <p className="text-xl font-bold">{kpis.totalAluminio.toFixed(2)} kg</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded">
                <p className="text-xs text-slate-600">Taxa Média de Perda</p>
                <p className="text-xl font-bold">{kpis.taxaPerda.toFixed(2)}%</p>
              </div>
              <div className="p-3 bg-slate-50 rounded">
                <p className="text-xs text-slate-600">Peças Perdidas</p>
                <p className="text-xl font-bold">{kpis.totalPerdas}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
