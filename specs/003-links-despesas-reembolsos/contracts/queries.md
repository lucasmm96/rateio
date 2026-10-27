# Contratos de Queries — Links

**Date**: 2026-10-27

Todas as queries usam a Neon Data API via `src/db/queries.ts`. RLS é aplicado automaticamente pelo JWT do usuário autenticado.

## `listarLinks(entidadeTipo, entidadeId): Promise<LinkItem[]>`

**Descrição**: Retorna todos os links de uma despesa ou reembolso, ordenados por `criado_em` ascendente.

**Parâmetros**:

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `entidadeTipo` | `'despesa' \| 'reembolso'` | Tipo da entidade |
| `entidadeId` | `string` (UUID) | ID da entidade |

**Retorno**: `LinkItem[]` — lista vazia se não houver links.

**Erros**: lança `Error` se a query falhar.

**Neon Data API**:
```typescript
neon
  .from('links')
  .select('id, entidade_tipo, entidade_id, rateio_id, url, rotulo, criado_em')
  .eq('entidade_tipo', entidadeTipo)
  .eq('entidade_id', entidadeId)
  .order('criado_em', { ascending: true })
```

---

## `adicionarLink(args): Promise<void>`

**Descrição**: Insere um novo link para uma despesa ou reembolso.

**Parâmetros**:

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `entidadeTipo` | `'despesa' \| 'reembolso'` | sim | Tipo da entidade |
| `entidadeId` | `string` (UUID) | sim | ID da entidade |
| `rateioId` | `string` (UUID) | sim | ID do rateio (para RLS) |
| `url` | `string` | sim | URL do link (validada no cliente) |
| `rotulo` | `string \| undefined` | não | Rótulo opcional |

**Retorno**: `void`

**Erros**: lança `Error` se a query falhar (ex.: violação de RLS).

**Neon Data API**:
```typescript
neon.from('links').insert({
  entidade_tipo: args.entidadeTipo,
  entidade_id:   args.entidadeId,
  rateio_id:     args.rateioId,
  url:           args.url,
  ...(args.rotulo ? { rotulo: args.rotulo } : {}),
})
```

---

## `removerLink(id): Promise<void>`

**Descrição**: Remove um link pelo seu ID. RLS garante que apenas membros do rateio podem remover.

**Parâmetros**:

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | `string` (UUID) | ID do link a remover |

**Retorno**: `void`

**Erros**: lança `Error` se a query falhar ou o link não existir.

**Neon Data API**:
```typescript
neon.from('links').delete().eq('id', id)
```

---

## Mudança em `DespesaItem` e queries afetadas

Os campos `boleto_url` e `comprovante_url` são **removidos** de `DespesaItem` e de todas as queries que os referenciam:

| Query | Mudança |
|-------|---------|
| `listarDespesas` | Remover `boleto_url, comprovante_url` do `.select(...)` |
| `DespesaItem` (interface) | Remover campos `boleto_url` e `comprovante_url` |

Links são buscados separadamente via `listarLinks('despesa', despesa.id)` quando necessário (lazy, ao abrir detalhes do lançamento).
