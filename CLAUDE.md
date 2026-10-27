# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Navigation

Start here for context; then read `.ai/README.md` for the full documentation map.

| File | Purpose |
|------|---------|
| `.ai/README.md` | Index of all `.ai/` documentation |
| `.ai/context/status.md` | What is implemented, what is open |
| `.ai/context/spec.md` | Functional specification |
| `.ai/context/constitution.md` | Design principles and anti-patterns |
| `.ai/context/financial-model.md` | Financial model: Forma B, IPCA, worked examples |
| `.ai/design/design.md` | Color tokens, typography, component specs |
| `.ai/deploy/deploy.md` | Vercel, GitHub Actions, env vars |

### Folder boundaries

| Folder | Owner | Purpose |
|--------|-------|---------|
| `.ai/` | human | canonical project documentation |
| `.ai/briefs/` | human | pre-analyzed implementation briefs (one file per feature) |
| `specs/` | Spec Kit | generated artifacts — do not edit manually |
| `.specify/` | Spec Kit | internal infrastructure — do not touch |

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_NEON_DATA_API_URL` | Vercel + `.env.local` | Neon Data API endpoint (front-end) |
| `VITE_NEON_AUTH_URL` | Vercel + `.env.local` | Neon Auth endpoint (front-end) |
| `DATABASE_URL` | `.env.local` only | Direct Postgres connection for migration scripts |
| `NEON_API_KEY` | GitHub Actions secret | Used by IPCA and backup workflows |

`VITE_*` variables are inlined at build time — they are not runtime secrets. Never put `DATABASE_URL` or service-role keys in Vercel env vars.

## Commands

```bash
npm run dev           # dev server (http://localhost:5173/)
npm run build         # tsc -b && vite build
npm test              # vitest watch
npm run test:coverage # vitest run --coverage
npm run lint          # oxlint

# Run a single test file
npx vitest run src/core/__tests__/saldo.test.ts

# Database scripts (need DATABASE_URL in .env.local)
npx tsx scripts/migrar.ts          # apply all SQL migrations
npx tsx scripts/verificar-schema.ts
node scripts/seed-taxas.mjs   # seed IPCA rates from BCB

# Drizzle
npm run db:generate   # generate migration from schema changes
npm run db:studio     # Drizzle Studio UI
```

## Architecture

### Data flow

The front-end never holds a database connection string. It communicates with Neon via two URLs set at build time (`VITE_NEON_AUTH_URL`, `VITE_NEON_DATA_API_URL`):

- **Auth**: Neon Auth (Better Auth) — `src/db/auth.ts` wraps `neon.auth.*`. `useUser()` is the auth hook used by route guards. After every login/signup, `garantirUsuario(email)` must be called to ensure the `users` table is populated (avoids FK violations).
- **Data**: PostgREST-style Neon Data API — `src/db/queries.ts` wraps every query and RPC call. All queries go through `neon` (from `src/db/client.ts`), which injects the user's JWT automatically so RLS always applies.

### Source layout

```
src/
  core/          # pure financial calculation — no UI, no DB, no side effects
    decimal.ts   # re-exports decimal.js `Decimal` as `D`
    indice.ts    # IPCA index at a given date, with daily pro-rata
    unidades.ts  # paraUnidades() / paraReais() — convert BRL ↔ corrected units
    saldo.ts     # calcularSaldo() — the Forma B balance model
    __tests__/   # vitest tests against oracle fixtures in __tests__/fixtures/
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

`createBrowserRouter` (HTML5 history) is used throughout. `vercel.json` has a catch-all rewrite `"/(.*)" → "/index.html"` that makes deep links work. All routes with `:id` segments are for a specific `rateio_id` (UUID).

### Auth and access

- **Signup is restricted**: registration is gated by an email allowlist in Neon Auth — do not implement open signup.
- **`garantirUsuario(email)`** must be called after every login/signup to populate the `users` table; Neon Auth does not do this automatically. FK violations occur if skipped.
- **Google OAuth** is supported via `signInWithGoogle()` in `src/db/auth.ts`.
- JWT is injected automatically by the `neon` client from `src/db/client.ts` — all Data API calls carry the user's token and RLS enforces row-level access.

### GitHub Actions

Two workflows run on GitHub (not Vercel) and must stay there:

| Workflow | Schedule | Purpose |
|----------|----------|---------|
| `ipca.yml` | Days 9–15 of each month | Fetches BCB series 433, upserts into `taxas_ipca` via `ipca_writer` role |
| `backup.yml` | Weekly | `pg_dump` saved as a GitHub Actions artifact |

Workflows are disabled by GitHub after 60 days of repo inactivity — re-enable manually if needed.

### Financial calculation model (Forma B)

The core model lives entirely in `src/core/saldo.ts:calcularSaldo()`. It is a pure function — no I/O — so it can be tested in isolation.

Key concepts:
- **Unidades**: a correction-normalized unit. When `corrigir_ipca=true`, `BRL / indice(date)` converts a payment to units; `units × indice(today)` converts back to today's BRL. When `corrigir_ipca=false`, 1 unit = 1 BRL.
- **U_total**: sum of all _paid_ despesas in units (only `data ≤ hoje`).
- **Compromisso**: each participant's obligation = `cota × U_total`.
- **Pago efetivo**: units actually paid by each participant (despesas paid) + reembolsos (move credit between participants, already in `pago_efetivo` — never subtracted again).
- **Excesso/Déficit**: `pago_efetivo - compromisso`. The `deve(i→j)` amounts distribute deficit proportionally to excess; this is the net transfer.

Invariants: `Σ excesso = Σ déficit` and `Σ saldo = 0`. Tests in `src/core/__tests__/` verify these and numeric oracles from `src/core/__tests__/fixtures/test-cases-np.json`.

### Database schema (Postgres / Drizzle)

Tables: `users`, `rateios`, `membros`, `despesas`, `reembolsos`, `taxas_ipca`, `config`.

Critical design decisions in the schema:
- A despesa has no `situacao` column — "paid" is derived: `data ≤ hoje`.
- `Σ cota = 1` per rateio is enforced by a Postgres trigger (not a Drizzle CHECK — Drizzle doesn't support cross-row constraints without extension).
- Rateio creation uses the RPC `criar_rateio` for atomicity (rateio + membros in one transaction).
- User lookup by email uses a `SECURITY DEFINER` RPC `buscar_usuario_por_email` — RLS on `users` stays row-level, no broad reads.
- `taxas_ipca` is written only by the `ipca_writer` Postgres role — never seed it via app code.
- `config` table stores global settings, notably `serie_ipca` (default BCB series ID: 433). Read from DB, do not hardcode.

Migrations live in `drizzle/migrations/` and are applied by `scripts/migrar.ts` (direct Postgres connection).

### Design system

All colors are CSS custom properties mapped as Tailwind tokens in `tailwind.config.ts`. **Never use hardcoded hex values in components.** Use semantic tokens like `bg-surface`, `text-on-surface`, `text-primary`, `bg-error`, etc. Dark mode is `darkMode: "class"` — applied by `ThemeProvider.tsx`.

Design reference: `.ai/design/design.md` (color tokens, typography, spacing, component specs).

Icons use Material Symbols (Outlined/Filled), loaded from CDN via `index.html`.

## After every push

Run `gh run list --limit 5` to check CI status. If any run shows `failure`, run `gh run view <id> --log-failed` to diagnose and fix before continuing other work.

## Key constraints

- **Never use `number` for money or indices** — always `decimal.js`. The `D()` helper is the canonical constructor.
- **All financial logic must go through `src/core/`**, not inline in components or queries.
- **New schema changes require a Drizzle migration** — never apply manual DDL in production without a corresponding migration file.
- **RLS is non-negotiable** — every new table needs Row Level Security policies. Test them.
- Despesas with `data > hoje` are "previstas" (projected) — they must be excluded from `U_total` and all balance calculations.
- Cotas are mutable parameters, not historical facts. Changing a cota recomputes all balances from history — this is intentional.
