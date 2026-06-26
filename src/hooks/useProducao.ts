import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Producao, Funcionario, Produto } from '@/lib/types';

interface UseProducaoReturn {
  producoes: Producao[];
  loading: boolean;
  error: string | null;
  funcionarios: Funcionario[];
  produtos: Produto[];
  criarProducao: (data: Omit<Producao, 'id' | 'produto' | 'moldador'>) => Promise<Producao>;
  deletarProducao: (id: string) => Promise<void>;
}

export function useProducao(): UseProducaoReturn {
  const [producoes, setProducoes] = useState<Producao[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    setError(null);
    try {
      const [funcsRes, prodsRes, prodRes] = await Promise.all([
        supabase.from('funcionarios').select('*').order('nome'),
        supabase.from('produtos').select('*').order('codigo'),
        supabase.from('producao').select('*').order('data', { ascending: false }).limit(200),
      ]);

      if (funcsRes.error) throw funcsRes.error;
      if (prodsRes.error) throw prodsRes.error;
      if (prodRes.error) throw prodRes.error;

      setFuncionarios((funcsRes.data as Funcionario[]) || []);
      setProdutos((prodsRes.data as Produto[]) || []);
      setProducoes((prodRes.data as Producao[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const criarProducao = useCallback(async (data: Omit<Producao, 'id' | 'produto' | 'moldador'>) => {
    try {
      const { data: producao, error: err } = await supabase
        .from('producao')
        .insert([data])
        .select()
        .single();

      if (err) throw err;
      setProducoes((prev) => [producao as Producao, ...prev]);
      return producao as Producao;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar produção';
      setError(msg);
      throw err;
    }
  }, []);

  const deletarProducao = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase.from('producao').delete().eq('id', id);
      if (err) throw err;
      setProducoes((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao deletar produção';
      setError(msg);
      throw err;
    }
  }, []);

  return { producoes, loading, error, funcionarios, produtos, criarProducao, deletarProducao };
}
