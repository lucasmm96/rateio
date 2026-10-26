# Implementation Plan: Fix Config. Rateio — modal vazio

**Branch**: `002-fix-config-rateio` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-fix-config-rateio/spec.md`

## Summary

A tela Config. Rateio (`Configuracoes.tsx`) exibe modal vazio quando o auth ainda não
resolveu ao montar o componente. A causa raiz é que `isPending` do `useUser()` é
ignorado e `buscarRateio` dispara antes do JWT estar disponível; somado a isso, o
estado `error` do `useAsync` nunca é renderizado. A correção adiciona `isPending`
nos deps do `useAsync`, suprime a query enquanto o auth não resolveu, e exibe estados
de loading / erro / acesso negado em vez de branco.

## Technical Context

**Language/Version**: TypeScript 5 (tsx, React 18)

**Primary Dependencies**: React Router (useSearchParams), neon-js (useSession / BetterAuthReactAdapter), useAsync hook interno

**Storage**: N/A — nenhuma mudança de schema ou migração

**Testing**: Vitest (componentes puramente visuais; sem query real em teste unitário)

**Target Platform**: Web (SPA, Vite + React)

**Project Type**: Web application (SPA)

**Performance Goals**: Modal exibindo conteúdo em < 3 s com conexão normal

**Constraints**: Nenhum novo dep externo; nenhuma mudança de schema; solução contida em `Configuracoes.tsx`

**Scale/Scope**: 1 arquivo de rota, ~530 linhas; nenhuma outra tela afetada

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Observação |
|-----------|--------|------------|
| 1 — Cálculo em módulo puro | ✅ Não se aplica | Sem cálculo financeiro envolvido |
| 2 — Dinheiro em decimal | ✅ Não se aplica | Nenhum valor monetário novo |
| 5 — RLS obrigatório; nenhuma credencial no cliente | ✅ Mantido | A correção garante que o JWT seja injetado antes da requisição |
| 6 — Schema versionado por Drizzle | ✅ Não se aplica | Sem mudança de schema |
| 16 — Design system como fonte da verdade visual | ✅ A seguir | Qualquer estado novo (carregando, erro) usará tokens semânticos |

**Resultado da gate**: ✅ Nenhuma violação — prosseguir para fase de design.

## Project Structure

### Documentation (this feature)

```text
specs/002-fix-config-rateio/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── routes/
│   └── Configuracoes.tsx     # único arquivo modificado
└── db/
    └── auth.ts               # leitura apenas (verificar se isPending está exposto)
```

**Structure Decision**: Modificação pontual em um único componente de rota. Nenhuma nova pasta, nenhum novo arquivo de produção.

## Complexity Tracking

> Nenhuma violação de constituição — seção não aplicável.
