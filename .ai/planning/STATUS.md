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

- **Data**: 2026-10-27
- **Onda**: 4 — D-007 (Perfil do usuário)
- **Feito**:
  - Gerado spec (`specs/005-perfil-usuario/spec.md`), plan e tasks.
  - Criado `src/routes/Perfil.tsx`: nome editável (max 80), e-mail read-only, badge Google via `user.image`, salvo via `neon.auth.updateUser`.
  - Adicionado `atualizarNome()` em `src/db/auth.ts`.
  - Registrada rota `/perfil` com `RequireAuth` em `src/App.tsx`.
  - Sidebar e TopNav: avatar vira `NavLink to="/perfil"`; logout separado; iniciais/nome usam `user.name` se disponível.
  - BottomNav: adicionado item "Perfil" (ícone `account_circle`).
  - Home.tsx: saudação usa `user.name` antes do email prefix.
- **Resultado**: 257 testes passando, thresholds 90% todos atingidos; build limpo. T010/T011 (teste no browser) pendentes — verificar `neon.auth.updateUser` em runtime.
