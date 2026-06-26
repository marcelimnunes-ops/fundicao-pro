import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Producao, Funcionario, Produto, EstoqueAluminio, ConfigSistema } from '@/lib/types';
import * as calculations from '@/lib/calculations';

interface UseProducaoReturn {
  producoes: Producao[];
  loading: boolean;
  error: string | null;
  funcionarios: Funcionario[];
  produtos: Produto[];
  estoque: EstoqueAluminio[];
  parametros: Record<string, number>;
  criarProducao: (data: Partial<Producao>) => Promise<Producao>;
  atualizarProducao: (id: string, data: Partial<Producao>) => Promise<Producao>;
  deletarProducao: (id: string) => Promise<void>;
  buscarProducoesPorData: (data: string) => Promise<Producao[]>;
  calcularProducao: (data: any) => any;
}

export function useProducao(): UseProducaoReturn {
  const [producoes, setProducoes] = useState<Producao[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [estoque, setEstoque] = useState<EstoqueAluminio[]>([]);
  const [parametros, setParametros] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    setError(null);
    try {
      // Carregar funcionários
      const { data: funcs, error: funcError } = await supabase
        .from('funcionarios')
        .select('*');
      if (funcError) throw funcError;
      setFuncionarios(funcs || []);

      // Carregar produtos
      const { data: prods, error: prodError } = await supabase
        .from('produtos')
        .select('*');
      if (prodError) throw prodError;
      setProdutos(prods || []);

      // Carregar estoque
      const { data: est, error: estError } = await supabase
        .from('estoque_aluminio')
        .select('*');
      if (estError) throw estError;
      setEstoque(est || []);

      // Carregar parâmetros
      const { data: params, error: paramError } = await supabase
        .from('config_sistema')
        .select('*');
      if (paramError) throw paramError;
      
      const paramsMap: Record<string, number> = {};
      params?.forEach((p: ConfigSistema) => {
        paramsMap[p.chave] = parseFloat(p.valor);
      });
      setParametros(paramsMap);

      // Carregar produções
      const { data: prod, error: prodError2 } = await supabase
        .from('producao')
        .select('*')
        .order('data', { ascending: false })
        .limit(100);
      if (prodError2) throw prodError2;
      setProducoes(prod || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const criarProducao = useCallback(async (data: Partial<Producao>) => {
    try {
      // Buscar dados necessários para cálculo
      const produto = produtos.find(p => p.id === data.produto_id);
      const moldador = funcionarios.find(f => f.id === data.moldador_id);
      const estoqueAluminio = estoque.find(e => e.tipo === 'Lingote');

      if (!produto || !moldador || !estoqueAluminio) {
        throw new Error('Dados incompletos para cálculo');
      }

      // Calcular valores
      const calculosData = {
        qtde_caixas: data.qtde_caixas || 0,
        tempo_horas: data.tempo_horas || 0,
        perdas_peca: data.perdas_peca || 0,
        peso_retorno: data.peso_retorno || 0,
        custo_medio_aluminio: estoqueAluminio.custo_medio,
      };

      const calculos = calculations.calcularApontamentoCompleto(
        {
          peso_peca: produto.peso_peca,
          peso_galho: produto.peso_galho,
          qtd_pecas_placa: produto.qtd_pecas_placa,
          preco_venda: produto.preco_venda || 0,
        },
        {
          salario: moldador.salario,
          vale: moldador.vale,
          cartao_custo: moldador.cartao_custo,
        },
        calculosData,
        parametros as any
      );

      const { data: producao, error } = await supabase
        .from('producao')
        .insert({
          ...data,
          ...calculos,
        })
        .select()
        .single();

      if (error) throw error;
      
      setProducoes([producao, ...producoes]);
      return producao;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar produção');
      throw err;
    }
  }, [produtos, funcionarios, estoque, parametros, producoes]);

  const atualizarProducao = useCallback(async (id: string, data: Partial<Producao>) => {
    try {
      const { data: producao, error } = await supabase
        .from('producao')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setProducoes(producoes.map(p => p.id === id ? producao : p));
      return producao;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar produção');
      throw err;
    }
  }, [producoes]);

  const deletarProducao = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('producao')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setProducoes(producoes.filter(p => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar produção');
      throw err;
    }
  }, [producoes]);

  const buscarProducoesPorData = useCallback(async (data: string) => {
    try {
      const { data: prod, error } = await supabase
        .from('producao')
        .select('*')
        .eq('data', data);

      if (error) throw error;
      return prod || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar produções');
      throw err;
    }
  }, []);

  const calcularProducao = useCallback((data: any) => {
    const produto = produtos.find(p => p.id === data.produto_id);
    const moldador = funcionarios.find(f => f.id === data.moldador_id);
    const estoqueAluminio = estoque.find(e => e.tipo === 'Lingote');

    if (!produto || !moldador || !estoqueAluminio) {
      return null;
    }

    return calculations.calcularApontamentoCompleto(
      {
        peso_peca: produto.peso_peca,
        peso_galho: produto.peso_galho,
        qtd_pecas_placa: produto.qtd_pecas_placa,
        preco_venda: produto.preco_venda || 0,
      },
      {
        salario: moldador.salario,
        vale: moldador.vale,
        cartao_custo: moldador.cartao_custo,
      },
      {
        qtde_caixas: data.qtde_caixas || 0,
        tempo_horas: data.tempo_horas || 0,
        perdas_peca: data.perdas_peca || 0,
        peso_retorno: data.peso_retorno || 0,
        custo_medio_aluminio: estoqueAluminio.custo_medio,
      },
      parametros as any
    );
  }, [produtos, funcionarios, estoque, parametros]);

  return {
    producoes,
    loading,
    error,
    funcionarios,
    produtos,
    estoque,
    parametros,
    criarProducao,
    atualizarProducao,
    deletarProducao,
    buscarProducoesPorData,
    calcularProducao,
  };
}
