# Tasks: Fix Config. Rateio — modal vazio

**Input**: Design documents from `specs/002-fix-config-rateio/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Não solicitados na spec — sem tarefas de teste automatizado. Validação manual via `quickstart.md`.

**Organization**: 1 arquivo modificado (`src/routes/Configuracoes.tsx`). Tasks organizadas por user story.

## Format: `[ID] [P?] [Story] Descrição com caminho do arquivo`

- **[P]**: Pode rodar em paralelo (arquivos diferentes ou sem dependências)
- **[Story]**: User story correspondente da spec.md
- Todas as tarefas são em `src/routes/Configuracoes.tsx`; não há novos arquivos.

---

## Phase 1: Foundacional — Corrigir race condition de auth (bloqueia US1–US4)

**Purpose**: Garantir que `buscarRateio` só dispare após `isPending === false`. Sem isso, nenhuma user story fica estável.

**⚠️ CRÍTICO**: Nenhuma user story pode ser completada sem esta fase.

- [X] T001 Desestruturar `isPending` de `useUser()` em `src/routes/Configuracoes.tsx` linha ~29: trocar `const { user } = useUser()` por `const { user, isPending: authPending } = useUser()`
- [X] T002 Atualizar chamada `useAsync` em `src/routes/Configuracoes.tsx` linhas ~30-33: adicionar `authPending` nos deps e fazer o callback retornar `Promise.resolve(null)` enquanto `authPending === true` ou `!rateioId`

**Checkpoint**: Após T001 + T002, a query não dispara mais antes do JWT estar pronto. Modal pode ainda ficar branco — os próximos blocos adicionam os estados visuais.

---

## Phase 2: User Story 1 + 2 — Formulário visível e feedback de carregamento (P1)

**Goal**: O formulário aparece quando dados chegam; "Carregando…" aparece antes disso — nunca tela em branco.

**Independent Test**: Abrir o modal como dono do rateio "teste" → ver formulário preenchido (V-1 do quickstart.md).

- [X] T003 [US1] [US2] Mover indicador de carregamento para fora do bloco `isOwner` em `src/routes/Configuracoes.tsx`: adicionar bloco `{(authPending || loading) && <p>Carregando…</p>}` no início de `ConfigRateioContent`, antes das seções condicionais existentes

**Checkpoint**: US1 e US2 resolvidas. Abrir o modal sempre exibe "Carregando…" ou o formulário; nunca branco enquanto dados chegam.

---

## Phase 3: User Story 3 — Feedback de erro (P2)

**Goal**: Erros de query (rede, RLS, auth expirado) geram mensagem visível com botão de retry — não tela branca.

**Independent Test**: Navegar para UUID inexistente → ver mensagem de erro (V-4 do quickstart.md).

- [X] T004 [US3] Renderizar `error` de `useAsync` em `src/routes/Configuracoes.tsx`: adicionar bloco `{!loading && error && <mensagem-erro + botão-reloadRateio>}` em `ConfigRateioContent` após o bloco de carregando

**Checkpoint**: US3 resolvida. Qualquer falha na query mostra mensagem + botão "Tentar novamente".

---

## Phase 4: User Story 4 — Estado para rateio não encontrado e não-donos (P3)

**Goal**: `rateio === null` após load → "Rateio não encontrado". `!isOwner` após load → "Apenas o criador pode alterar". Nunca branco.

**Independent Test**: Abrir modal com UUID inválido → mensagem "não encontrado" (V-4). Abrir como não-dono → mensagem de acesso (V-5). Ambos em quickstart.md.

- [X] T005 [US4] Adicionar estado "rateio não encontrado" em `src/routes/Configuracoes.tsx`: após bloco de erro, adicionar `{!loading && !error && !rateio && <mensagem-nao-encontrado + botão-voltar>}` em `ConfigRateioContent`
- [X] T006 [US4] Adicionar estado "acesso negado" em `src/routes/Configuracoes.tsx`: após bloco de não-encontrado, adicionar `{!loading && !error && rateio && !isOwner && <mensagem-acesso-negado + botão-voltar>}` em `ConfigRateioContent`

**Checkpoint**: US4 resolvida. Nenhum estado da tabela `data-model.md/Estados de UI mapeados` resulta em tela branca.

---

## Phase 5: Polish e Validação

**Purpose**: Lint + validação manual dos 5 cenários de `quickstart.md`.

- [X] T007 Executar `npm run lint` em `src/routes/Configuracoes.tsx` e corrigir qualquer warning novo introduzido pelas mudanças
- [X] T008 [P] Validar manualmente os 5 cenários V-1 a V-5 de `specs/002-fix-config-rateio/quickstart.md` com o app rodando localmente (`npm run dev`)

---

## Dependencies & Execution Order

### Dependências de fase

- **Phase 1 (Foundacional)**: Sem dependências — começar imediatamente
- **Phase 2 (US1+US2)**: Depende de Phase 1 completa
- **Phase 3 (US3)**: Depende de Phase 1 completa; independente de Phase 2
- **Phase 4 (US4)**: Depende de Phase 1 completa; independente de Phase 2 e 3
- **Phase 5 (Polish)**: Depende de todas as fases anteriores completas

### Dependências dentro de cada fase

- T001 → T002 (T002 usa `authPending` introduzido em T001)
- T003 → T004 → T005 → T006 (ordem de renderização no JSX — podem ser feitas em sequência no mesmo bloco)
- T007 e T008 são independentes entre si

### Oportunidades de paralelismo

- Após Phase 1: T003, T004, T005, T006 são no mesmo arquivo mas são blocos JSX independentes — podem ser escritos em qualquer ordem
- T007 e T008 podem rodar em paralelo (lint vs. teste manual)

---

## Parallel Example: Phase 2–4

```bash
# Após T001 + T002 (Phase 1 completa), as Phases 2, 3, 4 podem ser
# implementadas em sequência no mesmo arquivo, bloco por bloco:
Task: "T003 — bloco loading em ConfigRateioContent"
Task: "T004 — bloco error em ConfigRateioContent"
Task: "T005 — bloco rateio null em ConfigRateioContent"
Task: "T006 — bloco !isOwner em ConfigRateioContent"
```

---

## Implementation Strategy

### MVP (US1 + US2 apenas — mínimo para corrigir o bug relatado)

1. Completar Phase 1: T001 + T002
2. Completar Phase 2: T003
3. **PARAR E VALIDAR**: testar V-1 e V-3 do quickstart.md
4. Deploy se comportamento estiver correto

### Entrega incremental (todas as user stories)

1. Phase 1 → Foundation pronta
2. Phase 2 → Bug principal corrigido, loading visível → Deploy/Demo
3. Phase 3 → Erros visíveis → Deploy/Demo
4. Phase 4 → Não-donos e não-encontrado cobertos → Deploy/Demo
5. Phase 5 → Lint + validação completa → Merge

---

## Notes

- Todas as tarefas são em `src/routes/Configuracoes.tsx` — sem novos arquivos de produção
- Usar tokens semânticos do design system (`text-on-surface-variant`, `text-error`, etc.) nos novos blocos JSX
- Não mudar lógica de `isOwner` — apenas adicionar estados antes da renderização das seções existentes
- Após T002, testar que a query ainda funciona: abrir modal com auth já resolvido deve carregar normalmente
