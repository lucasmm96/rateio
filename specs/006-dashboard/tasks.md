# Tasks: Dashboard de Métricas

**Input**: Design documents from `specs/006-dashboard/`

**Prerequisites**: plan.md, spec.md

**Organization**: Tasks agrupadas por user story para implementação e teste independente.

---

## Phase 1: Core — Função Pura de Métricas

**Purpose**: Criar `calcularMetricas()` em `src/core/dashboard.ts` — bloqueante para a tela.

- [ ] T001 Criar `src/core/dashboard.ts` exportando `calcularMetricas(rateios, userId, hoje, taxas)`: retorna `{ totalPago: Decimal, totalPrevisto: Decimal, totalAcertar: Decimal }`. Lógica:
  - `totalPago`: soma de `D(d.valor)` onde `d.pagador_user_id === userId && d.data <= hoje`, iterando todos os rateios
  - `totalPrevisto`: soma de `D(d.valor)` onde `d.data > hoje`, iterando todos os rateios
  - `totalAcertar`: para cada rateio, chamar `calcularSaldo()` + `saldoEmReais(resultado, userId, hoje, rateio.corrigir_ipca, taxas)`; somar algebricamente

- [ ] T002 [P] Criar teste unitário `src/core/__tests__/dashboard.test.ts` cobrindo:
  - 2 rateios com despesas pagas e previstas — verificar soma correta
  - Rateio com corrigir_ipca=true — verificar que totalAcertar usa valor corrigido
  - Usuário sem despesas — verificar que os 3 retornam D(0)
  - Invariante: totalAcertar com apenas 2 participantes bate com o saldo do rateio

**Checkpoint**: `npm run test:coverage` passa com novos testes; função retorna valores corretos para os fixtures.

---

## Phase 2: User Story 1 — Tela de Dashboard

**Purpose**: Criar `src/routes/Dashboard.tsx` e registrar a rota `/dashboard`.

- [ ] T003 Criar `src/routes/Dashboard.tsx` com componente `Component`:
  - `useAsync` busca `listarRateios()` + `listarTaxasIpca()` em paralelo via `Promise.all`
  - Para cada rateio, busca `listarDespesas(rateio.id)` e `listarReembolsos(rateio.id)` em paralelo
  - Monta estruturas `Rateio` para `calcularSaldo()` e agrega com `calcularMetricas()`
  - Exibe 3 cards: "Total pago" (neutral), "Total previsto" (neutral), "Total a acertar" (primary se positivo / error se negativo / neutral se zero)
  - Estado de loading: skeleton nos 3 cards
  - Estado de erro: ícone + mensagem + botão retry
  - Estado vazio (sem rateios): mensagem "Crie seu primeiro rateio para ver métricas" com link para `/novo-rateio`

- [ ] T004 Registrar rota `/dashboard` em `src/App.tsx`: lazy import de `./routes/Dashboard.tsx` envolta em `RequireAuth`, seguindo o padrão das demais rotas protegidas

**Checkpoint**: Acessar `/dashboard` exibe os 3 cards com valores corretos para os rateios do usuário; loading e erro funcionam.

---

## Phase 3: User Story 2 — Navegação Global

**Purpose**: Tornar o dashboard alcançável com 1 clique.

- [ ] T005 [P] Atualizar `src/components/ui/BottomNav.tsx`: adicionar item `{ to: '/dashboard', label: 'Dashboard', icon: 'dashboard' }` ao array `NAV_ITEMS`

- [ ] T006 [P] Atualizar `src/components/layout/Sidebar.tsx`: adicionar link `NavLink to="/dashboard"` com ícone `dashboard` e label "Dashboard" na lista de navegação

**Checkpoint**: Link "Dashboard" visível e funcional no BottomNav (mobile) e Sidebar (desktop).

---

## Phase 4: Polish e Validação

- [ ] T007 [P] Verificar formatação dos valores em BRL: usar `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` consistente com o restante do app
- [ ] T008 [P] Testar no browser: login → Dashboard → verificar 3 métricas batem com DetalheRateio de cada rateio
- [ ] T009 [P] Rodar `npm run test:coverage` e confirmar thresholds 90% atingidos
- [ ] T010 Atualizar `.ai/planning/STATUS.md`: D-008 → ✅ com data

---

## Dependencies & Execution Order

### Dependências entre phases

- **Phase 1 (Core)**: sem dependências — iniciar imediatamente
- **Phase 2 (Tela)**: depende de T001 (função `calcularMetricas`)
- **Phase 3 (Navegação)**: pode rodar em paralelo com Phase 2 (arquivos diferentes)
- **Phase 4 (Polish)**: após Phases 1–3 prontas

### Dependências internas

- T001 → T003 (tela importa `calcularMetricas`)
- T002: paralelo a T001 (escrever teste ao mesmo tempo que a função, ou após)
- T003 → T004 (router precisa do componente)
- T005 e T006: independentes entre si e de Phase 2

### Oportunidades de paralelismo

```bash
# Phase 1: T001 e T002 podem rodar juntos
# Phase 2: T003 → T004 (sequencial)
# Phase 3: T005 e T006 paralelos entre si e com T003
# Phase 4: T007, T008, T009 paralelos
```

---

## Implementation Strategy

### MVP (User Story 1 apenas)

1. T001 (função pura) → T003 (tela) → T004 (rota)
2. Parar e validar: dashboard mostra métricas corretas
3. Deploy/demo antes de adicionar navegação

### Entrega incremental

1. Phase 1 → cálculo verificado com testes
2. Phase 2 → tela acessível via URL direta
3. Phase 3 → navegação integrada
4. Phase 4 → polish e cobertura

---

## Notes

- Nenhuma migration Drizzle necessária — não tocar em `drizzle/` nem em `src/db/schema.ts`
- Tokens de design obrigatórios: `bg-surface-container`, `text-on-surface`, `text-primary`, `text-error` — nunca hex hardcoded
- Ícone sugerido para os cards: `payments` (total pago), `schedule` (previsto), `account_balance_wallet` (a acertar)
- Após cada push: `gh run list --limit 5` para verificar CI
