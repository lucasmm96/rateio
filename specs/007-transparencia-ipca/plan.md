# Implementation Plan: Transparência IPCA

**Branch**: `007-transparencia-ipca` | **Date**: 2026-11-01 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-transparencia-ipca/spec.md`

## Summary

Seção "IPCA Dashboard" adicionada à tela `/config` (visão global, sem `?rateio=`). Exibe gráfico de linha da série histórica do índice acumulado com tooltip, tabela de taxas mensais com filtro de datas (De/Até) e ordenação por coluna, e link para fonte oficial (BCB SGS 433). Reutiliza `indiceEmData()` do core. Nenhuma nova rota, nenhuma migration.

## Technical Context

**Language/Version**: TypeScript 5 / React 18

**Primary Dependencies**: `src/core/indice.ts` (existente), `src/db/queries.ts` — `listarTaxasIpca()` (existente), Tailwind CSS

**Storage**: Leitura da tabela `taxas_ipca` via query existente — sem alteração de schema.

**Testing**: Cálculo do acumulado extraído em função pura testável; a exibição pode ser verificada manualmente.

**Target Platform**: Browser (SPA)

**Performance Goals**: Gráfico e tabela carregam em menos de 3 segundos. Mudança de intervalo de datas recarrega em menos de 1 segundo (cache se possível).

**Constraints**: Sem hex hardcoded; sem nova migration; sem nova rota; reutilizar `indiceEmData()`. Biblioteca de gráficos leve (Recharts preferida se disponível).

**Scale/Scope**: Operação de leitura; tabela `taxas_ipca` cresce ~12 registros/ano.

## Constitution Check

| Princípio | Status | Observação |
|-----------|--------|-----------|
| 1. Cálculo em módulo puro | ✅ | Cálculo do acumulado em função pura no core ou inline usando `indiceEmData()` |
| 2. Dinheiro em Decimal | ✅ | Taxas e índices tratados com `D()` e `indiceEmData()` existentes |
| 3. Séries configuráveis | ✅ | Usa `listarTaxasIpca()` que busca da tabela; série BCB 433 é o padrão |
| 5. RLS obrigatório | ✅ | Sem tabela nova; `taxas_ipca` tem RLS de leitura para usuários autenticados |
| 6. Schema versionado | ✅ | Nenhuma migration necessária |
| 10. Modelo de dados mínimo | ✅ | Dado derivado; sem coluna nova |
| 16. Tokens de design | ✅ | Sem hex hardcoded |

**Gate**: aprovado — sem violações.

## Architectural Decisions

### 1. Localização na UI

**Decisão**: adicionar a seção IPCA dentro do `Component` de `Configuracoes.tsx`, renderizada condicionalmente quando `!rateioId` (visão global).

**Motivo**: A tela de Configurações já tem lógica que diferencia visão global (`!rateioId`) de visão de rateio (`rateioId`). Adicionar dentro do bloco global é coerente e não cria rota nova desnecessária.

**Alternativa rejeitada**: Criar componente separado em nova rota `/ipca`. Mais código, mais rota, sem benefício — o usuário não precisa de uma tela dedicada para ver taxas.

### 2. Cálculo do fator acumulado

**Decisão**: calcular `(indiceEmData(taxas, hoje) / indiceEmData(taxas, primerMes)) - 1` direto no componente ou em helper inline, usando a função existente `indiceEmData()` de `src/core/indice.ts`.

**Motivo**: Não é uma regra de negócio nova — é uma leitura derivada dos índices já calculáveis. Não justifica um arquivo novo em `src/core/`.

### 3. Número de taxas exibidas

**Decisão**: exibir as últimas 6 taxas disponíveis (6 meses), como padrão hardcoded. Não expor como configuração nesta versão.

**Motivo**: 6 meses é informação suficiente para o usuário entender o contexto recente. Adicionar configuração de N seria over-engineering para um uso pessoal.

## Project Structure

### Documentation (this feature)

```text
specs/007-transparencia-ipca/
├── spec.md
├── plan.md              ← este arquivo
├── checklists/
│   └── requirements.md
└── tasks.md             ← gerado pelo /speckit-tasks
```

### Source Code (repository root)

```text
src/
└── routes/
    └── Configuracoes.tsx     ← + seção IPCA renderizada quando !rateioId
```

**Nenhuma migration Drizzle necessária. Nenhum arquivo novo em `src/core/`.**

## Implementation Notes

- Em `Configuracoes.tsx`, adicionar seção "IPCA Dashboard" no bloco `!rateioId`:
  - `useAsync(() => listarTaxasIpca(), [])` carrega todas as taxas
  - Estado local: `dataInicio` e `dataFim` (inicialmente hoje - 24 meses, hoje)
  - Filtrar taxas pelo intervalo: `taxas.filter(t => t.mes >= dataInicio && t.mes <= dataFim)`
  - **Gráfico**: usar Recharts (se disponível) ou SVG nativo para plotar `indiceEmData(taxas, mes)` vs. `mes`. Tooltip ao hover.
  - **Tabela**: colunas `[Mês, Taxa (%), Índice acumulado, Variação (%)]`. Ordenação por clique no header.
  - **Link BCB**: `<a href="https://www3.bcb.gov.br/sgspub/localizarseries/localizar.jsp?measure=612&serie=433" target="_blank">BCB SGS 433</a>`
  - **Validação**: rejeitar se `dataInicio > dataFim` com mensagem de erro
- `taxas_ipca.taxa` é percentual decimal (ex.: `0.33` = 0,33%). Verificar schema Drizzle.
- Calcular variação mensal: `(taxa_mes_n / taxa_mes_n-1 - 1) * 100`
- Tokens de design: `bg-surface-container`, `border-outline-variant`, `text-on-surface`, `hover:bg-surface-variant`
- Sugerir biblioteca: Recharts (se npm list | grep recharts retorna algo) ou D3; senão, SVG customizado
