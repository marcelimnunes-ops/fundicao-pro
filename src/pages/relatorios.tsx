import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card, Badge } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function RelatoriosPage() {
  const { producoes, funcionarios, produtos, loading } = useProducao();

  // Preparar dados para gráfico de performance
  const performanceMoldadores = funcionarios
    .filter((f) => f.funcao === 'Moldador')
    .map((f) => {
      const prodsDoMoldador = producoes.filter((p) => p.moldador_id === f.id);
      return {
        nome: f.nome,
        apontamentos: prodsDoMoldador.length,
        caixas: prodsDoMoldador.reduce((sum, p) => sum + p.qtde_caixas, 0),
        aluminio: prodsDoMoldador.reduce((sum, p) => sum + p.aluminio_bruto, 0),
        horas: prodsDoMoldador.reduce((sum, p) => sum + p.tempo_horas, 0),
      };
    });

  const relatorioMoldadores = funcionarios
    .filter((f) => f.funcao === 'Moldador')
    .map((f) => {
      const dados = producoes.filter((p) => p.moldador_id === f.id);
      const totalAluminio = dados.reduce((sum, p) => sum + p.aluminio_bruto, 0);
      const totalRetorno = dados.reduce((sum, p) => sum + p.peso_retorno, 0);
      const totalPerdas = dados.reduce((sum, p) => sum + p.perdas_peca, 0);

      return {
        nome: f.nome,
        apontamentos: dados.length,
        caixas: dados.reduce((sum, p) => sum + p.qtde_caixas, 0),
        aluminio: totalAluminio,
        retorno: totalRetorno,
        perdas: totalPerdas,
        horas: dados.reduce((sum, p) => sum + p.tempo_horas, 0),
      };
    });

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
        {/* GRÁFICO: PERFORMANCE MOLDADORES */}
        <Card title="📊 Performance dos Moldadores">
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
            <p className="text-center text-slate-600">Sem dados disponíveis</p>
          )}
        </Card>

        {/* TABELA: MOLDADORES */}
        <Card title="👷 Relatório Detalhado - Moldadores">
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
              {relatorioMoldadores.map((r) => (
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
            </tbody>
          </table>
        </Card>

        {/* RESUMO GERAL */}
        <Card title="📈 Resumo Geral da Produção">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-slate-600">Total Apontamentos</p>
              <p className="text-2xl font-bold">{producoes.length}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-xs text-slate-600">Total Caixas</p>
              <p className="text-2xl font-bold">{producoes.reduce((sum, p) => sum + p.qtde_caixas, 0)}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-xs text-slate-600">Total Alumínio (kg)</p>
              <p className="text-2xl font-bold">{producoes.reduce((sum, p) => sum + p.aluminio_bruto, 0).toFixed(0)}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-xs text-slate-600">Total Perdas</p>
              <p className="text-2xl font-bold">{producoes.reduce((sum, p) => sum + p.perdas_peca, 0)}</p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
