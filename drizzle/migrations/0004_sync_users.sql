-- =============================================================================
-- 0004_sync_users.sql
-- Garante sincronização entre o Better Auth e a tabela users da aplicação.
--
-- Problema: o Neon Auth (Better Auth) gerencia usuários internamente e emite
-- JWTs com sub = user_id, mas NÃO popula automaticamente a tabela users desta
-- aplicação. Isso causa FK violation ao criar rateios.
--
-- Solução:
--   1. garantir_usuario(p_email): RPC chamada pelo client após login/signup.
--   2. criar_rateio atualizado: tenta upsert do criador via claims do JWT.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- garantir_usuario: upsert seguro do usuário autenticado em users
-- SECURITY DEFINER para contornar eventuais políticas na tabela users.
-- ---------------------------------------------------------------------------
create or replace function public.garantir_usuario(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id    uuid := auth_user_id()::uuid;
  v_email text;
begin
  if v_id is null then
    raise exception 'não autenticado';
  end if;

  -- Prefere email do JWT (server-side, confiável); fallback ao parâmetro do client
  v_email := coalesce(
    nullif(trim(current_setting('request.jwt.claims', true)::jsonb->>'email'), ''),
    lower(trim(p_email))
  );

  if v_email is null or v_email = '' then
    raise exception 'email não disponível';
  end if;

  insert into users (id, email)
  values (v_id, v_email)
  on conflict (id) do nothing;
end;
$$;

grant execute on function public.garantir_usuario(text) to authenticated;

-- ---------------------------------------------------------------------------
-- criar_rateio atualizado: inclui upsert do criador antes de inserir o rateio
-- Evita FK violation quando o client esqueceu de chamar garantir_usuario.
-- ---------------------------------------------------------------------------
create or replace function public.criar_rateio(
  p_nome          text,
  p_corrigir_ipca boolean,
  p_participantes jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rateio_id  uuid;
  v_criador    uuid := auth_user_id()::uuid;
  v_soma_cota  numeric := 0;
  v_email_jwt  text;
begin
  if v_criador is null then
    raise exception 'não autenticado';
  end if;

  select coalesce(sum((p->>'cota')::numeric), 0)
  into   v_soma_cota
  from   jsonb_array_elements(p_participantes) p;

  if abs(v_soma_cota - 1) > 0.000001 then
    raise exception
      'soma das cotas deve ser 1 (recebido: %)', v_soma_cota;
  end if;

  -- Tenta garantir que o criador existe em users (best-effort via JWT claims)
  v_email_jwt := nullif(trim(
    current_setting('request.jwt.claims', true)::jsonb->>'email'
  ), '');

  if v_email_jwt is not null then
    insert into users (id, email)
    values (v_criador, v_email_jwt)
    on conflict (id) do nothing;
  end if;

  insert into rateios (nome, corrigir_ipca, criado_por_user_id)
  values (p_nome, p_corrigir_ipca, v_criador)
  returning id into v_rateio_id;

  insert into membros (rateio_id, user_id, cota)
  select v_rateio_id,
         (p->>'user_id')::uuid,
         (p->>'cota')::numeric
  from   jsonb_array_elements(p_participantes) p;

  return v_rateio_id;
end;
$$;
