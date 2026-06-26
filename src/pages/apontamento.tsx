import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { formatarMoeda, formatarPercentual, formatarPeso, formatarVolume } from '@/lib/calculations';

export default function ApontamentoPage() {
  const {
    produtos,
    funcionarios,
    criarProducao,
    calcularProducao,
    producoes,
    loading: dataLoading,
  } = useProducao();

  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    produto_id: '',
    moldador_id: '',
    ajudante_id: '',
    qtde_caixas: '',
    tempo_horas: '',
    perdas_peca: '',
    peso_retorno: '',
  });

  const [calculos, setCalculos] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Recalcular quando form muda
  useEffect(() => {
    if (formData.produto_id && formData.moldador_id) {
      const resultado = calcularProducao({
        produto_id: formData.produto_id,
        moldador_id: formData.moldador_id,
        qtde_caixas: parseInt(formData.qtde_caixas) || 0,
        tempo_horas: parseFloat(formData.tempo_horas) || 0,
        perdas_peca: parseInt(formData.perdas_peca) || 0,
        peso_retorno: parseFloat(formData.peso_retorno) || 0,
      });
      setCalculos(resultado);
    }
  }, [formData, calcularProducao]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await criarProducao({
        data: formData.data,
        produto_id: formData.produto_id,
        moldador_id: formData.moldador_id,
        ajudante_id: formData.ajudante_id,
        qtde_caixas: parseInt(formData.qtde_caixas),
        tempo_horas: parseFloat(formData.tempo_horas),
        perdas_peca: parseInt(formData.perdas_peca),
        peso_retorno: parseFloat(formData.peso_retorno),
      });

      setSuccess(true);
      setFormData({
        data: new Date().toISOString().split('T')[0],
        produto_id: '',
        moldador_id: '',
        ajudante_id: '',
        qtde_caixas: '',
        tempo_horas: '',
        perdas_peca: '',
        peso_retorno: '',
      });
      setCalculos(null);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar apontamento');
    } finally {
      setSubmitting(false);
    }
  };

  const moldadores = funcionarios.filter((f) => f.funcao === 'Moldador');
  const ajudantes = funcionarios.filter((f) => f.funcao === 'Ajudante');

  return (
    <Layout title="Apontamento de Produção">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORMULÁRIO */}
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="subsection-title">Novo Apontamento</h3>

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-600 font-medium">✓ Apontamento salvo com sucesso!</p>
              </div>
            )}

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 font-medium">✗ {error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    name="data"
                    value={formData.data}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                </div>

                {/* Produto */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Produto *
                  </label>
                  <select
                    name="produto_id"
                    value={formData.produto_id}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    <option value="">Selecione um produto</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} - {p.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Moldador */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Moldador *
                  </label>
                  <select
                    name="moldador_id"
                    value={formData.moldador_id}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    <option value="">Selecione um moldador</option>
                    {moldadores.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ajudante */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Ajudante *
                  </label>
                  <select
                    name="ajudante_id"
                    value={formData.ajudante_id}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                  >
                    <option value="">Selecione um ajudante</option>
                    {ajudantes.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Caixas */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Caixas Produzidas *
                  </label>
                  <input
                    type="number"
                    name="qtde_caixas"
                    value={formData.qtde_caixas}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="0"
                    required
                  />
                </div>

                {/* Tempo */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Tempo (horas) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    name="tempo_horas"
                    value={formData.tempo_horas}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="0.0"
                    required
                  />
                </div>

                {/* Perdas */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Perdas (peças) *
                  </label>
                  <input
                    type="number"
                    name="perdas_peca"
                    value={formData.perdas_peca}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="0"
                    required
                  />
                </div>

                {/* Peso Retorno */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Peso Retorno (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="peso_retorno"
                    value={formData.peso_retorno}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="0.0"
                    required
                  />
                </div>
              </div>

              {/* Cálculos Automáticos */}
              {calculos && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-semibold text-blue-900 mb-3">📊 Cálculos Automáticos</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-slate-600">Alumínio Bruto</p>
                      <p className="font-bold">{formatarPeso(calculos.aluminio_bruto)}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Consumo Óleo</p>
                      <p className="font-bold">{formatarVolume(calculos.consumo_oleo)}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Custo M.O.</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Custo/Peça</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Custo Total</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Taxa Perda</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Eficiência</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Caixas/Hora</p>
                      <p className="font-bold">{calculos.caixas_por_hora.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting || dataLoading}
                  className="btn-primary py-2 px-6"
                >
                  {submitting ? 'Salvando...' : '💾 Salvar Apontamento'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      data: new Date().toISOString().split('T')[0],
                      produto_id: '',
                      moldador_id: '',
                      ajudante_id: '',
                      qtde_caixas: '',
                      tempo_horas: '',
                      perdas_peca: '',
                      peso_retorno: '',
                    });
                    setCalculos(null);
                  }}
                  className="btn-secondary py-2 px-6"
                >
                  Limpar
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* HISTÓRICO */}
        <div>
          <div className="card">
            <h3 className="subsection-title">Últimas Produções</h3>
            <div className="space-y-3">
              {producoes.slice(0, 5).map((p) => {
                const produto = produtos.find((pr) => pr.id === p.produto_id);
                const moldador = funcionarios.find((f) => f.id === p.moldador_id);
                return (
                  <div
                    key={p.id}
                    className="p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition"
                  >
                    <p className="font-semibold text-sm">{produto?.codigo}</p>
                    <p className="text-xs text-slate-600">{moldador?.nome}</p>
                    <p className="text-xs text-slate-600">
                      {new Date(p.data).toLocaleDateString('pt-BR')}
                    </p>
                    <div className="mt-2 pt-2 border-t flex justify-between">
                      <span
                        className={`badge ${
                          0 < 3 ? 'badge-success' : 'badge-warning'
                        }`}
                      >
                        {(0).toFixed(1)}%
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {formatarMoeda(0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
