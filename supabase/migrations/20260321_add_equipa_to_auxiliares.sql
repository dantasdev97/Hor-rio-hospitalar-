-- Adiciona coluna equipa à tabela auxiliares
-- Valores permitidos: 'Equipa 1', 'Equipa 2', 'Equipa Transportes'
ALTER TABLE auxiliares
ADD COLUMN IF NOT EXISTS equipa text
  CHECK (equipa IN ('Equipa 1', 'Equipa 2', 'Equipa Transportes'));
