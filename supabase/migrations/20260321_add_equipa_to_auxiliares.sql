-- Migration: Add equipa column to auxiliares table
-- Description: Adds team support for auxiliaries (Equipa 1, Equipa 2, Equipa Transportes)
-- Date: 2026-03-21
-- Author: Sistema de Agentes

-- Step 1: Add column with default value
ALTER TABLE auxiliares
ADD COLUMN equipa VARCHAR(50) DEFAULT 'Equipa 1';

-- Step 2: Add validation constraint
ALTER TABLE auxiliares
ADD CONSTRAINT check_equipa
CHECK (equipa IN ('Equipa 1', 'Equipa 2', 'Equipa Transportes'));

-- Step 3: Create index for performance optimization
CREATE INDEX idx_auxiliares_equipa ON auxiliares(equipa);

-- Step 4: Update existing records to have default value (if needed)
UPDATE auxiliares
SET equipa = 'Equipa 1'
WHERE equipa IS NULL;

-- ========================================
-- ROLLBACK (if needed)
-- ========================================
-- Uncomment and run the following to rollback this migration:
--
-- DROP INDEX idx_auxiliares_equipa;
-- ALTER TABLE auxiliares DROP CONSTRAINT check_equipa;
-- ALTER TABLE auxiliares DROP COLUMN equipa;
