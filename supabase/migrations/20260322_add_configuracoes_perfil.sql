-- ============================================================
-- Sistema de Gestão de Horários Hospitalares
-- Migration: Adicionar tabelas configuracoes e perfil_coordenador
-- Executar no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rijonndemwuxihrzzmru/sql
-- ============================================================

-- Tabela de configurações globais (key-value JSONB)
CREATE TABLE IF NOT EXISTS configuracoes (
  chave text PRIMARY KEY,        -- 'empresa' | 'horarios'
  valor jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- Inserir valores padrão (não sobrescreve se já existirem)
INSERT INTO configuracoes (chave, valor) VALUES
  ('empresa', '{"nome":"Hospital Leiria CHL","departamento":"Imagiologia","telefone":"","email":"","logo":null}'),
  ('horarios', '{"bloquearTurnosConsecutivos":true,"horasDescansMinimas":11,"maxTurnosSemana":5,"maxTurnosNoturnos":2,"alertasConflito":true,"permitirSubstituicoes":false,"maxTurnosMes":22,"maxTurnosNoturnosMes":4}')
ON CONFLICT (chave) DO NOTHING;

-- Perfil do coordenador (1 registo por utilizador autenticado)
CREATE TABLE IF NOT EXISTS perfil_coordenador (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text DEFAULT '',
  telemovel text DEFAULT '',
  numero_mecanografico text DEFAULT '',
  foto text,                     -- base64 da imagem
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfil_coordenador ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'configuracoes' AND policyname = 'allow_all_configuracoes') THEN
    CREATE POLICY allow_all_configuracoes ON configuracoes FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'perfil_coordenador' AND policyname = 'allow_all_perfil') THEN
    CREATE POLICY allow_all_perfil ON perfil_coordenador FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
