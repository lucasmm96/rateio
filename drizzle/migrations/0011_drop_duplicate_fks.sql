-- =============================================================================
-- 0011_drop_duplicate_fks.sql — remove FKs duplicadas geradas por 0000_lush_thena.sql
--
-- 0000_init.sql cria as tabelas com FKs inline (nomes automáticos como
-- membros_rateio_id_fkey). Como 'i' < 'l', ele roda antes de
-- 0000_lush_thena.sql, que não consegue criar as tabelas (já existem) mas
-- adiciona as constraints nomeadas com ALTER TABLE — duplicando as FKs.
-- PostgREST interpreta múltiplas FKs entre dois mesmos objetos como relações
-- ambíguas e rejeita o embed ("more than one relationship was found").
-- =============================================================================

ALTER TABLE membros    DROP CONSTRAINT IF EXISTS membros_rateio_id_rateios_id_fk;
ALTER TABLE membros    DROP CONSTRAINT IF EXISTS membros_user_id_users_id_fk;
ALTER TABLE rateios    DROP CONSTRAINT IF EXISTS rateios_criado_por_user_id_users_id_fk;
ALTER TABLE despesas   DROP CONSTRAINT IF EXISTS despesas_rateio_id_rateios_id_fk;
ALTER TABLE despesas   DROP CONSTRAINT IF EXISTS despesas_pagador_user_id_users_id_fk;
ALTER TABLE reembolsos DROP CONSTRAINT IF EXISTS reembolsos_rateio_id_rateios_id_fk;
ALTER TABLE reembolsos DROP CONSTRAINT IF EXISTS reembolsos_pagador_user_id_users_id_fk;
ALTER TABLE reembolsos DROP CONSTRAINT IF EXISTS reembolsos_recebedor_user_id_users_id_fk;
