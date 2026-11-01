# Implementation Plan: Busca de Usuário por Prefixo de Email

**Branch**: `008-busca-username` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-busca-username/spec.md`

## Summary

Substituição da busca de membro por email exato (`buscarUsuarioPorEmail`) por busca por prefixo com lista de resultados. Exige: (1) nova função RPC Postgres `SECURITY DEFINER` com `ILIKE`, (2) migration Drizzle, (3) nova query em `src/db/queries.ts`, (4) refatoração da UI de busca em `Configuracoes.tsx` para exibir lista e seleção.

## Technical Context

**Language/Version**: TypeScript 5 / React 18 / Postgres (Neon)

**Primary Dependencies**: Drizzle ORM (migration), Neon Data API (RPC), React

**Storage**: Nova função RPC no Postgres via migration Drizzle.

**Testing**: Sem lógica de negócio nova em `src/core/`; verificação manual do fluxo no browser.

**Target Platform**: Browser (SPA) + Postgres

**Performance Goals**: Lista de candidatos em menos de 1 segundo após debounce de 300ms.

**Constraints**: RPC com SECURITY DEFINER; sem expor dados além de `id` e `email`; ILIKE para case-insensitivity; limite de 10 resultados; `buscarUsuarioPorEmail` (exato) mantido.

**Scale/Scope**: Uma chamada por search event; tabela `users` de volume pequeno (dezenas de usuários).

## Constitution Check

| Princípio | Status | Observação |
|-----------|--------|-----------|
| 5. RLS obrigatório | ✅ | Função é SECURITY DEFINER com RETURNS TABLE restrito a `id` e `email` |
| 6. Schema versionado | ✅ | Nova função via migration Drizzle |
| 10. Modelo de dados mínimo | ✅ | Nenhuma coluna ou tabela nova — apenas função |
| 14. Terminologia explícita | ✅ | "prefixo de email" consistente com spec e DECISIONS.md |
| 15. RPC para busca de usuário | ✅ | Padrão já existente em `buscar_usuario_por_email` — seguir mesmo padrão |
| 16. Tokens de design | ✅ | Sem hex hardcoded na UI |

**Gate**: aprovado — sem violações.

## Architectural Decisions

### 1. Nome da nova função RPC

**Decisão**: `buscar_usuarios_por_prefixo_email(p_prefixo TEXT)` — plural, separado da função exata.

**Motivo**: A função exata (`buscar_usuario_por_email`) retorna um único registro (exact match). A nova retorna uma lista. Nomes distintos evitam confusão e mantêm as duas funcionando.

### 2. Escrita da query Postgres

**Decisão**: `WHERE LOWER(email) LIKE LOWER(p_prefixo) || '%' LIMIT 10`.

**Motivo**: Case-insensitive (LOWER) sem precisar de extensão `pg_trgm`. Limite explícito protege contra retornos grandes.

### 3. UX da seleção

**Decisão**: a lista de candidatos aparece abaixo do campo (dropdown simples, não select nativo). O usuário clica num item → ele substitui o estado `novoMembro` atual → a UI de confirmação de adição aparece como antes.

**Motivo**: Reutiliza o fluxo de confirmação já existente sem redesenhar a tela inteira. Mudança mínima no componente.

### 4. Debounce

**Decisão**: debounce de 300ms usando `setTimeout`/`clearTimeout` em `useEffect` — sem nova lib.

**Motivo**: O projeto não tem lib de debounce; 5 linhas resolvem sem dependência extra.

## Project Structure

### Documentation (this feature)

```text
specs/008-busca-username/
├── spec.md
├── plan.md              ← este arquivo
├── checklists/
│   └── requirements.md
└── tasks.md             ← gerado pelo /speckit-tasks
```

### Source Code (repository root)

```text
drizzle/
└── migrations/
    └── XXXX_buscar_usuarios_por_prefixo.sql   ← nova: função RPC

src/
├── db/
│   └── queries.ts        ← + buscarUsuariosPorPrefixo(prefixo: string)
└── routes/
    └── Configuracoes.tsx ← refatoração da seção "Adicionar participante"
```

## Implementation Notes

- Função SQL (a ser criada via migration Drizzle):
  ```sql
  CREATE OR REPLACE FUNCTION buscar_usuarios_por_prefixo_email(p_prefixo TEXT)
  RETURNS TABLE(id UUID, email TEXT)
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  AS $$
    SELECT id, email FROM users
    WHERE LOWER(email) LIKE LOWER(p_prefixo) || '%'
    ORDER BY email
    LIMIT 10;
  $$;
  ```
- Gerar migration com `npm run db:generate` após adicionar a definição em `schema.ts` (ou criar SQL raw se Drizzle não suportar funções diretamente — usar `sql` template).
- Em `Configuracoes.tsx`:
  - Substituir `novoMembro: {id, email} | null` por `candidatos: {id, email}[]`
  - Adicionar `useEffect` com debounce que chama `buscarUsuariosPorPrefixo` quando `emailBusca.length >= 2`
  - Renderizar dropdown com `candidatos`; ao clicar, setar `novoMembro` e limpar `candidatos`
  - Marcar visualmente candidatos que já são membros (`rateio.membros.some(m => m.user_id === c.id)`)
- `buscarUsuarioPorEmail` (exato) em `queries.ts` e no Postgres: **não remover** — manter para compatibilidade.
- Tokens de design para o dropdown: `bg-surface-container`, `border-outline-variant`, `hover:bg-surface-variant`
