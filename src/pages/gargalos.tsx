import { useMemo } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card, Badge } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function GargolosPage() {
  const { producoes, loading } = useProducao();

  const gargalos = useMemo(() => {
    const prodPorHora = new Map();

    producoes.forEach((p) => {
      const hora = new Date(p.data).getHours();
      if (!prodPorHora.has(hora)) {
        prodPorHora.set(hora, []);
      }
      prodPorHora.get(hora).push(p);
    });

    return Array.from(prodPorHora.entries())
      .map(([hora, prods]) => ({
        hora: `${hora}:00`,
        apontamentos: prods.length,
        caixas: 0,
        perdas: prods.reduce((sum: number, p) => sum + p.perdas_peca, 0),
      }))
      .sort((a, b) => parseInt(a.hora) - parseInt(b.hora));
  }, [producoes]);

  if (loading) {
    return (
      <Layout title="Gargalos">
        <div className="text-center py-12">Carregando...</div>
      </Layout>
    );
  }

  const gargaloHora = gargalos.reduce((max, g) => (g.perdas > max.perdas ? g : max), gargalos[0] || {});

  return (
    <Layout title="Gargalos Detectados">
      <div className="space-y-6">
        <Card title="⚠️ Gargalo Principal">
          {gargaloHora && (
            <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
              <p className="text-sm text-slate-600">Horário com maior perda</p>
              <p className="text-2xl font-bold">{gargaloHora.hora}</p>
              <p className="text-sm mt-2">
                <Badge variant="warning">{gargaloHora.perdas} peças perdidas</Badge>
              </p>
            </div>
          )}
        </Card>

        <Card title="📊 Perdas por Hora">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={gargalos}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hora" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="perdas" fill="#ef4444" name="Perdas" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="📈 Apontamentos por Hora">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left">Hora</th>
                <th className="p-2 text-right">Apontamentos</th>
                <th className="p-2 text-right">Perdas</th>
              </tr>
            </thead>
            <tbody>
              {gargalos.map((g) => (
                <tr key={g.hora} className="border-b hover:bg-slate-50">
                  <td className="p-2 font-semibold">{g.hora}</td>
                  <td className="p-2 text-right">{g.apontamentos}</td>
                  <td className="p-2 text-right">
                    <Badge variant={g.perdas > 5 ? 'danger' : 'success'}>{g.perdas}</Badge>
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
