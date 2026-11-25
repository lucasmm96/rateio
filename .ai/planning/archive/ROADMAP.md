# Roadmap — 10 demandas

Mapa entre ID de tracking (D-XXX) e número de spec (NNN). A ordem de
execução segue as ondas, não a numeração de spec.

## Ondas

### Onda 1 — Correções
- **D-001** — Fix: Config. Rateio vazio → `specs/002-fix-config-rateio`
- **D-002** — Auditoria de workflows (sem spec formal)

### Onda 2 — Infra e limpeza
- **D-003** — Remover GitHub Pages (sem spec formal)

### Onda 3 — Qualidade
- **D-004** — Coverage de testes (constitution + instrumentação)

### Onda 4 — Features pequenas
- **D-005** — Links em despesas/reembolsos → `specs/003-links-despesas-reembolsos`
- **D-006** — Editar lançamentos + auditoria → `specs/004-editar-lancamentos-auditoria`
- **D-007** — Perfil do usuário → `specs/005-perfil-usuario`

### Onda 5 — Features grandes
- **D-008** — Dashboard → `specs/006-dashboard`
- **D-009** — Transparência IPCA → `specs/007-transparencia-ipca`
- **D-010** — Busca por username → `specs/008-busca-username`

## Numeração de specs

| Spec | Demanda | Motivo |
|---|---|---|
| `001` | (existente — controle-de-rateios) | Reservado; não alterar |
| `002` | D-001 (fix config) | Primeira spec nova |
| `003` | D-005 (links) | Segunda spec nova |
| `004` | D-006 (editar) | Terceira spec nova |
| `005` | D-007 (perfil) | Quarta spec nova |
| `006` | D-008 (dashboard) | Quinta spec nova |
| `007` | D-009 (IPCA) | Sexta spec nova |
| `008` | D-010 (username) | Sétima spec nova |

A numeração reflete ordem de criação, não de execução.

## Dependências

- D-005 (links) recomendado antes de D-006 (edição), porque edição
  audita também os links.
- D-004 (coverage) recomendado antes de D-008 (dashboard), porque
  dashboard adiciona componente novo que precisa de teste.
- D-008 (dashboard) e D-009 (IPCA) compartilham a tela de Config
  Globais — coordenar layout.

## Como iniciar uma onda

Ver `.ai/planning/TEMPLATE-ONDA.md`.
