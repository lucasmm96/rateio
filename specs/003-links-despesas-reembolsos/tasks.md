# Tasks: Links em Despesas e Reembolsos

**Input**: Design documents from `specs/003-links-despesas-reembolsos/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/queries.md](contracts/queries.md)

**Tests**: Não solicitados — validação manual via [quickstart.md](quickstart.md).

**Organization**: Tarefas agrupadas por user story. US5 (migração) é pré-requisito de todas as demais e entra na fase Foundational.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: User story correspondente (US1–US5)

---

## Phase 1: Setup (Infraestrutura de schema e queries)

**Purpose**: Preparar o schema Drizzle, os tipos TypeScript e as funções de query antes de qualquer UI ou migration.

- [X] T001 Adicionar tabela `links` ao schema Drizzle em `src/db/schema.ts` com campos: `id uuid PK DEFAULT gen_random_uuid()`, `entidade_tipo text NOT NULL`, `entidade_id uuid NOT NULL`, `rateio_id uuid NOT NULL REFERENCES rateios(id) ON DELETE CASCADE`, `url text NOT NULL`, `rotulo text`, `criado_em timestamptz NOT NULL DEFAULT now()`; exportar tipos `Link` e `NewLink`
- [X] T002 Gerar a migration Drizzle: executar `npm run db:generate` e confirmar que o arquivo SQL foi criado em `drizzle/migrations/`
- [X] T003 [P] Remover campos `boleto_url` e `comprovante_url` da interface `DespesaItem` e da query `listarDespesas` em `src/db/queries.ts`
- [X] T004 [P] Adicionar interface `LinkItem` e as três funções `listarLinks(entidadeTipo, entidadeId)`, `adicionarLink(args)`, `removerLink(id)` em `src/db/queries.ts` conforme contrato em `contracts/queries.md`

**Checkpoint**: Schema e queries prontos; build compila sem erros (`npm run build`).

---

## Phase 2: Foundational — Migração de banco (US5)

**Purpose**: Aplicar a migration de banco e validar que os dados existentes foram migrados corretamente. Sem isso, a tabela `links` não existe e nenhuma UI pode funcionar.

**⚠️ CRÍTICO**: Nenhuma user story de UI pode ser validada em produção antes desta fase estar completa.

- [X] T005 Editar o arquivo SQL gerado em `drizzle/migrations/` para adicionar: (a) `CHECK (entidade_tipo IN ('despesa', 'reembolso'))`, (b) índices `links_entidade_idx ON links (entidade_tipo, entidade_id)` e `links_rateio_idx ON links (rateio_id)`, (c) `ALTER TABLE links ENABLE ROW LEVEL SECURITY` com as três policies (SELECT, INSERT, DELETE) conforme `data-model.md`, (d) triggers `BEFORE DELETE` em `despesas` e `reembolsos` que deletam links correspondentes, (e) INSERTs de migração de `boleto_url` → `links` com `rotulo = 'Boleto'` e `comprovante_url` → `links` com `rotulo = 'Comprovante'`, (f) `ALTER TABLE despesas DROP COLUMN boleto_url` e `DROP COLUMN comprovante_url`
- [X] T006 Criar diretório `drizzle/rollbacks/` e escrever script `drizzle/rollbacks/XXXX_rollback_links.sql` com o rollback completo conforme `plan.md` (recriar colunas, restaurar URLs, remover triggers e tabela)
- [X] T007 [US5] Aplicar a migration localmente (`npx tsx scripts/migrar.ts`) e verificar: schema sem `boleto_url`/`comprovante_url` via `npx tsx scripts/verificar-schema.ts`; contagem de linhas em `links` igual à soma de `boleto_url IS NOT NULL` e `comprovante_url IS NOT NULL` antes da migration

**Checkpoint**: Banco local com tabela `links` e dados migrados; colunas antigas removidas de `despesas`.

---

## Phase 3: User Story 1 — Adicionar link a uma despesa (P1) 🎯 MVP

**Goal**: Usuário abre uma despesa e adiciona um ou mais links com URL e rótulo opcional.

**Independent Test**: Abrir uma despesa, adicionar dois links com URLs e rótulos distintos, salvar, recarregar a página e confirmar que ambos persistem.

- [X] T008 [US1] Criar `src/components/LinksList.tsx` — recebe `entidadeTipo: 'despesa' | 'reembolso'`, `entidadeId: string`, `rateioId: string`; carrega links via `listarLinks`; exibe lista com URL clicável (abre em nova aba via `target="_blank" rel="noopener noreferrer"`), rótulo (se houver) e botão de remover; exibe estado vazio "Nenhum link adicionado" quando a lista estiver vazia; usa tokens semânticos do design system (`bg-surface`, `text-on-surface`, `text-primary`, etc.) — sem hex hardcoded
- [X] T009 [US1] Adicionar formulário de adição dentro de `LinksList.tsx`: campo de URL (obrigatório, validado: deve começar com `http://` ou `https://` — rejeitar qualquer outro esquema com mensagem "URL inválida. Use http:// ou https://"), campo de rótulo (opcional, texto livre), botão "Adicionar link"; ao submeter, chamar `adicionarLink` e atualizar a lista localmente sem recarregar a página inteira
- [X] T010 [US1] Integrar `LinksList` na tela de detalhe de despesa em `src/routes/DetalheRateio.tsx`: exibir seção "Links" abaixo dos dados da despesa, passando `entidadeTipo='despesa'`, `entidadeId=despesa.id`, `rateioId=rateio.id`

**Checkpoint**: US1 completa — adicionar links a uma despesa funciona end-to-end (quickstart.md, etapa 2 e 3).

---

## Phase 4: User Story 2 — Remover link de uma despesa (P1)

**Goal**: Usuário remove um link individual de uma despesa sem afetar os demais.

**Independent Test**: Despesa com dois links. Remover um. Recarregar e confirmar que apenas o outro permanece.

- [X] T011 [US2] Implementar o botão "Remover" no componente `LinksList.tsx` (já scaffolded em T008): ao clicar, chamar `removerLink(link.id)` e remover o item da lista local imediatamente; confirmar antes de remover com estado de loading no botão para evitar double-click
- [X] T012 [US2] Tratar o caso de lista vazia após remoção: quando o último link for removido, exibir o estado vazio "Nenhum link adicionado" em `LinksList.tsx`

**Checkpoint**: US2 completa — remover links funciona; nenhum link é removido acidentalmente (quickstart.md, etapa 4).

---

## Phase 5: User Story 4 — Visualizar links de um lançamento (P2)

**Goal**: Usuário vê todos os links de uma despesa ou reembolso; URLs são clicáveis e abrem em nova aba.

**Independent Test**: Despesa com dois links. Confirmar que ambos aparecem com rótulo e URL clicável.

- [X] T013 [P] [US4] Verificar que `LinksList.tsx` renderiza URLs como `<a href={link.url} target="_blank" rel="noopener noreferrer">` e que o rótulo aparece antes da URL (ou como legenda); URLs sem rótulo exibem a URL diretamente como texto do link
- [X] T014 [P] [US4] Verificar que o estado vazio (`links.length === 0`) exibe mensagem "Nenhum link adicionado" visível na `LinksList.tsx` — sem espaço em branco sem explicação

**Checkpoint**: US4 completa — links visíveis e clicáveis em despesas (quickstart.md, etapa 2).

---

## Phase 6: User Story 3 — Adicionar link a um reembolso (P2)

**Goal**: Usuário adiciona e visualiza links em um reembolso.

**Independent Test**: Abrir um reembolso, adicionar um link, recarregar e verificar que persiste.

- [X] T015 [US3] Integrar `LinksList` na tela de detalhe de reembolso em `src/routes/DetalheRateio.tsx`: exibir seção "Links" abaixo dos dados do reembolso, passando `entidadeTipo='reembolso'`, `entidadeId=reembolso.id`, `rateioId=rateio.id`

**Checkpoint**: US3 completa — links de reembolsos funcionam com o mesmo componente reutilizado (quickstart.md, etapa 5).

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: Validação final, qualidade e verificação de regressão.

- [ ] T016 Executar o guia de validação completo conforme `quickstart.md` (etapas 1–8): migration, add/remove links em despesa, link inválido, links em reembolso, cascade delete, RLS
- [X] T017 [P] Executar `npm run build` e confirmar que não há erros de TypeScript relacionados a `boleto_url`/`comprovante_url` removidos
- [X] T018 [P] Executar `npm run test:coverage` e confirmar que os thresholds de 90% são mantidos

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependência — iniciar imediatamente
- **Foundational (Phase 2)**: Depende de Phase 1 completa — T005 depende de T002
- **Phase 3 (US5)**: Depende de Phase 2 — BLOQUEIA testes de UI em produção
- **Phase 4 (US1)**: Depende de Phase 2 e Phase 3 — banco com tabela `links` existente
- **Phase 5 (US2)**: Depende de T008 (US1) — botão de remover está no mesmo componente
- **Phase 6 (US4)**: Pode ser validada em paralelo com Phase 5, pois a visualização é parte da Phase 4
- **Phase 7 (US3)**: Depende de Phase 4 — componente `LinksList.tsx` precisa existir
- **Phase 8 (Polish)**: Depende de todas as user stories concluídas

### Dentro de cada fase

- T003 e T004 podem rodar em paralelo (arquivos diferentes)
- T013 e T014 podem rodar em paralelo (ambos em `LinksList.tsx` mas são verificações independentes)
- T017 e T018 podem rodar em paralelo

### Dependências entre tarefas

| Tarefa | Depende de |
|--------|-----------|
| T002 | T001 |
| T003 | T001 |
| T004 | T001 |
| T005 | T002 |
| T007 | T005, T006 |
| T009 | T008 |
| T010 | T008, T004 |
| T011 | T008 |
| T012 | T011 |
| T013 | T008 |
| T014 | T008 |
| T015 | T008, T004 |
| T016 | T007, T010, T011, T012, T013, T014, T015 |
| T017 | T003, T004 |
| T018 | T016 |

---

## Parallel Example: Phase 1

```
Podem rodar em paralelo após T001 e T002:
  T003 — remover boleto_url/comprovante_url de queries.ts
  T004 — adicionar LinkItem e funções de links em queries.ts
```

---

## Implementation Strategy

### MVP (User Stories US5 + US1 + US2)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (migration + rollback)
3. Completar Phase 3: Validar migration (US5)
4. Completar Phase 4: Adicionar links a despesas (US1)
5. Completar Phase 5: Remover links de despesas (US2)
6. **PARAR e VALIDAR**: Testar US5+US1+US2 independentemente
7. Deploy possível neste ponto

### Entrega Incremental

1. Setup + Foundational → banco pronto
2. US5 validada → dados migrados sem perda
3. US1+US2 → links em despesas funcionam → Deploy/Demo
4. US4 → visualização confirmada (parte de US1, mínimo de trabalho extra)
5. US3 → links em reembolsos → Deploy/Demo
6. Polish → qualidade e cobertura

---

## Notes

- [P] = arquivos diferentes, sem dependência de tarefa incompleta
- [Story] = rastreabilidade com user story da spec.md
- Nenhuma URL com hex hardcoded — usar tokens do design system
- Nunca usar `number` para valores financeiros — não se aplica aqui (links não têm campos monetários)
- Commit após cada fase ou grupo lógico
- `drizzle/rollbacks/` NÃO é um diretório de migration Drizzle — não rodar via `db:migrate`
