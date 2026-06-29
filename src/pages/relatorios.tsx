import { useState, useMemo, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { supabase } from '@/lib/supabase';
import { fmtData, fmtR, fmtN } from '@/lib/fmt';

interface Compra { data: string; material: string; quantidade: number; preco_unitario: number; valor_total: number; }

interface Filtros { dataIni: string; dataFim: string; funcionario: string; produto: string; }
const FILTROS_VAZIO: Filtros = { dataIni: '', dataFim: '', funcionario: '', produto: '' };

function FiltroBar({ filtros, onChange, showFunc = true, showProd = true, funcionarios, produtos }: {
  filtros: Filtros; onChange: (f: Filtros) => void; showFunc?: boolean; showProd?: boolean;
  funcionarios: { id: string; nome: string }[]; produtos: { id: string; nome: string }[];
}) {
  const f = (field: keyof Filtros) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...filtros, [field]: e.target.value });
  return (
    <div className="flex flex-wrap gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4 text-sm">
      <div><label className="block text-xs text-slate-500 mb-1">De</label><input type="date" className="form-input py-1 text-sm" value={filtros.dataIni} onChange={f('dataIni')} /></div>
      <div><label className="block text-xs text-slate-500 mb-1">Ate</label><input type="date" className="form-input py-1 text-sm" value={filtros.dataFim} onChange={f('dataFim')} /></div>
      {showFunc && <div><label className="block text-xs text-slate-500 mb-1">Funcionario</label>
        <select className="form-select py-1 text-sm" value={filtros.funcionario} onChange={f('funcionario')}>
          <option value="">Todos</option>
          {funcionarios.map((fn) => <option key={fn.id} value={fn.id}>{fn.nome}</option>)}
        </select></div>}
      {showProd && <div><label className="block text-xs text-slate-500 mb-1">Produto</label>
        <select className="form-select py-1 text-sm" value={filtros.produto} onChange={f('produto')}>
          <option value="">Todos</option>
          {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select></div>}
      <div className="flex items-end"><button onClick={() => onChange(FILTROS_VAZIO)} className="btn-secondary py-1 px-3 text-sm">Limpar</button></div>
    </div>
  );
}

function Th({ children, sortKey, sortState, onSort }: { children: React.ReactNode; sortKey?: string; sortState?: { key: string; dir: 'asc' | 'desc' }; onSort?: (k: string) => void }) {
  const active = sortState && sortKey && sortState.key === sortKey;
  return (
    <th onClick={() => sortKey && onSort && onSort(sortKey)}
      className={'px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase bg-slate-50 border-b border-slate-200 ' + (sortKey ? 'cursor-pointer hover:bg-slate-100 select-none' : '')}>
      <span className="flex items-center gap-1">
        {children}
        {sortKey && <span className="text-slate-300">{active ? (sortState.dir === 'asc' ? '▲' : '▼') : '⇅'}</span>}
      </span>
    </th>
  );
}
function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td className={'px-3 py-2 text-sm border-b border-slate-50 ' + (right ? 'text-right font-mono' : '')}>{children}</td>;
}
function TotRow({ label, vals }: { label: string; vals: React.ReactNode[] }) {
  return (
    <tr className="bg-orange-50 font-bold border-t-2 border-orange-200">
      <td className="px-3 py-2 text-sm">{label}</td>
      {vals.map((v, i) => <td key={i} className="px-3 py-2 text-sm text-right font-mono">{v ?? ''}</td>)}
    </tr>
  );
}

const RELATORIOS = [
  { id: 'producao-geral', label: '1. Producao Geral' },
  { id: 'por-produto', label: '2. Por Produto' },
  { id: 'por-funcionario', label: '3. Por Funcionario' },
  { id: 'perdas', label: '4. Analise de Perdas' },
  { id: 'aluminio', label: '5. Consumo de Aluminio' },
  { id: 'produtividade', label: '6. Produtividade/Hora' },
  { id: 'mensal', label: '7. Evolucao Mensal' },
  { id: 'compras', label: '8. Compras / Materia-Prima' },
  { id: 'custo-produto', label: '9. Custo por Produto' },
  { id: 'comparativo', label: '10. Comparativo Moldadores' },
];

export default function RelatoriosPage() {
  const { producoes, funcionarios, produtos, loading } = useProducao();
  const [rel, setRel] = useState('producao-geral');
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIO);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'cx', dir: 'desc' });
  const [drillProduto, setDrillProduto] = useState<string | null>(null);

  const handleSort = (key: string) =>
    setSort((prev) => prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' });

  useEffect(() => {
    supabase.from('compras').select('*').order('data').then(({ data }) => setCompras((data ?? []) as Compra[]));
  }, []);

  const prodFiltrados = useMemo(() => {
    return producoes.filter((p) => {
      if (filtros.dataIni && p.data < filtros.dataIni) return false;
      if (filtros.dataFim && p.data > filtros.dataFim) return false;
      if (filtros.funcionario && p.moldador_id !== filtros.funcionario && p.ajudante_id !== filtros.funcionario) return false;
      if (filtros.produto && p.produto_id !== filtros.produto) return false;
      return true;
    });
  }, [producoes, filtros]);

  const comprasFiltradas = useMemo(() => {
    return compras.filter((c) => {
      if (filtros.dataIni && c.data < filtros.dataIni) return false;
      if (filtros.dataFim && c.data > filtros.dataFim) return false;
      return true;
    });
  }, [compras, filtros]);

  if (loading) return <Layout title="Relatorios"><div className="flex items-center justify-center py-20"><div className="spinner w-10 h-10" /></div></Layout>;

  const renderRelatorio = () => {
    const fb = <FiltroBar filtros={filtros} onChange={setFiltros} funcionarios={funcionarios} produtos={produtos} />;

    if (rel === 'producao-geral') {
      const totalCx = prodFiltrados.reduce((s, p) => s + (p.qtde_caixas ?? 0), 0);
      const totalAl = prodFiltrados.reduce((s, p) => s + (p.aluminio_bruto ?? 0), 0);
      const totalRet = prodFiltrados.reduce((s, p) => s + (p.peso_retorno ?? 0), 0);
      const totalH = prodFiltrados.reduce((s, p) => s + (p.tempo_horas ?? 0), 0);
      const totalPerdas = prodFiltrados.reduce((s, p) => s + (p.perdas_peca ?? 0), 0);
      return (<>
        {fb}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {[['Registros', prodFiltrados.length, ''], ['Caixas', totalCx.toLocaleString('pt-BR'), 'text-orange-600'], ['Al. Bruto kg', fmtN(totalAl), ''], ['Retorno kg', fmtN(totalRet), 'text-green-600'], ['Horas', fmtN(totalH, 1), '']].map(([l, v, c]) => (
            <div key={l} className="card p-3 text-center"><p className="text-xs text-slate-400">{l}</p><p className={'text-xl font-bold ' + c}>{v}</p></div>
          ))}
        </div>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr>{['Data', 'O.P.', 'Moldador', 'Ajudante', 'Produto', 'Caixas', 'Pecas', 'Al. Bruto', 'Retorno', 'Perdas', 'Horas'].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>
            {prodFiltrados.map((p) => {
              const mold = funcionarios.find((f) => f.id === p.moldador_id);
              const ajud = funcionarios.find((f) => f.id === p.ajudante_id);
              const prod = produtos.find((pr) => pr.id === p.produto_id);
              const extra = p as unknown as Record<string, unknown>;
              return (<tr key={p.id} className="hover:bg-slate-50">
                <Td>{fmtData(p.data)}</Td><Td>{String(extra.numero_op ?? '--')}</Td>
                <Td>{mold?.nome ?? '--'}</Td><Td>{ajud?.nome ?? '--'}</Td><Td>{prod?.nome ?? '--'}</Td>
                <Td right>{p.qtde_caixas}</Td><Td right>{p.qtde_pecas ?? '--'}</Td>
                <Td right>{fmtN(p.aluminio_bruto ?? 0)}</Td><Td right>{fmtN(p.peso_retorno ?? 0)}</Td>
                <Td right>{p.perdas_peca ?? 0}</Td><Td right>{fmtN(p.tempo_horas ?? 0, 1)}</Td>
              </tr>);
            })}
            <TotRow label="TOTAL" vals={[null, null, null, null, totalCx, '--', fmtN(totalAl), fmtN(totalRet), totalPerdas, fmtN(totalH, 1)]} />
          </tbody>
        </table></div>
      </>);
    }

    if (rel === 'por-produto') {
      type ProdRow = { id: string; nome: string; cx: number; pecas: number; al: number; ret: number; perdas: number; h: number; ops: number };
      const agg: Record<string, ProdRow> = {};
      prodFiltrados.forEach((p) => {
        if (!agg[p.produto_id]) { const pr = produtos.find((x) => x.id === p.produto_id); agg[p.produto_id] = { id: p.produto_id, nome: pr?.nome ?? '--', cx: 0, pecas: 0, al: 0, ret: 0, perdas: 0, h: 0, ops: 0 }; }
        const a = agg[p.produto_id];
        a.cx += p.qtde_caixas ?? 0; a.pecas += p.qtde_pecas ?? 0; a.al += p.aluminio_bruto ?? 0;
        a.ret += p.peso_retorno ?? 0; a.perdas += p.perdas_peca ?? 0; a.h += p.tempo_horas ?? 0; a.ops++;
      });
      const sortNum = (r: ProdRow) => {
        if (sort.key === 'ops') return r.ops; if (sort.key === 'cx') return r.cx;
        if (sort.key === 'pecas') return r.pecas; if (sort.key === 'al') return r.al;
        if (sort.key === 'ret') return r.ret; if (sort.key === 'perdas') return r.perdas;
        if (sort.key === 'h') return r.h; if (sort.key === 'cxh') return r.h > 0 ? r.cx / r.h : 0;
        if (sort.key === 'alcx') return r.cx > 0 ? r.al / r.cx : 0;
        return r.cx;
      };
      const rows = Object.values(agg).sort((a, b) => sort.dir === 'desc' ? sortNum(b) - sortNum(a) : sortNum(a) - sortNum(b));
      const totCx = rows.reduce((s, r) => s + r.cx, 0);
      const cols: { label: string; key: string }[] = [
        { label: 'Produto', key: '' }, { label: 'OPs', key: 'ops' }, { label: 'Caixas', key: 'cx' },
        { label: 'Pecas', key: 'pecas' }, { label: 'Al. Bruto kg', key: 'al' }, { label: 'Retorno kg', key: 'ret' },
        { label: 'Perdas pcs', key: 'perdas' }, { label: 'Horas', key: 'h' }, { label: 'Cx/Hora', key: 'cxh' }, { label: 'Al/Cx', key: 'alcx' },
      ];

      // Drill-down modal
      if (drillProduto) {
        const pr = produtos.find((x) => x.id === drillProduto);
        const entries = prodFiltrados.filter((p) => p.produto_id === drillProduto)
          .sort((a, b) => b.data.localeCompare(a.data));
        const tot = { cx: 0, pecas: 0, al: 0, ret: 0, perdas: 0, h: 0 };
        entries.forEach((e) => { tot.cx += e.qtde_caixas ?? 0; tot.pecas += e.qtde_pecas ?? 0; tot.al += e.aluminio_bruto ?? 0; tot.ret += e.peso_retorno ?? 0; tot.perdas += e.perdas_peca ?? 0; tot.h += e.tempo_horas ?? 0; });
        return (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setDrillProduto(null)} className="btn-secondary py-1 px-3 text-sm">← Voltar</button>
              <h2 className="font-bold text-slate-700">{pr?.nome ?? drillProduto}</h2>
              <span className="text-xs text-slate-400">{entries.length} apontamentos</span>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
              {([['Caixas', tot.cx, ''], ['Pecas', tot.pecas, ''], ['Al. Bruto', fmtN(tot.al) + ' kg', ''], ['Retorno', fmtN(tot.ret) + ' kg', 'text-green-600'], ['Perdas', tot.perdas, 'text-red-500'], ['Horas', fmtN(tot.h, 1), '']] as [string, React.ReactNode, string][]).map(([l, v, c]) => (
                <div key={l} className="card p-3 text-center"><p className="text-xs text-slate-400">{l}</p><p className={'text-lg font-bold ' + c}>{v}</p></div>
              ))}
            </div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr>{['Data', 'Moldador', 'Caixas', 'Pecas', 'Al. Bruto', 'Retorno', 'Perdas', 'Horas'].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
              <tbody>
                {entries.map((e) => {
                  const mold = funcionarios.find((f) => f.id === e.moldador_id);
                  return (<tr key={e.id} className="hover:bg-slate-50">
                    <Td>{fmtData(e.data)}</Td><Td>{mold?.nome ?? '--'}</Td>
                    <Td right>{e.qtde_caixas}</Td><Td right>{e.qtde_pecas ?? '--'}</Td>
                    <Td right>{fmtN(e.aluminio_bruto ?? 0)}</Td><Td right>{fmtN(e.peso_retorno ?? 0)}</Td>
                    <Td right>{e.perdas_peca ?? 0}</Td><Td right>{fmtN(e.tempo_horas ?? 0, 1)}</Td>
                  </tr>);
                })}
                <TotRow label="TOTAL" vals={[null, tot.cx, tot.pecas, fmtN(tot.al), fmtN(tot.ret), tot.perdas, fmtN(tot.h, 1)]} />
              </tbody>
            </table></div>
          </div>
        );
      }

      return (<>
        <FiltroBar filtros={filtros} onChange={setFiltros} showFunc={false} funcionarios={funcionarios} produtos={produtos} />
        <p className="text-xs text-slate-400 mb-2">Clique no produto para ver os lancamentos detalhados. Clique no cabecalho para ordenar.</p>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr>{cols.map((c) => <Th key={c.key || c.label} sortKey={c.key || undefined} sortState={sort} onSort={handleSort}>{c.label}</Th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (<tr key={r.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => setDrillProduto(r.id)}>
              <Td><span className="font-medium text-blue-700 hover:underline">{r.nome}</span></Td>
              <Td right>{r.ops}</Td><Td right>{r.cx}</Td><Td right>{r.pecas}</Td>
              <Td right>{fmtN(r.al)}</Td><Td right>{fmtN(r.ret)}</Td><Td right>{r.perdas}</Td>
              <Td right>{fmtN(r.h, 1)}</Td><Td right>{fmtN(r.h > 0 ? r.cx / r.h : 0)}</Td>
              <Td right>{fmtN(r.cx > 0 ? r.al / r.cx : 0)}</Td>
            </tr>))}
            <TotRow label="TOTAL" vals={[rows.reduce((s, r) => s + r.ops, 0), totCx, rows.reduce((s, r) => s + r.pecas, 0), fmtN(rows.reduce((s, r) => s + r.al, 0)), fmtN(rows.reduce((s, r) => s + r.ret, 0)), rows.reduce((s, r) => s + r.perdas, 0), fmtN(rows.reduce((s, r) => s + r.h, 0), 1), '--', '--']} />
          </tbody>
        </table></div>
      </>);
    }

    if (rel === 'por-funcionario') {
      const agg: Record<string, { nome: string; cx: number; al: number; perdas: number; h: number; ops: number }> = {};
      prodFiltrados.forEach((p) => {
        [p.moldador_id, p.ajudante_id].filter(Boolean).forEach((fid) => {
          if (!fid) return;
          if (!agg[fid]) { const fn = funcionarios.find((f) => f.id === fid); agg[fid] = { nome: fn?.nome ?? '--', cx: 0, al: 0, perdas: 0, h: 0, ops: 0 }; }
          const a = agg[fid]; a.cx += p.qtde_caixas ?? 0; a.al += p.aluminio_bruto ?? 0; a.perdas += p.perdas_peca ?? 0; a.h += p.tempo_horas ?? 0; a.ops++;
        });
      });
      const rows = Object.values(agg).sort((a, b) => b.cx - a.cx);
      return (<>
        <FiltroBar filtros={filtros} onChange={setFiltros} showProd={false} funcionarios={funcionarios} produtos={produtos} />
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr>{['Funcionario', 'OPs', 'Caixas', 'Al. Bruto kg', 'Perdas pcs', 'Horas', 'Cx/Hora', 'Al/Cx'].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (<tr key={i} className="hover:bg-slate-50">
              <Td><span className="font-medium">{r.nome}</span></Td>
              <Td right>{r.ops}</Td><Td right>{r.cx}</Td><Td right>{fmtN(r.al)}</Td><Td right>{r.perdas}</Td>
              <Td right>{fmtN(r.h, 1)}</Td>
              <Td right><span className={(r.h > 0 ? r.cx / r.h : 0) >= 3 ? 'text-green-600 font-bold' : 'text-orange-500'}>{fmtN(r.h > 0 ? r.cx / r.h : 0)}</span></Td>
              <Td right>{fmtN(r.cx > 0 ? r.al / r.cx : 0)}</Td>
            </tr>))}
          </tbody>
        </table></div>
      </>);
    }

    if (rel === 'perdas') {
      const rows = prodFiltrados.filter((p) => (p.perdas_peca ?? 0) > 0).map((p) => ({
        data: p.data, mold: funcionarios.find((f) => f.id === p.moldador_id)?.nome ?? '--',
        prod: produtos.find((pr) => pr.id === p.produto_id)?.nome ?? '--',
        cx: p.qtde_caixas, perdas: p.perdas_peca ?? 0,
      })).sort((a, b) => b.perdas - a.perdas);
      const totPerdas = rows.reduce((s, r) => s + r.perdas, 0);
      return (<>
        {fb}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="card p-3 text-center"><p className="text-xs text-slate-400">Total Perdas</p><p className="text-2xl font-bold text-red-600">{totPerdas.toLocaleString('pt-BR')} pcs</p></div>
          <div className="card p-3 text-center"><p className="text-xs text-slate-400">Apontamentos c/ Perda</p><p className="text-2xl font-bold">{rows.length}</p></div>
          <div className="card p-3 text-center"><p className="text-xs text-slate-400">Media/Apontamento</p><p className="text-2xl font-bold">{fmtN(rows.length > 0 ? totPerdas / rows.length : 0, 1)} pcs</p></div>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr>{['Data', 'Moldador', 'Produto', 'Caixas', 'Perdas pcs'].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (<tr key={i} className="hover:bg-slate-50"><Td>{r.data}</Td><Td>{r.mold}</Td><Td>{r.prod}</Td><Td right>{r.cx}</Td><Td right><span className="text-red-600 font-bold">{r.perdas}</span></Td></tr>))}
            <TotRow label="TOTAL" vals={[null, null, null, totPerdas]} />
          </tbody>
        </table></div>
      </>);
    }

    if (rel === 'aluminio') {
      const totBruto = prodFiltrados.reduce((s, p) => s + (p.aluminio_bruto ?? 0), 0);
      const totRet = prodFiltrados.reduce((s, p) => s + (p.peso_retorno ?? 0), 0);
      const totUtil = totBruto - totRet;
      const pctUtil = totBruto > 0 ? (totUtil / totBruto) * 100 : 0;
      return (<>
        {fb}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[['Al. Bruto', fmtN(totBruto) + ' kg', ''], ['Al. Util', fmtN(totUtil) + ' kg', 'text-green-600'], ['Retorno', fmtN(totRet) + ' kg', 'text-blue-600'], ['Aproveitamento', fmtN(pctUtil) + '%', pctUtil > 60 ? 'text-green-600' : 'text-orange-600']].map(([l, v, c]) => (
            <div key={l} className="card p-3 text-center"><p className="text-xs text-slate-400">{l}</p><p className={'text-2xl font-bold ' + c}>{v}</p></div>
          ))}
        </div>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr>{['Data', 'Produto', 'Caixas', 'Al. Bruto kg', 'Retorno kg', 'Al. Util kg', 'Al/Cx'].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>
            {prodFiltrados.map((p, i) => {
              const prod = produtos.find((pr) => pr.id === p.produto_id);
              const bruto = p.aluminio_bruto ?? 0; const ret = p.peso_retorno ?? 0;
              return (<tr key={i} className="hover:bg-slate-50">
                <Td>{fmtData(p.data)}</Td><Td>{prod?.nome ?? '--'}</Td><Td right>{p.qtde_caixas}</Td>
                <Td right>{fmtN(bruto)}</Td><Td right>{fmtN(ret)}</Td><Td right>{fmtN(bruto - ret)}</Td>
                <Td right>{fmtN(p.qtde_caixas > 0 ? bruto / p.qtde_caixas : 0)}</Td>
              </tr>);
            })}
            <TotRow label="TOTAL" vals={[null, null, fmtN(totBruto), fmtN(totRet), fmtN(totUtil), '--']} />
          </tbody>
        </table></div>
      </>);
    }

    if (rel === 'produtividade') {
      const agg: Record<string, { nome: string; cx: number; h: number; ops: number; al: number }> = {};
      prodFiltrados.filter((p) => (p.tempo_horas ?? 0) > 0).forEach((p) => {
        if (!agg[p.moldador_id]) { const fn = funcionarios.find((f) => f.id === p.moldador_id); agg[p.moldador_id] = { nome: fn?.nome ?? '--', cx: 0, h: 0, ops: 0, al: 0 }; }
        agg[p.moldador_id].cx += p.qtde_caixas ?? 0; agg[p.moldador_id].h += p.tempo_horas ?? 0; agg[p.moldador_id].al += p.aluminio_bruto ?? 0; agg[p.moldador_id].ops++;
      });
      const rows = Object.values(agg).map((r) => ({ ...r, cxH: r.h > 0 ? r.cx / r.h : 0 })).sort((a, b) => b.cxH - a.cxH);
      return (<>
        <FiltroBar filtros={filtros} onChange={setFiltros} showProd={false} funcionarios={funcionarios} produtos={produtos} />
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr>{['Moldador', 'OPs', 'Total Caixas', 'Total Horas', 'Cx/Hora', 'Al/Hora kg', 'Al. Bruto Total'].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (<tr key={i} className="hover:bg-slate-50">
              <Td><span className="font-medium">{r.nome}</span></Td>
              <Td right>{r.ops}</Td><Td right>{r.cx}</Td><Td right>{fmtN(r.h, 1)}</Td>
              <Td right><span className={r.cxH >= 3 ? 'text-green-600 font-bold' : 'text-orange-500 font-bold'}>{fmtN(r.cxH)}</span></Td>
              <Td right>{fmtN(r.h > 0 ? r.al / r.h : 0)}</Td><Td right>{fmtN(r.al)}</Td>
            </tr>))}
          </tbody>
        </table></div>
      </>);
    }

    if (rel === 'mensal') {
      const agg: Record<string, { cx: number; al: number; ret: number; perdas: number; h: number; ops: number }> = {};
      prodFiltrados.forEach((p) => {
        const mes = p.data.substring(0, 7);
        if (!agg[mes]) agg[mes] = { cx: 0, al: 0, ret: 0, perdas: 0, h: 0, ops: 0 };
        agg[mes].cx += p.qtde_caixas ?? 0; agg[mes].al += p.aluminio_bruto ?? 0; agg[mes].ret += p.peso_retorno ?? 0; agg[mes].perdas += p.perdas_peca ?? 0; agg[mes].h += p.tempo_horas ?? 0; agg[mes].ops++;
      });
      const rows = Object.entries(agg).sort(([a], [b]) => a.localeCompare(b)).map(([mes, v]) => ({ mes, ...v, cxH: v.h > 0 ? v.cx / v.h : 0 }));
      return (<>
        <FiltroBar filtros={filtros} onChange={setFiltros} showFunc={false} showProd={false} funcionarios={funcionarios} produtos={produtos} />
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr>{['Mes', 'OPs', 'Caixas', 'Al. Bruto kg', 'Retorno kg', 'Perdas pcs', 'Horas', 'Cx/Hora'].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (<tr key={i} className="hover:bg-slate-50">
              <Td><span className="font-bold">{r.mes}</span></Td>
              <Td right>{r.ops}</Td><Td right>{r.cx}</Td><Td right>{fmtN(r.al)}</Td>
              <Td right>{fmtN(r.ret)}</Td><Td right>{r.perdas}</Td><Td right>{fmtN(r.h, 1)}</Td>
              <Td right>{fmtN(r.cxH)}</Td>
            </tr>))}
          </tbody>
        </table></div>
      </>);
    }

    if (rel === 'compras') {
      const totAl = comprasFiltradas.filter((c) => c.material !== 'Óleo').reduce((s, c) => s + (c.valor_total ?? 0), 0);
      const totOleo = comprasFiltradas.filter((c) => c.material === 'Óleo').reduce((s, c) => s + (c.valor_total ?? 0), 0);
      const totKg = comprasFiltradas.reduce((s, c) => s + (c.quantidade ?? 0), 0);
      return (<>
        <FiltroBar filtros={filtros} onChange={setFiltros} showFunc={false} showProd={false} funcionarios={funcionarios} produtos={produtos} />
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="card p-3 text-center"><p className="text-xs text-slate-400">Total Aluminio</p><p className="text-xl font-bold text-orange-600">{fmtR(totAl)}</p></div>
          <div className="card p-3 text-center"><p className="text-xs text-slate-400">Total Oleo</p><p className="text-xl font-bold">{fmtR(totOleo)}</p></div>
          <div className="card p-3 text-center"><p className="text-xs text-slate-400">Total kg/L</p><p className="text-xl font-bold">{fmtN(totKg)}</p></div>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr>{['Data', 'Material', 'Qtde', 'Preco Unit.', 'Total'].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>
            {comprasFiltradas.map((c, i) => (<tr key={i} className="hover:bg-slate-50">
              <Td>{c.data}</Td>
              <Td><span className={'px-2 py-0.5 rounded text-xs font-medium ' + (c.material === 'Lingote' ? 'bg-blue-100 text-blue-700' : c.material === 'Sucata' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700')}>{c.material}</span></Td>
              <Td right>{fmtN(c.quantidade)}</Td><Td right>{fmtR(c.preco_unitario)}</Td><Td right>{fmtR(c.valor_total ?? 0)}</Td>
            </tr>))}
            <TotRow label="TOTAL" vals={[null, fmtN(totKg) + ' kg', '--', fmtR(totAl + totOleo)]} />
          </tbody>
        </table></div>
      </>);
    }

    if (rel === 'custo-produto') {
      const compraAl = comprasFiltradas.filter((c) => c.material !== 'Óleo');
      const totAlKg = compraAl.reduce((s, c) => s + c.quantidade, 0);
      const totAlR = compraAl.reduce((s, c) => s + (c.valor_total ?? 0), 0);
      const custoMedioAl = totAlKg > 0 ? totAlR / totAlKg : 21.67;
      const agg: Record<string, { nome: string; cx: number; al: number; ret: number; ops: number; ppKg: number }> = {};
      prodFiltrados.forEach((p) => {
        const pid = p.produto_id;
        const prod = produtos.find((pr) => pr.id === pid);
        if (!agg[pid]) agg[pid] = { nome: prod?.nome ?? '--', cx: 0, al: 0, ret: 0, ops: 0, ppKg: prod?.preco_venda_kg ?? 0 };
        const a = agg[pid]; a.cx += p.qtde_caixas ?? 0; a.al += p.aluminio_bruto ?? 0; a.ret += p.peso_retorno ?? 0; a.ops++;
      });
      const rows = Object.values(agg).sort((a, b) => b.cx - a.cx).map((r) => {
        const alUtil = r.al - r.ret;
        const custMpTotal = r.al * custoMedioAl;
        const custMpPorCx = r.cx > 0 ? custMpTotal / r.cx : 0;
        const pesoUtilPorCx = r.cx > 0 ? alUtil / r.cx : 0;
        const precoMinKg = pesoUtilPorCx > 0 ? (custMpPorCx / pesoUtilPorCx) * 1.3 : 0;
        return { ...r, alUtil, custMpTotal, custMpPorCx, pesoUtilPorCx, precoMinKg };
      });
      return (<>
        <FiltroBar filtros={filtros} onChange={setFiltros} showFunc={false} funcionarios={funcionarios} produtos={produtos} />
        <p className="text-xs text-slate-500 mb-3">Custo medio Al. no periodo: {fmtR(custoMedioAl)}/kg | Preco min = custo MP/cx / peso util/cx * 1.30</p>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr>{['Produto', 'Caixas', 'Al. Util kg', 'Custo MP/Cx', 'Peso Util/Cx', 'Preco Min/kg', 'Preco Venda/kg'].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (<tr key={i} className="hover:bg-slate-50">
              <Td><span className="font-medium">{r.nome}</span></Td>
              <Td right>{r.cx}</Td><Td right>{fmtN(r.alUtil)}</Td><Td right>{fmtR(r.custMpPorCx)}</Td>
              <Td right>{fmtN(r.pesoUtilPorCx)} kg</Td>
              <Td right><span className="font-bold text-orange-600">{fmtR(r.precoMinKg)}</span></Td>
              <Td right>{r.ppKg > 0 ? fmtR(r.ppKg) : '--'}</Td>
            </tr>))}
          </tbody>
        </table></div>
      </>);
    }

    if (rel === 'comparativo') {
      const agg: Record<string, { nome: string; cx: number; al: number; perdas: number; h: number; ops: number; salario: number; cartao: number }> = {};
      prodFiltrados.forEach((p) => {
        const fid = p.moldador_id;
        if (!agg[fid]) { const fn = funcionarios.find((f) => f.id === fid); agg[fid] = { nome: fn?.nome ?? '--', cx: 0, al: 0, perdas: 0, h: 0, ops: 0, salario: fn?.salario ?? 0, cartao: fn?.cartao_beneficio ?? 0 }; }
        const a = agg[fid]; a.cx += p.qtde_caixas ?? 0; a.al += p.aluminio_bruto ?? 0; a.perdas += p.perdas_peca ?? 0; a.h += p.tempo_horas ?? 0; a.ops++;
      });
      const maxCx = Math.max(...Object.values(agg).map((r) => r.cx), 1);
      const rows = Object.values(agg).sort((a, b) => b.cx - a.cx).map((r) => ({
        ...r, cxH: r.h > 0 ? r.cx / r.h : 0,
        custoH: (r.salario + r.cartao) / 176,
        custoPorCx: r.cx > 0 ? ((r.salario + r.cartao) / 176 * r.h) / r.cx : 0,
        pctBar: Math.round((r.cx / maxCx) * 100),
      }));
      return (<>
        <FiltroBar filtros={filtros} onChange={setFiltros} showProd={false} funcionarios={funcionarios} produtos={produtos} />
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr>{['Moldador', 'Producao', 'OPs', 'Cx/Hora', 'Horas', 'Custo/h', 'Custo/Cx', 'Perdas'].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (<tr key={i} className="hover:bg-slate-50">
              <Td><span className="font-medium">{r.nome}</span></Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-slate-100 rounded-full h-3"><div className="h-3 rounded-full bg-orange-400" style={{ width: r.pctBar + '%' }} /></div>
                  <span className="text-xs font-mono">{r.cx} cx</span>
                </div>
              </Td>
              <Td right>{r.ops}</Td>
              <Td right><span className={r.cxH >= 3 ? 'text-green-600 font-bold' : 'text-orange-500'}>{fmtN(r.cxH)}</span></Td>
              <Td right>{fmtN(r.h, 1)}</Td><Td right>{fmtR(r.custoH)}</Td><Td right>{fmtR(r.custoPorCx)}</Td><Td right>{r.perdas}</Td>
            </tr>))}
          </tbody>
        </table></div>
      </>);
    }

    return <p className="text-slate-400">Selecione um relatorio.</p>;
  };

  return (
    <Layout title="Relatorios de Producao">
      <div className="flex gap-5">
        <div className="w-52 flex-shrink-0">
          <nav className="space-y-1">
            {RELATORIOS.map((r) => (
              <button key={r.id} onClick={() => { setRel(r.id); setFiltros(FILTROS_VAZIO); }}
                className={'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ' + (rel === r.id ? 'bg-orange-500 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100')}>
                {r.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex-1 min-w-0">
          <div className="card p-5">
            <h2 className="text-lg font-bold text-slate-800 mb-4">{RELATORIOS.find((r) => r.id === rel)?.label}</h2>
            {renderRelatorio()}
          </div>
        </div>
      </div>
    </Layout>
  );
}
