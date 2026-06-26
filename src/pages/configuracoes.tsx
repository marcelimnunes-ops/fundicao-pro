import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui';

interface ConfigRow {
  id: string;
  chave: string;
  valor: string;
  tipo: string;
  descricao?: string;
}

const GRUPOS: { titulo: string; chaves: string[] }[] = [
  {
    titulo: 'Jornada de Trabalho',
    chaves: ['HORAS_UTEIS_MES', 'DIAS_UTEIS_MES', 'HORAS_DIA_PADRAO'],
  },
  {
    titulo: 'Custos de Materiais',
    chaves: ['CUSTO_KG_LINGOTE', 'CUSTO_KG_SUCATA', 'CUSTO_LITRO_OLEO', 'CUSTO_MACHO_KG'],
  },
  {
    titulo: 'Parâmetros de Fusão',
    chaves: [
      'CAPACIDADE_FORNO_KG', 'OLEO_POR_FORNADA_L', 'KG_ALUM_POR_LITRO_OLEO',
      'RENDIMENTO_LINGOTE', 'RENDIMENTO_SUCATA', 'MARGEM_ALUMINIO', 'APROVEIT_RETORNO',
    ],
  },
  {
    titulo: 'Precificação',
    chaves: ['ENCARGOS_TRABALHISTAS', 'MARKUP_CUSTO'],
  },
  {
    titulo: 'Estoque Mínimo',
    chaves: ['ESTOQUE_MIN_LINGOTE', 'ESTOQUE_MIN_SUCATA'],
  },
  {
    titulo: 'Empresa',
    chaves: ['EMPRESA_NOME', 'EMPRESA_CNPJ'],
  },
];

export default function ConfiguracoesPage() {
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => { carregar(); }, []);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('config_sistema').select('*').order('chave');
    if (error) setErro(`Erro: ${error.message}`);
    setConfigs((data as ConfigRow[]) ?? []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!editingKey) return;
    setSaving(true);
    const { error } = await supabase
      .from('config_sistema')
      .update({ valor: editingValue })
      .eq('chave', editingKey);
    if (error) {
      setErro(`Erro ao salvar: ${error.message}`);
    } else {
      setConfigs((prev) => prev.map((c) => c.chave === editingKey ? { ...c, valor: editingValue } : c));
      setEditingKey(null);
    }
    setSaving(false);
  };

  const getConfig = (chave: string) => configs.find((c) => c.chave === chave);

  if (loading) {
    return (
      <Layout title="Configurações">
        <div className="text-center py-12"><div className="spinner w-12 h-12 mx-auto mb-4"></div></div>
      </Layout>
    );
  }

  return (
    <Layout title="Configurações do Sistema">
      <div className="max-w-3xl space-y-6">
        {erro && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{erro}</div>
        )}

        {configs.length === 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
            Tabela config_sistema vazia. Execute o arquivo <strong>supabase-config-reset.sql</strong> no Supabase SQL Editor.
          </div>
        )}

        {GRUPOS.map((grupo) => {
          const linhas = grupo.chaves.map(getConfig).filter(Boolean) as ConfigRow[];
          if (linhas.length === 0) return null;
          return (
            <Card key={grupo.titulo} title={grupo.titulo}>
              <div className="divide-y">
                {linhas.map((c) => (
                  <div key={c.chave} className="py-3 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{c.chave}</p>
                      {c.descricao && <p className="text-xs text-slate-500 mt-0.5">{c.descricao}</p>}
                    </div>
                    {editingKey === c.chave ? (
                      <div className="flex gap-2 items-center shrink-0">
                        <input
                          type={c.tipo === 'number' ? 'number' : 'text'}
                          step="any"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          className="form-input w-32"
                          autoFocus
                        />
                        <button className="btn-primary py-1 px-3 text-sm" onClick={handleSave} disabled={saving}>
                          {saving ? '...' : 'Salvar'}
                        </button>
                        <button className="btn-secondary py-1 px-3 text-sm" onClick={() => setEditingKey(null)}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold text-slate-900">{c.valor}</span>
                        <button
                          className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                          onClick={() => { setEditingKey(c.chave); setEditingValue(c.valor); }}
                        >
                          Editar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}

        <Card title="Informações do Sistema">
          <div className="space-y-0 text-sm divide-y">
            {[
              ['Versão', '1.0.0'],
              ['Banco de Dados', 'Supabase PostgreSQL'],
              ['Framework', 'Next.js 14 + React 18'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2">
                <span className="text-slate-600">{k}</span>
                <span className="font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm font-semibold mb-1">Atenção</p>
          <p className="text-yellow-700 text-sm">
            Alterações nos parâmetros afetarão todos os cálculos futuros.
          </p>
        </div>
      </div>
    </Layout>
  );
}
