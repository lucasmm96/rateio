# Feature Specification: Dashboard de Métricas

**Feature Branch**: `006-dashboard`

**Created**: 2026-11-01

**Status**: Draft

**Input**: D-008 — Dashboard com 3 métricas (total pago, total previsto, total a acertar). Nova aba em `/dashboard`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver Métricas Globais (Priority: P1)

Um usuário autenticado acessa `/dashboard` e vê 3 cards com métricas consolidadas de todos os seus rateios ativos:
- **Total pago**: soma nominal das despesas já pagas (data ≤ hoje) em que o usuário é pagador, em todos os rateios.
- **Total previsto**: soma nominal de todas as despesas futuras (data > hoje) nos rateios do usuário.
- **Total a acertar**: saldo líquido do usuário (soma dos saldos por rateio, com correção IPCA onde aplicável).

**Why this priority**: Essas 3 métricas são o resumo executivo do estado financeiro do usuário. Permitem responder "quanto já gastei?", "quanto está planejado?" e "o que ainda preciso resolver?" sem entrar em cada rateio individualmente.

**Independent Test**: Criar despesas em dois rateios distintos, navegar para `/dashboard` e verificar que os cards somam corretamente os valores.

**Acceptance Scenarios**:

1. **Given** um usuário membro de 2 rateios com despesas pagas, **When** acessa `/dashboard`, **Then** o card "Total pago" exibe a soma nominal de todas as despesas em que ele é pagador com data ≤ hoje.
2. **Given** despesas com data > hoje, **When** o usuário acessa `/dashboard`, **Then** elas aparecem em "Total previsto" e não em "Total pago".
3. **Given** um rateio com `corrigir_ipca=true`, **When** o usuário acessa o dashboard, **Then** o card "Total a acertar" reflete o saldo corrigido pelo IPCA daquele rateio.
4. **Given** um usuário sem nenhum rateio, **When** acessa `/dashboard`, **Then** os 3 cards exibem R$0,00 e uma mensagem orienta a criar o primeiro rateio.
5. **Given** saldo a acertar positivo, **When** exibido no dashboard, **Then** aparece com indicação visual de "você deve"; negativo indica "você tem a receber".

---

### User Story 2 - Navegar para o Dashboard (Priority: P2)

A partir de qualquer tela autenticada, o usuário consegue acessar `/dashboard` com no máximo 1 clique via navegação global (BottomNav no mobile, Sidebar no desktop).

**Why this priority**: A tela só tem valor se for alcançável sem digitar URL.

**Independent Test**: Verificar que o item "Dashboard" existe e funciona no BottomNav e no Sidebar.

**Acceptance Scenarios**:

1. **Given** qualquer tela autenticada no mobile, **When** o usuário toca em "Dashboard" no BottomNav, **Then** é navegado para `/dashboard`.
2. **Given** um desktop com Sidebar, **When** o usuário clica no link "Dashboard", **Then** é navegado para `/dashboard`.

---

### Edge Cases

- Usuário sem rateios: 3 cards com R$0,00 + mensagem "Crie seu primeiro rateio para ver métricas".
- Rateio arquivado (`arquivado_em IS NOT NULL`): excluído de todos os cálculos.
- Carregamento lento: exibir skeleton nos 3 cards enquanto os dados são buscados.
- Falha na busca: exibir estado de erro com botão de retry, sem crash.
- "Total a acertar" zero: exibir com formatação neutra (sem destaque de devedor/credor).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE disponibilizar a rota `/dashboard` acessível somente a usuários autenticados.
- **FR-002**: O dashboard DEVE exibir "Total pago": soma de `despesas.valor` (nominal) onde `pagador_user_id = user.id` e `data ≤ hoje`, nos rateios não-arquivados do usuário.
- **FR-003**: O dashboard DEVE exibir "Total previsto": soma de `despesas.valor` (nominal) onde `data > hoje`, nos rateios não-arquivados do usuário, independentemente de quem é o pagador.
- **FR-004**: O dashboard DEVE exibir "Total a acertar": soma algébrica de `saldoEmReais(user, hoje)` calculada por `calcularSaldo()` para cada rateio, respeitando `corrigir_ipca` de cada um.
- **FR-005**: Sinal do "Total a acertar": positivo = usuário deve; negativo = usuário tem a receber. O card DEVE indicar essa distinção visualmente.
- **FR-006**: Rateios arquivados DEVEM ser excluídos de todos os cálculos.
- **FR-007**: O dashboard DEVE ter link no BottomNav (mobile) e no Sidebar (desktop), acessível com 1 clique.
- **FR-008**: O sistema DEVE exibir estado de loading enquanto os dados são carregados.
- **FR-009**: O sistema DEVE exibir estado de erro recuperável (com retry) se a busca falhar.

### Key Entities

- **Rateio ativo**: rateio com `arquivado_em IS NULL` e do qual o usuário é membro.
- **Despesa paga**: despesa com `data ≤ hoje` (sem coluna `situacao` — derivado em runtime).
- **Despesa prevista**: despesa com `data > hoje`.
- **Saldo por rateio**: resultado de `calcularSaldo()` + `saldoEmReais(userId, hoje)` para o rateio.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O usuário vê as 3 métricas corretas em menos de 3 segundos em conexão normal.
- **SC-002**: As métricas são alcançáveis com no máximo 1 clique a partir de qualquer tela autenticada.
- **SC-003**: 100% das despesas pagas e previstas do usuário estão refletidas nas métricas corretas.
- **SC-004**: O "Total a acertar" é matematicamente consistente com a soma dos saldos individuais exibidos em cada `DetalheRateio`.

## Assumptions

- "Total pago" e "Total previsto" usam valores nominais (sem correção IPCA), pois correção só se aplica ao que foi pago na perspectiva do cálculo de saldo (princípio 4 da constitution).
- "Total a acertar" usa correção IPCA para rateios com `corrigir_ipca=true`, pois reflete o saldo atual corrigido.
- O cálculo do saldo por rateio reutiliza `calcularSaldo()` de `src/core/saldo.ts` — nenhuma nova lógica financeira.
- Rateios arquivados não aparecem no dashboard.
- Não há filtro por período nesta versão; inclui todo o histórico.
- A tela de dashboard não substitui `DetalheRateio` — é visão consolidada de alto nível.
