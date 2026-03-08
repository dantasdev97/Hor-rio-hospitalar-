-- ============================================================
-- Sistema de Gestão de Horários Hospitalares
-- Migration: Criar tabelas base
-- Executar no Supabase SQL Editor: https://supabase.com/dashboard/project/rijonndemwuxihrzzmru/sql
-- ============================================================

-- Auxiliares
CREATE TABLE IF NOT EXISTS auxiliares (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  email text,
  numero_mecanografico text,
  contribuinte text,
  disponivel boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Doutores
CREATE TABLE IF NOT EXISTS doutores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  numero_mecanografico text,
  created_at timestamptz DEFAULT now()
);

-- Turnos
CREATE TABLE IF NOT EXISTS turnos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  horario_inicio time NOT NULL,
  horario_fim time NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Doutor Turnos (N:N)
CREATE TABLE IF NOT EXISTS doutor_turnos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  doutor_id uuid REFERENCES doutores(id) ON DELETE CASCADE,
  turno_id uuid REFERENCES turnos(id) ON DELETE CASCADE
);

-- Escalas
CREATE TABLE IF NOT EXISTS escalas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  data date NOT NULL,
  tipo_escala text CHECK (tipo_escala IN ('semanal','mensal')),
  turno_id uuid REFERENCES turnos(id) ON DELETE SET NULL,
  auxiliar_id uuid REFERENCES auxiliares(id) ON DELETE CASCADE,
  status text DEFAULT 'disponivel' CHECK (status IN ('disponivel','alocado','bloqueado'))
);

-- Restricoes
CREATE TABLE IF NOT EXISTS restricoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  auxiliar_id uuid REFERENCES auxiliares(id) ON DELETE CASCADE,
  turno_id uuid REFERENCES turnos(id) ON DELETE CASCADE,
  motivo text,
  data_inicio date,
  data_fim date
);

-- ============================================================
-- Row Level Security (permitir acesso público com anon key)
-- ============================================================

ALTER TABLE auxiliares ENABLE ROW LEVEL SECURITY;
ALTER TABLE doutores ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE doutor_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalas ENABLE ROW LEVEL SECURITY;
ALTER TABLE restricoes ENABLE ROW LEVEL SECURITY;

-- Políticas: acesso total (ajustar conforme necessário para produção)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'auxiliares' AND policyname = 'allow_all_auxiliares') THEN
    CREATE POLICY allow_all_auxiliares ON auxiliares FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'doutores' AND policyname = 'allow_all_doutores') THEN
    CREATE POLICY allow_all_doutores ON doutores FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'turnos' AND policyname = 'allow_all_turnos') THEN
    CREATE POLICY allow_all_turnos ON turnos FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'doutor_turnos' AND policyname = 'allow_all_doutor_turnos') THEN
    CREATE POLICY allow_all_doutor_turnos ON doutor_turnos FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'escalas' AND policyname = 'allow_all_escalas') THEN
    CREATE POLICY allow_all_escalas ON escalas FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'restricoes' AND policyname = 'allow_all_restricoes') THEN
    CREATE POLICY allow_all_restricoes ON restricoes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
