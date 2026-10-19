-- =============================================================================
-- 0001_rls.sql — RLS, triggers, RPCs e role ipca_writer
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Role ipca_writer (usada pelo GitHub Action de IPCA)
-- Criada com NOLOGIN; o Action usa a senha via DATABASE_URL específica
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select from pg_roles where rolname = 'ipca_writer') then
    create role ipca_writer nologin;
  end if;
end
$$;

grant connect on database neondb to ipca_writer;
grant usage on schema public to ipca_writer;
grant select, insert, update on taxas_ipca to ipca_writer;

-- ---------------------------------------------------------------------------
-- Habilitar RLS em todas as tabelas de negócio
-- ---------------------------------------------------------------------------
alter table rateios   enable row level security;
alter table membros   enable row level security;
alter table despesas  enable row level security;
alter table reembolsos enable row level security;
alter table taxas_ipca enable row level security;
alter table config    enable row level security;
-- users: RLS ativado mas gerenciado pela função SECURITY DEFINER

-- ---------------------------------------------------------------------------
-- rateios
-- ---------------------------------------------------------------------------
create policy rateios_select on rateios
  for select using (
    id in (
      select rateio_id from membros
      where user_id = auth_user_id()::uuid
    )
  );

create policy rateios_insert on rateios
  for insert with check (
    criado_por_user_id = auth_user_id()::uuid
  );

create policy rateios_update on rateios
  for update using (
    id in (
      select rateio_id from membros
      where user_id = auth_user_id()::uuid
    )
  );

-- ---------------------------------------------------------------------------
-- membros
-- ---------------------------------------------------------------------------
create policy membros_select on membros
  for select using (
    rateio_id in (
      select rateio_id from membros
      where user_id = auth_user_id()::uuid
    )
  );

create policy membros_insert on membros
  for insert with check (
    rateio_id in (
      select id from rateios
      where criado_por_user_id = auth_user_id()::uuid
    )
    or
    rateio_id in (
      select rateio_id from membros
      where user_id = auth_user_id()::uuid
    )
  );

-- ---------------------------------------------------------------------------
-- despesas
-- ---------------------------------------------------------------------------
create policy despesas_select on despesas
  for select using (
    rateio_id in (
      select rateio_id from membros
      where user_id = auth_user_id()::uuid
    )
  );

create policy despesas_insert on despesas
  for insert with check (
    rateio_id in (
      select rateio_id from membros
      where user_id = auth_user_id()::uuid
    )
  );

create policy despesas_update on despesas
  for update using (
    rateio_id in (
      select rateio_id from membros
      where user_id = auth_user_id()::uuid
    )
  );

create policy despesas_delete on despesas
  for delete using (
    rateio_id in (
      select rateio_id from membros
      where user_id = auth_user_id()::uuid
    )
  );

-- ---------------------------------------------------------------------------
-- reembolsos
-- ---------------------------------------------------------------------------
create policy reembolsos_select on reembolsos
  for select using (
    rateio_id in (
      select rateio_id from membros
      where user_id = auth_user_id()::uuid
    )
  );

create policy reembolsos_insert on reembolsos
  for insert with check (
    rateio_id in (
      select rateio_id from membros
      where user_id = auth_user_id()::uuid
    )
  );

create policy reembolsos_delete on reembolsos
  for delete using (
    rateio_id in (
      select rateio_id from membros
      where user_id = auth_user_id()::uuid
    )
  );

-- ---------------------------------------------------------------------------
-- taxas_ipca — leitura para qualquer autenticado; escrita só ipca_writer
-- ---------------------------------------------------------------------------
create policy taxas_select on taxas_ipca
  for select using (auth_user_id() is not null);

create policy taxas_insert on taxas_ipca
  for insert with check (current_user = 'ipca_writer');

create policy taxas_update on taxas_ipca
  for update using (current_user = 'ipca_writer');

-- ---------------------------------------------------------------------------
-- config — leitura para autenticado; escrita só service role
-- ---------------------------------------------------------------------------
create policy config_select on config
  for select using (auth_user_id() is not null);

-- ---------------------------------------------------------------------------
-- Trigger: Σ cota = 1 por rateio
-- ---------------------------------------------------------------------------
create or replace function trg_fn_cotas_somam_1()
returns trigger language plpgsql as $$
declare
  v_soma numeric;
begin
  select coalesce(sum(cota), 0) into v_soma
  from membros
  where rateio_id = coalesce(new.rateio_id, old.rateio_id);

  if abs(v_soma - 1) > 0.000001 then
    raise exception
      'soma das cotas deve ser 1 (atual: %)', v_soma;
  end if;
  return coalesce(new, old);
end;
$$;

create constraint trigger trg_cotas_somam_1
  after insert or update or delete on membros
  deferrable initially deferred
  for each row execute function trg_fn_cotas_somam_1();

-- ---------------------------------------------------------------------------
-- Trigger: despesas.pagador_user_id ∈ membros do rateio
-- ---------------------------------------------------------------------------
create or replace function trg_fn_pagador_eh_membro()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from membros
    where rateio_id = new.rateio_id
      and user_id   = new.pagador_user_id
  ) then
    raise exception
      'pagador % não é membro do rateio %',
      new.pagador_user_id, new.rateio_id;
  end if;
  return new;
end;
$$;

create trigger trg_despesa_pagador_membro
  before insert or update on despesas
  for each row execute function trg_fn_pagador_eh_membro();

-- ---------------------------------------------------------------------------
-- Trigger: reembolsos.pagador/recebedor ∈ membros do rateio
-- ---------------------------------------------------------------------------
create or replace function trg_fn_reembolso_membros()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from membros
    where rateio_id = new.rateio_id and user_id = new.pagador_user_id
  ) then
    raise exception 'pagador do reembolso não é membro do rateio';
  end if;
  if not exists (
    select 1 from membros
    where rateio_id = new.rateio_id and user_id = new.recebedor_user_id
  ) then
    raise exception 'recebedor do reembolso não é membro do rateio';
  end if;
  return new;
end;
$$;

create trigger trg_reembolso_membros
  before insert or update on reembolsos
  for each row execute function trg_fn_reembolso_membros();

-- ---------------------------------------------------------------------------
-- RPC: buscar_usuario_por_email
-- SECURITY DEFINER: bypassa RLS de users (cada user vê só sua linha)
-- Retorna apenas id e email — sem expor outros campos
-- ---------------------------------------------------------------------------
create or replace function public.buscar_usuario_por_email(p_email text)
returns table (id uuid, email text)
language sql
security definer
set search_path = public
as $$
  select u.id, u.email
  from users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.buscar_usuario_por_email(text) from public;
-- grant será adicionado após configurar o role do Neon Auth
-- grant execute on function public.buscar_usuario_por_email(text) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: criar_rateio — transação atômica rateio + membros
-- Garante que Σ cota = 1 antes de inserir; evita estado intermediário
-- ---------------------------------------------------------------------------
create or replace function public.criar_rateio(
  p_nome          text,
  p_corrigir_ipca boolean,
  p_participantes jsonb   -- [{user_id, cota}]
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

revoke all on function public.criar_rateio(text, boolean, jsonb) from public;
-- grant execute on function public.criar_rateio(text, boolean, jsonb) to authenticated;
