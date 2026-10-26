# Template — iniciar uma onda

Copiar e colar no Claude Code no início de cada sessão.

---

## Para demandas com spec formal (D-001, D-005 a D-010)

Leia `.ai/planning/STATUS.md` e `.ai/planning/ROADMAP.md` para
contexto. Vamos trabalhar na demanda `<D-ID>` (`<nome>`), spec
`specs/<NNN>-<nome>/`.

Passos:

1. Leia `specs/<NNN>-<nome>/` (se existir).
2. Se `spec.md` não existir: rode `/speckit.specify` para criá-la, com
   base em `.ai/planning/DECISIONS.md` e no estado atual do código.
3. Se `plan.md` não existir: rode `/speckit.plan`.
4. Se `tasks.md` não existir: rode `/speckit.tasks`.
5. **Pare e reporte**. Aguarde aprovação antes de `/speckit.implement`.

A cada passo, atualize `.ai/planning/STATUS.md`:
- Após `/specify`: `🟡` + data.
- Após `/tasks`: `🟠` + data.
- Após aprovação para implementar: `🔵` + data.

Se o usuário autorizar `/speckit.implement`, ao final atualize
`STATUS.md` para `✅` e preencha "Última sessão".

---

## Para D-002 (workflows, sem spec)

1. Rodar `gh run list --limit 20` para listar as execuções recentes.
2. Para cada workflow que falhou, `gh run view <id> --log` e analisar.
3. Produzir `.ai/planning/workflows-audit.md` com:
   - Lista de workflows existentes.
   - Frequência, últimos status (sucesso/falha).
   - Causa provável de cada falha.
   - Recomendação: **manter** / **ajustar** / **remover** (com
     justificativa).
4. **Parar e aguardar decisão** do usuário antes de alterar qualquer
   workflow.

---

## Para D-003 (remover GitHub Pages, sem spec)

1. Verificar `.github/workflows/` — se existe workflow de deploy de
   GitHub Pages, marcar como obsoleto (comentário no topo).
2. Verificar `vite.config.ts` — se tem `base: '/rateio/'`, remover.
3. Verificar `src/routes/` — se usa `createHashRouter`, trocar por
   `createBrowserRouter`. Substituir todos os `href="#/"` por
   `href="/"`.
4. Verificar `index.html` — nenhum caminho absoluto com `/rateio/`.
5. Instruir o usuário a desligar GitHub Pages no GitHub (Settings →
   Pages → Source: None) — **o agente não tem permissão para fazer
   isso via CLI**; precisa ser manual pelo console.
6. Atualizar `STATUS.md` para `✅`.

---

## Para D-004 (coverage, sem spec)

1. Adicionar/atualizar princípio na `.ai/constitution.md`: "Toda regra
   de negócio em `src/core/` e todo componente em `src/components/`
   tem teste automatizado. Coverage mínimo X% (definir com o usuário)."
2. Configurar `vitest` com coverage (via `@vitest/coverage-v8`).
3. Adicionar script `npm run test:coverage` no `package.json`.
4. Configurar CI (GitHub Actions) para rodar testes em push.
5. Reportar coverage atual e gap por arquivo em
   `.ai/planning/coverage-report.md`.
6. Atualizar `STATUS.md` para `✅`.
