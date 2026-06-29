import { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { Card, Modal } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Produto, Cliente } from '@/lib/types';

const TIPO_MATERIAL = ['lingote', 'sucata', 'mistura'] as const;

interface FormData {
  codigo: string;
  nome: string;
  descricao: string;
  qtd_peca_placa: string;
  peso_peca: string;
  peso_total_galho: string;
  percentual_retorno: string;
  qtd_machos_por_caixa: string;
  peso_macho: string;
  tipo_material: string;
  preco_venda_kg: string;
  custo_adicional: string;
  cliente_id: string;
  estoque_minimo: string;
}

const FORM_VAZIO: FormData = {
  codigo: '', nome: '', descricao: '',
  qtd_peca_placa: '1', peso_peca: '', peso_total_galho: '',
  percentual_retorno: '', qtd_machos_por_caixa: '0', peso_macho: '',
  tipo_material: 'sucata', preco_venda_kg: '', custo_adicional: '0',
  cliente_id: '', estoque_minimo: '0',
};

function fmtKg(n?: number | null) {
  if (n == null || n === 0) return '—';
  return n.toFixed(3) + ' kg';
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [formData, setFormData] = useState<FormData>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    setLoading(true);
    const [resProdutos, resClientes] = await Promise.all([
      supabase.from('produtos').select('*, cliente:clientes(id, razao_social, nome_fantasia)').order('nome'),
      supabase.from('clientes').select('id, razao_social, nome_fantasia').eq('ativo', true).order('razao_social'),
    ]);
    setProdutos((resProdutos.data as Produto[]) || []);
    setClientes((resClientes.data as Cliente[]) || []);
    setLoading(false);
  };

  const abrirNovo = () => {
    setEditando(null);
    setFormData(FORM_VAZIO);
    setErro('');
    setShowModal(true);
  };

  const abrirEditar = (p: Produto) => {
    setEditando(p);
    setFormData({
      codigo: p.codigo ?? '',
      nome: p.nome,
      descricao: p.descricao ?? '',
      qtd_peca_placa: String(p.qtd_peca_placa ?? 1),
      peso_peca: p.peso_peca != null ? String(p.peso_peca) : '',
      peso_total_galho: p.peso_total_galho != null ? String(p.peso_total_galho) : '',
      percentual_retorno: p.percentual_retorno != null ? String(p.percentual_retorno) : '',
      qtd_machos_por_caixa: String(p.qtd_machos_por_caixa ?? 0),
      peso_macho: p.peso_macho != null ? String(p.peso_macho) : '',
      tipo_material: p.tipo_material ?? 'sucata',
      preco_venda_kg: p.preco_venda_kg != null ? String(p.preco_venda_kg) : '',
      custo_adicional: String(p.custo_adicional ?? 0),
      cliente_id: p.cliente_id ?? '',
      estoque_minimo: String(p.estoque_minimo ?? 0),
    });
    setErro('');
    setShowModal(true);
  };

  const handleSalvar = async () => {
    if (!formData.nome.trim()) { setErro('Nome é obrigatório'); return; }
    setSalvando(true);
    setErro('');
    const numOrNull = (v: string) => v.trim() === '' ? null : parseFloat(v) || null;

    const payload = {
      nome: formData.nome.trim(),
      descricao: formData.descricao.trim() || null,
      qtd_peca_placa: parseInt(formData.qtd_peca_placa) || 1,
      peso_peca: numOrNull(formData.peso_peca),
      peso_total_galho: numOrNull(formData.peso_total_galho),
      percentual_retorno: numOrNull(formData.percentual_retorno),
      qtd_machos_por_caixa: parseInt(formData.qtd_machos_por_caixa) || 0,
      peso_macho: numOrNull(formData.peso_macho),
      tipo_material: formData.tipo_material || 'sucata',
      preco_venda_kg: numOrNull(formData.preco_venda_kg),
      custo_adicional: parseFloat(formData.custo_adicional) || 0,
      cliente_id: formData.cliente_id || null,
      estoque_minimo: parseFloat(formData.estoque_minimo) || 0,
    };

    try {
      if (editando) {
        const { data, error } = await supabase.from('produtos').update(payload).eq('id', editando.id)
          .select('*, cliente:clientes(id, razao_social, nome_fantasia)').single();
        if (error) throw error;
        setProdutos((prev) => prev.map((p) => (p.id === editando.id ? (data as Produto) : p)));
      } else {
        const { data, error } = await supabase.from('produtos').insert([{ ...payload, ativo: true }])
          .select('*, cliente:clientes(id, razao_social, nome_fantasia)').single();
        if (error) throw error;
        setProdutos((prev) => [...prev, data as Produto]);
      }
      setShowModal(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const handleDeletar = async (id: string) => {
    if (!confirm('Remover este produto?')) return;
    const { error } = await supabase.from('produtos').delete().eq('id', id);
    if (error) { alert(`Erro: ${error.message}`); return; }
    setProdutos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleToggleAtivo = async (p: Produto) => {
    const { data, error } = await supabase.from('produtos').update({ ativo: !p.ativo }).eq('id', p.id)
      .select('*, cliente:clientes(id, razao_social, nome_fantasia)').single();
    if (error) { alert(`Erro: ${error.message}`); return; }
    setProdutos((prev) => prev.map((x) => (x.id === p.id ? (data as Produto) : x)));
  };

  const setF = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const produtosFiltrados = useMemo(() => produtos.filter((p) => {
    const q = busca.toLowerCase();
    const matchBusca = !q || (p.codigo ?? '').toLowerCase().includes(q) || p.nome.toLowerCase().includes(q);
    const matchCliente = !filtroCliente || p.cliente_id === filtroCliente;
    return matchBusca && matchCliente;
  }), [produtos, busca, filtroCliente]);

  // preview cálculo no modal
  const qtdPeca = parseInt(formData.qtd_peca_placa) || 0;
  const pesoPeca = parseFloat(formData.peso_peca) || 0;
  const pesoGalho = parseFloat(formData.peso_total_galho) || 0;
  const percRet = parseFloat(formData.percentual_retorno) || 0;
  const pesoUtilCx = qtdPeca * pesoPeca;
  const pesoCanal = pesoGalho > 0 ? pesoGalho - pesoUtilCx : 0;
  const retornoKg = pesoCanal > 0 ? pesoCanal * percRet : 0;

  if (loading) {
    return (
      <Layout title="Produtos">
        <div className="flex items-center justify-center py-20"><div className="spinner w-10 h-10" /></div>
      </Layout>
    );
  }

  return (
    <Layout title="Produtos">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-3 flex-1 flex-wrap">
            <input
              type="text"
              placeholder="Buscar produto..."
              className="form-input flex-1 min-w-48"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <select className="form-select w-44" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
              <option value="">Todos os clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome_fantasia ?? c.razao_social}</option>
              ))}
            </select>
          </div>
          <button className="btn-primary whitespace-nowrap" onClick={abrirNovo}>+ Novo Produto</button>
        </div>

        {/* Tabela compacta */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Código</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-500 uppercase tracking-wide">Pç/Pl</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase tracking-wide">Peso Pç</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase tracking-wide">Galho</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase tracking-wide">Canal</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-500 uppercase tracking-wide">% Ret</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-500 uppercase tracking-wide">Machos</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-500 uppercase tracking-wide">Mat</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase tracking-wide">R$/kg</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide">Cliente</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-500 uppercase tracking-wide">St</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {produtosFiltrados.map((p) => {
                  const canal = p.peso_total_galho && p.peso_peca && p.qtd_peca_placa
                    ? p.peso_total_galho - (p.qtd_peca_placa * p.peso_peca)
                    : null;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2">
                        <span className="font-mono text-orange-600 font-semibold">{p.codigo ?? '—'}</span>
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-800 max-w-xs truncate" title={p.nome}>{p.nome}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{p.qtd_peca_placa ?? '—'}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtKg(p.peso_peca)}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtKg(p.peso_total_galho)}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-500">{fmtKg(canal)}</td>
                      <td className="px-3 py-2 text-center tabular-nums">
                        {p.percentual_retorno != null ? `${(p.percentual_retorno * 100).toFixed(0)}%` : '—'}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">{p.qtd_machos_por_caixa ?? 0}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                          p.tipo_material === 'lingote' ? 'bg-blue-50 text-blue-700' :
                          p.tipo_material === 'mistura' ? 'bg-yellow-50 text-yellow-700' : 'bg-slate-100 text-slate-600'
                        }`}>{p.tipo_material ?? '—'}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">
                        {p.preco_venda_kg ? `R$ ${p.preco_venda_kg.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-600 max-w-24 truncate">
                        {p.cliente ? (p.cliente.nome_fantasia ?? p.cliente.razao_social) : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${p.ativo ? 'bg-green-500' : 'bg-red-400'}`} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex gap-2 justify-center">
                          <button onClick={() => abrirEditar(p)} className="text-blue-600 hover:text-blue-800 font-semibold hover:underline">Editar</button>
                          <button onClick={() => handleToggleAtivo(p)} className="text-amber-600 hover:text-amber-800 font-semibold hover:underline">{p.ativo ? 'Inativar' : 'Ativar'}</button>
                          <button onClick={() => handleDeletar(p.id)} className="text-red-600 hover:text-red-800 font-semibold hover:underline">✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {produtosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-10 text-center text-slate-400">
                      {busca || filtroCliente ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-3 pt-2 pb-1 text-xs text-slate-400 border-t">
            {produtosFiltrados.length} de {produtos.length} produtos
          </div>
        </Card>

        {/* Modal XL — todos os campos sem abas */}
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editando ? `Editar: ${editando.nome}` : 'Novo Produto'}
          size="xl"
          footer={
            <div className="flex gap-3">
              <button className="btn-primary" onClick={handleSalvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar Produto'}
              </button>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
              {editando?.codigo && (
                <span className="ml-auto text-xs text-slate-400 self-center font-mono">Código: {editando.codigo}</span>
              )}
            </div>
          }
        >
          {erro && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{erro}</div>}

          {/* Grid 4 colunas — compacto */}
          <div className="grid grid-cols-4 gap-x-4 gap-y-3">
            {/* Linha 1: Nome (span 3) + Cliente (1) */}
            <div className="col-span-3">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nome / Descrição <span className="text-red-500">*</span></label>
              <input className="form-input text-sm" value={formData.nome} onChange={setF('nome')} placeholder="Ex: BICA DUPLA" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Cliente</label>
              <select className="form-select text-sm" value={formData.cliente_id} onChange={setF('cliente_id')}>
                <option value="">—</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome_fantasia ?? c.razao_social}</option>
                ))}
              </select>
            </div>

            {/* Linha 2: Qtd Pça/Placa, Peso Pça, Peso Total Galho, % Retorno */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Qtd Pçs/Placa</label>
              <input type="number" min="1" className="form-input text-sm" value={formData.qtd_peca_placa} onChange={setF('qtd_peca_placa')} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Peso Peça (kg)</label>
              <input type="number" step="0.001" min="0" className="form-input text-sm" value={formData.peso_peca} onChange={setF('peso_peca')} placeholder="0.185" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Peso Total Galho (kg)</label>
              <input type="number" step="0.001" min="0" className="form-input text-sm" value={formData.peso_total_galho} onChange={setF('peso_total_galho')} placeholder="1.308" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">% Retorno (fração)</label>
              <input type="number" step="0.001" min="0" max="1" className="form-input text-sm" value={formData.percentual_retorno} onChange={setF('percentual_retorno')} placeholder="0.511" />
            </div>

            {/* Linha 3: Machos/Cx, Peso Macho, Tipo Material, R$/kg */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Machos/Caixa</label>
              <input type="number" min="0" className="form-input text-sm" value={formData.qtd_machos_por_caixa} onChange={setF('qtd_machos_por_caixa')} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Peso Macho (kg)</label>
              <input type="number" step="0.001" min="0" className="form-input text-sm" value={formData.peso_macho} onChange={setF('peso_macho')} placeholder="0.175" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo Material</label>
              <select className="form-select text-sm" value={formData.tipo_material} onChange={setF('tipo_material')}>
                {TIPO_MATERIAL.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Preço Venda (R$/kg)</label>
              <input type="number" step="0.01" min="0" className="form-input text-sm" value={formData.preco_venda_kg} onChange={setF('preco_venda_kg')} placeholder="15.60" />
            </div>

            {/* Linha 4: Custo adicional, Estoque mínimo, Obs */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Custo Adicional (R$/cx)</label>
              <input type="number" step="0.01" min="0" className="form-input text-sm" value={formData.custo_adicional} onChange={setF('custo_adicional')} placeholder="Usin./pintura" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Estoque Mín. (cxs)</label>
              <input type="number" min="0" className="form-input text-sm" value={formData.estoque_minimo} onChange={setF('estoque_minimo')} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Observações</label>
              <input className="form-input text-sm" value={formData.descricao} onChange={setF('descricao')} placeholder="Notas internas..." />
            </div>
          </div>

          {/* Preview cálculo */}
          {pesoGalho > 0 && qtdPeca > 0 && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs font-bold text-orange-800 mb-2">Preview por caixa (1 placa)</p>
              <div className="grid grid-cols-4 gap-3 text-xs">
                <div className="text-center">
                  <p className="text-slate-500">Alumínio bruto</p>
                  <p className="font-bold text-orange-700 tabular-nums">{fmtKg(pesoGalho)}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500">Peso útil ({qtdPeca} pçs)</p>
                  <p className="font-bold text-green-700 tabular-nums">{fmtKg(pesoUtilCx)}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500">Canal (retorno)</p>
                  <p className="font-bold text-blue-700 tabular-nums">{fmtKg(pesoCanal)}</p>
                </div>
                <div className="text-center">
                  <p className="text-slate-500">Retorno aproveit.</p>
                  <p className="font-bold text-purple-700 tabular-nums">{percRet > 0 ? fmtKg(retornoKg) : '—'}</p>
                  {percRet > 0 && <p className="text-slate-400">({(percRet * 100).toFixed(0)}% canal)</p>}
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
}
