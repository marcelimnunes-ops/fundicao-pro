import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import type { ConfigSistema } from '@/lib/types';
import { Card } from '@/components/ui';

const CONFIG_DESCRICOES: Record<string, string> = {
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

export default function ConfiguracoesPage() {
  const [configs, setConfigs] = useState<ConfigSistema[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    carregarConfigs();
  }, []);

  const carregarConfigs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('config_sistema').select('*');
      if (error) throw error;
      setConfigs((data as ConfigSistema[]) || []);
    } catch {
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (chave: string, valor: string) => {
    setSaving(true);
    try {
      await supabase.from('config_sistema').update({ valor }).eq('chave', chave);
      setConfigs((prev) => prev.map((c) => (c.chave === chave ? { ...c, valor } : c)));
      setEditingKey(null);
      setEditingValue('');
    } catch {
      // silently fail
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

  const configsFiltradas = configs.filter((c) => CONFIG_DESCRICOES[c.chave]);

  return (
    <Layout title="Configurações do Sistema">
      <div className="max-w-2xl space-y-6">
        <Card
          title="Parâmetros do Sistema"
          subtitle="Ajuste os parâmetros que afetam os cálculos do sistema."
        >
          {configsFiltradas.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">
              Nenhum parâmetro encontrado. A tabela config_sistema pode não existir.
            </p>
          ) : (
            <div className="space-y-4">
              {configsFiltradas.map((c) => (
                <div key={c.chave} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-900">{c.chave}</p>
                      <p className="text-xs text-slate-600 mt-1">{CONFIG_DESCRICOES[c.chave]}</p>
                    </div>
                    {editingKey === c.chave ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          step="0.01"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="form-input w-24"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSave(c.chave, editingValue)}
                          disabled={saving}
                          className="btn-primary py-1 px-3 text-sm"
                        >
                          {saving ? '...' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => setEditingKey(null)}
                          className="btn-secondary py-1 px-3 text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3 items-center">
                        <span className="font-bold text-lg">{c.valor}</span>
                        <button
                          onClick={() => {
                            setEditingKey(c.chave);
                            setEditingValue(c.valor);
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
          )}

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm font-semibold mb-1">Atenção</p>
            <p className="text-yellow-700 text-sm">
              Alterações nesses parâmetros afetarão todos os cálculos futuros.
            </p>
          </div>
        </Card>

        <Card title="Informações do Sistema">
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
        </Card>
      </div>
    </Layout>
  );
}
