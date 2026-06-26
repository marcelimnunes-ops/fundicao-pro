import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Cliente } from '@/lib/types';

interface UseClientesReturn {
  clientes: Cliente[];
  loading: boolean;
  error: string | null;
  criarCliente: (data: Partial<Cliente>) => Promise<Cliente>;
  atualizarCliente: (id: string, data: Partial<Cliente>) => Promise<Cliente>;
  deletarCliente: (id: string) => Promise<void>;
  buscarCliente: (id: string) => Promise<Cliente | null>;
}

export function useClientes(): UseClientesReturn {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarClientes();
  }, []);

  const carregarClientes = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('clientes')
        .select('*')
        .order('nome', { ascending: true });

      if (err) throw err;
      setClientes(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const criarCliente = useCallback(async (data: Partial<Cliente>) => {
    try {
      const { data: cliente, error: err } = await supabase
        .from('clientes')
        .insert([data])
        .select()
        .single();

      if (err) throw err;
      setClientes([...clientes, cliente]);
      return cliente;
    } catch (err) {
      throw err;
    }
  }, [clientes]);

  const atualizarCliente = useCallback(async (id: string, data: Partial<Cliente>) => {
    try {
      const { data: cliente, error: err } = await supabase
        .from('clientes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (err) throw err;
      setClientes(clientes.map((c) => (c.id === id ? cliente : c)));
      return cliente;
    } catch (err) {
      throw err;
    }
  }, [clientes]);

  const deletarCliente = useCallback(async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (err) throw err;
      setClientes(clientes.filter((c) => c.id !== id));
    } catch (err) {
      throw err;
    }
  }, [clientes]);

  const buscarCliente = useCallback(async (id: string) => {
    try {
      const { data, error: err } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();

      if (err) throw err;
      return data;
    } catch (err) {
      return null;
    }
  }, []);

  return {
    clientes,
    loading,
    error,
    criarCliente,
    atualizarCliente,
    deletarCliente,
    buscarCliente,
  };
}
