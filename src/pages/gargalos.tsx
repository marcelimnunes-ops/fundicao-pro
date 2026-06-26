import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card, Badge } from '@/components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function GarralosPage() {
  const { producoes, funcionarios, produtos } = useProducao();

  // Analisar gargalos por moldador
  const gargalosMoldador = funcionarios
    .filter((f) => f.funcao === 'Moldador')
    .map((f) => {
      const prods = producoes.filter((p) => p.moldador_id === f.id);
      const caixasTotal = prods.reduce((sum, p) => sum + p.qtde_caixas, 0);
      const tempoTotal = prods.reduce((sum, p) => sum + p.tempo_horas, 0);
      const caixasPorHora = tempoTotal > 0 ? (caixasTotal / tempoTotal).toFixed(2) : '0';
      const perdaMedia = prods.length > 0 
        ? (prods.reduce((sum, p) => sum + p.taxa_perda, 0) / prods.length).toFixed(2)
        : '0';

      return {
        nome: f.nome,
        caixasPorHora: parseFloat(caixasPorHora),
        perdaMedia: parseFloat(perdaMedia),
        apontamentos: prods.length,
      };
    });

  // Produtos com maior perda
  const produtosComPerda = produtos
    .map((p) => {
      const prods = producoes.filter((pr) => pr.produto_id === p.id);
      const perdaMedia = prods.length > 0
        ? (prods.reduce((sum, pr) => sum + pr.taxa_perda, 0) / prods.length).toFixed(2)
        : '0';

      return {
        codigo: p.codigo,
        nome: p.nome,
        perdaMedia: parseFloat(perdaMedia),
        apontamentos: prods.length,
      };
    })
    .filter((p) => p.apontamentos > 0)
    .sort((a, b) => b.perdaMedia - a.perdaMedia);

  // Análise por hora do dia (padrão)
  const analiseHora = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((hora) => {
    const prods = producoes.filter((p) => {
      const h = new Date(p.criado_em).getHours();
      return h === hora;
    });

    return {
      hora: `${hora}:00`,
      eficiencia: prods.length > 0
        ? (prods.reduce((sum, p) => sum + 0, 0) / prods.length).toFixed(1)
        : '0',
      perda: prods.length > 0
        ? (prods.reduce((sum, p) => sum + p.taxa_perda, 0) / prods.length).toFixed(1)
        : '0',
    };
  });

  return (
    <Layout title="Análise de Gargalos">
      <div className="space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card title="Moldador Mais Rápido" className="text-center">
            {gargalosMoldador.length > 0 ? (
              <>
                <p className="text-3xl font-bold text-orange-500">
                  {Math.max(...gargalosMoldador.map((g) => g.caixasPorHora)).toFixed(2)}
                </p>
                <p className="text-sm text-slate-600 mt-2">caixas/hora</p>
                <p className="text-sm font-semibold mt-2">
                  {gargalosMoldador.find((g) => g.caixasPorHora === Math.max(...gargalosMoldador.map((m) => m.caixasPorHora)))?.nome}
                </p>
              </>
            ) : (
              <p>Sem dados</p>
            )}
          </Card>

          <Card title="Maior Taxa de Perda" className="text-center">
            {produtosComPerda.length > 0 ? (
              <>
                <p className="text-3xl font-bold text-red-500">
                  {produtosComPerda[0].perdaMedia.toFixed(2)}%
                </p>
                <p className="text-sm text-slate-600 mt-2">perdas</p>
                <p className="text-sm font-semibold mt-2">{produtosComPerda[0].codigo}</p>
              </>
            ) : (
              <p>Sem dados</p>
            )}
          </Card>

          <Card title="Total de Apontamentos" className="text-center">
            <p className="text-3xl font-bold text-blue-500">{producoes.length}</p>
            <p className="text-sm text-slate-600 mt-2">registrados</p>
          </Card>
        </div>

        {/* Performance por Moldador */}
        <Card title="Performance por Moldador">
          <div className="space-y-3">
            {gargalosMoldador.map((g) => (
              <div key={g.nome} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-semibold">{g.nome}</p>
                  <p className="text-xs text-slate-600">{g.apontamentos} apontamentos</p>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold">{g.caixasPorHora}</p>
                    <p className="text-xs text-slate-600">caixas/h</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={parseFloat(g.perdaMedia.toString()) < 3 ? 'success' : 'warning'}>
                      {g.perdaMedia.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Gráfico de Eficiência por Hora */}
        <Card title="Eficiência por Hora do Dia">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analiseHora}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hora" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="eficiencia" fill="#10b981" name="Eficiência %" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Produtos com Maior Perda */}
        <Card title="Top Produtos com Perda">
          <div className="space-y-2">
            {produtosComPerda.slice(0, 5).map((p) => (
              <div key={p.codigo} className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <p className="font-semibold">{p.codigo}</p>
                  <p className="text-sm text-slate-600">{p.nome}</p>
                </div>
                <Badge variant="danger">{p.perdaMedia.toFixed(2)}%</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Recomendações */}
        <Card title="💡 Recomendações" className="bg-blue-50 border border-blue-200">
          <ul className="space-y-2 text-sm text-slate-700">
            {gargalosMoldador.length > 0 && (
              <>
                <li>
                  ✓ Moldador mais rápido: <strong>{gargalosMoldador.reduce((a, b) => a.caixasPorHora > b.caixasPorHora ? a : b).nome}</strong>
                </li>
                <li>✓ Análise: Verificar padrões de produtividade entre moldadores</li>
              </>
            )}
            {produtosComPerda.length > 0 && (
              <>
                <li>
                  ⚠️ Produto crítico: <strong>{produtosComPerda[0].codigo}</strong> (perda {produtosComPerda[0].perdaMedia.toFixed(2)}%)
                </li>
                <li>✓ Ação: Investigar causas de perda neste produto</li>
              </>
            )}
          </ul>
        </Card>
      </div>
    </Layout>
  );
}
