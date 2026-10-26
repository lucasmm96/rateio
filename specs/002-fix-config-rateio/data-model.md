# Data Model: Fix Config. Rateio — modal vazio

**Date**: 2026-10-26

## Mudanças de schema

Nenhuma. Esta correção não altera nenhuma tabela, coluna, índice ou política RLS.

## Entidades relevantes (leitura apenas)

### `RateioDetalhe` (tipo existente em `src/db/queries.ts`)

| Campo | Tipo | Relevância para o fix |
|-------|------|-----------------------|
| `id` | `string` | Chave de busca |
| `nome` | `string` | Exibido no formulário |
| `corrigir_ipca` | `boolean` | Toggle no formulário |
| `criado_por_user_id` | `string` | Comparado com `user?.id` para `isOwner` |
| `membros` | `MembroUsuario[]` | Lista de cotas |

### Sessão de auth (valor de `neon.auth.useSession()`)

| Campo | Tipo | Relevância para o fix |
|-------|------|-----------------------|
| `data.user` | `User \| null` | `user?.id` para `isOwner` |
| `isPending` | `boolean` | **NOVO uso** — deve ser incluído nos deps do `useAsync` |

## Estados de UI mapeados

| Condição | Estado atual | Estado correto |
|----------|-------------|----------------|
| `authPending === true` | query dispara sem token; retorna `null`; branco | loading indicator visível |
| `loading === true` | "Carregando…" (só dentro de `isOwner`) | "Carregando…" visível independente de `isOwner` |
| `error !== null` | silencioso; branco | mensagem de erro + botão "Tentar novamente" |
| `rateio === null && !loading` | branco | "Rateio não encontrado ou sem acesso." |
| `rateio !== null && !isOwner` | branco | "Apenas o criador pode alterar as configurações." |
| `rateio !== null && isOwner` | formulário (quando auth não tem race) | formulário (sempre) |
