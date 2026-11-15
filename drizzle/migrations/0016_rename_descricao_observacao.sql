-- =============================================================================
-- 0016_rename_descricao_observacao.sql — Despesa e Reembolso:
--   descricao -> titulo (obrigatório)
--   observacao -> descricao (opcional)
--
-- Idempotente: scripts/migrar.ts reaplica todos os arquivos a cada execução.
-- Renames protegidos por DO $$ ... $$ verificando information_schema.columns.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Colunas: despesas
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'despesas' AND column_name = 'descricao'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'despesas' AND column_name = 'titulo'
  ) THEN
    ALTER TABLE despesas RENAME COLUMN descricao TO titulo;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'despesas' AND column_name = 'observacao'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'despesas' AND column_name = 'descricao'
  ) THEN
    ALTER TABLE despesas RENAME COLUMN observacao TO descricao;
  END IF;
END $$;

-- Limpeza: a migration 0015 (em versões anteriores a esta) re-adiciona
-- despesas.observacao a cada reexecução. Se sobrou uma coluna observacao vazia
-- depois dos renames acima, remova-a.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'despesas' AND column_name = 'observacao'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'despesas' AND column_name = 'titulo'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'despesas' AND column_name = 'descricao'
  )
  AND NOT EXISTS (
    SELECT 1 FROM despesas WHERE observacao IS NOT NULL
  ) THEN
    ALTER TABLE despesas DROP COLUMN observacao;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Colunas: reembolsos
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reembolsos' AND column_name = 'descricao'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reembolsos' AND column_name = 'titulo'
  ) THEN
    ALTER TABLE reembolsos RENAME COLUMN descricao TO titulo;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reembolsos' AND column_name = 'observacao'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reembolsos' AND column_name = 'descricao'
  ) THEN
    ALTER TABLE reembolsos RENAME COLUMN observacao TO descricao;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. RPC editar_despesa (p_titulo, p_descricao)
-- DROP necessário: mesmo tipo de parâmetros com nomes diferentes seria
-- sobrecarga ambígua para o PostgREST.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.editar_despesa(uuid, date, text, uuid, numeric, text);

CREATE OR REPLACE FUNCTION public.editar_despesa(
  p_id          uuid,
  p_data        date,
  p_titulo      text,
  p_pagador_id  uuid,
  p_valor       numeric(14,2),
  p_descricao   text DEFAULT NULL
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

  IF p_titulo IS NULL OR btrim(p_titulo) = '' THEN
    RAISE EXCEPTION 'Título é obrigatório';
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
  IF v_row.titulo IS DISTINCT FROM p_titulo THEN
    v_diff := v_diff || jsonb_build_object('titulo',
      jsonb_build_object('de', v_row.titulo, 'para', p_titulo));
  END IF;
  IF v_row.pagador_user_id IS DISTINCT FROM p_pagador_id THEN
    v_diff := v_diff || jsonb_build_object('pagador_user_id',
      jsonb_build_object('de', v_row.pagador_user_id::text, 'para', p_pagador_id::text));
  END IF;
  IF v_row.valor IS DISTINCT FROM p_valor THEN
    v_diff := v_diff || jsonb_build_object('valor',
      jsonb_build_object('de', v_row.valor::text, 'para', p_valor::text));
  END IF;
  IF v_row.descricao IS DISTINCT FROM p_descricao THEN
    v_diff := v_diff || jsonb_build_object('descricao',
      jsonb_build_object('de', v_row.descricao, 'para', p_descricao));
  END IF;

  UPDATE despesas
  SET data            = p_data,
      titulo          = p_titulo,
      pagador_user_id = p_pagador_id,
      valor           = p_valor,
      descricao       = p_descricao
  WHERE id = p_id;

  IF v_diff <> '{}'::jsonb THEN
    INSERT INTO audit_log (entidade, entidade_id, rateio_id, user_id, acao, diff_json)
    VALUES ('despesa', p_id, v_row.rateio_id, v_caller, 'update', v_diff);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.editar_despesa(uuid, date, text, uuid, numeric, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. RPC editar_reembolso (p_titulo, p_descricao)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.editar_reembolso(uuid, date, uuid, uuid, numeric, text, text);

CREATE OR REPLACE FUNCTION public.editar_reembolso(
  p_id            uuid,
  p_data          date,
  p_pagador_id    uuid,
  p_recebedor_id  uuid,
  p_valor         numeric(14,2),
  p_titulo        text,
  p_descricao     text DEFAULT NULL
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

  IF p_titulo IS NULL OR btrim(p_titulo) = '' THEN
    RAISE EXCEPTION 'Título é obrigatório';
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
  IF v_row.titulo IS DISTINCT FROM p_titulo THEN
    v_diff := v_diff || jsonb_build_object('titulo',
      jsonb_build_object('de', v_row.titulo, 'para', p_titulo));
  END IF;
  IF v_row.descricao IS DISTINCT FROM p_descricao THEN
    v_diff := v_diff || jsonb_build_object('descricao',
      jsonb_build_object('de', v_row.descricao, 'para', p_descricao));
  END IF;

  UPDATE reembolsos
  SET data              = p_data,
      pagador_user_id   = p_pagador_id,
      recebedor_user_id = p_recebedor_id,
      valor             = p_valor,
      titulo            = p_titulo,
      descricao         = p_descricao
  WHERE id = p_id;

  IF v_diff <> '{}'::jsonb THEN
    INSERT INTO audit_log (entidade, entidade_id, rateio_id, user_id, acao, diff_json)
    VALUES ('reembolso', p_id, v_row.rateio_id, v_caller, 'update', v_diff);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.editar_reembolso(uuid, date, uuid, uuid, numeric, text, text) TO authenticated;
