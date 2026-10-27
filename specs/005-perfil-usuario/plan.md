# Implementation Plan: Perfil do Usuário

**Branch**: `005-perfil-usuario` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-perfil-usuario/spec.md`

## Summary

Nova tela `/perfil` que exibe nome (editável) e e-mail (read-only) do usuário. O nome é lido de `user.name` na sessão Better Auth e atualizado via `neon.auth.updateUser({ name })` — sem nova tabela ou migration. A navegação global (Sidebar, TopNav, BottomNav) recebe um link "Perfil".

## Technical Context

**Language/Version**: TypeScript 5 / React 18

**Primary Dependencies**: Neon Auth (Better Auth client), React Router v6, Tailwind CSS, Vitest

**Storage**: Nenhuma alteração no schema Postgres da aplicação — nome gerenciado pelo Better Auth.

**Testing**: Sem lógica pura nova (nenhum módulo em `src/core/`); validação de formulário testável via Vitest + jsdom se houver extração de função.

**Target Platform**: Browser (SPA)

**Performance Goals**: Salvar nome deve responder em < 2 s em condições normais de rede.

**Constraints**: Sem `number` para valores monetários (não aplicável aqui); sem hex hardcoded; RLS não alterada; sem nova tabela.

**Scale/Scope**: Tela por usuário individual; operação de baixíssimo volume.

## Constitution Check

| Princípio | Status | Observação |
|-----------|--------|-----------|
| 1. Cálculo em módulo puro | ✅ | Sem cálculo financeiro nesta feature |
| 5. RLS obrigatório | ✅ | Nenhuma tabela nova; Better Auth gerencia o próprio dado |
| 6. Schema versionado por Drizzle | ✅ | Nenhuma migration necessária |
| 10. Modelo de dados mínimo | ✅ | Reutiliza campo `name` existente no Better Auth; sem colunas adicionais |
| 14. Terminologia explícita | ✅ | "perfil", "nome", "provedor" usados consistentemente |
| 15. Tokens de design sem hex | ✅ | Todos os componentes usarão tokens semânticos |

**Gate**: aprovado — sem violações.

## Architectural Decisions

### 1. Armazenamento do nome

**Decisão**: usar `neon.auth.updateUser({ name })` — o campo `name` já existe no modelo de usuário do Better Auth.

**Motivo**: Evita duplicar estado entre `users.nome` (banco da app) e o campo `name` do Better Auth. A sessão já carrega `user.name`; após `updateUser`, o SDK refaz a sessão e os componentes que consomem `useUser()` reatualizam automaticamente via re-render.

**Alternativa rejeitada**: Adicionar coluna `nome` em `users` + RPC. Criaria drift entre dois armazéns; o Better Auth seria a fonte de verdade de identidade, mas o banco da app teria uma cópia.

### 2. Detecção de provedor Google

**Decisão**: usar `user.image` como proxy. Better Auth popula `user.image` com a foto do Google OAuth; usuários e-mail/senha ficam com `null`. Se `user.image` estiver preenchido, exibir badge "Conta Google".

**Motivo**: Não há campo `provider` explícito exposto pelo SDK client-side; `user.image` é o sinal mais confiável disponível sem chamada extra.

### 3. Link de navegação

**Decisão**: substituir o avatar estático do usuário no Sidebar e TopNav por um link clicável para `/perfil`. No BottomNav, adicionar item "Perfil" com ícone `account_circle`.

**Motivo**: O avatar já existe nos três componentes como área de usuário — torná-la clicável não quebra layout nem adiciona item de nav extra no Sidebar/TopNav. O BottomNav tem espaço para um terceiro item.

## Project Structure

### Documentation (this feature)

```text
specs/005-perfil-usuario/
├── plan.md              ← este arquivo
└── tasks.md             ← gerado pelo /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── db/
│   └── auth.ts               ← + atualizarNome(name: string)
├── routes/
│   └── Perfil.tsx             ← nova tela (novo arquivo)
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx        ← avatar → link para /perfil
│   │   └── TopNav.tsx         ← avatar → link para /perfil
│   └── ui/
│       └── BottomNav.tsx      ← + item "Perfil"
└── App.tsx                    ← + rota /perfil com RequireAuth
```

**Nenhuma migration Drizzle necessária.**

## Complexity Tracking

> Nenhuma violação de constitution — seção omitida.

## Implementation Notes

- `neon.auth.updateUser({ name })` é síncrono no sentido de que retorna Promise; await e tratar erro.
- Após salvar, a sessão é atualizada automaticamente pelo Better Auth client — `useUser()` re-renderiza com o novo nome. Não é necessário invalidar cache manualmente.
- O campo `name` do Better Auth: se `null`, o input aparece vazio. Salvar com string vazia deve ser rejeitado no cliente (FR-007) antes de chamar a API.
- A rota `/perfil` segue o mesmo padrão de rotas protegidas do `App.tsx` (lazy + `RequireAuth`).
- Tokens de design a usar: `bg-surface`, `bg-surface-container`, `text-on-surface`, `text-on-surface-variant`, `text-primary`, `bg-primary`, `text-on-primary`, `bg-error`, `text-error`.
