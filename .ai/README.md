# .ai/ — Source of truth for AI

Human-authored project documentation. Start here in any AI session.

## Structure

```
.ai/
  README.md          ← this file (start here)
  context/
    spec.md          ← functional specification (what the system does)
    constitution.md  ← design principles and anti-patterns
    status.md        ← implementation phases done + open items
    financial-model.md ← Forma B math, IPCA mechanics, worked examples
  briefs/
    README.md        ← how to write and use briefs
    *.md             ← one file per feature, pre-analyzed and ready to implement
  design/
    design.md        ← color tokens, typography, spacing, component specs
    responsive.md    ← responsive layout guidelines
  deploy/
    deploy.md        ← Vercel, GitHub Actions, env vars, infra
```

## What to read first

1. **`context/status.md`** — current state: what is done, what is open
2. **`context/spec.md`** — what the system does (rules, screens, data model)
3. **`context/financial-model.md`** — how the math works: Forma B, IPCA, examples
4. **`context/constitution.md`** — how the system should be built (principles)
5. **`design/design.md`** — visual tokens and component guide

## Folder boundaries

| Folder | Owner | Purpose |
|--------|-------|---------|
| `.ai/` | human | canonical project documentation |
| `specs/` | Spec Kit | generated artifacts — do not edit manually |
| `.specify/` | Spec Kit | internal infrastructure — do not touch |
| `src/core/` | code | pure financial logic (executable source of truth) |
| `src/core/__tests__/fixtures/` | tests | oracle JSON used by vitest |
| `drizzle/migrations/` | Drizzle | schema change history |

> **Expected duplication**: `specs/001-controle-de-rateios/spec.md` is nearly identical to `.ai/context/spec.md`. The canonical version is `.ai/context/spec.md`; the one in `specs/` is the Spec Kit's copy.
