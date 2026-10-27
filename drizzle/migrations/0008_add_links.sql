-- =============================================================================
-- 0008_add_links.sql — tabela links, migração de dados, remoção de colunas
-- Aplicar com: npx tsx scripts/migrar.ts
-- Rollback: drizzle/rollbacks/0008_rollback_links.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Criar tabela links
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS links (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_tipo text         NOT NULL CHECK (entidade_tipo IN ('despesa', 'reembolso')),
  entidade_id   uuid         NOT NULL,
  rateio_id     uuid         NOT NULL REFERENCES rateios(id) ON DELETE CASCADE,
  url           text         NOT NULL,
  rotulo        text,
  criado_em     timestamptz  NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. Índices
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS links_entidade_idx ON links (entidade_tipo, entidade_id);
CREATE INDEX IF NOT EXISTS links_rateio_idx   ON links (rateio_id);

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS links_select ON links;
CREATE POLICY links_select ON links FOR SELECT
  USING (rateio_id IN (
    SELECT rateio_id FROM membros WHERE user_id = auth_user_id()::uuid
  ));

DROP POLICY IF EXISTS links_insert ON links;
CREATE POLICY links_insert ON links FOR INSERT
  WITH CHECK (rateio_id IN (
    SELECT rateio_id FROM membros WHERE user_id = auth_user_id()::uuid
  ));

DROP POLICY IF EXISTS links_delete ON links;
CREATE POLICY links_delete ON links FOR DELETE
  USING (rateio_id IN (
    SELECT rateio_id FROM membros WHERE user_id = auth_user_id()::uuid
  ));

-- ---------------------------------------------------------------------------
-- 4. Trigger: cascade delete quando despesa for excluída
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_links_for_despesa()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM links WHERE entidade_tipo = 'despesa' AND entidade_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_links_despesa ON despesas;
CREATE TRIGGER trg_delete_links_despesa
  BEFORE DELETE ON despesas
  FOR EACH ROW EXECUTE FUNCTION delete_links_for_despesa();

-- ---------------------------------------------------------------------------
-- 5. Trigger: cascade delete quando reembolso for excluído
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_links_for_reembolso()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM links WHERE entidade_tipo = 'reembolso' AND entidade_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_links_reembolso ON reembolsos;
CREATE TRIGGER trg_delete_links_reembolso
  BEFORE DELETE ON reembolsos
  FOR EACH ROW EXECUTE FUNCTION delete_links_for_reembolso();

-- ---------------------------------------------------------------------------
-- 6. Migrar dados existentes (boleto_url e comprovante_url → links)
-- ---------------------------------------------------------------------------
INSERT INTO links (entidade_tipo, entidade_id, rateio_id, url, rotulo)
  SELECT 'despesa', id, rateio_id, boleto_url, 'Boleto'
  FROM despesas
  WHERE boleto_url IS NOT NULL;

INSERT INTO links (entidade_tipo, entidade_id, rateio_id, url, rotulo)
  SELECT 'despesa', id, rateio_id, comprovante_url, 'Comprovante'
  FROM despesas
  WHERE comprovante_url IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 7. Remover colunas antigas
-- ---------------------------------------------------------------------------
ALTER TABLE despesas DROP COLUMN IF EXISTS boleto_url;
ALTER TABLE despesas DROP COLUMN IF EXISTS comprovante_url;
