# Plano de Implementação — Controle de Rateios

*Gerado em 2026-10-19 pelo speckit-plan (execução manual baseada em .ai/spec.md e .ai/handoffs/HANDOFF_INICIAL.md)*

## Visão Geral

PWA de controle de rateios com correção IPCA, substituindo a planilha Controle.xlsx. Stack: React 19 + Vite 8 + TypeScript + Neon Postgres + Drizzle ORM + vite-plugin-pwa. Hospedagem no GitHub Pages.

## Decisões Técnicas Fechadas

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Roteamento | Hash Router (`createHashRouter`) | Evita 404 no GitHub Pages sem SSR |
| Banco | Neon Postgres + Data API | Free tier, PostgREST compatible, RLS nativa |
| Auth | Neon Auth (JWT) | Integrado ao Neon, sem backend extra |
| Aritmética | `decimal.js` | Float binário não é confiável para dinheiro |
| IPCA | BCB SGS 433, pro-rata diária composta | Fórmula validada contra planilha real |
| Segurança | RLS em todas as tabelas | Nenhuma query retorna dados de outro usuário |
| Módulo de cálculo | Puro TypeScript (sem IO) | Testável em isolamento, sem dependência de runtime |

## Arquitetura

```
src/
├── core/            # Cálculo puro (decimal.ts, indice.ts, unidades.ts, saldo.ts)
│   └── __tests__/   # Testes Vitest contra fixtures JSON
├── db/              # Schema Drizzle + cliente Data API
├── components/ui/   # Design system (Button, Card, Badge, …)
├── routes/          # Telas React (lazy-loaded)
└── features/        # Lógica de negócio por domínio
```

## Fases e Módulos

### Fase 2 — Módulo de Cálculo Puro

**Prioridade**: Alta — é o oráculo que valida todas as outras fases.

`src/core/decimal.ts`:
- Configura `Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })`
- Exporta `D(x)` como atalho para `new Decimal(x)`
- Nunca usa `toNumber()` no caminho de cálculo; só em exibição

`src/core/indice.ts`:
- `indiceEmData(data: string, taxas: TaxaIPCA[]): Decimal`
- Base: 1000 em 2025-12-01
- Acumula: `indice(M) = indice(M-1) × (1 + taxa(M-1)/100)`
- Pro-rata: `indice(d) = indice(01/M) × (1 + taxa(M)/100) ^ ((dia-1) / diasNoMes(M))`
- Último mês sem taxa seguinte: retorna `indice(01/M)` sem pro-rata
- Datas antes de 2025-12-01: lança `Error('data fora da série')`

`src/core/unidades.ts`:
- `paraUnidades(valor, data, corrigir, taxas): Decimal`
  - Se `corrigir=false`: retorna `valor` direto
  - Se `corrigir=true`: retorna `valor / indiceEmData(data, taxas)`
- `paraReais(unidades, hoje, corrigir, taxas): Decimal`
  - Se `corrigir=false`: retorna `unidades` direto
  - Se `corrigir=true`: retorna `unidades × indiceEmData(hoje, taxas)`

`src/core/saldo.ts`:
- `calcularSaldo(rateio, corrigir, hoje, taxas)` conforme pseudocódigo do HANDOFF §4.10
- Retorna: `{ uTotal, pagoEfetivo, compromisso, excesso, deficit, saldoUnidades, deveDePara }`
- Invariantes verificadas: `Σexcesso = Σdeficit`, `ΣsaldoUnidades = 0`

Testes (`src/core/__tests__/`):
- `indice.test.ts`: valida tabela de índices do HANDOFF §4.1 contra valores esperados
- `saldo.test.ts`: roda sobre `.ai/casos-de-teste.json` (27 casos piloto) e `.ai/casos-de-teste-n-pessoas.json` (10 sintéticos)
- Critério de aceite: saldo em 2026-08-15 entre R$ 707,00 e R$ 708,00

### Fase 3 — Banco de Dados e RLS

`src/db/schema.ts` (Drizzle):
- Tabelas: `users`, `rateios`, `membros`, `despesas`, `reembolsos`, `taxas_ipca`, `config`
- Sem coluna `situacao` em despesas (derivada em runtime)
- Cota: `numeric(9,6)`, 0 ≤ cota ≤ 1, Σ = 1 por rateio (trigger)

Migrações:
- `drizzle/migrations/0000_init.sql`: schema base
- `drizzle/migrations/0001_rls.sql`: RLS, triggers, RPCs

RPCs SECURITY DEFINER:
- `buscar_usuario_por_email(email)`: retorna `{id, email}` sem relaxar RLS de `users`
- `criar_rateio(nome, corrigir_ipca, participantes)`: transação atômica rateio + membros

Roles:
- `authenticated`: acesso via Data API + JWT
- `ipca_writer`: INSERT/UPDATE apenas em `taxas_ipca` (usada pelo GitHub Action)

### Fase 4 — Autenticação e Cliente de Dados

`src/db/auth.ts`:
- `useSession()`, `useUser()` via Neon Auth JWT
- Redirect para `/login` se não autenticado

`src/db/client.ts`:
- Wrapper sobre Neon Data API (PostgREST)
- Funções tipadas: `listarRateios()`, `criarDespesa()`, `criarReembolso()`, `listarTaxas()`
- Sem connection string: usa JWT do usuário + Data API URL

### Fase 5 — Telas

Todas as telas usam componentes de `src/components/ui/` e tokens do design system.

| Rota | Tela | Componentes-chave |
|------|------|-------------------|
| `/` | Lista de rateios | Card, Badge (saldo), Avatar |
| `/rateios/:id` | Detalhe do rateio | Header, extrato, FAB |
| `/rateios/:id/nova-despesa` | Formulário despesa | Input, Select, Badge (prevista/paga) |
| `/rateios/:id/novo-reembolso` | Formulário reembolso | Input, Select |
| `/novo-rateio` | Criar rateio | Input, Switch (corrigir_ipca), Avatar |
| `/configuracoes` | Configurações | Switch (tema), Card por rateio |
| `/login` | Login | Button, Input |

Toast de recálculo: quando `U_total` muda ao inserir despesa, exibir mensagem global.

### Fase 6 — Workflows GitHub

- `smoke-bcb.yml`: curl em `api.bcb.gov.br`, falha se inacessível
- `ipca.yml`: busca SGS 433, upsert idempotente em `taxas_ipca`, agendado dias 9-15
- `backup.yml`: `pg_dump` semanal como artifact (retenção 90 dias)

### Fase 7 — Migração e Deploy

`scripts/migrar-planilha.mjs`:
- Cria rateio "Apartamento" via RPC `criar_rateio` (cotas LUCAS=0, LETICIA=1)
- Insere 27 despesas e reembolsos da planilha
- Valida saldo calculado contra intervalo R$ 707–R$ 708

Deploy: GitHub Pages via Action, base `/rateio/`, service worker respeita o scope.

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Neon Data API em beta pode mudar | Médio | Abstração em `client.ts`; atualizar wrapper se API mudar |
| BCB bloqueia IPs de datacenter | Baixo | Smoke test + fallback manual |
| Workflows desativados após 60 dias | Alto | Documentar no README; `workflow_dispatch` manual |
| Cold start Neon ~5s | Médio | Loading elegante; warm-up opcional |
| vite@8 incompatibilidade com plugins | Baixo | Já resolvido: vitest.config.ts separado |

## Critério de Conclusão

- Módulo de cálculo: 27 + 10 testes passando
- Saldo 2026-08-15: R$ 707,00 – R$ 708,00
- RLS validada com 2 usuários distintos
- PWA instalável; base path correto
- Todos os artefatos do spec kit presentes em `specs/`
