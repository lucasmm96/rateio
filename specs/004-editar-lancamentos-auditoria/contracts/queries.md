# Contratos de Queries — Editar Lançamentos e Auditoria (D-006)

Todos os contratos usam a Neon Data API via `neon` client (`src/db/client.ts`). RLS é aplicado automaticamente pelo token JWT do usuário.

---

## 1. editar_despesa (RPC)

**Assinatura TypeScript** (`src/db/queries.ts`):

```typescript
export async function editarDespesa(args: {
  id: string
  data: string            // 'YYYY-MM-DD'
  descricao: string
  pagadorUserId: string
  valor: number
}): Promise<void>
```

**Chamada**:
```typescript
const { error } = await neon.rpc('editar_despesa', {
  p_id:         args.id,
  p_data:       args.data,
  p_descricao:  args.descricao,
  p_pagador_id: args.pagadorUserId,
  p_valor:      args.valor,
  // p_user_id injetado via auth_user_id() dentro do RPC
})
```

**Erros esperados**:
- `Despesa não encontrada ou acesso negado` — id inválido ou rateio alheio
- `Valor deve ser maior que zero`

---

## 2. editar_reembolso (RPC)

**Assinatura TypeScript**:

```typescript
export async function editarReembolso(args: {
  id: string
  data: string
  pagadorUserId: string
  recebedorUserId: string
  valor: number
  observacao?: string | null
}): Promise<void>
```

**Chamada**:
```typescript
const { error } = await neon.rpc('editar_reembolso', {
  p_id:             args.id,
  p_data:           args.data,
  p_pagador_id:     args.pagadorUserId,
  p_recebedor_id:   args.recebedorUserId,
  p_valor:          args.valor,
  p_observacao:     args.observacao ?? null,
})
```

**Erros esperados**:
- `Reembolso não encontrado ou acesso negado`
- `Valor deve ser maior que zero`
- `Pagador e recebedor não podem ser o mesmo usuário`

---

## 3. listarAuditLog (SELECT direto)

**Assinatura TypeScript**:

```typescript
export async function listarAuditLog(
  entidade: 'despesa' | 'reembolso',
  entidadeId: string,
): Promise<AuditLogItem[]>
```

**Chamada**:
```typescript
const { data, error } = await neon
  .from('audit_log')
  .select('id, entidade, entidade_id, rateio_id, user_id, acao, diff_json, criado_em, ator:users!user_id(email)')
  .eq('entidade', entidade)
  .eq('entidade_id', entidadeId)
  .order('criado_em', { ascending: false })
```

**Retorno**: array de `AuditLogItem` (ver `data-model.md`), mais recente primeiro.

---

## 4. Invariantes de contrato

| Invariante | Onde é garantido |
|------------|-----------------|
| `valor > 0` | RPC (RAISE EXCEPTION) |
| `pagador ≠ recebedor` em reembolso | RPC (RAISE EXCEPTION) |
| Campos `id`, `rateio_id`, `criado_em` nunca mudam | RPC não os atualiza |
| Toda edição gera `audit_log` com diff correto | RPC — mesma transação |
| Usuário só edita lançamentos do seu rateio | RLS + validação interna no RPC |
| Usuário só lê `audit_log` do seu rateio | RLS em `audit_log` |
