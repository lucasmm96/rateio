-- =============================================================================
-- 0003_fix_rls_recursion.sql
-- Corrige recursão infinita nas policies de membros.
--
-- Causa: policies consultavam a própria tabela membros para decidir acesso,
-- disparando a policy novamente → loop infinito.
--
-- Solução: função SECURITY DEFINER is_member_of() que consulta membros
-- diretamente sem passar por RLS, quebrando o ciclo.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Função auxiliar: verifica membership sem disparar RLS
-- ---------------------------------------------------------------------------
create or replace function is_member_of(p_rateio_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from membros
    where rateio_id = p_rateio_id
      and user_id = auth_user_id()::uuid
  );
$$;

-- ---------------------------------------------------------------------------
-- Recriar policies de rateios (usavam subquery em membros)
-- ---------------------------------------------------------------------------
drop policy if exists rateios_select on rateios;
drop policy if exists rateios_update on rateios;

create policy rateios_select on rateios
  for select using (is_member_of(id));

create policy rateios_update on rateios
  for update using (is_member_of(id));

-- ---------------------------------------------------------------------------
-- Recriar policies de membros (auto-referência → recursão)
-- ---------------------------------------------------------------------------
drop policy if exists membros_select on membros;
drop policy if exists membros_insert on membros;

create policy membros_select on membros
  for select using (is_member_of(rateio_id));

create policy membros_insert on membros
  for insert with check (
    exists (
      select 1 from rateios
      where id = rateio_id
        and criado_por_user_id = auth_user_id()::uuid
    )
    or is_member_of(rateio_id)
  );

-- ---------------------------------------------------------------------------
-- Recriar policies de despesas (usavam subquery em membros)
-- ---------------------------------------------------------------------------
drop policy if exists despesas_select on despesas;
drop policy if exists despesas_insert on despesas;
drop policy if exists despesas_update on despesas;
drop policy if exists despesas_delete on despesas;

create policy despesas_select on despesas
  for select using (is_member_of(rateio_id));

create policy despesas_insert on despesas
  for insert with check (is_member_of(rateio_id));

create policy despesas_update on despesas
  for update using (is_member_of(rateio_id));

create policy despesas_delete on despesas
  for delete using (is_member_of(rateio_id));

-- ---------------------------------------------------------------------------
-- Recriar policies de reembolsos (usavam subquery em membros)
-- ---------------------------------------------------------------------------
drop policy if exists reembolsos_select on reembolsos;
drop policy if exists reembolsos_insert on reembolsos;
drop policy if exists reembolsos_delete on reembolsos;

create policy reembolsos_select on reembolsos
  for select using (is_member_of(rateio_id));

create policy reembolsos_insert on reembolsos
  for insert with check (is_member_of(rateio_id));

create policy reembolsos_delete on reembolsos
  for delete using (is_member_of(rateio_id));
