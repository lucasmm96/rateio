# Tasks

## Fase 0 — Preparação
- [ ] T001 Confirmar repositório público no GitHub (já existe).
- [ ] T002 Rodar `pnpm create vite` com React + TS na raiz (cuidado com
      arquivos já existentes: HANDOFF.md e specs devem ser preservados).
- [ ] T003 Adicionar `vite-plugin-pwa`, `decimal.js`, `drizzle-orm`,
      `drizzle-kit`, `react-router-dom`, `@neondatabase/neon-js`.
- [ ] T004 Configurar base path do Vite para GitHub Pages.
- [ ] T005 Configurar `createHashRouter`.
- [ ] T006 Criar `.env.example` com as variáveis necessárias.
- [ ] T007 Configurar `tailwind.config.ts` com tokens do `DESIGN.md`
      (cores light + dark, `darkMode: "class"`, tipografia, radius,
      spacing).
- [ ] T008 Configurar `postcss.config.js`.
- [ ] T009 Criar `src/styles/globals.css` com `@tailwind base/components/
      utilities` + bases do `DESIGN.md`.
- [ ] T010 Instalar `@fontsource/inter` e importar pesos 400/500/600/700
      no `main.tsx`.
- [ ] T011 Adicionar Material Symbols via CSS no `index.html` (link
      Google Fonts) ou `@fontsource/material-symbols-outlined`.
- [ ] T012 Criar `src/components/ui/` com Button, Input, Card, Badge,
      Switch, Avatar, Header, BottomNav, FAB.
- [ ] T013 Criar `ThemeProvider` (React context) com persistência em
      `localStorage` e observação de `prefers-color-scheme`.

## Fase 1 — Integração com o GitHub Spec Kit
- [ ] T101 Instalar `specify-cli` via `uv tool install`.
- [ ] T102 Rodar `specify init --here --force --integration claude`.
- [ ] T103 Rodar `/speckit.clarify` sobre o `spec.md`.
- [ ] T104 Rodar `/speckit.plan` para gerar o `plan.md`.
- [ ] T105 Rodar `/speckit.checklist` para gerar critérios de aceite.
- [ ] T106 Rodar `/speckit.analyze` para verificar consistência.
- [ ] T107 Revisar os artefatos gerados e reportar ao usuário.

## Fase 2 — Módulo de cálculo puro
- [ ] T201 Criar `src/core/decimal.ts` (config do Decimal: precisão alta,
      arredondamento explícito na exibição).
- [ ] T202 Criar `src/core/indice.ts` com `indiceEmData(data)` conforme
      seções 4.1 e 4.2 do HANDOFF.
- [ ] T203 Criar `src/core/unidades.ts` (conversão valor ↔ unidades,
      respeitando `corrigir_ipca`).
- [ ] T204 Criar `src/core/saldo.ts` com `calcularSaldo(rateio, corrigir)`
      conforme pseudocódigo da seção 4.10 do HANDOFF.
- [ ] T205 Preencher `.ai/casos-de-teste.json` com os 27 casos do piloto
      (linhas 2 a 28 da planilha), calculando índices e valores
      corrigidos.
- [ ] T206 Escrever testes contra o JSON. Todos os 27 devem passar.
- [ ] T207 Validar saldo em 2026-08-15 entre R$ 707,00 e R$ 708,00.
- [ ] T208 Preencher `.ai/casos-de-teste-n-pessoas.json` com os 10 casos
      sintéticos (n01 a n10) e seus valores esperados.
- [ ] T209 Rodar testes contra os casos n-pessoas. Todos devem passar.
- [ ] T210 Verificar invariantes em todos os casos: Σ excesso = Σ déficit
      e Σ saldoUnidades = 0.

## Fase 3 — Banco e RLS
- [ ] T301 Criar `src/db/schema.ts` com Drizzle (tabela `rateios`; sem
      credor/devedor fixos; `membros` com cota; `reembolsos` com pagador
      e recebedor).
- [ ] T302 Gerar migração inicial com `drizzle-kit generate`.
- [ ] T303 Escrever migração de RLS (SQL puro).
- [ ] T304 Escrever triggers: Σ cota = 1; pagador ∈ membros do rateio;
      partes do reembolso ∈ membros do rateio.
- [ ] T305 Criar role restrita para o Action de IPCA.
- [ ] T306 Aplicar migrações em ambiente de dev.
- [ ] T307 Testar RLS com 2 usuários distintos.
- [ ] T308 Criar RPC `buscar_usuario_por_email` (SECURITY DEFINER,
      retorna id + email).
- [ ] T309 Criar RPC `criar_rateio` (SECURITY DEFINER, insere rateio +
      membros em transação).
- [ ] T310 Adicionar coluna `criado_por_user_id` em `rateios`.
- [ ] T311 Testar RLS: usuário A cria rateio com usuário B; B vê o
      rateio; C não vê.
- [ ] T312 Testar RPC de busca por email (existente e inexistente).

## Fase 4 — Autenticação
- [ ] T401 Configurar Neon Auth. Desativar cadastro aberto.
- [ ] T402 Criar tela de login/logout.
- [ ] T403 Hook `useSession` e `useUser`.

## Fase 5 — Cliente de dados
- [ ] T501 Criar `src/db/client.ts` usando Neon Data API.
- [ ] T502 Funções tipadas: listar rateios, criar despesa, criar
      reembolso, atualizar cotas.

## Fase 6 — Telas
- [ ] T601 Tela "lista de rateios".
- [ ] T602 Tela "detalhe do rateio" com extrato e saldos por participante.
- [ ] T603 Tela "memória de cálculo".
- [ ] T604 Formulário de despesa.
- [ ] T605 Formulário de reembolso.
- [ ] T606 Tela de configurações (globais + cotas por rateio).
- [ ] T607 Toast de "saldos recalculados" quando U_total muda.

## Fase 7 — Workflows GitHub
- [ ] T701 `smoke-bcb.yml` — testa acesso ao BCB.
- [ ] T702 `ipca.yml` — busca série, faz upsert.
- [ ] T703 `backup.yml` — pg_dump semanal.
- [ ] T704 Documentar no README que workflows são desativados após 60
      dias sem atividade.

## Fase 8 — Migração da planilha
- [ ] T801 `scripts/migrar-planilha.mjs` (cria o rateio "Apartamento"
      com cotas 0/1, insere despesas e reembolsos).
- [ ] T802 Rodar contra banco de dev.
- [ ] T803 Conferir valores com extrato bancário.

## Fase 9 — Deploy
- [ ] T901 Configurar GitHub Pages via Action.
- [ ] T902 Testar PWA instalável no celular.
- [ ] T903 Verificar service worker e base path.

## Fase 10 — Documentação
- [ ] U001 `README.md` com instruções de fork.
- [ ] U002 `.env.example`.
- [ ] U003 Confirmar que `.ai/constitution.md`, `.ai/spec.md`,
      `.ai/tasks.md`, `.ai/casos-de-teste.json` e
      `.ai/casos-de-teste-n-pessoas.json` estão no repo.
- [ ] U004 Confirmar que os artefatos do Spec Kit (`plan.md`,
      `checklist.md`, `clarify.md`, `analyze.md`) estão em `specs/`.
