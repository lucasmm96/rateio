# Relatório de Análise — Controle de Rateios

*Gerado em 2026-10-19 pelo speckit-analyze (execução manual)*

## Sumário

**Resultado:** ✅ CONSISTENTE — nenhuma divergência bloqueadora encontrada.

Artefatos analisados:
- `.ai/constitution.md` (16 princípios)
- `.ai/spec.md` (v1)
- `.ai/tasks.md` (Fases 0–10)
- `specs/001-controle-de-rateios/plan.md`
- `specs/001-controle-de-rateios/clarify.md`
- `specs/001-controle-de-rateios/checklists/requirements.md`

## Verificações Realizadas

### 1. Constitution ↔ Spec

| Princípio | Verificação | Status |
|-----------|-------------|--------|
| Cálculo em módulo puro | `src/core/` isolado, sem IO | ✅ |
| `decimal.js` obrigatório | Explícito em spec §4 e tasks T201 | ✅ |
| Série configurável | `config.valor` jsonb, serie como parâmetro | ✅ |
| Pro-rata diária composta | Fórmula exata em spec §4, implementada em indice.ts | ✅ |
| RLS obrigatório | Todas as tabelas cobertas em tasks T303 | ✅ |
| Schema versionado por Drizzle | tasks T301–T302 | ✅ |
| Oráculo de dados reais | 27 casos do piloto + 10 sintéticos | ✅ |
| Open source by default | Repositório público, sem dados pessoais | ✅ |
| Sem offline | service worker cache-only do shell | ✅ |
| Modelo mínimo | Sem coluna `situacao` (derivada em runtime) | ✅ |
| Multi-rateio e n participantes | Todas as entidades escopadas por `rateio_id` | ✅ |
| Cotas como parâmetros | Sem snapshot histórico de cotas | ✅ |
| Reembolsos no `pago_efetivo` | Fórmula explícita em spec §4, sem dupla subtração | ✅ |
| Terminologia explícita | Glossário em spec §2, consistente no HANDOFF | ✅ |
| Busca por email via RPC SECURITY DEFINER | RPC `buscar_usuario_por_email` em tasks T308 | ✅ |
| Design system como fonte da verdade | Tokens em tailwind.config.ts, darkMode: class | ✅ |

### 2. Spec ↔ Plan

| Item do Spec | Cobertura no Plan | Status |
|--------------|-------------------|--------|
| `src/core/` com 4 módulos | Fase 2 do plan com interfaces detalhadas | ✅ |
| Banco Drizzle + RLS | Fase 3 com schema, migrações, RPCs | ✅ |
| Neon Auth JWT | Fase 4, `useSession`, `useUser` | ✅ |
| Data API (sem connection string) | Fase 4, `client.ts` | ✅ |
| 7 telas com hash routing | Fase 5, tabela de rotas | ✅ |
| Workflow IPCA + backup | Fase 6 | ✅ |
| Script de migração | Fase 7 | ✅ |
| Toast de recálculo | Mencionado em Fase 5 | ✅ |

### 3. Spec ↔ Checklist

| Requisito crítico | Item de checklist | Status |
|-------------------|-------------------|--------|
| Saldo entre R$ 707–708 em 2026-08-15 | Item explícito | ✅ |
| Σ excesso = Σ déficit | Item explícito | ✅ |
| Σ saldoUnidades = 0 | Item explícito | ✅ |
| RLS: usuário A não vê dados de B | Item explícito | ✅ |
| `criar_rateio` atômica | Item explícito | ✅ |
| Sem `number` nativo no cálculo | Item explícito | ✅ |
| PWA instalável | Item explícito | ✅ |
| Hash routing sem 404 | Item explícito | ✅ |

### 4. Terminologia Consistente

- "Rateio", "Participante", "Cota", "Compromisso", "Excesso", "Déficit" — usados uniformemente em todos os artefatos. ✅
- "pago_efetivo" — forma correta; não usar "pagamento líquido" ou "saldo bruto". ✅
- "prevista" e "paga" — derivadas de `data` em runtime; não de coluna no banco. ✅

### 5. Gaps Encontrados

| Gap | Impacto | Ação |
|-----|---------|------|
| Constitution template em `.specify/memory/constitution.md` está vazio | Baixo — não afeta a implementação | Copiar conteúdo de `.ai/constitution.md` |
| `tasks.md` não tem critérios de aceite individuais por task | Baixo — coberto pelo checklist | Aceito |
| Especificação de erro de UX para data fora da série não detalhada | Baixo | Implementar com mensagem: "Data anterior à série do IPCA (2025-12-01)" |

## Conclusão

Todos os artefatos são consistentes entre si. Os gaps identificados são de baixo impacto e não bloqueiam a implementação. Prosseguir com a Fase 2 (módulo de cálculo puro).
