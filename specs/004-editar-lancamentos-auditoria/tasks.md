# Tasks: Editar Lançamentos e Auditoria

**Input**: Design documents from `specs/004-editar-lancamentos-auditoria/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/queries.md

**Organization**: Tasks agrupadas por user story para permitir implementação e teste independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de task incompleta)
- **[Story]**: User story a que pertence ([US1], [US2], [US3])

---

## Phase 1: Setup — Migration e Schema

**Purpose**: Criar a infra de banco que bloqueia todas as user stories

**⚠️ CRÍTICO**: Nenhuma user story pode começar antes desta phase estar completa.

- [X] T001 Criar migration `drizzle/migrations/0009_audit_log.sql`: tabela `audit_log` (id UUID PK, entidade TEXT CHECK('despesa','reembolso'), entidade_id UUID, rateio_id UUID FK rateios.id ON DELETE CASCADE, user_id UUID FK users.id, acao TEXT DEFAULT 'update' CHECK('update','delete'), diff_json JSONB NOT NULL, criado_em TIMESTAMPTZ DEFAULT NOW()), índices (entidade+entidade_id, rateio_id, criado_em DESC) e RLS SELECT via membros (mesma pattern de `links`)
- [X] T002 Adicionar RPCs `editar_despesa` e `editar_reembolso` na mesma migration `drizzle/migrations/0009_audit_log.sql`: cada RPC é SECURITY INVOKER, obtém user_id via `auth_user_id()`, valida que o lançamento pertence a um rateio do qual o chamador é membro, constrói diff_json com apenas os campos alterados no formato `{"campo": {"de": valor_antigo, "para": valor_novo}}`, executa UPDATE no lançamento e INSERT em audit_log na mesma transação; validações: valor > 0 (RAISE EXCEPTION), pagador ≠ recebedor no reembolso (RAISE EXCEPTION)
- [X] T003 Adicionar `auditLog` table definition em `src/db/schema.ts` (campos: id, entidade, entidadeId, rateioId, userId, acao, diffJson, criadoEm) e exportar tipos `AuditLog` e `NewAuditLog` — seguir padrão das tabelas existentes no arquivo
- [X] T004 Aplicar migration: `npx tsx scripts/migrar.ts`; verificar com `npx tsx scripts/verificar-schema.ts` que a tabela `audit_log` e os RPCs existem

**Checkpoint**: `audit_log` existe no banco com RLS ativa; RPCs `editar_despesa` e `editar_reembolso` testáveis via Drizzle Studio

---

## Phase 2: User Story 1 — Editar Despesa (Priority: P1) 🎯 MVP

**Goal**: Membros do rateio conseguem editar data, descrição, pagador e valor de uma despesa existente; saldo recalcula automaticamente.

**Independent Test**: Editar uma despesa e verificar que os novos valores aparecem na lista e o saldo muda.

### Implementação

- [X] T005 Adicionar interface `AuditLogItem` e função `listarAuditLog(entidade, entidadeId)` em `src/db/queries.ts` — SELECT em `audit_log` com join em `users!user_id(email)`, filtro por entidade+entidade_id, order by criado_em DESC (ver contrato em `contracts/queries.md`)
- [X] T006 Adicionar função `editarDespesa(args: {id, data, descricao, pagadorUserId, valor})` em `src/db/queries.ts` — chamada via `neon.rpc('editar_despesa', {...})` (ver contrato em `contracts/queries.md`); valor deve ser convertido de `Decimal` para string antes de enviar
- [X] T007 [P] Criar componente `src/components/EditarDespesaModal.tsx`: modal com formulário contendo campos data (date input), descrição (text input), pagador (select com membros do rateio) e valor (numeric input com validação > 0 usando `D()` de `src/core/decimal.ts`); ao submeter chama `editarDespesa()` e fecha o modal; exibir erro se o RPC rejeitar; usar tokens de design (`bg-surface`, `text-on-surface` etc — sem hex hardcoded)
- [X] T008 Integrar `EditarDespesaModal` em `src/routes/DetalheRateio.tsx`: adicionar botão "Editar" por linha de despesa na aba extrato; ao clicar abre o modal pré-populado com os dados atuais; ao salvar com sucesso recarrega a lista de despesas e o saldo

**Checkpoint**: US1 funcional — editar despesa persiste, saldo recalcula, sem regressão nas despesas existentes

---

## Phase 3: User Story 2 — Editar Reembolso (Priority: P2)

**Goal**: Membros conseguem editar data, pagador, recebedor, valor e observação de um reembolso.

**Independent Test**: Editar um reembolso e verificar que os campos e o saldo atualizam.

### Implementação

- [X] T009 Adicionar função `editarReembolso(args: {id, data, pagadorUserId, recebedorUserId, valor, observacao?})` em `src/db/queries.ts` — chamada via `neon.rpc('editar_reembolso', {...})`; valor em string; observacao aceita null
- [X] T010 [P] Criar componente `src/components/EditarReembolsoModal.tsx`: modal com campos data, pagador (select), recebedor (select), valor (> 0), observação (text opcional); validação client-side: pagador ≠ recebedor; chama `editarReembolso()`; mesma convenção de design que `EditarDespesaModal`
- [X] T011 Integrar `EditarReembolsoModal` em `src/routes/DetalheRateio.tsx`: botão "Editar" por linha de reembolso; pré-popular com dados atuais; recarregar lista e saldo após salvar com sucesso

**Checkpoint**: US2 funcional — editar reembolso persiste, sem regressão em US1

---

## Phase 4: User Story 3 — Histórico de Auditoria (Priority: P3)

**Goal**: Membros veem o histórico de alterações de um lançamento (quem, quando, o quê), em painel colapsável por lançamento.

**Independent Test**: Após editar um lançamento, expandir o painel "Histórico" e verificar a entrada com ator, data/hora e diff correto.

### Implementação

- [X] T012 [P] Criar componente `src/components/AuditLogPanel.tsx`: painel colapsável (accordion) que recebe `entidade: 'despesa' | 'reembolso'` e `entidadeId: string`; ao expandir chama `listarAuditLog()` e exibe lista de entradas em ordem cronológica decrescente (mais recente primeiro); cada entrada mostra: email do ator, data/hora formatada, e para cada campo em `diff_json`: nome do campo, valor anterior e novo; estado colapsado por padrão; usar apenas tokens de design do sistema
- [X] T013 Integrar `AuditLogPanel` abaixo de cada despesa em `src/routes/DetalheRateio.tsx` — o painel é renderizado por linha de despesa (toggle por id da despesa)
- [X] T014 Integrar `AuditLogPanel` abaixo de cada reembolso em `src/routes/DetalheRateio.tsx` — mesmo padrão de T013 para reembolsos

**Checkpoint**: US3 funcional — histórico de auditoria visível e correto; usuário fora do rateio não vê logs (RLS garante via SELECT policy)

---

## Phase 5: Polish e Validação

**Purpose**: Verificação final, cobertura e atualização de documentação

- [X] T015 Executar roteiro completo de `specs/004-editar-lancamentos-auditoria/quickstart.md` no browser: editar despesa, verificar log; editar reembolso, verificar log; testar validações de erro; confirmar que usuário fora do rateio não vê audit_log
- [X] T016 [P] Rodar `npm run test:coverage` e confirmar que thresholds 90% continuam atingidos (nenhum arquivo existente regredia)
- [X] T017 [P] Atualizar `src/db/schema.ts` com generate migration se necessário (`npm run db:generate`) e commitar artefatos gerados em `drizzle/`
- [X] T018 [P] Atualizar `.ai/planning/STATUS.md`: D-006 → ✅ com data 2026-10-27

---

## Dependencies & Execution Order

### Dependências entre phases

- **Phase 1 (Setup)**: sem dependências — iniciar imediatamente
- **Phase 2 (US1)**: bloqueia pelo Phase 1 completo
- **Phase 3 (US2)**: bloqueia pelo Phase 1 completo; US1 não é pré-requisito (independente)
- **Phase 4 (US3)**: depende de T005 (`listarAuditLog`) estar implementado (Phase 2); o painel pode ser criado em paralelo com US1/US2
- **Phase 5 (Polish)**: depois que todas as user stories desejadas estiverem prontas

### Dependências internas dentro de cada phase

- T001 → T002 (RPCs na mesma migration, T002 depende da tabela criada em T001)
- T002 → T003 → T004 (schema Drizzle antes de aplicar; aplicar antes de testar)
- T004 → T005, T006, T007, T008 (Phase 2 só começa após migration aplicada)
- T006 → T008 (precisamos de `editarDespesa` antes de wiring no componente)
- T007 pode rodar em paralelo com T005 e T006
- T009 → T011 (precisamos de `editarReembolso` antes de wiring)
- T010 pode rodar em paralelo com T009
- T005 → T012 (AuditLogPanel usa `listarAuditLog`)
- T012 pode rodar em paralelo com T013 e T014 não — T012 precisa estar pronto antes de T013/T014

### Oportunidades de paralelismo

```bash
# Phase 1: T001 e T002 são sequenciais (mesma migration)
# T003 pode ser feito em paralelo com T001+T002

# Phase 2: após T004 completo
Task T005: adicionar listarAuditLog em queries.ts
Task T006: adicionar editarDespesa em queries.ts
Task T007: criar EditarDespesaModal.tsx   # paralelo a T005/T006

# Phase 3: após T004 completo (paralelo com Phase 2)
Task T009: adicionar editarReembolso em queries.ts
Task T010: criar EditarReembolsoModal.tsx  # paralelo a T009
```

---

## Implementation Strategy

### MVP (User Story 1 apenas)

1. Completar Phase 1 (T001–T004) — migration + schema
2. Completar Phase 2 (T005–T008) — editar despesa
3. **Parar e validar**: despesa editável, log gravado, saldo correto
4. Deploy/demo se pronto

### Entrega incremental

1. Phase 1 → foundation pronta
2. Phase 2 → editar despesa (MVP demonstrável)
3. Phase 3 → editar reembolso
4. Phase 4 → histórico de auditoria visível
5. Phase 5 → validação e polish

---

## Notes

- Nunca usar `number` para valor monetário — converter via `D()` de `src/core/decimal.ts` antes de qualquer operação; enviar ao banco como string
- Tokens de design: `bg-surface`, `text-on-surface`, `text-primary`, `bg-error` — sem hex hardcoded
- Após cada push: `gh run list --limit 5` para verificar CI (regra do CLAUDE.md)
- O diff_json é construído no RPC, não no front-end — o front só exibe o que vier do banco
