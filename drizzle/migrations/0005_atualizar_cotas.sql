-- =============================================================================
-- 0005_atualizar_cotas.sql — RPC para atualizar todas as cotas de uma vez
--
-- Problema: o trigger trg_cotas_somam_1 é DEFERRABLE INITIALLY DEFERRED, ou
-- seja, só dispara no fim da transação. Mas cada chamada HTTP da Data API é
-- uma transação separada. Atualizar cotas uma a uma violaria a constraint
-- (Σ cota ≠ 1 durante a transação intermediária).
--
-- Solução: RPC que faz o UPDATE de todas as cotas em uma única transação,
-- permitindo que o trigger verifique o estado final correto.
-- =============================================================================

create or replace function public.atualizar_cotas(
  p_rateio_id uuid,
  p_cotas     jsonb   -- [{user_id: uuid, cota: numeric}]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth_user_id()::uuid;
begin
  if v_user_id is null then
    raise exception 'não autenticado';
  end if;

  if not exists (
    select 1 from membros
    where rateio_id = p_rateio_id and user_id = v_user_id
  ) then
    raise exception 'usuário não é membro deste rateio';
  end if;

  update membros m
  set cota = (p->>'cota')::numeric
  from jsonb_array_elements(p_cotas) p
  where m.rateio_id = p_rateio_id
    and m.user_id = (p->>'user_id')::uuid;
end;
$$;

grant execute on function public.atualizar_cotas(uuid, jsonb) to authenticated;
