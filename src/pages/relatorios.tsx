import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function RelatoriosPage() {
  const { producoes, funcionarios, produtos, loading } = useProducao();

  // Preparar dados para gráfico de performance
  const performanceMoldadores = funcionarios
    .filter((f) => f.funcao === 'Moldador')
    .map((f) => {
      const prodsDoMoldador = producoes.filter((p) => p.moldador_id === f.id);
      return {
        nome: f.nome,
        eficiencia: prodsDoMoldador.length
          ? prodsDoMoldador.reduce((sum, _) => sum + 0, 0) / prodsDoMoldador.length
          : 0,
        custoMedioPeca:
          prodsDoMoldador.length > 0
            ? prodsDoMoldador.reduce((sum, _) => sum + 0, 0) / prodsDoMoldador.length
            : 0,
      };
    });

  if (loading) {
    return (
      <Layout title="Relatórios">
        <div className="text-center py-12">
          <div className="spinner w-12 h-12 mx-auto mb-4"></div>
          <p>Carregando relatórios...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Relatórios">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Moldadores */}
        <div className="card">
          <h3 className="subsection-title">Performance de Moldadores</h3>
          {performanceMoldadores.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceMoldadores}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="eficiencia" fill="#3b82f6" name="Eficiência %" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-8">Sem dados</p>
          )}
        </div>

        {/* Custo por Peça */}
        <div className="card">
          <h3 className="subsection-title">Custo Médio por Peça</h3>
          {performanceMoldadores.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceMoldadores}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="custoMedioPeca" fill="#f97316" name="Custo (R$)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-8">Sem dados</p>
          )}
        </div>

        {/* Rentabilidade por Produto */}
        <div className="card">
          <h3 className="subsection-title">Rentabilidade por Produto</h3>
          <div className="space-y-3">
            {produtos.slice(0, 5).map((p) => {
              const prodsRelacionados = producoes.filter((prod) => prod.produto_id === p.id);
              const receitaEstimada =
              const lucro = receitaEstimada - custoTotal;

              return (
                <div key={p.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">{p.codigo}</span>
                    <span className={`font-bold ${lucro > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      R$ {lucro.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex justify-between">
                    <span>Receita: R$ {receitaEstimada.toFixed(2)}</span>
                    <span>Custo: R$ {custoTotal.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumo Geral */}
        <div className="card">
          <h3 className="subsection-title">Resumo Geral</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span>Total Apontamentos</span>
              <span className="font-bold">{producoes.length}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Total Caixas</span>
              <span className="font-bold">{producoes.reduce((sum, p) => sum + p.qtde_caixas, 0)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Total Kg</span>
              <span className="font-bold">{producoes.reduce((sum, p) => sum + p.aluminio_bruto, 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Custo Total</span>
              <span className="font-bold">R$ {producoes.reduce((sum, _) => sum + 0, 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span>Taxa Perda Média</span>
              <span className="font-bold">
                {producoes.length > 0
                  ? (producoes.reduce((sum, _) => sum + 0, 0) / producoes.length).toFixed(2)
                  : '0'}
                %
              </span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
