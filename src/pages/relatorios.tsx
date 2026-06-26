import { useMemo } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card, Badge } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function RelatoriosPage() {
  const { producoes, funcionarios, loading } = useProducao();

  const performanceMoldadores = useMemo(
    () =>
      funcionarios
        .filter((f) => f.funcao === 'Moldador')
        .map((f) => {
          const prods = producoes.filter((p) => p.moldador_id === f.id);
          return {
            nome: f.nome,
            apontamentos: prods.length,
            caixas: prods.reduce((s, p) => s + p.qtde_caixas, 0),
            aluminio: prods.reduce((s, p) => s + p.aluminio_bruto, 0),
            retorno: prods.reduce((s, p) => s + p.peso_retorno, 0),
            perdas: prods.reduce((s, p) => s + p.perdas_peca, 0),
            horas: prods.reduce((s, p) => s + p.tempo_horas, 0),
          };
        }),
    [funcionarios, producoes]
  );

  const resumo = useMemo(
    () => ({
      apontamentos: producoes.length,
      caixas: producoes.reduce((s, p) => s + p.qtde_caixas, 0),
      aluminio: producoes.reduce((s, p) => s + p.aluminio_bruto, 0),
      perdas: producoes.reduce((s, p) => s + p.perdas_peca, 0),
    }),
    [producoes]
  );

  if (loading) {
    return (
      <Layout title="Relatórios">
        <div className="text-center py-12">Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Relatórios Gerenciais">
      <div className="space-y-6">
        <Card title="Performance dos Moldadores">
          {performanceMoldadores.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceMoldadores}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="apontamentos" fill="#3b82f6" name="Apontamentos" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-slate-600 py-8">Sem dados disponíveis</p>
          )}
        </Card>

        <Card title="Relatório Detalhado — Moldadores">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 text-left">Moldador</th>
                  <th className="p-2 text-right">Apontamentos</th>
                  <th className="p-2 text-right">Caixas</th>
                  <th className="p-2 text-right">Alumínio (kg)</th>
                  <th className="p-2 text-right">Retorno (kg)</th>
                  <th className="p-2 text-right">Perdas</th>
                  <th className="p-2 text-right">Horas</th>
                </tr>
              </thead>
              <tbody>
                {performanceMoldadores.map((r) => (
                  <tr key={r.nome} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-semibold">{r.nome}</td>
                    <td className="p-2 text-right">{r.apontamentos}</td>
                    <td className="p-2 text-right">{r.caixas}</td>
                    <td className="p-2 text-right">{r.aluminio.toFixed(2)}</td>
                    <td className="p-2 text-right">{r.retorno.toFixed(2)}</td>
                    <td className="p-2 text-right">
                      <Badge variant={r.perdas < 5 ? 'success' : 'warning'}>{r.perdas}</Badge>
                    </td>
                    <td className="p-2 text-right">{r.horas.toFixed(2)}</td>
                  </tr>
                ))}
                {performanceMoldadores.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Sem dados disponíveis
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Resumo Geral da Produção">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-slate-600">Total Apontamentos</p>
              <p className="text-2xl font-bold">{resumo.apontamentos}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-xs text-slate-600">Total Caixas</p>
              <p className="text-2xl font-bold">{resumo.caixas}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-xs text-slate-600">Total Alumínio (kg)</p>
              <p className="text-2xl font-bold">{resumo.aluminio.toFixed(0)}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-xs text-slate-600">Total Perdas</p>
              <p className="text-2xl font-bold">{resumo.perdas}</p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
