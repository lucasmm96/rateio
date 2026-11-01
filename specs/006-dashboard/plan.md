# Implementation Plan: Dashboard de Métricas

**Branch**: `006-dashboard` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-dashboard/spec.md`

## Summary

Nova rota `/dashboard` que exibe 3 cards de métricas consolidadas (total pago, total previsto, total a acertar) de todos os rateios ativos do usuário. O cálculo reutiliza `calcularSaldo()` de `src/core/saldo.ts` sem nova lógica financeira. Navegação integrada via BottomNav e Sidebar.

## Technical Context

**Language/Version**: TypeScript 5 / React 18

**Primary Dependencies**: Neon Data API, `src/core/saldo.ts` (existente), `src/db/queries.ts` (existente), Tailwind CSS

**Storage**: Sem alteração de schema — usa queries existentes (`listarRateios`, `listarDespesas`, `listarTaxasIpca`).

**Testing**: Lógica de agregação das métricas extraída para função pura em `src/core/` — testável via Vitest com dados fixos.

**Target Platform**: Browser (SPA)

**Performance Goals**: Renderizar as 3 métricas em menos de 3 segundos em conexão normal. O carregamento é paralelo (N+1 evitado via Promise.all).

**Constraints**: Nenhum hex hardcoded; reutilizar `calcularSaldo()` sem duplicar lógica; sem nova tabela ou migration.

**Scale/Scope**: Tela lida uma vez por sessão; volume de dados proporcional ao número de rateios do usuário (tipicamente 1–5).

## Constitution Check

| Princípio | Status | Observação |
|-----------|--------|-----------|
| 1. Cálculo em módulo puro | ✅ | Função `calcularMetricas()` extraída em `src/core/dashboard.ts` — sem cálculo no componente |
| 2. Dinheiro em Decimal | ✅ | Reutiliza `D()`, `saldoEmReais()`, `paraReais()` existentes |
| 4. Só pago é corrigido | ✅ | "Total pago" e "Total previsto" são nominais; "Total a acertar" usa `saldoEmReais()` |
| 5. RLS obrigatório | ✅ | Sem tabela nova; queries existentes já respeitam RLS |
| 6. Schema versionado | ✅ | Nenhuma migration necessária |
| 10. Modelo de dados mínimo | ✅ | Dados derivados de queries existentes; nenhuma coluna nova |
| 14. Terminologia explícita | ✅ | "total pago", "total previsto", "total a acertar" definidos em spec |
| 16. Tokens de design | ✅ | Sem hex hardcoded; usar `text-on-surface`, `text-primary`, `text-error`, `bg-surface-container` |

**Gate**: aprovado — sem violações.

## Architectural Decisions

### 1. Onde vive o cálculo das métricas

**Decisão**: criar `src/core/dashboard.ts` com `calcularMetricas(rateios, userId, hoje, taxas)` — função pura que recebe todos os dados já carregados e retorna `{ totalPago, totalPrevisto, totalAcertar }` como `Decimal`.

**Motivo**: Princípio 1 da constitution — nenhum cálculo financeiro no componente. A função é testável de forma isolada com fixtures.

**Alternativa rejeitada**: Calcular inline no componente. Viola o princípio 1 e impede testes unitários.

### 2. Carregamento dos dados

**Decisão**: usar `Promise.all` para buscar em paralelo os dados de todos os rateios (despesas + taxas). Todas as queries são feitas no mount do componente via `useAsync`.

**Motivo**: Minimiza latência quando o usuário tem vários rateios.

**Nota**: Para N rateios, serão N+1 chamadas (1 para lista de rateios + N para despesas de cada rateio). Aceitável para o volume atual (tipicamente ≤ 5 rateios).

### 3. Navegação

**Decisão**: adicionar item "Dashboard" ao BottomNav (mobile) e ao Sidebar (desktop/tablet), antes do item atual "Home" ou após, conforme ordem lógica.

**Motivo**: FR-007 exige alcançabilidade com 1 clique. O BottomNav e Sidebar já existem como pontos centrais de navegação.

## Project Structure

### Documentation (this feature)

```text
specs/006-dashboard/
├── spec.md
├── plan.md              ← este arquivo
├── checklists/
│   └── requirements.md
└── tasks.md             ← gerado pelo /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── core/
│   └── dashboard.ts          ← nova: calcularMetricas() função pura
├── routes/
│   └── Dashboard.tsx          ← nova: tela com 3 cards de métricas
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx        ← + item "Dashboard"
│   └── ui/
│       └── BottomNav.tsx      ← + item "Dashboard"
└── App.tsx                    ← + rota /dashboard com RequireAuth
```

**Nenhuma migration Drizzle necessária.**

## Implementation Notes

- `calcularMetricas()` deve iterar pelos rateios ativos do usuário:
  - `totalPago`: filtrar despesas onde `pagador_user_id === userId` e `data <= hoje`; somar `.valor` com `D()`
  - `totalPrevisto`: filtrar despesas onde `data > hoje`; somar `.valor` com `D()`
  - `totalAcertar`: para cada rateio, chamar `calcularSaldo()` + `saldoEmReais(resultado, userId, hoje, corrigir, taxas)`; somar algebricamente
- Rateios arquivados (`arquivado_em !== null`) são excluídos por `listarRateios()` que já filtra por `.is('arquivado_em', null)`
- Taxas IPCA: uma única chamada a `listarTaxasIpca()` compartilhada por todos os rateios
- Tokens de design para os cards: `bg-surface-container` para fundo, `text-on-surface-variant` para label, `text-on-surface` para valor, `text-primary`/`text-error` para acertar positivo/negativo
