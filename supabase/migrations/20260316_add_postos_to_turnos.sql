-- ============================================================
-- Migration: Adicionar coluna postos (array) à tabela turnos
-- Permite ligar cada turno a um ou mais postos de trabalho
-- para preenchimento automático da escala semanal.
-- Executar no Supabase SQL Editor: https://supabase.com/dashboard/project/rijonndemwuxihrzzmru/sql
-- ============================================================

ALTER TABLE turnos ADD COLUMN IF NOT EXISTS postos text[] DEFAULT '{}';
