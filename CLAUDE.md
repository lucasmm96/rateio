# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # dev server (http://localhost:5173/rateio/)
pnpm build            # tsc -b && vite build
pnpm test             # vitest watch
pnpm test:coverage    # vitest run --coverage
pnpm lint             # oxlint

# Run a single test file
pnpm exec vitest run src/core/__tests__/saldo.test.ts

# Database scripts (need DATABASE_URL in .env.local)
pnpm exec tsx scripts/migrar.ts          # apply all SQL migrations
pnpm exec tsx scripts/verificar-schema.ts
pnpm exec node scripts/seed-taxas.mjs   # seed IPCA rates from BCB

# Drizzle
pnpm db:generate   # generate migration from schema changes
pnpm db:studio     # Drizzle Studio UI
```

## Architecture

### Data flow

The front-end never holds a database connection string. It communicates with Neon via two URLs set at build time (`VITE_NEON_AUTH_URL`, `VITE_NEON_DATA_API_URL`):

- **Auth**: Neon Auth (Better Auth) — `src/db/auth.ts` wraps `neon.auth.*`. `useUser()` is the auth hook used by route guards.
- **Data**: PostgREST-style Neon Data API — `src/db/queries.ts` wraps every query and RPC call. All queries go through `neon` (from `src/db/client.ts`), which injects the user's JWT automatically so RLS always applies.

### Source layout

```
src/
  core/          # pure financial calculation — no UI, no DB, no side effects
    decimal.ts   # re-exports decimal.js `Decimal` as `D`
    indice.ts    # IPCA index at a given date, with daily pro-rata
    unidades.ts  # paraUnidades() / paraReais() — convert BRL ↔ corrected units
    saldo.ts     # calcularSaldo() — the Forma B balance model
    __tests__/   # vitest tests against oracle data in .ai/
  db/
    schema.ts    # Drizzle schema (source of truth for table shapes)
    client.ts    # neon client singleton
    auth.ts      # auth helpers
    queries.ts   # all Data API calls, typed
  routes/        # one file per page, exported as `Component`
  components/
    ui/          # Button, Card, Input, etc. — design-system primitives
    ThemeProvider.tsx
  hooks/
    useAsync.ts
```

### Routing

Hash routing (`createHashRouter`) is used throughout — required for GitHub Pages, which can't handle HTML5 history rewrites. All routes with `:id` segments are for a specific `rateio_id` (UUID).

### Financial calculation model (Forma B)

The core model lives entirely in `src/core/saldo.ts:calcularSaldo()`. It is a pure function — no I/O — so it can be tested in isolation.

Key concepts:
- **Unidades**: a correction-normalized unit. When `corrigir_ipca=true`, `BRL / indice(date)` converts a payment to units; `units × indice(today)` converts back to today's BRL. When `corrigir_ipca=false`, 1 unit = 1 BRL.
- **U_total**: sum of all _paid_ despesas in units (only `data ≤ hoje`).
- **Compromisso**: each participant's obligation = `cota × U_total`.
- **Pago efetivo**: units actually paid by each participant (despesas paid) + reembolsos (move credit between participants, already in `pago_efetivo` — never subtracted again).
- **Excesso/Déficit**: `pago_efetivo - compromisso`. The `deve(i→j)` amounts distribute deficit proportionally to excess; this is the net transfer.

Invariants: `Σ excesso = Σ déficit` and `Σ saldo = 0`. Tests in `src/core/__tests__/` verify these and numeric oracles from `.ai/casos-de-teste-n-pessoas.json`.

### Database schema (Postgres / Drizzle)

Tables: `users`, `rateios`, `membros`, `despesas`, `reembolsos`, `taxas_ipca`, `config`.

Critical design decisions in the schema:
- A despesa has no `situacao` column — "paid" is derived: `data ≤ hoje`.
- `Σ cota = 1` per rateio is enforced by a Postgres trigger (not a Drizzle CHECK — Drizzle doesn't support cross-row constraints without extension).
- Rateio creation uses the RPC `criar_rateio` for atomicity (rateio + membros in one transaction).
- User lookup by email uses a `SECURITY DEFINER` RPC `buscar_usuario_por_email` — RLS on `users` stays row-level, no broad reads.
- `taxas_ipca` is written only by the `ipca_writer` Postgres role, which has no access to user data.

Migrations live in `drizzle/migrations/` and are applied by `scripts/migrar.ts` (direct Postgres connection).

### Design system

All colors are CSS custom properties mapped as Tailwind tokens in `tailwind.config.ts`. **Never use hardcoded hex values in components.** Use semantic tokens like `bg-surface`, `text-on-surface`, `text-primary`, `bg-error`, etc. Dark mode is `darkMode: "class"` — applied by `ThemeProvider.tsx`.

Design reference: `.ai/design/DESIGN.md` (color tokens, typography, spacing, component specs) and `.ai/design/screens/*.html` (visual mockups — reference only, not code to copy).

Icons use Material Symbols (Outlined/Filled), loaded from CDN via `index.html`.

## Key constraints

- **Never use `number` for money or indices** — always `decimal.js`. The `D()` helper is the canonical constructor.
- **All financial logic must go through `src/core/`**, not inline in components or queries.
- **New schema changes require a Drizzle migration** — never apply manual DDL in production without a corresponding migration file.
- **RLS is non-negotiable** — every new table needs Row Level Security policies. Test them.
- Despesas with `data > hoje` are "previstas" (projected) — they must be excluded from `U_total` and all balance calculations.
- Cotas are mutable parameters, not historical facts. Changing a cota recomputes all balances from history — this is intentional.
