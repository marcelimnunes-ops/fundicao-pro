import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, Badge, Modal } from '@/components/ui';
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
  codigo: '',
  nome: '',
  descricao: '',
  qtd_peca_placa: '1',
  peso_peca: '',
  peso_total_galho: '',
  percentual_retorno: '',
  qtd_machos_por_caixa: '0',
  peso_macho: '',
  tipo_material: 'sucata',
  preco_venda_kg: '',
  custo_adicional: '0',
  cliente_id: '',
  estoque_minimo: '0',
};

function fmtKg(n?: number | null) {
  if (n == null) return '—';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' kg';
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
  const [abaForm, setAbaForm] = useState<'basico' | 'tecnico' | 'comercial'>('basico');

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    setLoading(true);
    const [resProdutos, resClientes] = await Promise.all([
      supabase.from('produtos').select('*, cliente:clientes(id, razao_social, nome_fantasia)').order('codigo'),
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
    setAbaForm('basico');
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
    setAbaForm('basico');
    setShowModal(true);
  };

  const handleSalvar = async () => {
    if (!formData.codigo.trim()) { setErro('Código é obrigatório'); return; }
    if (!formData.nome.trim()) { setErro('Nome é obrigatório'); return; }
    setSalvando(true);
    setErro('');

    const numOrNull = (v: string) => v.trim() === '' ? null : parseFloat(v) || null;
    const intOrNull = (v: string) => v.trim() === '' || v === '0' ? null : parseInt(v) || null;

    const payload = {
      codigo: formData.codigo.trim().toUpperCase(),
      nome: formData.nome.trim(),
      descricao: formData.descricao.trim() || null,
      qtd_peca_placa: parseInt(formData.qtd_peca_placa) || 1,
      peso_peca: numOrNull(formData.peso_peca),
      peso_total_galho: numOrNull(formData.peso_total_galho),
      percentual_retorno: numOrNull(formData.percentual_retorno),
      qtd_machos_por_caixa: intOrNull(formData.qtd_machos_por_caixa) ?? 0,
      peso_macho: numOrNull(formData.peso_macho),
      tipo_material: formData.tipo_material || 'sucata',
      preco_venda_kg: numOrNull(formData.preco_venda_kg),
      custo_adicional: parseFloat(formData.custo_adicional) || 0,
      cliente_id: formData.cliente_id || null,
      estoque_minimo: parseFloat(formData.estoque_minimo) || 0,
    };

    try {
      if (editando) {
        const { data, error } = await supabase
          .from('produtos').update(payload).eq('id', editando.id).select('*, cliente:clientes(id, razao_social, nome_fantasia)').single();
        if (error) throw error;
        setProdutos((prev) => prev.map((p) => (p.id === editando.id ? (data as Produto) : p)));
      } else {
        const { data, error } = await supabase
          .from('produtos').insert([payload]).select('*, cliente:clientes(id, razao_social, nome_fantasia)').single();
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
    if (!confirm('Remover este produto? Esta ação não pode ser desfeita.')) return;
    const { error } = await supabase.from('produtos').delete().eq('id', id);
    if (error) { alert(`Erro: ${error.message}`); return; }
    setProdutos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleToggleAtivo = async (p: Produto) => {
    const { data, error } = await supabase
      .from('produtos').update({ ativo: !p.ativo }).eq('id', p.id)
      .select('*, cliente:clientes(id, razao_social, nome_fantasia)').single();
    if (error) { alert(`Erro: ${error.message}`); return; }
    setProdutos((prev) => prev.map((x) => (x.id === p.id ? (data as Produto) : x)));
  };

  const setF = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const produtosFiltrados = produtos.filter((p) => {
    const matchBusca = !busca || (p.codigo ?? '').toLowerCase().includes(busca.toLowerCase()) || p.nome.toLowerCase().includes(busca.toLowerCase()) || (p.codigo_erp ?? '').toLowerCase().includes(busca.toLowerCase());
    const matchCliente = !filtroCliente || p.cliente_id === filtroCliente;
    return matchBusca && matchCliente;
  });

  if (loading) {
    return (
      <Layout title="Produtos">
        <div className="text-center py-12">Carregando produtos...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Produtos">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900">Produtos ({produtos.length})</h3>
          <button className="btn-primary" onClick={abrirNovo}>+ Novo Produto</button>
        </div>

        <Card>
          <div className="flex gap-3 mb-4 flex-wrap">
            <input
              type="text"
              placeholder="Buscar por código ou nome..."
              className="form-input flex-1 min-w-48"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <select className="form-select w-48" value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
              <option value="">Todos os clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nome_fantasia ?? c.razao_social}</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-left">Código</th>
                  <th className="p-3 text-left">Nome</th>
                  <th className="p-3 text-center">Pçs/Placa</th>
                  <th className="p-3 text-right">Peso Pç</th>
                  <th className="p-3 text-right">Peso Galho</th>
                  <th className="p-3 text-center">Machos/Cx</th>
                  <th className="p-3 text-center">Material</th>
                  <th className="p-3 text-left">Cliente</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 font-mono font-semibold text-orange-600">{p.codigo}</td>
                    <td className="p-3 font-semibold">{p.nome}</td>
                    <td className="p-3 text-center">{p.qtd_peca_placa ?? '—'}</td>
                    <td className="p-3 text-right font-mono">{fmtKg(p.peso_peca)}</td>
                    <td className="p-3 text-right font-mono">{fmtKg(p.peso_total_galho)}</td>
                    <td className="p-3 text-center">{p.qtd_machos_por_caixa ?? 0}</td>
                    <td className="p-3 text-center">
                      <Badge variant={p.tipo_material === 'lingote' ? 'info' : p.tipo_material === 'mistura' ? 'warning' : 'default'}>
                        {p.tipo_material ?? '—'}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-600 text-xs">
                      {p.cliente ? (p.cliente.nome_fantasia ?? p.cliente.razao_social) : '—'}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={p.ativo ? 'success' : 'danger'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => abrirEditar(p)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Editar</button>
                        <button onClick={() => handleToggleAtivo(p)} className="text-yellow-600 hover:text-yellow-800 text-xs font-semibold">{p.ativo ? 'Inativar' : 'Ativar'}</button>
                        <button onClick={() => handleDeletar(p.id)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Remover</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {produtosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500">
                      {busca || filtroCliente ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editando ? `Editar: ${editando.codigo}` : 'Novo Produto'}
          size="lg"
          footer={
            <div className="flex gap-3">
              <button className="btn-primary" onClick={handleSalvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar Produto'}
              </button>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
            </div>
          }
        >
          <div className="space-y-4">
            {erro && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{erro}</div>
            )}

            {/* Abas do formulário */}
            <div className="flex gap-1 border-b">
              {(['basico', 'tecnico', 'comercial'] as const).map((aba) => (
                <button
                  key={aba}
                  className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                    abaForm === aba
                      ? 'border-orange-500 text-orange-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                  onClick={() => setAbaForm(aba)}
                >
                  {aba === 'basico' ? 'Dados Básicos' : aba === 'tecnico' ? 'Dados Técnicos' : 'Comercial'}
                </button>
              ))}
            </div>

            {abaForm === 'basico' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Código <span className="text-red-500">*</span></label>
                    <input className="form-input" value={formData.codigo} onChange={setF('codigo')} placeholder="Ex: 0429013" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Cliente</label>
                    <select className="form-select" value={formData.cliente_id} onChange={setF('cliente_id')}>
                      <option value="">Selecione...</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>{c.nome_fantasia ?? c.razao_social}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nome / Descrição <span className="text-red-500">*</span></label>
                  <input className="form-input" value={formData.nome} onChange={setF('nome')} placeholder="Ex: BICA DUPLA" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Observações</label>
                  <input className="form-input" value={formData.descricao} onChange={setF('descricao')} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Material</label>
                    <select className="form-select" value={formData.tipo_material} onChange={setF('tipo_material')}>
                      {TIPO_MATERIAL.map((t) => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Estoque Mínimo (cxs)</label>
                    <input type="number" min="0" className="form-input" value={formData.estoque_minimo} onChange={setF('estoque_minimo')} />
                  </div>
                </div>
              </div>
            )}

            {abaForm === 'tecnico' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500">Dados da placa de fundição — usados para calcular consumo de alumínio e custo.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Qtde Peças/Placa</label>
                    <input type="number" min="1" className="form-input" value={formData.qtd_peca_placa} onChange={setF('qtd_peca_placa')} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Peso da Peça (kg)</label>
                    <input type="number" step="0.001" min="0" className="form-input" value={formData.peso_peca} onChange={setF('peso_peca')} placeholder="0.185" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Peso Total c/ Canal (kg)</label>
                    <input type="number" step="0.001" min="0" className="form-input" value={formData.peso_total_galho} onChange={setF('peso_total_galho')} placeholder="1.308" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">% Retorno (canal)</label>
                    <input type="number" step="0.0001" min="0" max="1" className="form-input" value={formData.percentual_retorno} onChange={setF('percentual_retorno')} placeholder="0.511 = 51.1%" />
                    <p className="text-xs text-slate-400 mt-1">Fração decimal (ex: 0.511)</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Machos (areia)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Qtde Machos/Caixa</label>
                      <input type="number" min="0" className="form-input" value={formData.qtd_machos_por_caixa} onChange={setF('qtd_machos_por_caixa')} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Peso do Macho (kg)</label>
                      <input type="number" step="0.001" min="0" className="form-input" value={formData.peso_macho} onChange={setF('peso_macho')} placeholder="0.175" />
                    </div>
                  </div>
                </div>
                {/* Preview do cálculo */}
                {formData.peso_peca && formData.qtd_peca_placa && formData.peso_total_galho && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded text-sm">
                    <p className="font-semibold text-orange-800 mb-1">Preview do Cálculo (por caixa)</p>
                    <p className="text-orange-700">
                      Alumínio bruto: <strong>{(parseFloat(formData.peso_total_galho)).toFixed(3)} kg</strong> ×{' '}
                      <strong>{formData.qtd_peca_placa} pçs</strong> ={' '}
                      <strong>{(parseFloat(formData.peso_total_galho) * parseInt(formData.qtd_peca_placa)).toFixed(3)} kg</strong>
                    </p>
                    <p className="text-orange-700">
                      Retorno (canal): <strong>
                        {formData.percentual_retorno
                          ? ((parseFloat(formData.peso_total_galho) * parseInt(formData.qtd_peca_placa)) * parseFloat(formData.percentual_retorno)).toFixed(3)
                          : '—'} kg</strong>
                    </p>
                  </div>
                )}
              </div>
            )}

            {abaForm === 'comercial' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Preço de Venda (R$/kg)</label>
                    <input type="number" step="0.01" min="0" className="form-input" value={formData.preco_venda_kg} onChange={setF('preco_venda_kg')} placeholder="15.60" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Custo Adicional (R$/cx)</label>
                    <input type="number" step="0.01" min="0" className="form-input" value={formData.custo_adicional} onChange={setF('custo_adicional')} placeholder="Usinagem, pintura..." />
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
