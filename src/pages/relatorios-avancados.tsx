import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card, Badge } from '@/components/ui';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function RelatoriosAvancadosPage() {
  const { producoes, funcionarios, produtos, loading } = useProducao();

  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroMoldador, setFiltroMoldador] = useState('');
  const [filtroProduto, setFiltroProduto] = useState('');

  const dadosFiltrados = useMemo(() => {
    let dados = [...producoes];
    if (filtroDataInicio) dados = dados.filter((p) => p.data >= filtroDataInicio);
    if (filtroDataFim) dados = dados.filter((p) => p.data <= filtroDataFim);
    if (filtroMoldador) dados = dados.filter((p) => p.moldador_id === filtroMoldador);
    if (filtroProduto) dados = dados.filter((p) => p.produto_id === filtroProduto);
    return dados;
  }, [producoes, filtroDataInicio, filtroDataFim, filtroMoldador, filtroProduto]);

  const relatorioMoldadores = useMemo(
    () =>
      funcionarios
        .filter((f) => f.funcao === 'Moldador')
        .map((f) => {
          const dados = dadosFiltrados.filter((p) => p.moldador_id === f.id);
          const totalAluminio = dados.reduce((s, p) => s + p.aluminio_bruto, 0);
          const totalPerdas = dados.reduce((s, p) => s + p.perdas_peca, 0);
          return {
            nome: f.nome,
            apontamentos: dados.length,
            caixas: dados.reduce((s, p) => s + p.qtde_caixas, 0),
            aluminio: totalAluminio,
            perdas: totalPerdas,
            horas: dados.reduce((s, p) => s + p.tempo_horas, 0),
            taxaPerda: totalAluminio > 0 ? ((totalPerdas / totalAluminio) * 100).toFixed(2) : '0.00',
          };
        }),
    [funcionarios, dadosFiltrados]
  );

  const relatorioProdutos = useMemo(
    () =>
      produtos
        .map((prod) => {
          const dados = dadosFiltrados.filter((p) => p.produto_id === prod.id);
          const totalAluminio = dados.reduce((s, p) => s + p.aluminio_bruto, 0);
          const totalPerdas = dados.reduce((s, p) => s + p.perdas_peca, 0);
          return {
            codigo: prod.codigo,
            nome: prod.nome,
            apontamentos: dados.length,
            caixas: dados.reduce((s, p) => s + p.qtde_caixas, 0),
            aluminio: totalAluminio,
            taxaPerda: totalAluminio > 0 ? ((totalPerdas / totalAluminio) * 100).toFixed(2) : '0.00',
          };
        })
        .filter((r) => r.apontamentos > 0),
    [produtos, dadosFiltrados]
  );

  const resumo = useMemo(() => {
    const totalAluminio = dadosFiltrados.reduce((s, p) => s + p.aluminio_bruto, 0);
    const totalPerdas = dadosFiltrados.reduce((s, p) => s + p.perdas_peca, 0);
    return {
      apontamentos: dadosFiltrados.length,
      caixas: dadosFiltrados.reduce((s, p) => s + p.qtde_caixas, 0),
      aluminio: totalAluminio,
      perdas: totalPerdas,
      taxaPerda: totalAluminio > 0 ? ((totalPerdas / totalAluminio) * 100).toFixed(2) : '0.00',
      oleo: dadosFiltrados.reduce((s, p) => s + p.consumo_oleo, 0),
      horas: dadosFiltrados.reduce((s, p) => s + p.tempo_horas, 0),
    };
  }, [dadosFiltrados]);

  const graficoProducaoPorDia = useMemo(() => {
    const mapa = new Map<string, { data: string; caixas: number; aluminio: number; perdas: number }>();
    dadosFiltrados.forEach((p) => {
      const item = mapa.get(p.data) ?? { data: p.data, caixas: 0, aluminio: 0, perdas: 0 };
      item.caixas += p.qtde_caixas;
      item.aluminio += p.aluminio_bruto;
      item.perdas += p.perdas_peca;
      mapa.set(p.data, item);
    });
    return Array.from(mapa.values()).sort((a, b) => a.data.localeCompare(b.data));
  }, [dadosFiltrados]);

  const moldadores = useMemo(() => funcionarios.filter((f) => f.funcao === 'Moldador'), [funcionarios]);

  if (loading) {
    return (
      <Layout title="Relatórios Avançados">
        <div className="text-center py-12">Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Relatórios Avançados">
      <div className="space-y-6">
        <Card title="Filtros">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Data Início</label>
              <input
                type="date"
                className="form-input"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Data Fim</label>
              <input
                type="date"
                className="form-input"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Moldador</label>
              <select
                className="form-select"
                value={filtroMoldador}
                onChange={(e) => setFiltroMoldador(e.target.value)}
              >
                <option value="">Todos</option>
                {moldadores.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Produto</label>
              <select
                className="form-select"
                value={filtroProduto}
                onChange={(e) => setFiltroProduto(e.target.value)}
              >
                <option value="">Todos</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        <Card title="Resumo Geral">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-slate-600">Apontamentos</p>
              <p className="text-2xl font-bold">{resumo.apontamentos}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-xs text-slate-600">Caixas</p>
              <p className="text-2xl font-bold">{resumo.caixas}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-xs text-slate-600">Alumínio (kg)</p>
              <p className="text-2xl font-bold">{resumo.aluminio.toFixed(0)}</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-xs text-slate-600">Taxa Perda</p>
              <p className="text-2xl font-bold">{resumo.taxaPerda}%</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600">Perdas (peças)</p>
              <p className="text-lg font-bold">{resumo.perdas}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600">Óleo Consumido (L)</p>
              <p className="text-lg font-bold">{resumo.oleo.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600">Horas Trabalhadas</p>
              <p className="text-lg font-bold">{resumo.horas.toFixed(1)}</p>
            </div>
          </div>
        </Card>

        <Card title="Performance por Moldador">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 text-left">Moldador</th>
                  <th className="p-2 text-right">Apontamentos</th>
                  <th className="p-2 text-right">Caixas</th>
                  <th className="p-2 text-right">Alumínio (kg)</th>
                  <th className="p-2 text-right">Perdas</th>
                  <th className="p-2 text-right">Taxa Perda</th>
                  <th className="p-2 text-right">Horas</th>
                </tr>
              </thead>
              <tbody>
                {relatorioMoldadores.map((r) => (
                  <tr key={r.nome} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-semibold">{r.nome}</td>
                    <td className="p-2 text-right">{r.apontamentos}</td>
                    <td className="p-2 text-right">{r.caixas}</td>
                    <td className="p-2 text-right">{r.aluminio.toFixed(0)}</td>
                    <td className="p-2 text-right">{r.perdas}</td>
                    <td className="p-2 text-right">
                      <Badge variant={parseFloat(r.taxaPerda) < 5 ? 'success' : 'warning'}>
                        {r.taxaPerda}%
                      </Badge>
                    </td>
                    <td className="p-2 text-right">{r.horas.toFixed(1)}</td>
                  </tr>
                ))}
                {relatorioMoldadores.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">Sem dados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Produção por Produto">
          <div className="overflow-x-auto">
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
                {relatorioProdutos.map((r) => (
                  <tr key={r.codigo} className="border-b hover:bg-slate-50">
                    <td className="p-2 font-semibold">{r.codigo}</td>
                    <td className="p-2">{r.nome}</td>
                    <td className="p-2 text-right">{r.apontamentos}</td>
                    <td className="p-2 text-right">{r.caixas}</td>
                    <td className="p-2 text-right">{r.aluminio.toFixed(0)}</td>
                    <td className="p-2 text-right">
                      <Badge variant={parseFloat(r.taxaPerda) < 5 ? 'success' : 'warning'}>
                        {r.taxaPerda}%
                      </Badge>
                    </td>
                  </tr>
                ))}
                {relatorioProdutos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">Sem dados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Produção por Dia">
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
