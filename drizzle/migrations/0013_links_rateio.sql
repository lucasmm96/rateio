-- =============================================================================
-- 0013_links_rateio.sql — ampliar CHECK de entidade_tipo para incluir 'rateio'
-- Aplicar com: npx tsx scripts/migrar.ts
-- =============================================================================

ALTER TABLE links DROP CONSTRAINT IF EXISTS links_entidade_tipo_check;
ALTER TABLE links ADD CONSTRAINT links_entidade_tipo_check
  CHECK (entidade_tipo IN ('despesa', 'reembolso', 'rateio'));
