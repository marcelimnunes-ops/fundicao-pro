-- ============================================================
-- CORRIGE trigger cartao_custo → cartao_beneficio em funcionarios
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Remove todos os triggers da tabela funcionarios
DO $$
DECLARE trig RECORD;
BEGIN
  FOR trig IN
    SELECT trigger_name FROM information_schema.triggers
    WHERE event_object_table = 'funcionarios' AND trigger_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.funcionarios CASCADE', trig.trigger_name);
    RAISE NOTICE 'Trigger removido: %', trig.trigger_name;
  END LOOP;
END $$;

-- 2. Remove funções de trigger relacionadas a custo_hora (se existirem)
DO $$
DECLARE fn RECORD;
BEGIN
  FOR fn IN
    SELECT routine_name FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name ILIKE '%custo_hora%'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I() CASCADE', fn.routine_name);
    RAISE NOTICE 'Função removida: %', fn.routine_name;
  END LOOP;
END $$;

-- 3. Remove a coluna custo_hora e recria como GENERATED ALWAYS AS
--    referenciando cartao_beneficio (não cartao_custo)
ALTER TABLE funcionarios DROP COLUMN IF EXISTS custo_hora;

ALTER TABLE funcionarios ADD COLUMN custo_hora DECIMAL(10,4)
  GENERATED ALWAYS AS (
    CASE
      WHEN COALESCE(salario, 0) + COALESCE(cartao_beneficio, 0) > 0
      THEN (COALESCE(salario, 0) + COALESCE(cartao_beneficio, 0)) / 176.0
      ELSE 0
    END
  ) STORED;

-- 4. Garante que cartao_beneficio existe (caso ainda não exista)
ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS cartao_beneficio DECIMAL(10,2) DEFAULT 0;

-- 5. Garante que salario tem DEFAULT 0 (não quebra em null)
ALTER TABLE funcionarios ALTER COLUMN salario SET DEFAULT 0;
UPDATE funcionarios SET salario = 0 WHERE salario IS NULL;
ALTER TABLE funcionarios ALTER COLUMN salario SET NOT NULL;

-- 6. Recarrega cache do PostgREST
NOTIFY pgrst, 'reload schema';

-- Verifica resultado
SELECT column_name, data_type, generation_expression
FROM information_schema.columns
WHERE table_name = 'funcionarios'
ORDER BY ordinal_position;
