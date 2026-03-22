-- ============================================================
-- Migration: Corrigir politicas RLS — restringir a utilizadores autenticados
-- Executar no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rijonndemwuxihrzzmru/sql
-- ============================================================

-- ── Remover politicas abertas (allow_all) ─────────────────────

DROP POLICY IF EXISTS allow_all_auxiliares ON auxiliares;
DROP POLICY IF EXISTS allow_all_doutores ON doutores;
DROP POLICY IF EXISTS allow_all_turnos ON turnos;
DROP POLICY IF EXISTS allow_all_doutor_turnos ON doutor_turnos;
DROP POLICY IF EXISTS allow_all_escalas ON escalas;
DROP POLICY IF EXISTS allow_all_restricoes ON restricoes;
DROP POLICY IF EXISTS allow_all_configuracoes ON configuracoes;
DROP POLICY IF EXISTS allow_all_perfil ON perfil_coordenador;

-- ── Tabelas partilhadas: acesso total para utilizadores autenticados ──
-- (Apenas utilizadores com sessao activa podem ler/escrever)

CREATE POLICY auth_auxiliares ON auxiliares
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY auth_doutores ON doutores
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY auth_turnos ON turnos
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY auth_doutor_turnos ON doutor_turnos
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY auth_escalas ON escalas
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY auth_restricoes ON restricoes
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── Configuracoes: leitura para autenticados, escrita para autenticados ──

CREATE POLICY auth_configuracoes ON configuracoes
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── Perfil do coordenador: cada utilizador so acede ao proprio perfil ──

CREATE POLICY perfil_own_user ON perfil_coordenador
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
