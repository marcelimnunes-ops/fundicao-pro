import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Type para usuário
export interface User {
  id: string;
  email: string;
  user_metadata?: {
    nome?: string;
  };
}

// Função para fazer login
export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// Função para fazer logout
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Função para obter usuário atual
export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user as User || null;
}

// Função para registrar novo usuário
export async function signup(email: string, password: string, nome: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nome,
      },
    },
  });

  if (error) throw error;
  return data;
}
