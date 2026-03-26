-- ============================================================
-- Sistema de Gestão de Horários Hospitalares
-- Migration: Criar tabela trocas_log para histórico de trocas
-- Executar no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rijonndemwuxihrzzmru/sql
-- ============================================================

CREATE TABLE IF NOT EXISTS trocas_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  tipo_escala text NOT NULL CHECK (tipo_escala IN ('semanal','mensal')),
  source_aux_id uuid NOT NULL REFERENCES auxiliares(id),
  target_aux_id uuid NOT NULL REFERENCES auxiliares(id),
  source_data text NOT NULL,
  target_data text NOT NULL,
  source_turno_info jsonb NOT NULL DEFAULT '{}',
  target_turno_info jsonb NOT NULL DEFAULT '{}',
  revertido boolean NOT NULL DEFAULT false,
  revertido_at timestamptz,
  apagado boolean NOT NULL DEFAULT false
);

-- RLS
ALTER TABLE trocas_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trocas_log' AND policyname = 'allow_all_trocas_log') THEN
    CREATE POLICY allow_all_trocas_log ON trocas_log FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
