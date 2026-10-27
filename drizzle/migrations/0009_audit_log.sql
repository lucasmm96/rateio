-- =============================================================================
-- 0009_audit_log.sql — tabela audit_log, RLS e RPCs editar_despesa/editar_reembolso
-- Aplicar com: npx tsx scripts/migrar.ts
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabela audit_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade    text        NOT NULL CHECK (entidade IN ('despesa', 'reembolso')),
  entidade_id uuid        NOT NULL,
  rateio_id   uuid        NOT NULL REFERENCES rateios(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES users(id),
  acao        text        NOT NULL DEFAULT 'update' CHECK (acao IN ('update', 'delete')),
  diff_json   jsonb       NOT NULL,
  criado_em   timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. Índices
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS audit_log_entidade_idx  ON audit_log (entidade, entidade_id);
CREATE INDEX IF NOT EXISTS audit_log_rateio_idx    ON audit_log (rateio_id);
CREATE INDEX IF NOT EXISTS audit_log_criado_em_idx ON audit_log (criado_em DESC);

-- ---------------------------------------------------------------------------
-- 3. RLS — leitura via membros; inserção exclusiva via RPCs SECURITY DEFINER
-- ---------------------------------------------------------------------------
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_select ON audit_log;
CREATE POLICY audit_log_select ON audit_log FOR SELECT
  USING (rateio_id IN (
    SELECT rateio_id FROM membros WHERE user_id = auth_user_id()::uuid
  ));

-- ---------------------------------------------------------------------------
-- 4. RPC editar_despesa
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.editar_despesa(
  p_id          uuid,
  p_data        date,
  p_descricao   text,
  p_pagador_id  uuid,
  p_valor       numeric(14,2)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid  := auth_user_id()::uuid;
  v_row    despesas%ROWTYPE;
  v_diff   jsonb := '{}'::jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;

  IF p_valor <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  SELECT * INTO v_row FROM despesas WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Despesa não encontrada ou acesso negado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM membros WHERE rateio_id = v_row.rateio_id AND user_id = v_caller
  ) THEN
    RAISE EXCEPTION 'Despesa não encontrada ou acesso negado';
  END IF;

  -- Constrói diff apenas com campos alterados
  IF v_row.data IS DISTINCT FROM p_data THEN
    v_diff := v_diff || jsonb_build_object('data',
      jsonb_build_object('de', v_row.data::text, 'para', p_data::text));
  END IF;
  IF v_row.descricao IS DISTINCT FROM p_descricao THEN
    v_diff := v_diff || jsonb_build_object('descricao',
      jsonb_build_object('de', v_row.descricao, 'para', p_descricao));
  END IF;
  IF v_row.pagador_user_id IS DISTINCT FROM p_pagador_id THEN
    v_diff := v_diff || jsonb_build_object('pagador_user_id',
      jsonb_build_object('de', v_row.pagador_user_id::text, 'para', p_pagador_id::text));
  END IF;
  IF v_row.valor IS DISTINCT FROM p_valor THEN
    v_diff := v_diff || jsonb_build_object('valor',
      jsonb_build_object('de', v_row.valor::text, 'para', p_valor::text));
  END IF;

  UPDATE despesas
  SET data            = p_data,
      descricao       = p_descricao,
      pagador_user_id = p_pagador_id,
      valor           = p_valor
  WHERE id = p_id;

  IF v_diff <> '{}'::jsonb THEN
    INSERT INTO audit_log (entidade, entidade_id, rateio_id, user_id, acao, diff_json)
    VALUES ('despesa', p_id, v_row.rateio_id, v_caller, 'update', v_diff);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.editar_despesa(uuid, date, text, uuid, numeric) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. RPC editar_reembolso
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.editar_reembolso(
  p_id            uuid,
  p_data          date,
  p_pagador_id    uuid,
  p_recebedor_id  uuid,
  p_valor         numeric(14,2),
  p_observacao    text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid       := auth_user_id()::uuid;
  v_row    reembolsos%ROWTYPE;
  v_diff   jsonb      := '{}'::jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'não autenticado';
  END IF;

  IF p_valor <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  IF p_pagador_id = p_recebedor_id THEN
    RAISE EXCEPTION 'Pagador e recebedor não podem ser o mesmo usuário';
  END IF;

  SELECT * INTO v_row FROM reembolsos WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reembolso não encontrado ou acesso negado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM membros WHERE rateio_id = v_row.rateio_id AND user_id = v_caller
  ) THEN
    RAISE EXCEPTION 'Reembolso não encontrado ou acesso negado';
  END IF;

  -- Constrói diff apenas com campos alterados
  IF v_row.data IS DISTINCT FROM p_data THEN
    v_diff := v_diff || jsonb_build_object('data',
      jsonb_build_object('de', v_row.data::text, 'para', p_data::text));
  END IF;
  IF v_row.pagador_user_id IS DISTINCT FROM p_pagador_id THEN
    v_diff := v_diff || jsonb_build_object('pagador_user_id',
      jsonb_build_object('de', v_row.pagador_user_id::text, 'para', p_pagador_id::text));
  END IF;
  IF v_row.recebedor_user_id IS DISTINCT FROM p_recebedor_id THEN
    v_diff := v_diff || jsonb_build_object('recebedor_user_id',
      jsonb_build_object('de', v_row.recebedor_user_id::text, 'para', p_recebedor_id::text));
  END IF;
  IF v_row.valor IS DISTINCT FROM p_valor THEN
    v_diff := v_diff || jsonb_build_object('valor',
      jsonb_build_object('de', v_row.valor::text, 'para', p_valor::text));
  END IF;
  IF v_row.observacao IS DISTINCT FROM p_observacao THEN
    v_diff := v_diff || jsonb_build_object('observacao',
      jsonb_build_object('de', v_row.observacao, 'para', p_observacao));
  END IF;

  UPDATE reembolsos
  SET data              = p_data,
      pagador_user_id   = p_pagador_id,
      recebedor_user_id = p_recebedor_id,
      valor             = p_valor,
      observacao        = p_observacao
  WHERE id = p_id;

  IF v_diff <> '{}'::jsonb THEN
    INSERT INTO audit_log (entidade, entidade_id, rateio_id, user_id, acao, diff_json)
    VALUES ('reembolso', p_id, v_row.rateio_id, v_caller, 'update', v_diff);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.editar_reembolso(uuid, date, uuid, uuid, numeric, text) TO authenticated;
