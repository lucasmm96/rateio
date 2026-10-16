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

## Fase 1 — Módulo de cálculo puro
- [ ] T101 Criar `src/core/decimal.ts`.
- [ ] T102 Criar `src/core/indice.ts` com `indiceEmData`.
- [ ] T103 Criar `src/core/unidades.ts` (conversão valor ↔ unidades).
- [ ] T104 Criar `src/core/saldo.ts` com a Forma B.
- [ ] T105 Preencher `.ai/casos-de-teste.json` com os 27 casos.
- [ ] T106 Escrever testes contra o JSON. Todos os 27 devem passar.
- [ ] T107 Validar saldo em 2026-08-15 entre R$ 707,00 e R$ 708,00.
- [ ] T108 Preencher `.ai/casos-de-teste-n-pessoas.json` com os valores
      esperados calculados.
- [ ] T109 Rodar testes contra os casos n-pessoas. Σ saldos = 0 em todos.

## Fase 2 — Banco e RLS
- [ ] T201 Criar `src/db/schema.ts` com Drizzle (tabela `rateios`; sem
      credor/devedor fixos; `membros` com cota; `reembolsos` com pagador
      e recebedor).
- [ ] T202 Gerar migração inicial com `drizzle-kit generate`.
- [ ] T203 Escrever migração de RLS (SQL puro).
- [ ] T204 Escrever triggers: Σ cota = 1; pagador ∈ membros.
- [ ] T205 Criar role restrita para o Action de IPCA.
- [ ] T206 Aplicar migrações em ambiente de dev.
- [ ] T207 Testar RLS com 2 usuários distintos.

## Fase 3 — Autenticação
- [ ] T301 Configurar Neon Auth. Desativar cadastro aberto.
- [ ] T302 Criar tela de login/logout.
- [ ] T303 Hook `useSession` e `useUser`.

## Fase 4 — Cliente de dados
- [ ] T401 Criar `src/db/client.ts` usando Neon Data API.
- [ ] T402 Funções tipadas: listar rateios, criar despesa, criar
      reembolso, atualizar cotas.

## Fase 5 — Telas
- [ ] T501 Tela "lista de rateios".
- [ ] T502 Tela "detalhe do rateio" com extrato e saldos por participante.
- [ ] T503 Tela "memória de cálculo".
- [ ] T504 Formulário de despesa.
- [ ] T505 Formulário de reembolso.
- [ ] T506 Tela de configurações (globais + cotas por rateio).
- [ ] T507 Toast de "saldos recalculados" quando U_total muda.

## Fase 6 — Workflows GitHub
- [ ] T601 `smoke-bcb.yml` — testa acesso ao BCB.
- [ ] T602 `ipca.yml` — busca série, faz upsert.
- [ ] T603 `backup.yml` — pg_dump semanal.
- [ ] T604 Documentar no README que workflows são desativados após 60
      dias sem atividade.

## Fase 7 — Migração da planilha
- [ ] T701 `scripts/migrar-planilha.mjs` (cria o rateio "Apartamento"
      com cotas 0/1, insere despesas e reembolsos).
- [ ] T702 Rodar contra banco de dev.
- [ ] T703 Conferir valores com extrato bancário.

## Fase 8 — Deploy
- [ ] T801 Configurar GitHub Pages via Action.
- [ ] T802 Testar PWA instalável no celular.
- [ ] T803 Verificar service worker e base path.

## Fase 9 — Documentação
- [ ] T901 `README.md` com instruções de fork.
- [ ] T902 `.env.example`.
- [ ] T903 Confirmar que `.ai/constitution.md`, `.ai/spec.md`,
      `.ai/tasks.md`, `.ai/casos-de-teste.json` e
      `.ai/casos-de-teste-n-pessoas.json` estão no repo.