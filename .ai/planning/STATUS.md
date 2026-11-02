# Status das demandas

Legenda: `⬜ não iniciado` · `🟡 spec escrita` · `🟠 tasks criadas` ·
`🔵 em implementação` · `✅ pronto` · `❌ bloqueado` · `—` sem spec formal

| ID | Demanda | Onda | Spec | Status | Última atualização |
|---|---|---|---|---|---|
| D-001 | Fix: Config. Rateio vazio | 1 | `specs/002-fix-config-rateio` | ✅ | 2026-10-26 |
| D-002 | Auditoria de workflows | 1 | — | ✅ | 2026-10-26 |
| D-003 | Remover GitHub Pages | 2 | — | ✅ | 2026-10-27 |
| D-004 | Coverage de testes | 3 | — | ✅ | 2026-10-27 |
| D-005 | Links em despesas/reembolsos | 4 | `specs/003-links-despesas-reembolsos` | ✅ | 2026-10-27 |
| D-006 | Editar lançamentos + auditoria | 4 | `specs/004-editar-lancamentos-auditoria` | ✅ | 2026-10-27 |
| D-007 | Perfil do usuário | 4 | `specs/005-perfil-usuario` | ✅ | 2026-10-27 |
| D-008 | Dashboard | 5 | `specs/006-dashboard` | ✅ | 2026-11-01 |
| D-009 | Transparência IPCA | 5 | `specs/007-transparencia-ipca` | 🟠 | 2026-11-01 |
| D-010 | Busca por username | 5 | `specs/008-busca-username` | ✅ | 2026-11-01 |

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

- **Data**: 2026-11-01
- **Onda**: 5 — D-008, D-009, D-010 (preparação)
- **Feito**:
  - Gerado spec, plan, tasks e checklist para D-008 (Dashboard) em `specs/006-dashboard/`
  - Gerado spec, plan, tasks e checklist para D-009 (Transparência IPCA) em `specs/007-transparencia-ipca/`
  - Gerado spec, plan, tasks e checklist para D-010 (Busca por username) em `specs/008-busca-username/`
  - D-008, D-009, D-010 marcados como 🟠 (tasks criadas)
- **Resultado**: Onda 5 pronta para implementação. Aguardando execução de `/speckit-implement` para cada demanda.
- **Pendente (sessão anterior)**: T010/T011 de D-007 (teste no browser de `neon.auth.updateUser`) ainda não verificados.
