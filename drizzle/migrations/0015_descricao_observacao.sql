-- =============================================================================
-- 0015_descricao_observacao.sql — Despesa e Reembolso passam a ter Descrição e Observação
--   despesas.observacao  -> coluna nova, opcional
--   reembolsos.descricao -> coluna nova, obrigatória (linhas existentes recebem 'temp')
--   RPCs editar_despesa / editar_reembolso passam a gravar os campos novos
--
-- Idempotente: scripts/migrar.ts reaplica todos os arquivos a cada execução.
-- Sem UPDATE de dados: reexecutar não pode sobrescrever correções manuais de 'temp'.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Colunas
-- ---------------------------------------------------------------------------
ALTER TABLE despesas ADD COLUMN IF NOT EXISTS observacao text;

-- O DEFAULT só existe para preencher as linhas atuais; é removido logo em
-- seguida para que todo INSERT novo precise informar a descrição.
ALTER TABLE reembolsos ADD COLUMN IF NOT EXISTS descricao text NOT NULL DEFAULT 'temp';
ALTER TABLE reembolsos ALTER COLUMN descricao DROP DEFAULT;

-- ---------------------------------------------------------------------------
-- 2. RPC editar_despesa (+ p_observacao)
-- DROP necessário: lista de parâmetros diferente criaria uma sobrecarga, e o
-- PostgREST pode recusar a chamada por ambiguidade. O 0009 reaplicado recria a
-- assinatura antiga a cada execução do migrar.ts; este arquivo roda depois e a remove.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.editar_despesa(uuid, date, text, uuid, numeric);

CREATE OR REPLACE FUNCTION public.editar_despesa(
  p_id          uuid,
  p_data        date,
  p_descricao   text,
  p_pagador_id  uuid,
  p_valor       numeric(14,2),
  p_observacao  text DEFAULT NULL
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
  IF v_row.observacao IS DISTINCT FROM p_observacao THEN
    v_diff := v_diff || jsonb_build_object('observacao',
      jsonb_build_object('de', v_row.observacao, 'para', p_observacao));
  END IF;

  UPDATE despesas
  SET data            = p_data,
      descricao       = p_descricao,
      pagador_user_id = p_pagador_id,
      valor           = p_valor,
      observacao      = p_observacao
  WHERE id = p_id;

  IF v_diff <> '{}'::jsonb THEN
    INSERT INTO audit_log (entidade, entidade_id, rateio_id, user_id, acao, diff_json)
    VALUES ('despesa', p_id, v_row.rateio_id, v_caller, 'update', v_diff);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.editar_despesa(uuid, date, text, uuid, numeric, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. RPC editar_reembolso (+ p_descricao)
-- p_descricao vem antes de p_observacao: parâmetros após um DEFAULT também
-- precisam ter DEFAULT.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.editar_reembolso(uuid, date, uuid, uuid, numeric, text);

CREATE OR REPLACE FUNCTION public.editar_reembolso(
  p_id            uuid,
  p_data          date,
  p_pagador_id    uuid,
  p_recebedor_id  uuid,
  p_valor         numeric(14,2),
  p_descricao     text,
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

  IF p_descricao IS NULL OR btrim(p_descricao) = '' THEN
    RAISE EXCEPTION 'Descrição é obrigatória';
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
  IF v_row.descricao IS DISTINCT FROM p_descricao THEN
    v_diff := v_diff || jsonb_build_object('descricao',
      jsonb_build_object('de', v_row.descricao, 'para', p_descricao));
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
      descricao         = p_descricao,
      observacao        = p_observacao
  WHERE id = p_id;

  IF v_diff <> '{}'::jsonb THEN
    INSERT INTO audit_log (entidade, entidade_id, rateio_id, user_id, acao, diff_json)
    VALUES ('reembolso', p_id, v_row.rateio_id, v_caller, 'update', v_diff);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.editar_reembolso(uuid, date, uuid, uuid, numeric, text, text) TO authenticated;
