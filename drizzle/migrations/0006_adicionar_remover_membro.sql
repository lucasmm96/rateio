-- =============================================================================
-- 0006_adicionar_remover_membro.sql
--
-- RPCs para gerenciar membros após criação do rateio.
-- Ambas operam em transação única para satisfazer o trigger Σcota=1.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- adicionar_membro
-- Insere um novo membro e aplica as novas cotas para todos (incluindo o novo).
-- p_cotas deve cobrir todos os membros existentes + o novo.
-- ---------------------------------------------------------------------------
create or replace function public.adicionar_membro(
  p_rateio_id uuid,
  p_user_id   uuid,
  p_cotas     jsonb   -- [{user_id: uuid, cota: numeric}]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth_user_id()::uuid;
begin
  if v_caller is null then
    raise exception 'não autenticado';
  end if;

  if not exists (
    select 1 from rateios
    where id = p_rateio_id and criado_por_user_id = v_caller
  ) then
    raise exception 'apenas o dono pode adicionar membros';
  end if;

  if exists (
    select 1 from membros
    where rateio_id = p_rateio_id and user_id = p_user_id
  ) then
    raise exception 'usuário já é membro deste rateio';
  end if;

  -- Insere com cota=0; trigger DEFERRED só dispara ao fim da transação
  insert into membros (rateio_id, user_id, cota)
  values (p_rateio_id, p_user_id, 0);

  -- Atualiza todas as cotas de uma vez (incluindo o novo membro)
  update membros m
  set cota = (p->>'cota')::numeric
  from jsonb_array_elements(p_cotas) p
  where m.rateio_id = p_rateio_id
    and m.user_id = (p->>'user_id')::uuid;
end;
$$;

grant execute on function public.adicionar_membro(uuid, uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- remover_membro
-- Remove um membro e redistribui sua cota proporcionalmente aos demais.
-- ---------------------------------------------------------------------------
create or replace function public.remover_membro(
  p_rateio_id uuid,
  p_user_id   uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller        uuid := auth_user_id()::uuid;
  v_cota_removida numeric;
  v_soma_restante numeric;
begin
  if v_caller is null then
    raise exception 'não autenticado';
  end if;

  if not exists (
    select 1 from rateios
    where id = p_rateio_id and criado_por_user_id = v_caller
  ) then
    raise exception 'apenas o dono pode remover membros';
  end if;

  select cota into v_cota_removida
  from membros
  where rateio_id = p_rateio_id and user_id = p_user_id;

  if v_cota_removida is null then
    raise exception 'membro não encontrado';
  end if;

  -- Remove o membro; trigger DEFERRED só dispara ao fim
  delete from membros
  where rateio_id = p_rateio_id and user_id = p_user_id;

  -- Verifica se ainda há membros restantes
  select sum(cota) into v_soma_restante
  from membros
  where rateio_id = p_rateio_id;

  if v_soma_restante is null or v_soma_restante = 0 then
    raise exception 'não é possível remover o único membro';
  end if;

  -- Normaliza as cotas dos membros restantes para Σ = 1
  update membros
  set cota = cota / v_soma_restante
  where rateio_id = p_rateio_id;
end;
$$;

grant execute on function public.remover_membro(uuid, uuid) to authenticated;
