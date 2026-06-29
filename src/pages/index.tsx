import { useMemo, useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { useConfig } from '@/hooks/useConfig';
import { supabase } from '@/lib/supabase';
import { fmtData, fmtN, fmtR } from '@/lib/fmt';

interface Compra { data: string; material: string; quantidade: number; preco_unitario: number; valor_total: number; }

function KpiCard({ label, value, sub, color = 'text-slate-800' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-1">{label}</p>
      <p className={'text-2xl font-bold ' + color}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function BarChart({ data, labelKey, valueKey, color = '#f97316' }: { data: Record<string, unknown>[]; labelKey: string; valueKey: string; color?: string }) {
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const val = Number(d[valueKey]) || 0;
        const pct = (val / max) * 100;
        return (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-28 text-right text-xs text-slate-500 truncate" title={String(d[labelKey])}>{String(d[labelKey])}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: pct + '%', backgroundColor: color }} />
            </div>
            <span className="w-16 text-xs text-slate-600 font-mono text-right">{val.toLocaleString('pt-BR')}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { producoes, funcionarios, produtos, loading } = useProducao();
  const { config } = useConfig();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [periodo, setPeriodo] = useState<'30' | '90' | '365' | 'tudo'>('tudo');

  useEffect(() => {
    supabase.from('compras').select('*').order('data', { ascending: false })
      .then(({ data }) => setCompras((data as Compra[]) ?? []));
  }, []);

  const kpis = useMemo(() => {
    const diasAtras = periodo === 'tudo' ? Infinity : parseInt(periodo);
    const corte = new Date();
    if (diasAtras !== Infinity) corte.setDate(corte.getDate() - diasAtras);

    const filtrados = periodo === 'tudo' ? producoes : producoes.filter((p) => new Date(p.data) >= corte);

    const totalCaixas = filtrados.reduce((s, p) => s + (p.qtde_caixas ?? 0), 0);
    const totalAlBruto = filtrados.reduce((s, p) => s + (p.aluminio_bruto ?? 0), 0);
    const totalRetorno = filtrados.reduce((s, p) => s + (p.peso_retorno ?? 0), 0);
    const totalPerdas = filtrados.reduce((s, p) => s + (p.perdas_peca ?? 0), 0);
    const totalHoras = filtrados.reduce((s, p) => s + (p.tempo_horas ?? 0), 0);
    const alUtil = Math.abs(totalAlBruto - totalRetorno);
    const aprovPct = totalAlBruto > 0 ? (alUtil / totalAlBruto) * 100 : 0;
    const cxPorHora = totalHoras > 0 ? totalCaixas / totalHoras : 0;

    // Custo matéria-prima (compras no período)
    const comprasFilt = periodo === 'tudo' ? compras : compras.filter((c) => new Date(c.data) >= corte);
    const custoAlR = comprasFilt.filter((c) => c.material !== 'Óleo').reduce((s, c) => s + (c.valor_total ?? 0), 0);
    const custoOleoR = comprasFilt.filter((c) => c.material === 'Óleo').reduce((s, c) => s + (c.valor_total ?? 0), 0);
    const totAlKg = comprasFilt.filter((c) => c.material !== 'Óleo').reduce((s, c) => s + (c.quantidade ?? 0), 0);
    // custo médio do alumínio (fallback para config se não há compras)
    const custoMedioAl = totAlKg > 0 ? custoAlR / totAlKg : config.CUSTO_KG_SUCATA;
    const custoPorKgUtil = alUtil > 0 ? custoAlR / alUtil : 0;
    const custoPorCx = totalCaixas > 0 ? (custoAlR + custoOleoR) / totalCaixas : 0;

    // Custo MO (com encargos)
    const custoMO = filtrados.reduce((s, p) => {
      const mold = funcionarios.find((f) => f.id === p.moldador_id);
      const ajud = funcionarios.find((f) => f.id === p.ajudante_id);
      const hMold = mold ? ((mold.salario ?? 0) * config.ENCARGOS_TRABALHISTAS + (mold.cartao_beneficio ?? 0)) / config.HORAS_UTEIS_MES : 0;
      const hAjud = ajud ? ((ajud.salario ?? 0) * config.ENCARGOS_TRABALHISTAS + (ajud.cartao_beneficio ?? 0)) / config.HORAS_UTEIS_MES : 0;
      return s + (hMold + hAjud) * (p.tempo_horas ?? 0);
    }, 0);

    // Top 5 produtos
    const porProduto: Record<string, number> = {};
    filtrados.forEach((p) => { porProduto[p.produto_id] = (porProduto[p.produto_id] ?? 0) + (p.qtde_caixas ?? 0); });
    const topProdutos = Object.entries(porProduto)
      .map(([id, cx]) => ({ label: (produtos.find((p) => p.id === id)?.nome ?? id).split(' ').slice(0, 3).join(' '), value: cx }))
      .sort((a, b) => b.value - a.value).slice(0, 5);

    // Top 5 moldadores
    const porMold: Record<string, { cx: number; h: number }> = {};
    filtrados.forEach((p) => {
      if (!porMold[p.moldador_id]) porMold[p.moldador_id] = { cx: 0, h: 0 };
      porMold[p.moldador_id].cx += p.qtde_caixas ?? 0;
      porMold[p.moldador_id].h += p.tempo_horas ?? 0;
    });
    const topMoldadores = Object.entries(porMold)
      .map(([id, v]) => ({ label: (funcionarios.find((f) => f.id === id)?.nome ?? '').split(' ')[0], value: v.cx, cxH: v.h > 0 ? v.cx / v.h : 0 }))
      .sort((a, b) => b.value - a.value).slice(0, 5);

    // Evolução mensal (últimos 6 meses com dados)
    const porMes: Record<string, number> = {};
    filtrados.forEach((p) => { const m = p.data.substring(0, 7); porMes[m] = (porMes[m] ?? 0) + (p.qtde_caixas ?? 0); });
    const meses = Object.entries(porMes).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
      .map(([m, cx]) => ({ label: m.substring(5) + '/' + m.substring(2, 4), value: cx }));

    return {
      n: filtrados.length, totalCaixas, totalAlBruto, totalRetorno, alUtil, aprovPct,
      totalPerdas, totalHoras, cxPorHora, custoAlR, custoOleoR, custoMedioAl,
      custoPorKgUtil, custoPorCx, custoMO, topProdutos, topMoldadores, meses,
    };
  }, [producoes, funcionarios, produtos, compras, periodo, config]);

  if (loading) return <Layout title="Dashboard"><div className="flex items-center justify-center py-20"><div className="spinner w-10 h-10" /></div></Layout>;

  const periodos: { v: typeof periodo; l: string }[] = [
    { v: '30', l: '30 dias' }, { v: '90', l: '90 dias' }, { v: '365', l: '1 ano' }, { v: 'tudo', l: 'Tudo' },
  ];

  return (
    <Layout title="Dashboard de Producao">
      <div className="space-y-6">
        {/* Filtro período */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500 font-semibold">Periodo:</span>
          {periodos.map((o) => (
            <button key={o.v} onClick={() => setPeriodo(o.v)}
              className={'px-3 py-1 rounded-full text-sm font-medium transition-colors ' + (periodo === o.v ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              {o.l}
            </button>
          ))}
          <span className="ml-2 text-xs text-slate-400">{kpis.n} apontamentos</span>
        </div>

        {/* KPIs Producao */}
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Producao</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <KpiCard label="Total Caixas" value={kpis.totalCaixas.toLocaleString('pt-BR')} color="text-orange-600" />
            <KpiCard label="Al. Bruto Total" value={fmtN(kpis.totalAlBruto) + ' kg'} sub="aluminio consumido" />
            <KpiCard label="Al. Util (pecas)" value={fmtN(kpis.alUtil) + ' kg'} sub={fmtN(kpis.aprovPct) + '% aproveitamento'} color="text-green-600" />
            <KpiCard label="Retorno (galho)" value={fmtN(kpis.totalRetorno) + ' kg'} color="text-blue-600" />
            <KpiCard label="Perdas" value={kpis.totalPerdas.toLocaleString('pt-BR') + ' pcs'} color={kpis.totalPerdas > 0 ? 'text-red-500' : 'text-slate-800'} />
          </div>
        </div>

        {/* KPIs Produtividade */}
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Produtividade</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total Horas" value={fmtN(kpis.totalHoras, 1) + ' h'} />
            <KpiCard label="Caixas / Hora" value={fmtN(kpis.cxPorHora)} color={kpis.cxPorHora >= 3 ? 'text-green-600' : 'text-orange-500'} sub="meta: 3,00 cx/h" />
            <KpiCard label="Al. Bruto / Cx" value={fmtN(kpis.totalCaixas > 0 ? kpis.totalAlBruto / kpis.totalCaixas : 0) + ' kg'} />
            <KpiCard label="Cx / Apontamento" value={fmtN(kpis.n > 0 ? kpis.totalCaixas / kpis.n : 0, 1)} />
          </div>
        </div>

        {/* KPIs Custos */}
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Custos (baseado em compras registradas)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Custo Aluminio (MP)" value={fmtR(kpis.custoAlR)} sub="Lingote + Sucata" color="text-red-600" />
            <KpiCard label="Custo Oleo" value={fmtR(kpis.custoOleoR)} />
            <KpiCard label="Custo/kg Util" value={kpis.custoPorKgUtil > 0 ? fmtR(kpis.custoPorKgUtil) : '--'} sub="MP por kg de peca" color="text-orange-600" />
            <KpiCard label="Custo MP / Cx" value={kpis.custoPorCx > 0 ? fmtR(kpis.custoPorCx) : '--'} sub="MP + oleo por caixa" />
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="card p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Top 5 Produtos (caixas)</h3>
            {kpis.topProdutos.length > 0 ? <BarChart data={kpis.topProdutos} labelKey="label" valueKey="value" color="#f97316" /> : <p className="text-xs text-slate-400">Sem dados</p>}
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Top 5 Moldadores (caixas + cx/h)</h3>
            {kpis.topMoldadores.length > 0 ? (
              <div className="space-y-2">
                {kpis.topMoldadores.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-20 text-right text-xs text-slate-500 truncate">{m.label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: (m.value / Math.max(...kpis.topMoldadores.map((x) => x.value), 1) * 100) + '%', backgroundColor: '#3b82f6' }} />
                    </div>
                    <span className="w-24 text-xs font-mono text-right">{m.value}cx | {fmtN(m.cxH)}cx/h</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs text-slate-400">Sem dados</p>}
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Evolucao Mensal (caixas)</h3>
            {kpis.meses.length > 0 ? <BarChart data={kpis.meses} labelKey="label" valueKey="value" color="#10b981" /> : <p className="text-xs text-slate-400">Sem dados</p>}
          </div>
        </div>

        {/* Indicadores */}
        <div className="card p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Indicadores de Qualidade</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className={'p-3 rounded-lg ' + (kpis.aprovPct < 55 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200')}>
              <p className="font-semibold">Aproveitamento do Aluminio</p>
              <p className="text-xs mt-1 text-slate-600">Util/Bruto: {fmtN(kpis.aprovPct)}%</p>
            </div>
            <div className={'p-3 rounded-lg ' + (kpis.cxPorHora >= 3 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200')}>
              <p className="font-semibold">{kpis.cxPorHora >= 3 ? 'Produtividade OK' : 'Produtividade abaixo da meta'}</p>
              <p className="text-xs mt-1 text-slate-600">Meta: 3,0 cx/h | Atual: {fmtN(kpis.cxPorHora)} cx/h</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="font-semibold">Custo MO estimado</p>
              <p className="text-xs mt-1 text-slate-600">{fmtR(kpis.custoMO)} (com {((config.ENCARGOS_TRABALHISTAS - 1) * 100).toFixed(0)}% encargos)</p>
            </div>
          </div>
        </div>

        {/* Último apontamento */}
        {producoes.length > 0 && (
          <div className="card p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-2">Apontamentos Recentes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 border-b border-slate-200">
                  {['Data', 'Moldador', 'Produto', 'Caixas', 'Al. Bruto', 'Horas'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {producoes.slice(0, 5).map((p) => {
                    const mold = funcionarios.find((f) => f.id === p.moldador_id);
                    const prod = produtos.find((pr) => pr.id === p.produto_id);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-xs">{fmtData(p.data)}</td>
                        <td className="px-3 py-2 font-semibold">{mold?.nome ?? '--'}</td>
                        <td className="px-3 py-2 text-slate-600 truncate max-w-xs">{prod?.nome ?? '--'}</td>
                        <td className="px-3 py-2 text-right font-mono">{p.qtde_caixas}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmtN(p.aluminio_bruto ?? 0)}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmtN(p.tempo_horas ?? 0, 1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
