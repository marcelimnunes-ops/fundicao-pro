import { useEffect, useState, useMemo, useRef } from 'react';
import Layout from '@/components/Layout';
import { Badge, Modal } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import type { Cliente } from '@/lib/types';

interface ClienteStats {
  cliente_id: string;
  total_caixas: number;
  total_pecas: number;
  total_apontamentos: number;
  caixas_ultimo_mes: number;
  perda_media: number;
}

interface FormData {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  email: string;
  telefone: string;
  celular: string;
  contato_nome: string;
  cidade: string;
  uf: string;
  prazo_pagamento_dias: string;
  observacoes: string;
}

const FORM_VAZIO: FormData = {
  razao_social: '', nome_fantasia: '', cnpj: '', email: '',
  telefone: '', celular: '', contato_nome: '', cidade: '', uf: '',
  prazo_pagamento_dias: '30', observacoes: '',
};

function nomeCurto(c: Cliente) { return c.nome_fantasia ?? c.razao_social; }
function fmtNum(n: number) { return n.toLocaleString('pt-BR'); }

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [stats, setStats] = useState<Map<string, ClienteStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState<FormData>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [sugestoes, setSugestoes] = useState<Cliente[]>([]);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const buscaRef = useRef<HTMLInputElement>(null);

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    setLoading(true);
    const [{ data: cls }, { data: statsData }] = await Promise.all([
      supabase.from('clientes').select('*').order('razao_social'),
      supabase.from('producao').select(`
        produto_id,
        qtde_caixas, qtde_pecas, perdas_peca, data,
        produto:produtos(cliente_id)
      `),
    ]);
    setClientes((cls as Cliente[]) || []);

    // Agrupa stats por cliente
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0];
    const mapa = new Map<string, ClienteStats>();

    for (const ap of (statsData ?? []) as Array<{
      qtde_caixas: number; qtde_pecas?: number; perdas_peca: number; data: string;
      produto?: { cliente_id?: string } | null;
    }>) {
      const cid = ap.produto?.cliente_id;
      if (!cid) continue;
      if (!mapa.has(cid)) mapa.set(cid, { cliente_id: cid, total_caixas: 0, total_pecas: 0, total_apontamentos: 0, caixas_ultimo_mes: 0, perda_media: 0 });
      const s = mapa.get(cid)!;
      s.total_caixas += ap.qtde_caixas;
      s.total_pecas += ap.qtde_pecas ?? 0;
      s.total_apontamentos++;
      if (ap.data >= primeiroDiaMes) s.caixas_ultimo_mes += ap.qtde_caixas;
      // acumula perda para calcular média depois
      s.perda_media += (ap.qtde_caixas > 0 ? ap.perdas_peca / ap.qtde_caixas : 0);
    }
    // finaliza média de perda
    mapa.forEach((s) => {
      if (s.total_apontamentos > 0) s.perda_media = (s.perda_media / s.total_apontamentos) * 100;
    });
    setStats(mapa);
    setLoading(false);
  };

  const abrirNovo = () => { setEditando(null); setFormData(FORM_VAZIO); setErro(''); setShowModal(true); };

  const abrirEditar = (c: Cliente) => {
    setEditando(c);
    setFormData({
      razao_social: c.razao_social, nome_fantasia: c.nome_fantasia ?? '',
      cnpj: c.cnpj ?? '', email: c.email ?? '', telefone: c.telefone ?? '',
      celular: c.celular ?? '', contato_nome: c.contato_nome ?? '',
      cidade: c.cidade ?? '', uf: c.uf ?? '',
      prazo_pagamento_dias: String(c.prazo_pagamento_dias ?? 30),
      observacoes: c.observacoes ?? '',
    });
    setErro(''); setShowModal(true);
  };

  const handleSalvar = async () => {
    if (!formData.razao_social.trim()) { setErro('Razão Social é obrigatória'); return; }
    setSalvando(true); setErro('');
    const payload = {
      razao_social: formData.razao_social.trim(),
      nome_fantasia: formData.nome_fantasia.trim() || null,
      cnpj: formData.cnpj.trim() || null, email: formData.email.trim() || null,
      telefone: formData.telefone.trim() || null, celular: formData.celular.trim() || null,
      contato_nome: formData.contato_nome.trim() || null,
      cidade: formData.cidade.trim() || null, uf: formData.uf.trim().toUpperCase() || null,
      prazo_pagamento_dias: parseInt(formData.prazo_pagamento_dias) || 30,
      observacoes: formData.observacoes.trim() || null,
    };
    try {
      if (editando) {
        const { data, error } = await supabase.from('clientes').update(payload).eq('id', editando.id).select().single();
        if (error) throw error;
        setClientes((prev) => prev.map((c) => (c.id === editando.id ? (data as Cliente) : c)));
      } else {
        const { data, error } = await supabase.from('clientes').insert([{ ...payload, ativo: true }]).select().single();
        if (error) throw error;
        setClientes((prev) => [...prev, data as Cliente]);
      }
      setShowModal(false);
    } catch (err) { setErro(err instanceof Error ? err.message : 'Erro ao salvar'); }
    finally { setSalvando(false); }
  };

  const handleDeletar = async (id: string) => {
    if (!confirm('Remover este cliente?')) return;
    const { error } = await supabase.from('clientes').delete().eq('id', id);
    if (error) { alert(`Erro: ${error.message}`); return; }
    setClientes((prev) => prev.filter((c) => c.id !== id));
  };

  const handleToggleAtivo = async (c: Cliente) => {
    const { data, error } = await supabase.from('clientes').update({ ativo: !c.ativo }).eq('id', c.id).select().single();
    if (error) { alert(`Erro: ${error.message}`); return; }
    setClientes((prev) => prev.map((x) => (x.id === c.id ? (data as Cliente) : x)));
  };

  const setF = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  // Autocomplete de busca
  const handleBusca = (val: string) => {
    setBusca(val);
    if (val.trim().length >= 1) {
      const q = val.toLowerCase();
      setSugestoes(clientes.filter((c) =>
        nomeCurto(c).toLowerCase().includes(q) || c.razao_social.toLowerCase().includes(q)
      ).slice(0, 8));
      setShowSugestoes(true);
    } else {
      setSugestoes([]);
      setShowSugestoes(false);
    }
  };

  const selecionarSugestao = (c: Cliente) => {
    setBusca(nomeCurto(c));
    setShowSugestoes(false);
  };

  const clientesFiltrados = useMemo(() => {
    if (!busca.trim()) return clientes;
    const q = busca.toLowerCase();
    return clientes.filter((c) =>
      nomeCurto(c).toLowerCase().includes(q) || c.razao_social.toLowerCase().includes(q)
    );
  }, [clientes, busca]);

  const ativos = clientes.filter((c) => c.ativo).length;

  if (loading) {
    return (
      <Layout title="Clientes">
        <div className="flex items-center justify-center py-20"><div className="spinner w-10 h-10" /></div>
      </Layout>
    );
  }

  return (
    <Layout title="Clientes">
      <div className="space-y-5">
        {/* Sumário */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: clientes.length, color: 'text-slate-700' },
            { label: 'Ativos', value: ativos, color: 'text-green-600' },
            { label: 'Inativos', value: clientes.length - ativos, color: 'text-red-500' },
            { label: 'Com Produção', value: stats.size, color: 'text-blue-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <input
              ref={buscaRef}
              type="text"
              placeholder="Buscar cliente..."
              className="form-input w-full pr-8"
              value={busca}
              onChange={(e) => handleBusca(e.target.value)}
              onFocus={() => busca && setShowSugestoes(true)}
              onBlur={() => setTimeout(() => setShowSugestoes(false), 150)}
            />
            {busca && (
              <button className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => { setBusca(''); setSugestoes([]); }}>✕</button>
            )}
            {showSugestoes && sugestoes.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                {sugestoes.map((c) => (
                  <button key={c.id} className="w-full text-left px-4 py-2 text-sm hover:bg-orange-50 flex items-center gap-2"
                    onMouseDown={() => selecionarSugestao(c)}>
                    <span className="flex-1">{nomeCurto(c)}</span>
                    <Badge variant={c.ativo ? 'success' : 'danger'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="btn-primary whitespace-nowrap" onClick={abrirNovo}>+ Novo Cliente</button>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientesFiltrados.map((c) => {
            const s = stats.get(c.id);
            return (
              <div key={c.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {/* Header do card */}
                <div className="px-4 pt-4 pb-2 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{nomeCurto(c)}</h3>
                      {c.nome_fantasia && c.razao_social !== c.nome_fantasia && (
                        <p className="text-xs text-slate-400 truncate">{c.razao_social}</p>
                      )}
                    </div>
                    <Badge variant={c.ativo ? 'success' : 'danger'}>{c.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  </div>
                </div>

                {/* Dados de produção (KPIs) */}
                {s && s.total_apontamentos > 0 ? (
                  <div className="grid grid-cols-3 gap-0 border-b border-slate-100">
                    <div className="px-3 py-3 text-center border-r border-slate-100">
                      <p className="text-xs text-slate-400">Cx produzidas</p>
                      <p className="text-lg font-bold text-slate-800 tabular-nums">{fmtNum(s.total_caixas)}</p>
                    </div>
                    <div className="px-3 py-3 text-center border-r border-slate-100">
                      <p className="text-xs text-slate-400">Cx este mês</p>
                      <p className="text-lg font-bold text-orange-600 tabular-nums">{fmtNum(s.caixas_ultimo_mes)}</p>
                    </div>
                    <div className="px-3 py-3 text-center">
                      <p className="text-xs text-slate-400">% perda méd.</p>
                      <p className={`text-lg font-bold tabular-nums ${s.perda_media > 5 ? 'text-red-500' : s.perda_media > 2 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {s.perda_media.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="px-4 py-3 text-xs text-slate-400 border-b border-slate-100">
                    Sem produção registrada
                  </div>
                )}

                {/* Contatos */}
                <div className="px-4 py-3 space-y-1 text-xs text-slate-500">
                  {c.cidade && <p>{c.cidade}{c.uf ? ` — ${c.uf}` : ''}</p>}
                  {c.telefone && <p>{c.telefone}</p>}
                  {c.email && <p className="truncate">{c.email}</p>}
                  <p className="text-slate-400">Prazo: {c.prazo_pagamento_dias ?? 30} dias</p>
                </div>

                {/* Ações */}
                <div className="px-4 pb-3 flex gap-2">
                  <button onClick={() => abrirEditar(c)} className="flex-1 btn-secondary text-xs py-1.5">Editar</button>
                  <button onClick={() => handleToggleAtivo(c)} className="text-amber-600 hover:text-amber-800 text-xs font-semibold px-2">{c.ativo ? 'Inativar' : 'Ativar'}</button>
                  <button onClick={() => handleDeletar(c.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold px-2">✕</button>
                </div>
              </div>
            );
          })}
          {clientesFiltrados.length === 0 && (
            <div className="col-span-3 text-center py-12">
              <p className="text-slate-500 mb-4">{busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}</p>
              {!busca && <button className="btn-primary" onClick={abrirNovo}>Criar Primeiro Cliente</button>}
            </div>
          )}
        </div>

        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editando ? 'Editar Cliente' : 'Novo Cliente'}
          size="lg"
          footer={
            <div className="flex gap-3">
              <button className="btn-primary" onClick={handleSalvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
            </div>
          }
        >
          <div className="space-y-3">
            {erro && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{erro}</div>}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Razão Social / Nome <span className="text-red-500">*</span></label>
              <input className="form-input" value={formData.razao_social} onChange={setF('razao_social')} autoFocus />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Fantasia / Apelido</label>
              <input className="form-input" value={formData.nome_fantasia} onChange={setF('nome_fantasia')} placeholder="Como é conhecido internamente" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CNPJ</label>
                <input className="form-input text-sm" value={formData.cnpj} onChange={setF('cnpj')} placeholder="XX.XXX.XXX/XXXX-XX" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prazo Pag. (dias)</label>
                <input type="number" min="0" className="form-input text-sm" value={formData.prazo_pagamento_dias} onChange={setF('prazo_pagamento_dias')} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contato</label>
                <input className="form-input text-sm" value={formData.contato_nome} onChange={setF('contato_nome')} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone</label>
                <input className="form-input text-sm" value={formData.telefone} onChange={setF('telefone')} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Celular</label>
                <input className="form-input text-sm" value={formData.celular} onChange={setF('celular')} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input type="email" className="form-input text-sm" value={formData.email} onChange={setF('email')} />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cidade</label>
                <input className="form-input text-sm" value={formData.cidade} onChange={setF('cidade')} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">UF</label>
                <input maxLength={2} className="form-input text-sm" value={formData.uf} onChange={setF('uf')} placeholder="SP" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Observações</label>
              <textarea className="form-input text-sm" rows={2} value={formData.observacoes} onChange={setF('observacoes')} />
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
