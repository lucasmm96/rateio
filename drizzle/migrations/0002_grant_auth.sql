-- =============================================================================
-- 0002_grant_auth.sql — Grants para o role 'authenticated' do Neon Auth
-- Aplicar SOMENTE após habilitar o Neon Auth no Console (Settings > Neon Auth)
-- O role 'authenticated' é criado automaticamente pelo Neon Auth
-- =============================================================================

-- Permissão para executar as RPCs publicamente expostas
grant execute on function public.buscar_usuario_por_email(text) to authenticated;
grant execute on function public.criar_rateio(text, boolean, jsonb) to authenticated;
