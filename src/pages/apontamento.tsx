import { useState, useMemo } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { Card } from '@/components/ui';

export default function ApontamentoPage() {
  const { producoes, funcionarios, produtos, loading, criarProducao } = useProducao();
  const [filtroMoldador, setFiltroMoldador] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    moldador_id: '',
    produto_id: '',
    qtde_caixas: '',
    aluminio_bruto: '',
    peso_retorno: '',
    perdas_peca: '',
    consumo_oleo: '',
    tempo_horas: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const moldadores = useMemo(
    () => funcionarios.filter((f) => f.funcao === 'Moldador'),
    [funcionarios]
  );

  const producaoFiltrada = useMemo(
    () => (filtroMoldador ? producoes.filter((p) => p.moldador_id === filtroMoldador) : producoes),
    [producoes, filtroMoldador]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await criarProducao({
        data: formData.data,
        moldador_id: formData.moldador_id,
        produto_id: formData.produto_id,
        qtde_caixas: parseInt(formData.qtde_caixas) || 0,
        aluminio_bruto: parseFloat(formData.aluminio_bruto) || 0,
        peso_retorno: parseFloat(formData.peso_retorno) || 0,
        perdas_peca: parseFloat(formData.perdas_peca) || 0,
        consumo_oleo: parseFloat(formData.consumo_oleo) || 0,
        tempo_horas: parseFloat(formData.tempo_horas) || 0,
      });
      setFormData({
        data: new Date().toISOString().split('T')[0],
        moldador_id: '',
        produto_id: '',
        qtde_caixas: '',
        aluminio_bruto: '',
        peso_retorno: '',
        perdas_peca: '',
        consumo_oleo: '',
        tempo_horas: '',
      });
      setShowForm(false);
      setSuccessMsg('Apontamento registrado com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      // error handled by hook
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Apontamento de Produção">
        <div className="text-center py-12">Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Apontamento de Produção">
      <div className="space-y-6">
        {successMsg && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm font-semibold">
            {successMsg}
          </div>
        )}

        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-900">Apontamentos de Produção</h3>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? '✕ Cancelar' : '+ Novo Apontamento'}
          </button>
        </div>

        {showForm && (
          <Card title="Registrar Apontamento">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Data <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Moldador <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={formData.moldador_id}
                    onChange={(e) => setFormData({ ...formData, moldador_id: e.target.value })}
                    required
                  >
                    <option value="">Selecionar...</option>
                    {moldadores.map((f) => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Produto <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={formData.produto_id}
                    onChange={(e) => setFormData({ ...formData, produto_id: e.target.value })}
                    required
                  >
                    <option value="">Selecionar...</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Qtd. Caixas</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.qtde_caixas}
                    onChange={(e) => setFormData({ ...formData, qtde_caixas: e.target.value })}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Alumínio Bruto (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.aluminio_bruto}
                    onChange={(e) => setFormData({ ...formData, aluminio_bruto: e.target.value })}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Peso Retorno (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.peso_retorno}
                    onChange={(e) => setFormData({ ...formData, peso_retorno: e.target.value })}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Perdas (peças)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.perdas_peca}
                    onChange={(e) => setFormData({ ...formData, perdas_peca: e.target.value })}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Consumo Óleo (L)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.consumo_oleo}
                    onChange={(e) => setFormData({ ...formData, consumo_oleo: e.target.value })}
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Tempo (horas)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.tempo_horas}
                    onChange={(e) => setFormData({ ...formData, tempo_horas: e.target.value })}
                    min="0"
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Salvando...' : 'Salvar Apontamento'}
              </button>
            </form>
          </Card>
        )}

        <Card title="Filtrar Apontamentos">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        </Card>

        <Card title="Apontamentos Recentes">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 text-left">Data</th>
                  <th className="p-2 text-left">Moldador</th>
                  <th className="p-2 text-left">Produto</th>
                  <th className="p-2 text-right">Caixas</th>
                  <th className="p-2 text-right">Alumínio (kg)</th>
                  <th className="p-2 text-right">Retorno (kg)</th>
                  <th className="p-2 text-right">Perdas</th>
                  <th className="p-2 text-right">Horas</th>
                </tr>
              </thead>
              <tbody>
                {producaoFiltrada.slice(0, 30).map((p) => {
                  const moldador = funcionarios.find((f) => f.id === p.moldador_id);
                  const produto = produtos.find((pr) => pr.id === p.produto_id);
                  const taxaPerda =
                    p.aluminio_bruto > 0 ? ((p.perdas_peca / p.aluminio_bruto) * 100).toFixed(1) : '0.0';

                  return (
                    <tr key={p.id} className="border-b hover:bg-slate-50">
                      <td className="p-2">{p.data}</td>
                      <td className="p-2">{moldador?.nome ?? '-'}</td>
                      <td className="p-2">{produto?.codigo ?? '-'}</td>
                      <td className="p-2 text-right">{p.qtde_caixas}</td>
                      <td className="p-2 text-right">{p.aluminio_bruto.toFixed(2)}</td>
                      <td className="p-2 text-right">{p.peso_retorno.toFixed(2)}</td>
                      <td className="p-2 text-right">
                        <span className={`font-semibold ${p.perdas_peca > 5 ? 'text-red-600' : 'text-green-600'}`}>
                          {p.perdas_peca} ({taxaPerda}%)
                        </span>
                      </td>
                      <td className="p-2 text-right">{p.tempo_horas.toFixed(2)}</td>
                    </tr>
                  );
                })}
                {producaoFiltrada.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      Nenhum apontamento encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
