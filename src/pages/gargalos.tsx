import { useMemo } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card, Badge } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function GargolosPage() {
  const { producoes, funcionarios, loading } = useProducao();

  const gargalosPorMoldador = useMemo(() => {
    return funcionarios
      .filter((f) => f.funcao === 'Moldador')
      .map((f) => {
        const prods = producoes.filter((p) => p.moldador_id === f.id);
        const totalAluminio = prods.reduce((s, p) => s + p.aluminio_bruto, 0);
        const totalPerdas = prods.reduce((s, p) => s + p.perdas_peca, 0);
        const taxaPerda = totalAluminio > 0 ? (totalPerdas / totalAluminio) * 100 : 0;
        return {
          nome: f.nome,
          apontamentos: prods.length,
          perdas: totalPerdas,
          aluminio: totalAluminio,
          taxaPerda,
        };
      })
      .sort((a, b) => b.taxaPerda - a.taxaPerda);
  }, [funcionarios, producoes]);

  const gargalosPorProduto = useMemo(() => {
    const mapa = new Map<string, { produto_id: string; perdas: number; aluminio: number }>();
    producoes.forEach((p) => {
      const item = mapa.get(p.produto_id) ?? { produto_id: p.produto_id, perdas: 0, aluminio: 0 };
      item.perdas += p.perdas_peca;
      item.aluminio += p.aluminio_bruto;
      mapa.set(p.produto_id, item);
    });
    return Array.from(mapa.values())
      .map((item) => ({
        ...item,
        taxaPerda: item.aluminio > 0 ? (item.perdas / item.aluminio) * 100 : 0,
      }))
      .sort((a, b) => b.taxaPerda - a.taxaPerda)
      .slice(0, 10);
  }, [producoes]);

  const piorGargalo = gargalosPorMoldador[0];

  if (loading) {
    return (
      <Layout title="Gargalos">
        <div className="text-center py-12">Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Gargalos Detectados">
      <div className="space-y-6">
        {piorGargalo && piorGargalo.taxaPerda > 5 && (
          <Card title="Alerta: Gargalo Principal">
            <div className="p-4 bg-red-50 rounded-lg border-l-4 border-red-500">
              <p className="text-sm text-slate-600">Moldador com maior taxa de perda</p>
              <p className="text-2xl font-bold mt-1">{piorGargalo.nome}</p>
              <p className="text-sm mt-2">
                <Badge variant="danger">{piorGargalo.taxaPerda.toFixed(2)}% de perda</Badge>
                <span className="ml-3 text-slate-600">{piorGargalo.perdas} peças perdidas</span>
              </p>
            </div>
          </Card>
        )}

        <Card title="Taxa de Perda por Moldador">
          {gargalosPorMoldador.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gargalosPorMoldador}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis unit="%" />
                <Tooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
                <Bar dataKey="taxaPerda" fill="#ef4444" name="Taxa de Perda (%)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-slate-500 py-8">Sem dados disponíveis</p>
          )}
        </Card>

        <Card title="Detalhamento por Moldador">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 text-left">Moldador</th>
                  <th className="p-2 text-right">Apontamentos</th>
                  <th className="p-2 text-right">Perdas (peças)</th>
                  <th className="p-2 text-right">Alumínio (kg)</th>
                  <th className="p-2 text-right">Taxa Perda</th>
                </tr>
              </thead>
              <tbody>
                {gargalosPorMoldador.map((g) => (
                  <tr key={g.nome} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-semibold">{g.nome}</td>
                    <td className="p-2 text-right">{g.apontamentos}</td>
                    <td className="p-2 text-right">{g.perdas}</td>
                    <td className="p-2 text-right">{g.aluminio.toFixed(0)}</td>
                    <td className="p-2 text-right">
                      <Badge variant={g.taxaPerda > 10 ? 'danger' : g.taxaPerda > 5 ? 'warning' : 'success'}>
                        {g.taxaPerda.toFixed(2)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
                {gargalosPorMoldador.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Sem dados disponíveis
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {gargalosPorProduto.length > 0 && (
          <Card title="Top Produtos com Maior Perda">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-2 text-left">Produto ID</th>
                    <th className="p-2 text-right">Perdas (peças)</th>
                    <th className="p-2 text-right">Alumínio (kg)</th>
                    <th className="p-2 text-right">Taxa Perda</th>
                  </tr>
                </thead>
                <tbody>
                  {gargalosPorProduto.map((g) => (
                    <tr key={g.produto_id} className="border-b hover:bg-slate-50">
                      <td className="p-2 font-semibold text-xs text-slate-500">{g.produto_id.slice(0, 8)}...</td>
                      <td className="p-2 text-right">{g.perdas}</td>
                      <td className="p-2 text-right">{g.aluminio.toFixed(0)}</td>
                      <td className="p-2 text-right">
                        <Badge variant={g.taxaPerda > 10 ? 'danger' : g.taxaPerda > 5 ? 'warning' : 'success'}>
                          {g.taxaPerda.toFixed(2)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
