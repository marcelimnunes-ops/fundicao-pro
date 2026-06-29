import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface Config {
  HORAS_UTEIS_MES: number;
  ENCARGOS_TRABALHISTAS: number;
  MARKUP_CUSTO: number;
  MARGEM_ALUMINIO: number;
  APROVEIT_RETORNO: number;
  RENDIMENTO_LINGOTE: number;
  RENDIMENTO_SUCATA: number;
  CUSTO_KG_LINGOTE: number;
  CUSTO_KG_SUCATA: number;
  CUSTO_LITRO_OLEO: number;
  CUSTO_MACHO_KG: number;
}

const DEFAULTS: Config = {
  HORAS_UTEIS_MES: 176,
  ENCARGOS_TRABALHISTAS: 1.45,
  MARKUP_CUSTO: 1.30,
  MARGEM_ALUMINIO: 1.055,
  APROVEIT_RETORNO: 0.90,
  RENDIMENTO_LINGOTE: 97,
  RENDIMENTO_SUCATA: 93,
  CUSTO_KG_LINGOTE: 17.60,
  CUSTO_KG_SUCATA: 15.60,
  CUSTO_LITRO_OLEO: 2.50,
  CUSTO_MACHO_KG: 1.55,
};

export function useConfig() {
  const [config, setConfig] = useState<Config>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('config_sistema').select('chave, valor').then(({ data }) => {
      if (!data) { setLoading(false); return; }
      const merged: Config = { ...DEFAULTS };
      data.forEach((row: { chave: string; valor: string }) => {
        if (row.chave in merged) {
          (merged as unknown as Record<string, number>)[row.chave] = parseFloat(row.valor) || 0;
        }
      });
      setConfig(merged);
      setLoading(false);
    });
  }, []);

  // custo/hora de um funcionário levando em conta encargos trabalhistas
  const custoHora = (salario: number, cartao: number) =>
    (salario * config.ENCARGOS_TRABALHISTAS + cartao) / config.HORAS_UTEIS_MES;

  return { config, loading, custoHora };
}
