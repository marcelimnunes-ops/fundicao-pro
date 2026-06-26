import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card, FormInput, Badge } from '@/components/ui';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function RelatoriosAvancadosPage() {
  const { producoes, funcionarios, produtos, loading } = useProducao();

  // FILTROS
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroMoldador, setFiltroMoldador] = useState('');
  const [filtroProduto, setFiltroProduto] = useState('');

  // DADOS FILTRADOS
  const dadosFiltrados = useMemo(() => {
    let dados = [...producoes];

    if (filtroDataInicio) {
      dados = dados.filter((p) => new Date(p.data) >= new Date(filtroDataInicio));
    }
    if (filtroDataFim) {
      dados = dados.filter((p) => new Date(p.data) <= new Date(filtroDataFim));
    }
    if (filtroMoldador) {
      dados = dados.filter((p) => p.moldador_id === filtroMoldador);
    }
    if (filtroProduto) {
      dados = dados.filter((p) => p.produto_id === filtroProduto);
    }

    return dados;
  }, [producoes, filtroDataInicio, filtroDataFim, filtroMoldador, filtroProduto]);

  // RELATÓRIO 1: PERFORMANCE POR MOLDADOR
  const relatorioPerformanceMoldador = useMemo(() => {
    return funcionarios
      .filter((f) => f.funcao === 'Moldador')
      .map((f) => {
        const dados = dadosFiltrados.filter((p) => p.moldador_id === f.id);
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
          tempo_horas: dados.reduce((sum, p) => sum + p.tempo_horas, 0),
        };
      });
  }, [funcionarios, dadosFiltrados]);

  // RELATÓRIO 2: PRODUÇÃO POR PRODUTO
  const relatorioProducaoProduto = useMemo(() => {
    return produtos.map((prod) => {
      const dados = dadosFiltrados.filter((p) => p.produto_id === prod.id);
      const totalAluminio = dados.reduce((sum, p) => sum + p.aluminio_bruto, 0);
      const totalPerdas = dados.reduce((sum, p) => sum + p.perdas_peca, 0);

      return {
        codigo: prod.codigo,
        nome: prod.nome,
        apontamentos: dados.length,
        caixas: dados.reduce((sum, p) => sum + p.qtde_caixas, 0),
        aluminio: totalAluminio,
        perdas: totalPerdas,
        taxa_perda: totalAluminio > 0 ? ((totalPerdas / totalAluminio) * 100).toFixed(2) : 0,
      };
    }).filter(x => x.apontamentos > 0);
  }, [produtos, dadosFiltrados]);

  // RELATÓRIO 3: RESUMO GERAL
  const relatorioResumo = useMemo(() => {
    const totalApontamentos = dadosFiltrados.length;
    const totalCaixas = dadosFiltrados.reduce((sum, p) => sum + p.qtde_caixas, 0);
    const totalAluminio = dadosFiltrados.reduce((sum, p) => sum + p.aluminio_bruto, 0);
    const totalRetorno = dadosFiltrados.reduce((sum, p) => sum + p.peso_retorno, 0);
    const totalPerdas = dadosFiltrados.reduce((sum, p) => sum + p.perdas_peca, 0);
    const totalOleo = dadosFiltrados.reduce((sum, p) => sum + p.consumo_oleo, 0);
    const totalHoras = dadosFiltrados.reduce((sum, p) => sum + p.tempo_horas, 0);

    return {
      apontamentos: totalApontamentos,
      caixas: totalCaixas,
      aluminio: totalAluminio,
      retorno: totalRetorno,
      perdas: totalPerdas,
      taxa_perda_pct: totalAluminio > 0 ? ((totalPerdas / totalAluminio) * 100).toFixed(2) : 0,
      oleo: totalOleo,
      horas: totalHoras.toFixed(2),
    };
  }, [dadosFiltrados]);

  // GRÁFICO: PRODUÇÃO POR DIA
  const graficoProducaoPorDia = useMemo(() => {
    const mapa = new Map();

    dadosFiltrados.forEach((p) => {
      const dia = p.data;
      if (!mapa.has(dia)) {
        mapa.set(dia, { data: dia, caixas: 0, aluminio: 0, perdas: 0 });
      }
      const item = mapa.get(dia);
      item.caixas += p.qtde_caixas;
      item.aluminio += p.aluminio_bruto;
      item.perdas += p.perdas_peca;
    });

    return Array.from(mapa.values()).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [dadosFiltrados]);

  if (loading) {
    return (
      <Layout title="Relatórios Avançados">
        <div className="text-center py-12">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Relatórios Avançados">
      <div className="space-y-6">
        {/* FILTROS */}
        <Card title="🔍 Filtros">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormInput
              label="Data Início"
              type="date"
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
            />
            <FormInput
              label="Data Fim"
              type="date"
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
            />
            <FormInput
              label="Moldador"
              type="select"
              value={filtroMoldador}
              onChange={(e) => setFiltroMoldador(e.target.value)}
            >
              <option value="">Todos</option>
              {funcionarios.filter(f => f.funcao === 'Moldador').map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </FormInput>
            <FormInput
              label="Produto"
              type="select"
              value={filtroProduto}
              onChange={(e) => setFiltroProduto(e.target.value)}
            >
              <option value="">Todos</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>{p.codigo} - {p.nome}</option>
              ))}
            </FormInput>
          </div>
        </Card>

        {/* RESUMO GERAL */}
        <Card title="📊 Resumo Geral">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-slate-600">Apontamentos</p>
              <p className="text-2xl font-bold">{relatorioResumo.apontamentos}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-xs text-slate-600">Caixas</p>
              <p className="text-2xl font-bold">{relatorioResumo.caixas}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-xs text-slate-600">Alumínio (kg)</p>
              <p className="text-2xl font-bold">{relatorioResumo.aluminio.toFixed(0)}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-xs text-slate-600">Perdas</p>
              <p className="text-2xl font-bold">{relatorioResumo.taxa_perda_pct}%</p>
            </div>
          </div>
        </Card>

        {/* PERFORMANCE POR MOLDADOR */}
        <Card title="👷 Performance por Moldador">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left">Moldador</th>
                <th className="p-2 text-right">Apontamentos</th>
                <th className="p-2 text-right">Caixas</th>
                <th className="p-2 text-right">Alumínio (kg)</th>
                <th className="p-2 text-right">Perdas</th>
                <th className="p-2 text-right">Horas</th>
              </tr>
            </thead>
            <tbody>
              {relatorioPerformanceMoldador.map((r) => (
                <tr key={r.nome} className="border-b hover:bg-slate-50">
                  <td className="p-2 font-semibold">{r.nome}</td>
                  <td className="p-2 text-right">{r.apontamentos}</td>
                  <td className="p-2 text-right">{r.caixas}</td>
                  <td className="p-2 text-right">{r.aluminio.toFixed(0)}</td>
                  <td className="p-2 text-right">{r.perdas}</td>
                  <td className="p-2 text-right">{r.tempo_horas.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* PRODUÇÃO POR PRODUTO */}
        <Card title="🏭 Produção por Produto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left">Código</th>
                <th className="p-2 text-left">Produto</th>
                <th className="p-2 text-right">Apontamentos</th>
                <th className="p-2 text-right">Caixas</th>
                <th className="p-2 text-right">Alumínio (kg)</th>
                <th className="p-2 text-right">Taxa Perda</th>
              </tr>
            </thead>
            <tbody>
              {relatorioProducaoProduto.map((r) => (
                <tr key={r.codigo} className="border-b hover:bg-slate-50">
                  <td className="p-2 font-semibold">{r.codigo}</td>
                  <td className="p-2">{r.nome}</td>
                  <td className="p-2 text-right">{r.apontamentos}</td>
                  <td className="p-2 text-right">{r.caixas}</td>
                  <td className="p-2 text-right">{r.aluminio.toFixed(0)}</td>
                  <td className="p-2 text-right">
                    <Badge variant={parseFloat(r.taxa_perda as string) < 5 ? 'success' : 'warning'}>
                      {r.taxa_perda}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* GRÁFICO: PRODUÇÃO POR DIA */}
        <Card title="📈 Produção por Dia">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={graficoProducaoPorDia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="caixas" stroke="#3b82f6" name="Caixas" />
              <Line yAxisId="right" type="monotone" dataKey="aluminio" stroke="#f97316" name="Alumínio (kg)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </Layout>
  );
}
