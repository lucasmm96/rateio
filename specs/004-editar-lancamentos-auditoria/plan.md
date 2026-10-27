# Implementation Plan: Editar Lançamentos e Auditoria

**Branch**: `004-editar-lancamentos-auditoria` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-editar-lancamentos-auditoria/spec.md`

## Summary

Permitir a edição de despesas e reembolsos (todos os campos) via RPCs Postgres que executam UPDATE + INSERT em `audit_log` atomicamente. O front exibe o histórico de alterações por lançamento em painel colapsável.

## Technical Context

**Language/Version**: TypeScript 5 / React 18

**Primary Dependencies**: Drizzle ORM, Neon Data API (PostgREST), Vitest, Tailwind CSS

**Storage**: PostgreSQL (Neon) — nova tabela `audit_log` + 2 novos RPCs

**Testing**: Vitest (unitário para lógica de diff, integração para RPCs)

**Target Platform**: Browser (web app SPA)

**Project Type**: web-app

**Performance Goals**: Edição deve persistir e retornar em < 1 s em condições normais de rede

**Constraints**: RLS obrigatório em toda tabela nova; sem credenciais no cliente; sem `number` para valores monetários

**Scale/Scope**: App de rateio doméstico (< 10 usuários por rateio); volume de audit_log é baixo

## Constitution Check

| Princípio | Status | Observação |
|-----------|--------|-----------|
| 1. Cálculo em módulo puro | ✅ | Sem cálculo financeiro novo nesta feature |
| 2. Dinheiro em decimal | ✅ | Formulário e queries usarão `Decimal`; comparação do diff opera sobre strings numéricas do banco |
| 5. RLS obrigatório | ✅ | `audit_log` tem RLS (SELECT via membros); inserção somente via RPC SECURITY DEFINER |
| 6. Schema versionado por Drizzle | ✅ | Migration `0009_audit_log.sql` + schema.ts atualizado |
| 10. Modelo de dados mínimo | ✅ | Tabela `audit_log` é justificada; nenhum campo além do necessário |
| 14. Terminologia explícita | ✅ | "lançamento", "auditoria", "diff" usados consistentemente |

**Gate**: aprovado — sem violações.

## Project Structure

### Documentation (this feature)

```text
specs/004-editar-lancamentos-auditoria/
├── plan.md              ← este arquivo
├── research.md          ← decisões arquiteturais
├── data-model.md        ← tabela audit_log, RPCs, tipos TypeScript
├── quickstart.md        ← roteiro de validação end-to-end
├── contracts/
│   └── queries.md       ← assinaturas TypeScript e contratos de erro
└── tasks.md             ← gerado por /speckit-tasks
```

### Source Code (repository root)

```text
drizzle/
├── migrations/
│   └── 0009_audit_log.sql        ← nova tabela + RLS + RPCs

src/
├── db/
│   ├── schema.ts                  ← + auditLog table + AuditLog types
│   └── queries.ts                 ← + editarDespesa, editarReembolso, listarAuditLog
├── components/
│   ├── EditarDespesaModal.tsx     ← formulário de edição de despesa
│   ├── EditarReembolsoModal.tsx   ← formulário de edição de reembolso
│   └── AuditLogPanel.tsx          ← painel colapsável de histórico
└── routes/
    └── Lancamentos.tsx            ← atualizar para wiring de edit + audit
```

**Structure Decision**: Single project (frontend + Postgres functions). Sem backend adicional — tudo via Neon Data API + RPCs SECURITY DEFINER.

## Complexity Tracking

> Nenhuma violação de constitution — seção omitida.
