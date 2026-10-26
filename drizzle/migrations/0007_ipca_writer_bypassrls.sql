-- =============================================================================
-- 0007_ipca_writer_bypassrls.sql
-- =============================================================================
-- A role ipca_writer tem GRANT restrito (SELECT/INSERT/UPDATE em taxas_ipca
-- apenas). O BYPASSRLS permite que ela escreva sem ser bloqueada pelas
-- policies JWT-based que exigem request.jwt.claims (configurado pelo Neon
-- Data API, ausente em conexões pg diretas).
-- O GRANT continua sendo a camada de segurança efetiva.
-- =============================================================================

ALTER ROLE ipca_writer BYPASSRLS;
