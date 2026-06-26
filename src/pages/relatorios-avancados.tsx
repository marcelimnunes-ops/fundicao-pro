import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card, FormSelect, FormInput, Badge } from '@/components/ui';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const CORES = ['#3b82f6', '#ef4444', '#10b981', '#f97316', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

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

  // ============================================================================
  // RELATÓRIO 1: PERFORMANCE POR MOLDADOR (COM FILTROS)
  // ============================================================================
  const relatorioPerformanceMoldador = useMemo(() => {
    return funcionarios
      .filter((f) => f.funcao === 'Moldador')
      .map((f) => {
        const dados = dadosFiltrados.filter((p) => p.moldador_id === f.id);
        return {
          nome: f.nome,
          apontamentos: dados.length,
          caixasTotal: dados.reduce((sum, p) => sum + p.qtde_caixas, 0),
          eficienciaMedia: dados.length ? (dados.reduce((sum, p) => sum + p.eficiencia, 0) / dados.length).toFixed(2) : 0,
          perdaMedia: dados.length ? (dados.reduce((sum, p) => sum + p.taxa_perda, 0) / dados.length).toFixed(2) : 0,
          custoMedio: dados.length ? (dados.reduce((sum, p) => sum + p.custo_total, 0) / dados.length).toFixed(2) : 0,
        };
      })
      .sort((a, b) => b.eficienciaMedia - a.eficienciaMedia);
  }, [funcionarios, dadosFiltrados]);

  // ============================================================================
  // RELATÓRIO 2: CUSTOS DETALHADOS
  // ============================================================================
  const relatorioCustos = useMemo(() => {
    const custoMO = dadosFiltrados.reduce((sum, p) => sum + (p.custo_mo || 0), 0);
    const custoAluminio = dadosFiltrados.reduce((sum, p) => sum + (p.custo_aluminio || 0), 0);
    const custoOleo = dadosFiltrados.reduce((sum, p) => sum + (p.custo_oleo || 0), 0);
    const custoTotal = custoMO + custoAluminio + custoOleo;

    return [
      { nome: 'Mão de Obra', valor: custoMO, percentual: custoTotal > 0 ? ((custoMO / custoTotal) * 100).toFixed(2) : 0 },
      { nome: 'Alumínio', valor: custoAluminio, percentual: custoTotal > 0 ? ((custoAluminio / custoTotal) * 100).toFixed(2) : 0 },
      { nome: 'Óleo', valor: custoOleo, percentual: custoTotal > 0 ? ((custoOleo / custoTotal) * 100).toFixed(2) : 0 },
    ];
  }, [dadosFiltrados]);

  // ============================================================================
  // RELATÓRIO 3: LUCRATIVIDADE POR CLIENTE
  // ============================================================================
  const relatorioLucratividade = useMemo(() => {
    return clientes.map((c) => {
      const dados = dadosFiltrados.filter((p) => p.cliente_id === c.id);
      const pecasTotal = dados.reduce((sum, p) => sum + (p.qtde_caixas * p.qtd_pecas_placa - p.perdas_peca), 0);
      const custoTotal = dados.reduce((sum, p) => sum + p.custo_total, 0);
      const receita = pecasTotal * (c.preco_venda || 0);
      const lucro = receita - custoTotal;
      const margemPercentual = receita > 0 ? ((lucro / receita) * 100).toFixed(2) : 0;

      return {
        nome: c.nome,
        apontamentos: dados.length,
        receita: parseFloat(receita.toFixed(2)),
        custo: parseFloat(custoTotal.toFixed(2)),
        lucro: parseFloat(lucro.toFixed(2)),
        margem: parseFloat(margemPercentual),
      };
    }).filter(x => x.apontamentos > 0);
  }, [clientes, dadosFiltrados]);

  // ============================================================================
  // RELATÓRIO 4: PERDA POR ETAPA
  // ============================================================================
  const relatorioPerda = useMemo(() => {
    const totalPecas = dadosFiltrados.reduce((sum, p) => sum + (p.qtde_caixas * p.qtd_pecas_placa), 0);
    const perdaMoldagem = dadosFiltrados.reduce((sum, p) => sum + (p.perda_moldagem || 0), 0);
    const perdaFusao = dadosFiltrados.reduce((sum, p) => sum + (p.perda_fusao || 0), 0);
    const perdaRebarbacao = dadosFiltrados.reduce((sum, p) => sum + (p.perda_rebarbacao || 0), 0);
    const perdaUsinagem = dadosFiltrados.reduce((sum, p) => sum + (p.perda_usinagem || 0), 0);

    return [
      { etapa: 'Moldagem', perda: perdaMoldagem, percentual: totalPecas > 0 ? ((perdaMoldagem / totalPecas) * 100).toFixed(2) : 0 },
      { etapa: 'Fusão', perda: perdaFusao, percentual: totalPecas > 0 ? ((perdaFusao / totalPecas) * 100).toFixed(2) : 0 },
      { etapa: 'Rebarbação', perda: perdaRebarbacao, percentual: totalPecas > 0 ? ((perdaRebarbacao / totalPecas) * 100).toFixed(2) : 0 },
      { etapa: 'Usinagem', perda: perdaUsinagem, percentual: totalPecas > 0 ? ((perdaUsinagem / totalPecas) * 100).toFixed(2) : 0 },
    ];
  }, [dadosFiltrados]);

  // ============================================================================
  // RELATÓRIO 5: CONSUMO DE ÓLEO
  // ============================================================================
  const relatorioOleo = useMemo(() => {
    const aluminioTotal = dadosFiltrados.reduce((sum, p) => sum + p.aluminio_bruto, 0);
    const oleoTotal = dadosFiltrados.reduce((sum, p) => sum + p.consumo_oleo, 0);
    const mediaOleoPorKg = aluminioTotal > 0 ? (oleoTotal / aluminioTotal).toFixed(4) : 0;

    return {
      aluminioProcessado: parseFloat(aluminioTotal.toFixed(2)),
      oleoConsumido: parseFloat(oleoTotal.toFixed(2)),
      mediaOleoPorKg: parseFloat(mediaOleoPorKg),
      custo: parseFloat((oleoTotal * 2.5).toFixed(2)), // 2.50 por litro
    };
  }, [dadosFiltrados]);

  // ============================================================================
  // RELATÓRIO 6: COMPARAÇÃO PERÍODO ANTERIOR
  // ============================================================================
  const relatorioComparacao = useMemo(() => {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 7);

    const periodoPrincipal = dadosFiltrados.filter((p) => new Date(p.data) > dataLimite);
    const periodoAnterior = producoes.filter((p) => {
      const d = new Date(p.data);
      return d <= dataLimite && d > new Date(dataLimite.getTime() - 7 * 24 * 60 * 60 * 1000);
    });

    const calc = (dados) => ({
      apontamentos: dados.length,
      caixas: dados.reduce((sum, p) => sum + p.qtde_caixas, 0),
      eficiencia: dados.length ? (dados.reduce((sum, p) => sum + p.eficiencia, 0) / dados.length).toFixed(2) : 0,
      perda: dados.length ? (dados.reduce((sum, p) => sum + p.taxa_perda, 0) / dados.length).toFixed(2) : 0,
      custo: parseFloat(dados.reduce((sum, p) => sum + p.custo_total, 0).toFixed(2)),
    });

    return {
      atual: calc(periodoPrincipal),
      anterior: calc(periodoAnterior),
    };
  }, [dadosFiltrados, producoes]);

  // ============================================================================
  // RELATÓRIO 7: RENTABILIDADE POR PRODUTO
  // ============================================================================
  const relatorioRentabilidade = useMemo(() => {
    return produtos
      .map((p) => {
        const dados = dadosFiltrados.filter((pr) => pr.produto_id === p.id);
        const pecasTotal = dados.reduce((sum, pr) => sum + (pr.qtde_caixas * p.qtd_pecas_placa - pr.perdas_peca), 0);
        const custoTotal = dados.reduce((sum, pr) => sum + pr.custo_total, 0);
        const custoPorPeca = pecasTotal > 0 ? (custoTotal / pecasTotal).toFixed(2) : 0;
        const precoVenda = p.preco_venda || 0;
        const margemUnitaria = (precoVenda - custoPorPeca).toFixed(2);
        const margemPercentual = precoVenda > 0 ? ((margemUnitaria / precoVenda) * 100).toFixed(2) : 0;

        return {
          codigo: p.codigo,
          nome: p.nome,
          apontamentos: dados.length,
          pecasTotal,
          precoVenda,
          custoPorPeca: parseFloat(custoPorPeca),
          margemUnitaria: parseFloat(margemUnitaria),
          margemPercentual: parseFloat(margemPercentual),
        };
      })
      .filter((p) => p.apontamentos > 0)
      .sort((a, b) => b.margemPercentual - a.margemPercentual);
  }, [produtos, dadosFiltrados]);

  // ============================================================================
  // RELATÓRIO 8: RESUMO FINANCEIRO
  // ============================================================================
  const relatorioFinanceiro = useMemo(() => {
    const caixasTotal = dadosFiltrados.reduce((sum, p) => sum + p.qtde_caixas, 0);
    const aluminioTotal = dadosFiltrados.reduce((sum, p) => sum + p.aluminio_bruto, 0);
    const pecasTotal = dadosFiltrados.reduce((sum, p) => sum + (p.qtde_caixas * p.qtd_pecas_placa - p.perdas_peca), 0);
    const custoTotal = dadosFiltrados.reduce((sum, p) => sum + p.custo_total, 0);
    const receitaEstimada = pecasTotal * 15; // preço médio estimado
    const lucro = receitaEstimada - custoTotal;
    const margemPercentual = receitaEstimada > 0 ? ((lucro / receitaEstimada) * 100).toFixed(2) : 0;

    return {
      apontamentos: dadosFiltrados.length,
      caixasProcessadas: caixasTotal,
      aluminioProcessado: parseFloat(aluminioTotal.toFixed(2)),
      pecasProduzidas: pecasTotal,
      custoTotal: parseFloat(custoTotal.toFixed(2)),
      receitaEstimada: parseFloat(receitaEstimada.toFixed(2)),
      lucroEstimado: parseFloat(lucro.toFixed(2)),
      margemPercentual: parseFloat(margemPercentual),
    };
  }, [dadosFiltrados]);

  // ============================================================================
  // RELATÓRIO 9: PRODUÇÃO POR DIA (SÉRIE TEMPORAL)
  // ============================================================================
  const relatorioProducaoPorDia = useMemo(() => {
    const agrupado = {};
    dadosFiltrados.forEach((p) => {
      const data = p.data.split('T')[0];
      if (!agrupado[data]) {
        agrupado[data] = { data, caixas: 0, custoTotal: 0, eficiencia: 0, count: 0 };
      }
      agrupado[data].caixas += p.qtde_caixas;
      agrupado[data].custoTotal += p.custo_total;
      agrupado[data].eficiencia += p.eficiencia;
      agrupado[data].count += 1;
    });

    return Object.values(agrupado)
      .map((d) => ({
        data: new Date(d.data).toLocaleDateString('pt-BR'),
        caixas: d.caixas,
        custoMedio: parseFloat((d.custoTotal / d.count).toFixed(2)),
        eficienciaMedia: parseFloat((d.eficiencia / d.count).toFixed(2)),
      }))
      .sort((a, b) => new Date(a.data) - new Date(b.data));
  }, [dadosFiltrados]);

  // ============================================================================
  // RELATÓRIO 10: DISTRIBUIÇÃO DE PERDA
  // ============================================================================
  const relatorioDistribuicaoPerda = useMemo(() => {
    const moldadores = {};
    dadosFiltrados.forEach((p) => {
      const moldador = funcionarios.find((f) => f.id === p.moldador_id);
      if (moldador) {
        if (!moldadores[moldador.nome]) {
          moldadores[moldador.nome] = 0;
        }
        moldadores[moldador.nome] += p.taxa_perda;
      }
    });

    return Object.entries(moldadores).map(([nome, perda]) => ({
      name: nome,
      value: parseFloat(perda.toFixed(2)),
    }));
  }, [dadosFiltrados, funcionarios]);

  if (loading) {
    return (
      <Layout title="Relatórios Avançados">
        <div className="text-center py-12">
          <p>Carregando dados...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Relatórios Avançados">
      <div className="space-y-6">
        {/* FILTROS */}
        <Card title="🔍 Filtros Avançados" className="bg-blue-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <FormSelect
              label="Moldador"
              options={[
                { value: '', label: 'Todos' },
                ...funcionarios
                  .filter((f) => f.funcao === 'Moldador')
                  .map((f) => ({ value: f.id, label: f.nome })),
              ]}
              value={filtroMoldador}
              onChange={(e) => setFiltroMoldador(e.target.value)}
            />
            <FormSelect
              label="Cliente"
              options={[
                { value: '', label: 'Todos' },
                ...clientes.map((c) => ({ value: c.id, label: c.nome })),
              ]}
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
            />
            <FormSelect
              label="Produto"
              options={[
                { value: '', label: 'Todos' },
                ...produtos.map((p) => ({ value: p.id, label: p.codigo })),
              ]}
              value={filtroProduto}
              onChange={(e) => setFiltroProduto(e.target.value)}
            />
          </div>
        </Card>

        {/* RELATÓRIO 1: PERFORMANCE POR MOLDADOR */}
        <Card title="📊 1. Performance por Moldador">
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={relatorioPerformanceMoldador}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="eficienciaMedia" fill="#10b981" name="Eficiência %" />
                <Bar yAxisId="right" dataKey="perdaMedia" fill="#ef4444" name="Perda %" />
              </BarChart>
            </ResponsiveContainer>
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 text-left">Moldador</th>
                  <th className="p-2 text-right">Apontamentos</th>
                  <th className="p-2 text-right">Caixas</th>
                  <th className="p-2 text-right">Eficiência</th>
                  <th className="p-2 text-right">Perda %</th>
                  <th className="p-2 text-right">Custo Médio</th>
                </tr>
              </thead>
              <tbody>
                {relatorioPerformanceMoldador.map((r) => (
                  <tr key={r.nome} className="border-b">
                    <td className="p-2 font-semibold">{r.nome}</td>
                    <td className="p-2 text-right">{r.apontamentos}</td>
                    <td className="p-2 text-right">{r.caixasTotal}</td>
                    <td className="p-2 text-right">{r.eficienciaMedia}%</td>
                    <td className="p-2 text-right">
                      <Badge variant={r.perdaMedia < 3 ? 'success' : 'warning'}>{r.perdaMedia}%</Badge>
                    </td>
                    <td className="p-2 text-right">R$ {parseFloat(r.custoMedio).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* RELATÓRIO 2: CUSTOS DETALHADOS */}
        <Card title="💰 2. Análise de Custos">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={relatorioCustos} dataKey="valor" nameKey="nome" cx="50%" cy="50%" outerRadius={100}>
                  {relatorioCustos.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {relatorioCustos.map((c) => (
                <div key={c.nome} className="p-3 border rounded-lg">
                  <div className="flex justify-between">
                    <span className="font-semibold">{c.nome}</span>
                    <span className="font-bold">R$ {c.valor.toFixed(2)}</span>
                  </div>
                  <div className="text-sm text-slate-600">{c.percentual}% do total</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* RELATÓRIO 3: LUCRATIVIDADE POR CLIENTE */}
        <Card title="🎯 3. Lucratividade por Cliente">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left">Cliente</th>
                <th className="p-2 text-right">Apontamentos</th>
                <th className="p-2 text-right">Receita</th>
                <th className="p-2 text-right">Custo</th>
                <th className="p-2 text-right">Lucro</th>
                <th className="p-2 text-right">Margem</th>
              </tr>
            </thead>
            <tbody>
              {relatorioLucratividade.map((r) => (
                <tr key={r.nome} className="border-b">
                  <td className="p-2 font-semibold">{r.nome}</td>
                  <td className="p-2 text-right">{r.apontamentos}</td>
                  <td className="p-2 text-right">R$ {r.receita.toFixed(2)}</td>
                  <td className="p-2 text-right">R$ {r.custo.toFixed(2)}</td>
                  <td className="p-2 text-right font-bold">{r.lucro >= 0 ? '✓' : '✗'} R$ {Math.abs(r.lucro).toFixed(2)}</td>
                  <td className="p-2 text-right">
                    <Badge variant={r.margem >= 20 ? 'success' : r.margem >= 10 ? 'warning' : 'danger'}>
                      {r.margem.toFixed(1)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* RELATÓRIO 4: PERDA POR ETAPA */}
        <Card title="⚠️ 4. Perda por Etapa de Produção">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={relatorioPerda}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="etapa" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="perda" fill="#ef4444" name="Peças Perdidas" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* RELATÓRIO 5: CONSUMO DE ÓLEO */}
        <Card title="🛢️ 5. Consumo de Óleo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-slate-600">Alumínio Processado</p>
                <p className="text-3xl font-bold">{relatorioOleo.aluminioProcessado} kg</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-slate-600">Óleo Consumido</p>
                <p className="text-3xl font-bold">{relatorioOleo.oleoConsumido} L</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-slate-600">Média por kg</p>
                <p className="text-3xl font-bold">{relatorioOleo.mediaOleoPorKg} L/kg</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-slate-600">Custo Total Óleo</p>
                <p className="text-3xl font-bold">R$ {relatorioOleo.custo.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* RELATÓRIO 6: COMPARAÇÃO COM PERÍODO ANTERIOR */}
        <Card title="📈 6. Comparação Últimas 2 Semanas">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { label: 'Apontamentos', atual: relatorioComparacao.atual.apontamentos, anterior: relatorioComparacao.anterior.apontamentos },
              { label: 'Caixas', atual: relatorioComparacao.atual.caixas, anterior: relatorioComparacao.anterior.caixas },
              { label: 'Eficiência %', atual: relatorioComparacao.atual.eficiencia, anterior: relatorioComparacao.anterior.eficiencia },
              { label: 'Perda %', atual: relatorioComparacao.atual.perda, anterior: relatorioComparacao.anterior.perda },
              { label: 'Custo R$', atual: relatorioComparacao.atual.custo, anterior: relatorioComparacao.anterior.custo },
            ].map((item, idx) => {
              const variacao = ((item.atual - item.anterior) / (item.anterior || 1) * 100).toFixed(1);
              const positivo = idx === 0 || idx === 1 || idx === 2 ? variacao >= 0 : variacao <= 0;

              return (
                <div key={idx} className="p-3 border rounded-lg">
                  <p className="text-xs text-slate-600">{item.label}</p>
                  <p className="text-lg font-bold">{item.atual}</p>
                  <p className={`text-xs ${positivo ? 'text-green-600' : 'text-red-600'}`}>
                    {positivo ? '↑' : '↓'} {Math.abs(variacao)}%
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* RELATÓRIO 7: RENTABILIDADE POR PRODUTO */}
        <Card title="💎 7. Rentabilidade por Produto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 text-left">Código</th>
                <th className="p-2 text-right">Apontamentos</th>
                <th className="p-2 text-right">Peças</th>
                <th className="p-2 text-right">Preço Venda</th>
                <th className="p-2 text-right">Custo/Peça</th>
                <th className="p-2 text-right">Margem Unit.</th>
                <th className="p-2 text-right">Margem %</th>
              </tr>
            </thead>
            <tbody>
              {relatorioRentabilidade.slice(0, 10).map((r) => (
                <tr key={r.codigo} className="border-b">
                  <td className="p-2 font-semibold">{r.codigo}</td>
                  <td className="p-2 text-right">{r.apontamentos}</td>
                  <td className="p-2 text-right">{r.pecasTotal}</td>
                  <td className="p-2 text-right">R$ {r.precoVenda.toFixed(2)}</td>
                  <td className="p-2 text-right">R$ {r.custoPorPeca.toFixed(2)}</td>
                  <td className="p-2 text-right">R$ {r.margemUnitaria.toFixed(2)}</td>
                  <td className="p-2 text-right">
                    <Badge variant={r.margemPercentual >= 20 ? 'success' : 'warning'}>
                      {r.margemPercentual.toFixed(1)}%
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* RELATÓRIO 8: RESUMO FINANCEIRO */}
        <Card title="📋 8. Resumo Financeiro Completo">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-100 rounded-lg">
              <p className="text-xs text-slate-600">Apontamentos</p>
              <p className="text-3xl font-bold">{relatorioFinanceiro.apontamentos}</p>
            </div>
            <div className="p-4 bg-blue-100 rounded-lg">
              <p className="text-xs text-slate-600">Caixas</p>
              <p className="text-3xl font-bold">{relatorioFinanceiro.caixasProcessadas}</p>
            </div>
            <div className="p-4 bg-orange-100 rounded-lg">
              <p className="text-xs text-slate-600">Alumínio (kg)</p>
              <p className="text-3xl font-bold">{relatorioFinanceiro.aluminioProcessado}</p>
            </div>
            <div className="p-4 bg-green-100 rounded-lg">
              <p className="text-xs text-slate-600">Peças</p>
              <p className="text-3xl font-bold">{relatorioFinanceiro.pecasTotal}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="p-4 border-2 border-red-300 rounded-lg">
              <p className="text-sm text-slate-600">Custo Total</p>
              <p className="text-2xl font-bold text-red-600">R$ {relatorioFinanceiro.custoTotal.toFixed(2)}</p>
            </div>
            <div className="p-4 border-2 border-blue-300 rounded-lg">
              <p className="text-sm text-slate-600">Receita Estimada</p>
              <p className="text-2xl font-bold text-blue-600">R$ {relatorioFinanceiro.receitaEstimada.toFixed(2)}</p>
            </div>
            <div className={`p-4 border-2 rounded-lg ${relatorioFinanceiro.lucroEstimado >= 0 ? 'border-green-300' : 'border-red-300'}`}>
              <p className="text-sm text-slate-600">Lucro Estimado</p>
              <p className={`text-2xl font-bold ${relatorioFinanceiro.lucroEstimado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {relatorioFinanceiro.lucroEstimado.toFixed(2)}
              </p>
              <p className="text-xs mt-1 text-slate-600">Margem: {relatorioFinanceiro.margemPercentual.toFixed(2)}%</p>
            </div>
          </div>
        </Card>

        {/* RELATÓRIO 9: PRODUÇÃO POR DIA */}
        <Card title="📅 9. Produção por Dia (Série Temporal)">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={relatorioProducaoPorDia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="data" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="caixas" stroke="#3b82f6" name="Caixas" />
              <Line yAxisId="right" type="monotone" dataKey="eficienciaMedia" stroke="#10b981" name="Eficiência %" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* RELATÓRIO 10: DISTRIBUIÇÃO DE PERDA */}
        <Card title="🥧 10. Distribuição de Perda por Moldador">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={relatorioDistribuicaoPerda} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                {relatorioDistribuicaoPerda.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </Layout>
  );
}
