import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, Badge, Modal } from '@/components/ui';
import { supabase } from '@/lib/supabase';

type Material = 'Lingote' | 'Sucata' | 'Óleo' | 'Galho';

interface Compra {
  id: string;
  data: string;
  material: Material;
  fornecedor?: string;
  nota_fiscal?: string;
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
  observacoes?: string;
  created_at: string;
}

interface EstoqueAluminio {
  id: string;
  tipo: string;
  saldo: number;
  custo_medio: number;
}

interface FormData {
  data: string;
  material: Material;
  fornecedor: string;
  nota_fiscal: string;
  quantidade: string;
  preco_unitario: string;
  observacoes: string;
}

const MATERIAIS: Material[] = ['Lingote', 'Sucata', 'Óleo', 'Galho'];
const UNIDADE: Record<Material, string> = { Lingote: 'kg', Sucata: 'kg', Óleo: 'L', Galho: 'kg' };

const FORM_VAZIO: FormData = {
  data: new Date().toISOString().split('T')[0],
  material: 'Lingote',
  fornecedor: '',
  nota_fiscal: '',
  quantidade: '',
  preco_unitario: '',
  observacoes: '',
};

function fmtBrl(n?: number | null) {
  if (n == null) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtNum(n?: number | null, dec = 3) {
  if (n == null) return '—';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export default function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [estoque, setEstoque] = useState<EstoqueAluminio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormData>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    setLoading(true);
    const [{ data: c }, { data: e }] = await Promise.all([
      supabase.from('compras').select('*').order('data', { ascending: false }).limit(100),
      supabase.from('estoque_aluminio').select('*').order('tipo'),
    ]);
    setCompras((c as Compra[]) ?? []);
    setEstoque((e as EstoqueAluminio[]) ?? []);
    setLoading(false);
  };

  const handleSalvar = async () => {
    if (!form.quantidade || !form.preco_unitario) { setErro('Quantidade e preço são obrigatórios'); return; }
    const qtd = parseFloat(form.quantidade.replace(',', '.'));
    const preco = parseFloat(form.preco_unitario.replace(',', '.'));
    if (isNaN(qtd) || qtd <= 0) { setErro('Quantidade inválida'); return; }
    if (isNaN(preco) || preco <= 0) { setErro('Preço inválido'); return; }

    setSalvando(true);
    setErro('');

    // 1. Insere a compra
    const { error: errCompra } = await supabase.from('compras').insert({
      data: form.data,
      material: form.material,
      fornecedor: form.fornecedor.trim() || null,
      nota_fiscal: form.nota_fiscal.trim() || null,
      quantidade: qtd,
      preco_unitario: preco,
      observacoes: form.observacoes.trim() || null,
    });

    if (errCompra) { setErro(errCompra.message); setSalvando(false); return; }

    // 2. Atualiza saldo e custo médio no estoque_aluminio (custo médio ponderado)
    const estoqueAtual = estoque.find(e => e.tipo === form.material);
    if (estoqueAtual) {
      const saldoAtual = estoqueAtual.saldo ?? 0;
      const custoAtual = estoqueAtual.custo_medio ?? 0;
      const novoSaldo = saldoAtual + qtd;
      const novoCusto = novoSaldo > 0
        ? ((saldoAtual * custoAtual) + (qtd * preco)) / novoSaldo
        : preco;

      await supabase.from('estoque_aluminio')
        .update({ saldo: novoSaldo, custo_medio: novoCusto, atualizado_em: new Date().toISOString() })
        .eq('tipo', form.material);
    } else {
      // Cria o registro de estoque se não existir
      await supabase.from('estoque_aluminio').insert({
        tipo: form.material,
        saldo: qtd,
        custo_medio: preco,
      });
    }

    // 3. Atualiza config_sistema com o novo custo (para uso nos cálculos)
    const chaveConfig: Record<Material, string | null> = {
      Lingote: 'CUSTO_KG_LINGOTE',
      Sucata:  'CUSTO_KG_SUCATA',
      Óleo:    'CUSTO_LITRO_OLEO',
      Galho:   null,
    };
    const chave = chaveConfig[form.material as Material];
    if (chave) {
      const estoqueNovo = estoque.find(e => e.tipo === form.material);
      const saldoNovo = (estoqueNovo?.saldo ?? 0) + qtd;
      const custoNovo = saldoNovo > 0
        ? (((estoqueNovo?.saldo ?? 0) * (estoqueNovo?.custo_medio ?? 0)) + (qtd * preco)) / saldoNovo
        : preco;
      await supabase.from('config_sistema')
        .update({ valor: custoNovo.toFixed(4) })
        .eq('chave', chave);
    }

    setShowModal(false);
    setForm(FORM_VAZIO);
    await carregar();
    setSalvando(false);
  };

  const setF = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const valorTotal = (() => {
    const q = parseFloat(form.quantidade.replace(',', '.'));
    const p = parseFloat(form.preco_unitario.replace(',', '.'));
    return !isNaN(q) && !isNaN(p) ? q * p : null;
  })();

  if (loading) {
    return (
      <Layout title="Compras">
        <div className="text-center py-12"><div className="spinner w-12 h-12 mx-auto mb-4"></div></div>
      </Layout>
    );
  }

  return (
    <Layout title="Compras de Material">
      <div className="space-y-6">
        {/* Saldos de estoque */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {estoque.map((e) => (
            <Card key={e.id}>
              <p className="text-sm text-slate-500">{e.tipo}</p>
              <p className="text-2xl font-bold text-slate-900">{fmtNum(e.saldo, 1)} <span className="text-sm font-normal">{UNIDADE[e.tipo as Material] ?? 'kg'}</span></p>
              <p className="text-xs text-slate-500 mt-1">Custo médio: <strong>{fmtBrl(e.custo_medio)}</strong>/{UNIDADE[e.tipo as Material] ?? 'kg'}</p>
            </Card>
          ))}
        </div>

        {/* Lista de compras */}
        <Card title={`Histórico de Compras (${compras.length})`}>
          <div className="flex justify-end mb-4">
            <button className="btn-primary" onClick={() => { setForm(FORM_VAZIO); setErro(''); setShowModal(true); }}>
              + Registrar Compra
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-left">Data</th>
                  <th className="p-3 text-left">Material</th>
                  <th className="p-3 text-left">Fornecedor</th>
                  <th className="p-3 text-left">NF</th>
                  <th className="p-3 text-right">Quantidade</th>
                  <th className="p-3 text-right">Preço Unit.</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {compras.map((c) => (
                  <tr key={c.id} className="border-b hover:bg-slate-50">
                    <td className="p-3">{new Date(c.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="p-3">
                      <Badge variant={c.material === 'Lingote' ? 'info' : c.material === 'Óleo' ? 'warning' : 'default'}>
                        {c.material}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-600">{c.fornecedor ?? '—'}</td>
                    <td className="p-3 text-slate-600">{c.nota_fiscal ?? '—'}</td>
                    <td className="p-3 text-right font-mono">{fmtNum(c.quantidade, 1)} {UNIDADE[c.material]}</td>
                    <td className="p-3 text-right font-mono">{fmtBrl(c.preco_unitario)}</td>
                    <td className="p-3 text-right font-mono font-semibold">{fmtBrl(c.valor_total)}</td>
                  </tr>
                ))}
                {compras.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Nenhuma compra registrada. Registre a primeira entrada de material.
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
          title="Registrar Compra de Material"
          size="md"
          footer={
            <div className="flex gap-3">
              <button className="btn-primary" onClick={handleSalvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
            </div>
          }
        >
          <div className="space-y-4">
            {erro && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{erro}</div>}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Data <span className="text-red-500">*</span></label>
                <input type="date" className="form-input" value={form.data} onChange={setF('data')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Material <span className="text-red-500">*</span></label>
                <select className="form-select" value={form.material} onChange={setF('material')}>
                  {MATERIAIS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Fornecedor</label>
                <input className="form-input" value={form.fornecedor} onChange={setF('fornecedor')} placeholder="Nome do fornecedor" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nota Fiscal</label>
                <input className="form-input" value={form.nota_fiscal} onChange={setF('nota_fiscal')} placeholder="NF-e 000000" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Quantidade ({UNIDADE[form.material as Material]}) <span className="text-red-500">*</span>
                </label>
                <input type="number" step="0.001" min="0" className="form-input" value={form.quantidade} onChange={setF('quantidade')} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Preço Unit. (R$/{UNIDADE[form.material as Material]}) <span className="text-red-500">*</span>
                </label>
                <input type="number" step="0.0001" min="0" className="form-input" value={form.preco_unitario} onChange={setF('preco_unitario')} />
              </div>
              {valorTotal !== null && (
                <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                  Valor total: <strong>{fmtBrl(valorTotal)}</strong>
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Observações</label>
                <textarea className="form-input" rows={2} value={form.observacoes} onChange={setF('observacoes')} />
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}
