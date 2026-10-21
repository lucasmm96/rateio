/**
 * Funções tipadas para a Neon Data API (PostgREST).
 * Todas as consultas respeitam RLS — o token do usuário autenticado
 * é injetado automaticamente pelo client neon-js.
 */

import { neon } from './client'

// ---------------------------------------------------------------------------
// Tipos de resposta (subconjuntos do schema)
// ---------------------------------------------------------------------------

export interface RateioListItem {
  id: string
  nome: string
  corrigir_ipca: boolean
  criado_em: string
  arquivado_em: string | null
  membros: { user_id: string; cota: number; users: { email: string } | null }[]
}

export interface RateioDetalhe extends RateioListItem {
  criado_por_user_id: string
}

export interface DespesaItem {
  id: string
  rateio_id: string
  data: string
  descricao: string
  pagador_user_id: string
  valor: number
  boleto_url: string | null
  comprovante_url: string | null
  criado_em: string
  pagador: { email: string } | null
}

export interface ReembolsoItem {
  id: string
  rateio_id: string
  data: string
  pagador_user_id: string
  recebedor_user_id: string
  valor: number
  observacao: string | null
  criado_em: string
  pagador: { email: string } | null
  recebedor: { email: string } | null
}

export interface TaxaIpca {
  mes: string   // 'YYYY-MM-DD'
  taxa: number
}

export interface MembroUsuario {
  user_id: string
  cota: number
  users: { email: string } | null
}

// ---------------------------------------------------------------------------
// Rateios
// ---------------------------------------------------------------------------

export async function listarRateios(): Promise<RateioListItem[]> {
  const { data, error } = await neon
    .from('rateios')
    .select('id, nome, corrigir_ipca, criado_em, arquivado_em, membros(user_id, cota, users(email))')
    .is('arquivado_em', null)
    .order('criado_em', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as RateioListItem[]
}

export async function buscarRateio(id: string): Promise<RateioDetalhe | null> {
  const { data, error } = await neon
    .from('rateios')
    .select('id, nome, corrigir_ipca, criado_em, arquivado_em, criado_por_user_id, membros(user_id, cota, users(email))')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data as RateioDetalhe | null
}

export async function criarRateio(
  nome: string,
  corrigirIpca: boolean,
  participantes: { user_id: string; cota: number }[],
): Promise<string> {
  const { data, error } = await neon.rpc('criar_rateio', {
    p_nome: nome,
    p_corrigir_ipca: corrigirIpca,
    p_participantes: participantes,
  })
  if (error) throw new Error(error.message)
  return data as string
}

export async function arquivarRateio(id: string): Promise<void> {
  const { error } = await neon
    .from('rateios')
    .update({ arquivado_em: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function editarRateio(
  id: string,
  updates: { nome?: string; corrigir_ipca?: boolean },
): Promise<void> {
  const { error } = await neon.from('rateios').update(updates).eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Membros
// ---------------------------------------------------------------------------

export async function adicionarMembro(
  rateioId: string,
  userId: string,
  cotas: { userId: string; cota: number }[],
): Promise<void> {
  const { error } = await neon.rpc('adicionar_membro', {
    p_rateio_id: rateioId,
    p_user_id: userId,
    p_cotas: cotas.map(c => ({ user_id: c.userId, cota: c.cota })),
  })
  if (error) throw new Error(error.message)
}

export async function removerMembro(rateioId: string, userId: string): Promise<void> {
  const { error } = await neon.rpc('remover_membro', {
    p_rateio_id: rateioId,
    p_user_id: userId,
  })
  if (error) throw new Error(error.message)
}

export async function atualizarCotas(
  rateioId: string,
  cotas: { userId: string; cota: number }[],
): Promise<void> {
  const { error } = await neon.rpc('atualizar_cotas', {
    p_rateio_id: rateioId,
    p_cotas: cotas.map(c => ({ user_id: c.userId, cota: c.cota })),
  })
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Despesas
// ---------------------------------------------------------------------------

export async function listarDespesas(rateioId: string): Promise<DespesaItem[]> {
  const { data, error } = await neon
    .from('despesas')
    .select('id, rateio_id, data, descricao, pagador_user_id, valor, boleto_url, comprovante_url, criado_em, pagador:users!pagador_user_id(email)')
    .eq('rateio_id', rateioId)
    .order('data', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as DespesaItem[]
}

export async function criarDespesa(args: {
  rateioId: string
  data: string
  descricao: string
  pagadorUserId: string
  valor: number
}): Promise<void> {
  const { error } = await neon.from('despesas').insert({
    rateio_id: args.rateioId,
    data: args.data,
    descricao: args.descricao,
    pagador_user_id: args.pagadorUserId,
    valor: args.valor,
  })
  if (error) throw new Error(error.message)
}

export async function deletarDespesa(id: string): Promise<void> {
  const { error } = await neon.from('despesas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// Reembolsos
// ---------------------------------------------------------------------------

export async function listarReembolsos(rateioId: string): Promise<ReembolsoItem[]> {
  const { data, error } = await neon
    .from('reembolsos')
    .select('id, rateio_id, data, pagador_user_id, recebedor_user_id, valor, observacao, criado_em, pagador:users!pagador_user_id(email), recebedor:users!recebedor_user_id(email)')
    .eq('rateio_id', rateioId)
    .order('data', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as ReembolsoItem[]
}

export async function deletarReembolso(id: string): Promise<void> {
  const { error } = await neon.from('reembolsos').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function criarReembolso(args: {
  rateioId: string
  data: string
  pagadorUserId: string
  recebedorUserId: string
  valor: number
  observacao?: string
}): Promise<void> {
  const { error } = await neon.from('reembolsos').insert({
    rateio_id: args.rateioId,
    data: args.data,
    pagador_user_id: args.pagadorUserId,
    recebedor_user_id: args.recebedorUserId,
    valor: args.valor,
    ...(args.observacao ? { observacao: args.observacao } : {}),
  })
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------
// IPCA
// ---------------------------------------------------------------------------

export async function listarTaxasIpca(): Promise<TaxaIpca[]> {
  const { data, error } = await neon
    .from('taxas_ipca')
    .select('mes, taxa')
    .order('mes')
  if (error) throw new Error(error.message)
  return (data ?? []) as TaxaIpca[]
}

// ---------------------------------------------------------------------------
// Usuários
// ---------------------------------------------------------------------------

export async function buscarUsuarioPorEmail(email: string): Promise<{ id: string; email: string } | null> {
  const { data, error } = await neon.rpc('buscar_usuario_por_email', { p_email: email })
  if (error) throw new Error(error.message)
  const rows = data as { id: string; email: string }[] | null
  return rows?.[0] ?? null
}

export async function garantirUsuario(email: string): Promise<void> {
  const { error } = await neon.rpc('garantir_usuario', { p_email: email })
  if (error) throw new Error(error.message)
}
