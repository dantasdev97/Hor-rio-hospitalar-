-- ============================================================
-- Migration: Tabela escalas_semanais + campo especial em escalas
-- ============================================================

-- Nova tabela para escala semanal (secoes/departamentos x N/M/T x dia)
CREATE TABLE IF NOT EXISTS escalas_semanais (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  data date NOT NULL,
  turno_tipo text NOT NULL CHECK (turno_tipo IN ('N', 'M', 'T')),
  secao text NOT NULL,
  auxiliar_id uuid REFERENCES auxiliares(id) ON DELETE SET NULL,
  especial text CHECK (especial IS NULL OR especial IN ('folga', 'ferias', 'descanso', 'licenca')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (data, turno_tipo, secao)
);

ALTER TABLE escalas_semanais ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'escalas_semanais' AND policyname = 'allow_all_escalas_semanais') THEN
    CREATE POLICY allow_all_escalas_semanais ON escalas_semanais FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Adicionar campo especial à tabela escalas (para escala mensal)
ALTER TABLE escalas ADD COLUMN IF NOT EXISTS especial text
  CHECK (especial IS NULL OR especial IN ('folga', 'ferias', 'descanso', 'licenca'));
