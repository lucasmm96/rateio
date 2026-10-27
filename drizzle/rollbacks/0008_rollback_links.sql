-- =============================================================================
-- 0008_rollback_links.sql — ROLLBACK EMERGENCIAL
-- AVISO: Perde links além dos dois primeiros por despesa (Boleto/Comprovante)
--        e todos os links de reembolsos.
-- Aplicar manualmente via: psql $DATABASE_URL -f este-arquivo
-- NÃO é uma migration Drizzle — não rodar via db:migrate.
-- =============================================================================

-- 1. Recriar colunas
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS boleto_url      text;
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS comprovante_url text;

-- 2. Restaurar dados (primeiro link de cada tipo por despesa)
UPDATE despesas d SET boleto_url = (
  SELECT url FROM links
  WHERE entidade_tipo = 'despesa' AND entidade_id = d.id AND rotulo = 'Boleto'
  ORDER BY criado_em LIMIT 1
);

UPDATE despesas d SET comprovante_url = (
  SELECT url FROM links
  WHERE entidade_tipo = 'despesa' AND entidade_id = d.id AND rotulo = 'Comprovante'
  ORDER BY criado_em LIMIT 1
);

-- 3. Remover triggers
DROP TRIGGER IF EXISTS trg_delete_links_despesa   ON despesas;
DROP TRIGGER IF EXISTS trg_delete_links_reembolso ON reembolsos;
DROP FUNCTION IF EXISTS delete_links_for_despesa();
DROP FUNCTION IF EXISTS delete_links_for_reembolso();

-- 4. Remover tabela
DROP TABLE IF EXISTS links;
