# Status das demandas

Legenda: `⬜ não iniciado` · `🟡 spec escrita` · `🟠 tasks criadas` ·
`🔵 em implementação` · `✅ pronto` · `❌ bloqueado` · `—` sem spec formal

| ID | Demanda | Onda | Spec | Status | Última atualização |
|---|---|---|---|---|---|
| D-001 | Fix: Config. Rateio vazio | 1 | `specs/002-fix-config-rateio` | ✅ | 2026-10-26 |
| D-002 | Auditoria de workflows | 1 | — | ✅ | 2026-10-26 |
| D-003 | Remover GitHub Pages | 2 | — | ⬜ | — |
| D-004 | Coverage de testes | 3 | — | ⬜ | — |
| D-005 | Links em despesas/reembolsos | 4 | `specs/003-links-despesas-reembolsos` | ⬜ | — |
| D-006 | Editar lançamentos + auditoria | 4 | `specs/004-editar-lancamentos-auditoria` | ⬜ | — |
| D-007 | Perfil do usuário | 4 | `specs/005-perfil-usuario` | ⬜ | — |
| D-008 | Dashboard | 5 | `specs/006-dashboard` | ⬜ | — |
| D-009 | Transparência IPCA | 5 | `specs/007-transparencia-ipca` | ⬜ | — |
| D-010 | Busca por username | 5 | `specs/008-busca-username` | ⬜ | — |

## Estado atual do Spec Kit

`specs/001-controle-de-rateios/` contém a spec original do app (gerada na primeira iteração):

| Arquivo | Linhas | Conteúdo |
|---|---|---|
| `spec.md` | 137 | Spec funcional completa: contexto, glossário, modelo de dados, regras de cálculo, stack, UI/UX, fases |
| `plan.md` | 147 | Plano de implementação: decisões técnicas, arquitetura, fases e módulos (Fase 2 = core puro, Fase 3 = DB, Fase 4 = UI) |
| `analyze.md` | 82 | Análise de riscos e trade-offs |
| `clarify.md` | 33 | Perguntas de clarificação respondidas |
| `checklists/` | — | Subpasta com checklists gerados |
| `contracts/requirements.md` | — | Contrato de requisitos |

Decisão técnica relevante registrada em `plan.md`: o plano original usava `createHashRouter` para GitHub Pages. A demanda D-003 (Onda 2) remove essa dependência e migra para `createBrowserRouter` + Vercel.

## Última sessão

- **Data**: 2026-10-26
- **Onda**: 1 — D-002 (Auditoria de workflows)
- **Feito**: Auditoria completa dos 4 workflows. smoke-bcb.yml removido. GitHub Pages desativado. backup.yml corrigido (pg_dump 17 via PGDG). ipca.yml corrigido (npm install pg + migration 0007 BYPASSRLS para ipca_writer). Ambos confirmados passando: backup run 40405459154, ipca run 40409613760. D-002 ✅.
- **Pendente**: nenhum — Onda 1 completa. Próxima: D-003 (Onda 2)
