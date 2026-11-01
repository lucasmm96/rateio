-- =============================================================================
-- 0012_drop_remaining_duplicate_fks.sql — remove FKs duplicadas em audit_log e links
--
-- 0011 cobriu membros, rateios, despesas e reembolsos. audit_log e links
-- foram criados DEPOIS de 0000_init.sql (em 0009 e 0008 respectivamente),
-- mas 0000_lush_thena.sql adicionou constraints nomeados extras quando
-- executado após essas migrations, gerando o mesmo problema de duplicata.
-- =============================================================================

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_rateio_id_rateios_id_fk;
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_user_id_users_id_fk;
ALTER TABLE links     DROP CONSTRAINT IF EXISTS links_rateio_id_rateios_id_fk;
