import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { EstoqueAluminio, MovimentacaoEstoque } from '@/lib/types';

interface UseEstoqueReturn {
  estoque: EstoqueAluminio[];
  movimentacoes: MovimentacaoEstoque[];
  loading: boolean;
  error: string | null;
  atualizarEstoque: (tipo: string, quantidade: number) => Promise<void>;
  adicionarMovimentacao: (data: Partial<MovimentacaoEstoque>) => Promise<MovimentacaoEstoque>;
  buscarSaldo: (tipo: string) => number;
}

export function useEstoque(): UseEstoqueReturn {
  const [estoque, setEstoque] = useState<EstoqueAluminio[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: estData, error: estError } = await supabase
        .from('estoque_aluminio')
        .select('*');

      if (estError) throw estError;
      setEstoque(estData || []);

      const { data: movData, error: movError } = await supabase
        .from('movimentacoes_estoque')
        .select('*')
        .order('data', { ascending: false })
        .limit(50);

      if (movError) throw movError;
      setMovimentacoes(movData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estoque');
    } finally {
      setLoading(false);
    }
  };

  const atualizarEstoque = useCallback(async (tipo: string, quantidade: number) => {
    try {
      const { error: err } = await supabase
        .from('estoque_aluminio')
        .update({ saldo: quantidade })
        .eq('tipo', tipo);

      if (err) throw err;
      carregarDados();
    } catch (err) {
      throw err;
    }
  }, []);

  const adicionarMovimentacao = useCallback(
    async (data: Partial<MovimentacaoEstoque>) => {
      try {
        const { data: mov, error: err } = await supabase
          .from('movimentacoes_estoque')
          .insert([data])
          .select()
          .single();

        if (err) throw err;
        setMovimentacoes([mov, ...movimentacoes]);
        carregarDados();
        return mov;
      } catch (err) {
        throw err;
      }
    },
    [movimentacoes]
  );

  const buscarSaldo = useCallback(
    (tipo: string): number => {
      const item = estoque.find((e) => e.tipo === tipo);
      return item?.saldo || 0;
    },
    [estoque]
  );

  return {
    estoque,
    movimentacoes,
    loading,
    error,
    atualizarEstoque,
    adicionarMovimentacao,
    buscarSaldo,
  };
}
