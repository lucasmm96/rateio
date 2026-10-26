# Research: Fix Config. Rateio — modal vazio

**Date**: 2026-10-26

## Findings

### 1. Por que `isPending` importa para a query

**Decision**: Incluir `authPending` nos deps do `useAsync` e retornar `null` enquanto `authPending === true`.

**Rationale**: O `BetterAuthReactAdapter` injeta o JWT no momento em que a requisição é disparada, não quando a sessão resolve. Se a query for para a Data API antes de `isPending` tornar-se `false`, o adaptador pode não ter o token ainda, e a RLS bloqueia a linha — `buscarRateio` retorna `null`. Aguardar `isPending === false` garante que o token esteja disponível.

**Alternatives considered**:
- Re-tentar automaticamente (retry) se `rateio === null && !error`: descartado — cria loop, não resolve race.
- Mover a query para depois de um efeito separado que observa `user`: descartado — mesmo problema, mais complexo.

---

### 2. Exibir `error` do `useAsync`

**Decision**: Renderizar `error` de `useAsync` dentro de `ConfigRateioContent`, com botão "Tentar novamente" (chama `reloadRateio()`).

**Rationale**: O campo `error` já existe no hook; o problema é que não há JSX que o renderize. Adicionar um bloco condicional simples resolve o erro silencioso.

**Alternatives considered**: Toast/snackbar global — descartado, pois o contexto é local ao modal.

---

### 3. Estado de fallback para `!isOwner` e `rateio === null`

**Decision**: Adicionar três estados de fallback após `loading === false`:
- `rateio === null` → "Rateio não encontrado ou sem acesso."
- `!isOwner` → "Apenas o criador do rateio pode alterar as configurações."
- `error` → mensagem + botão Tentar novamente.

**Rationale**: Atualmente todos esses casos resultam em tela branca. Exibir mensagem é o mínimo de UX e facilita diagnóstico.

**Alternatives considered**: Redirecionar para `/` em vez de mostrar mensagem — descartado, pois perde o contexto da URL.

---

### 4. `useAsync` atual já tem cancelamento (sem race no retorno)

**Decision**: O hook `useAsync` em `src/hooks/useAsync.ts` já implementa `cancelled` flag e cleanup — sem risco de estado stale no retorno da promise. Nenhuma mudança necessária no hook.

**Rationale**: Verificado no código — o `cancelled` previne `setData` após unmount ou re-render com deps diferentes.

---

## Conclusão

Nenhum NEEDS CLARIFICATION. Todas as decisões podem ser implementadas em `Configuracoes.tsx` sem mudar nenhum outro arquivo (exceto possivelmente expor `isPending` em `auth.ts` se ainda não está — verificado: `useUser()` já retorna `isPending`).
