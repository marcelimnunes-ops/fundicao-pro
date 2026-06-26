import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card, Badge } from '@/components/ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';

export default function CorrelacoesPage() {
  const { producoes } = useProducao();

  // Correlação: Hora do dia vs Taxa de Perda
  const horaVsPerda = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((hora) => {
    const prods = producoes.filter((p) => {
      const h = new Date(p.criado_em).getHours();
      return h === hora;
    });

    return {
      hora,
      perdaMedia: prods.length > 0
        ? (prods.reduce((sum, p) => sum + p.taxa_perda, 0) / prods.length)
        : 0,
      eficienciaMedia: prods.length > 0
        ? (prods.reduce((sum, p) => sum + p.eficiencia, 0) / prods.length)
        : 0,
      count: prods.length,
    };
  });

  // Correlação: Tempo de trabalho vs Eficiência
  const tempoVsEficiencia = producoes
    .filter((p) => p.tempo_horas > 0)
    .sort((a, b) => a.tempo_horas - b.tempo_horas)
    .map((p) => ({
      tempo: parseFloat(p.tempo_horas.toFixed(1)),
      eficiencia: p.eficiencia,
      perda: p.taxa_perda,
    }))
    .slice(0, 50);

  // Análise por dia da semana
  const diaVsPerda = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((dia, idx) => {
    const prods = producoes.filter((p) => {
      const d = new Date(p.data).getDay();
      return d === idx;
    });

    return {
      dia,
      perda: prods.length > 0 ? (prods.reduce((sum, p) => sum + p.taxa_perda, 0) / prods.length) : 0,
      eficiencia: prods.length > 0 ? (prods.reduce((sum, p) => sum + p.eficiencia, 0) / prods.length) : 0,
      count: prods.length,
    };
  });

  // Calcular correlações numéricas (Pearson)
  const calcularCorrelacao = (arr1: number[], arr2: number[]) => {
    const n = Math.min(arr1.length, arr2.length);
    if (n === 0) return 0;

    const mean1 = arr1.slice(0, n).reduce((a, b) => a + b, 0) / n;
    const mean2 = arr2.slice(0, n).reduce((a, b) => a + b, 0) / n;

    let numerador = 0;
    let denom1 = 0;
    let denom2 = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = arr1[i] - mean1;
      const diff2 = arr2[i] - mean2;
      numerador += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    }

    const denom = Math.sqrt(denom1 * denom2);
    return denom === 0 ? 0 : numerador / denom;
  };

  const tempos = tempoVsEficiencia.map((d) => d.tempo);
  const eficiencias = tempoVsEficiencia.map((d) => d.eficiencia);
  const correlacaoTempoEficiencia = calcularCorrelacao(tempos, eficiencias);

  return (
    <Layout title="Análise de Correlações">
      <div className="space-y-6">
        {/* Resumo de Correlações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Tempo de Trabalho vs Eficiência">
            <p className="text-3xl font-bold text-blue-500">
              {(correlacaoTempoEficiencia * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-slate-600 mt-2">
              {Math.abs(correlacaoTempoEficiencia) > 0.7
                ? 'Forte correlação'
                : Math.abs(correlacaoTempoEficiencia) > 0.4
                ? 'Correlação moderada'
                : 'Correlação fraca'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {correlacaoTempoEficiencia > 0 ? '↑ Positiva' : '↓ Negativa'}
            </p>
          </Card>

          <Card title="Performance Média">
            <div className="space-y-2">
              <div>
                <p className="text-sm text-slate-600">Eficiência Média</p>
                <p className="text-2xl font-bold">
                  {(producoes.reduce((sum, p) => sum + p.eficiencia, 0) / producoes.length || 0).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Perda Média</p>
                <p className="text-2xl font-bold text-orange-500">
                  {(producoes.reduce((sum, p) => sum + p.taxa_perda, 0) / producoes.length || 0).toFixed(2)}%
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Hora vs Perda */}
        <Card title="Padrão: Hora do Dia vs Taxa de Perda">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={horaVsPerda}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hora" label={{ value: 'Hora do dia', position: 'insideBottomRight', offset: -5 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="perdaMedia" stroke="#ef4444" name="Perda %" />
              <Line type="monotone" dataKey="eficienciaMedia" stroke="#10b981" name="Eficiência %" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Dia da Semana vs Perda */}
        <Card title="Padrão: Dia da Semana vs Taxa de Perda">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={diaVsPerda}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="perda" stroke="#ef4444" name="Perda %" />
              <Line type="monotone" dataKey="eficiencia" stroke="#10b981" name="Eficiência %" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Insights */}
        <Card title="📊 Insights e Padrões Detectados" className="bg-green-50 border border-green-200">
          <ul className="space-y-2 text-sm text-slate-700">
            <li>
              ✓ Melhor horário: <strong>{horaVsPerda.reduce((a, b) => a.eficienciaMedia > b.eficienciaMedia ? a : b).hora}:00</strong>
            </li>
            <li>
              ✓ Pior horário: <strong>{horaVsPerda.reduce((a, b) => a.perdaMedia > b.perdaMedia ? a : b).hora}:00</strong>
            </li>
            <li>
              ✓ Melhor dia: <strong>{diaVsPerda.reduce((a, b) => a.eficiencia > b.eficiencia ? a : b).dia}</strong>
            </li>
            <li>
              ✓ Pior dia: <strong>{diaVsPerda.reduce((a, b) => a.perda > b.perda ? a : b).dia}</strong>
            </li>
            {correlacaoTempoEficiencia > 0.5 && (
              <li>⚡ Trabalhos mais longos têm maior eficiência (correlação positiva)</li>
            )}
            {correlacaoTempoEficiencia < -0.5 && (
              <li>⚠️ Trabalhos mais longos têm menor eficiência (correlação negativa)</li>
            )}
          </ul>
        </Card>

        {/* Recomendações */}
        <Card title="💡 Recomendações" className="bg-blue-50 border border-blue-200">
          <ul className="space-y-2 text-sm text-slate-700">
            <li>✓ Agende trabalhos importantes no melhor horário do dia</li>
            <li>✓ Invista em treinamento nos piores períodos</li>
            <li>✓ Analise padrões de perda por dia da semana</li>
            <li>✓ Correlação tempo-eficiência: ajuste conforme necessário</li>
          </ul>
        </Card>
      </div>
    </Layout>
  );
}
