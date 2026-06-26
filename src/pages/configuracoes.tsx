import Layout from '@/components/Layout';
import { useProducao } from '@/hooks/useProducao';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ConfiguracoesPage() {
  const { parametros, loading } = useProducao();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [saving, setSaving] = useState(false);

  const configDescricoes: Record<string, string> = {
    ENCARGOS_TRABALHISTAS: 'Multiplicador de encargos (ex: 1.45 = 45%)',
    HORAS_UTEIS_MES: 'Horas úteis trabalhadas por mês',
    MARKUP_CUSTO: 'Markup aplicado ao custo total',
    MARGEM_ALUMINIO: 'Margem de alumínio bruto (ex: 1.055)',
    APROVEIT_RETORNO: 'Aproveitamento de retorno (ex: 0.90 = 90%)',
    RENDIMENTO_LINGOTE: 'Rendimento do lingote (%)',
    RENDIMENTO_SUCATA: 'Rendimento da sucata (%)',
    OLEO_POR_KG: 'Consumo de óleo por kg de alumínio',
    CUSTO_OLEO_LITRO: 'Custo do óleo por litro',
    ESTOQUE_MIN_LINGOTE: 'Estoque mínimo de lingote (kg)',
    ESTOQUE_MIN_SUCATA: 'Estoque mínimo de sucata (kg)',
  };

  const handleSave = async (key: string, value: string) => {
    setSaving(true);
    try {
      await supabase
        .from('config_sistema')
        .update({ valor: value })
        .eq('chave', key);

      setEditingKey(null);
      setEditingValue('');
      // Trigger refresh aqui se houver função
    } catch (err) {
      console.error('Erro ao salvar configuração:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Configurações">
        <div className="text-center py-12">
          <div className="spinner w-12 h-12 mx-auto mb-4"></div>
          <p>Carregando configurações...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Configurações do Sistema">
      <div className="max-w-2xl">
        <div className="card">
          <h3 className="subsection-title">Parâmetros do Sistema</h3>
          <p className="text-sm text-slate-600 mb-6">
            Aqui você pode ajustar os parâmetros que afetam os cálculos do sistema.
          </p>

          <div className="space-y-4">
            {Object.entries(parametros)
              .filter(([key]) => configDescricoes[key])
              .map(([key, value]) => (
                <div key={key} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">{key}</p>
                      <p className="text-xs text-slate-600 mt-1">{configDescricoes[key]}</p>
                    </div>
                    {editingKey === key ? (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="form-input w-24"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSave(key, editingValue)}
                          disabled={saving}
                          className="btn-primary py-1 px-3 text-sm"
                        >
                          {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => setEditingKey(null)}
                          className="btn-secondary py-1 px-3 text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 items-center">
                        <span className="font-bold text-lg">{value}</span>
                        <button
                          onClick={() => {
                            setEditingKey(key);
                            setEditingValue(String(value));
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                        >
                          Editar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>

          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm font-semibold mb-2">⚠️ Atenção</p>
            <p className="text-yellow-700 text-sm">
              Alterações nesses parâmetros afetarão todos os cálculos futuros. Certifique-se de que os valores
              estão corretos antes de fazer mudanças.
            </p>
          </div>
        </div>

        {/* Info do Sistema */}
        <div className="card mt-6">
          <h3 className="subsection-title">Informações do Sistema</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-slate-600">Versão</span>
              <span className="font-semibold">1.0.0</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-slate-600">Banco de Dados</span>
              <span className="font-semibold">Supabase PostgreSQL</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-600">Framework</span>
              <span className="font-semibold">Next.js 14 + React 18</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
