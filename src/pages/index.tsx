import { useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';

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

function BarChart({ data, labelKey, valueKey, color = '#f97316' }: { data: Record<string,unknown>[]; labelKey: string; valueKey: string; color?: string }) {
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="space-y-1">
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

function fmtR(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }); }
function fmtN(n: number, d = 1) { return n.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }); }

export default function DashboardPage() {
  const { producoes, funcionarios, produtos, loading } = useProducao();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [periodo, setPeriodo] = useState<'30' | '90' | '365' | 'tudo'>('90');

  useEffect(() => {
    supabase.from('compras').select('*').order('data', { ascending: false })
      .then(({ data }) => setCompras((data as Compra[]) ?? []));
  }, []);

  const kpis = useMemo(() => {
    const diasAtras = periodo === 'tudo' ? 99999 : parseInt(periodo);
    const corte = new Date(); corte.setDate(corte.getDate() - diasAtras);
    const filtrados = producoes.filter((p) => new Date(p.data) >= corte);

    const totalCaixas = filtrados.reduce((s, p) => s + (p.qtde_caixas ?? 0), 0);
    const totalPecas = filtrados.reduce((s, p) => s + (p.qtde_pecas ?? p.qtde_caixas * 1), 0);
    const totalAlBruto = filtrados.reduce((s, p) => s + (p.aluminio_bruto ?? 0), 0);
    const totalRetorno = filtrados.reduce((s, p) => s + (p.peso_retorno ?? 0), 0);
    const totalPerdas = filtrados.reduce((s, p) => s + (p.perdas_peca ?? 0), 0);
    const totalHoras = filtrados.reduce((s, p) => s + (p.tempo_horas ?? 0), 0);
    const alUtil = totalAlBruto - totalRetorno;
    const pctPerda = totalAlBruto > 0 ? ((totalAlBruto - alUtil) / totalAlBruto) * 100 : 0;
    const cxPorHora = totalHoras > 0 ? totalCaixas / totalHoras : 0;

    // Custos de matéria-prima (compras no período)
    const comprasFiltradas = compras.filter((c) => new Date(c.data) >= corte);
    const custoAl = comprasFiltradas.filter((c) => c.material !== 'Óleo').reduce((s, c) => s + (c.valor_total ?? 0), 0);
    const custoOleo = comprasFiltradas.filter((c) => c.material === 'Óleo').reduce((s, c) => s + (c.valor_total ?? 0), 0);
    const custoTotal = custoAl + custoOleo;
    const custoPorKg = alUtil > 0 ? custoAl / alUtil : 0;
    const custoPorCx = totalCaixas > 0 ? custoTotal / totalCaixas : 0;

    // Custo mão de obra
    const custoMO = filtrados.reduce((s, p) => {
      const mold = funcionarios.find((f) => f.id === p.moldador_id);
      const ajud = funcionarios.find((f) => f.id === p.ajudante_id);
      const custH = (mold ? ((mold.salario ?? 0) + (mold.cartao_beneficio ?? 0)) / 176 : 0)
                  + (ajud ? ((ajud.salario ?? 0) + (ajud.cartao_beneficio ?? 0)) / 176 : 0);
      return s + custH * (p.tempo_horas ?? 0);
    }, 0);

    // Por produto top 5
    const porProduto: Record<string, number> = {};
    filtrados.forEach((p) => { porProduto[p.produto_id] = (porProduto[p.produto_id] ?? 0) + (p.qtde_caixas ?? 0); });
    const topProdutos = Object.entries(porProduto)
      .map(([id, cx]) => ({ label: produtos.find((p) => p.id === id)?.nome?.split(' ').slice(0, 3).join(' ') ?? id.slice(0, 8), value: cx }))
      .sort((a, b) => b.value - a.value).slice(0, 5);

    // Por moldador top 5
    const porMoldador: Record<string, { cx: number; h: number }> = {};
    filtrados.forEach((p) => {
      const id = p.moldador_id;
      if (!porMoldador[id]) porMoldador[id] = { cx: 0, h: 0 };
      porMoldador[id].cx += p.qtde_caixas ?? 0;
      porMoldador[id].h += p.tempo_horas ?? 0;
    });
    const topMoldadores = Object.entries(porMoldador)
      .map(([id, v]) => ({ label: funcionarios.find((f) => f.id === id)?.nome?.split(' ')[0] ?? 'Desc', value: v.cx, cxH: v.h > 0 ? v.cx / v.h : 0 }))
      .sort((a, b) => b.value - a.value).slice(0, 5);

    // Por mes (ultimos 6 meses)
    const porMes: Record<string, number> = {};
    filtrados.forEach((p) => {
      const mes = p.data.substring(0, 7);
      porMes[mes] = (porMes[mes] ?? 0) + (p.qtde_caixas ?? 0);
    });
    const meses = Object.entries(porMes).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
      .map(([m, cx]) => ({ label: m.substring(5) + '/' + m.substring(2, 4), value: cx }));

    // Retorno aproveitamento
    const aprovRetorno = totalRetorno > 0 && totalAlBruto > 0 ? (totalRetorno / totalAlBruto) * 100 : 0;

    return {
      totalCaixas, totalPecas, totalAlBruto, totalRetorno, totalPerdas, totalHoras, alUtil,
      pctPerda, cxPorHora, custoAl, custoOleo, custoTotal, custoPorKg, custoPorCx, custoMO,
      topProdutos, topMoldadores, meses, aprovRetorno,
      nApontamentos: filtrados.length,
    };
  }, [producoes, funcionarios, produtos, compras, periodo]);

  if (loading) return <Layout title="Dashboard"><div className="flex items-center justify-center py-20"><div className="spinner w-10 h-10" /></div></Layout>;

  const periodoOpts: { v: typeof periodo; l: string }[] = [
    { v: '30', l: '30 dias' }, { v: '90', l: '90 dias' }, { v: '365', l: '1 ano' }, { v: 'tudo', l: 'Tudo' },
  ];

  return (
    <Layout title="Dashboard de Producao">
      <div className="space-y-6">
        {/* Filtro periodo */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-slate-500 font-semibold">Periodo:</span>
          {periodoOpts.map((o) => (
            <button key={o.v} onClick={() => setPeriodo(o.v)}
              className={'px-3 py-1 rounded-full text-sm font-medium transition-colors ' + (periodo === o.v ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
              {o.l}
            </button>
          ))}
          <span className="ml-2 text-xs text-slate-400">{kpis.nApontamentos} apontamentos</span>
        </div>

        {/* KPIs linha 1 — producao */}
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Producao</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <KpiCard label="Total Caixas" value={kpis.totalCaixas.toLocaleString('pt-BR')} sub={kpis.totalPecas.toLocaleString('pt-BR') + ' pecas'} color="text-orange-600" />
            <KpiCard label="Al. Bruto" value={fmtN(kpis.totalAlBruto) + ' kg'} sub="aluminio consumido" />
            <KpiCard label="Al. Util (pecas)" value={fmtN(kpis.alUtil) + ' kg'} sub={fmtN(100 - kpis.pctPerda) + '% aproveitamento'} color="text-green-600" />
            <KpiCard label="Retorno (galho)" value={fmtN(kpis.totalRetorno) + ' kg'} sub={fmtN(kpis.aprovRetorno) + '% do bruto'} color="text-blue-600" />
            <KpiCard label="Perdas" value={kpis.totalPerdas.toLocaleString('pt-BR') + ' pcs'} sub={fmtN(kpis.pctPerda) + '% perda bruta'} color={kpis.pctPerda > 5 ? 'text-red-600' : 'text-slate-800'} />
          </div>
        </div>

        {/* KPIs linha 2 — produtividade */}
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Produtividade</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Total Horas" value={fmtN(kpis.totalHoras) + ' h'} sub={(kpis.totalHoras / Math.max(1, kpis.nApontamentos)).toFixed(1) + ' h/apontamento'} />
            <KpiCard label="Caixas/Hora" value={fmtN(kpis.cxPorHora)} sub="media geral" color={kpis.cxPorHora > 3 ? 'text-green-600' : 'text-slate-800'} />
            <KpiCard label="Cx/Apontamento" value={fmtN(kpis.totalCaixas / Math.max(1, kpis.nApontamentos), 1)} sub="media por OP" />
            <KpiCard label="Al. Bruto/Cx" value={fmtN(kpis.totalCaixas > 0 ? kpis.totalAlBruto / kpis.totalCaixas : 0) + ' kg'} sub="consumo medio" />
          </div>
        </div>

        {/* KPIs linha 3 — custos */}
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Custos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="Custo Materia-Prima" value={fmtR(kpis.custoAl)} sub="Lingote + Sucata" color="text-red-600" />
            <KpiCard label="Custo Oleo" value={fmtR(kpis.custoOleo)} sub="lubrificante" />
            <KpiCard label="Custo/kg Util" value={fmtR(kpis.custoPorKg)} sub="materia prima por kg util" color="text-orange-600" />
            <KpiCard label="Custo/Caixa" value={fmtR(kpis.custoPorCx)} sub="MP + oleo por caixa" />
          </div>
        </div>

        {/* Graficos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="card p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Top 5 Produtos (caixas)</h3>
            {kpis.topProdutos.length > 0 ? <BarChart data={kpis.topProdutos} labelKey="label" valueKey="value" color="#f97316" /> : <p className="text-xs text-slate-400">Sem dados</p>}
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Top 5 Moldadores (caixas)</h3>
            {kpis.topMoldadores.length > 0 ? (
              <div className="space-y-1">
                {kpis.topMoldadores.map((m, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-20 text-right text-xs text-slate-500 truncate">{m.label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: (m.value / Math.max(...kpis.topMoldadores.map((x) => x.value), 1) * 100) + '%', backgroundColor: '#3b82f6' }} />
                    </div>
                    <span className="w-20 text-xs text-slate-600 font-mono text-right">{m.value} cx | {fmtN(m.cxH)} cx/h</span>
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

        {/* Alertas */}
        <div className="card p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Indicadores de Qualidade</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className={'p-3 rounded-lg ' + (kpis.pctPerda > 5 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200')}>
              <p className="font-semibold">{kpis.pctPerda > 5 ? 'Alta perda de peca' : 'Perda dentro do limite'}</p>
              <p className="text-xs mt-1 text-slate-600">% perda: {fmtN(kpis.pctPerda)}% {kpis.pctPerda > 5 ? '(acima de 5%)' : '(abaixo de 5%)'}</p>
            </div>
            <div className={'p-3 rounded-lg ' + (kpis.cxPorHora >= 3 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200')}>
              <p className="font-semibold">{kpis.cxPorHora >= 3 ? 'Produtividade boa' : 'Produtividade abaixo da meta'}</p>
              <p className="text-xs mt-1 text-slate-600">Meta: 3,0 cx/h | Atual: {fmtN(kpis.cxPorHora)} cx/h</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="font-semibold">Retorno de galho</p>
              <p className="text-xs mt-1 text-slate-600">{fmtN(kpis.totalRetorno)} kg retornado ({fmtN(kpis.aprovRetorno)}% do bruto)</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
