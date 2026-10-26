# Controle de Rateios

PWA para gerenciar **rateios** — divisões de despesas compartilhadas entre participantes — com correção monetária opcional pelo IPCA (ou qualquer série do BCB). Substitui a planilha. Instalável no celular.

Código **open source e reutilizável**. Fork e adapte para qualquer cenário de divisão de despesas: apartamento, celular, carro, viagem.

---

## Funcionalidades

- Múltiplos rateios independentes, cada um com seus próprios participantes, cotas, despesas e saldo
- Correção monetária por IPCA (BCB SGS 433) — opcional por rateio, configurável para qualquer série
- Cálculo de saldo pelo modelo Forma B (compromisso/excesso): quem pagou mais que o compromisso vira credor
- Despesas previstas (data futura) não entram no cálculo até a data passar
- Reembolsos registrados como fatos históricos
- Memória de cálculo por rateio (breakdown: U\_total, compromisso, pago efetivo, saldo)
- Dark mode automático / manual

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Front | React 19 + Vite 8 + TypeScript + PWA (vite-plugin-pwa) |
| Roteamento | react-router-dom v7 (BrowserRouter, SPA rewrite via `vercel.json`) |
| Banco | Neon Postgres (free tier) |
| Auth | Neon Auth (Better Auth) |
| Data API | Neon PostgREST via `@neondatabase/neon-js` |
| ORM / Migrações | Drizzle ORM |
| Cálculo | decimal.js (nunca `number` para dinheiro) |
| Hospedagem | Vercel (plano Hobby) |
| CI/CD | GitHub Actions |

---

## Fork — como usar para o seu cenário

### 1. Pré-requisitos

- Conta no [Neon](https://neon.tech) (free tier suficiente)
- Conta na [Vercel](https://vercel.com) (plano Hobby, gratuito)
- Repositório público no GitHub
- Node.js 22+

### 2. Fork e clone

```bash
gh repo fork seu-usuario/rateio --clone
cd rateio
npm install
```

### 3. Criar projeto no Neon

1. Crie um projeto no [Console do Neon](https://console.neon.tech).
2. Anote o **endpoint ID** (formato `ep-xxx-yyy`).
3. Em **Settings → Neon Auth**: ative e copie a **Auth URL**.
4. Em **Settings → Data API**: ative e copie a **Data API URL**.

As URLs têm o formato:
```
Auth URL:     https://ep-xxx.neonauth.c-2.<region>.aws.neon.tech/<db>/auth
Data API URL: https://ep-xxx.apirest.c-2.<region>.aws.neon.tech/<db>/rest/v1
```

### 4. Configurar variáveis locais

```bash
cp .env.example .env.local
# Edite .env.local com suas URLs e connection string
```

### 5. Aplicar migrações

```bash
# Aplica schema, RLS, triggers e RPCs
npx tsx scripts/migrar.ts
```

### 6. Popular taxas IPCA (série 433)

```bash
node scripts/seed-taxas.mjs
```

### 7. Cadastrar usuários

Acesse o app localmente (`npm run dev`) e crie as contas pela tela de cadastro. O Neon Auth registra os usuários na tabela `users`.

### 8. Migrar dados da planilha (opcional)

Se você tiver dados históricos para importar:

```bash
LUCAS_EMAIL=seu@email.com LETICIA_EMAIL=outro@email.com \
  node scripts/migrar-planilha.mjs
```

Edite `scripts/migrar-planilha.mjs` com os dados do seu rateio antes de rodar.

### 9. Deploy na Vercel

Instruções completas em **[`.ai/deploy/DEPLOY.md`](.ai/deploy/DEPLOY.md)**. Resumo:

1. Acesse [vercel.com](https://vercel.com) → **Add New Project** → **Import Git Repository** → selecione seu fork.
2. Framework Preset: **Vite** (auto-detectado). Build: `npm run build`. Output: `dist`.
3. Em **Environment Variables**, adicione as variáveis `VITE_*` do `.env.example`.
4. Clique **Deploy**.
5. Após o primeiro deploy, adicione o domínio de produção na allowlist de CORS do Neon Data API.

Em **GitHub Secrets** (para os workflows de IPCA e backup), crie:
- `DATABASE_URL` — connection string completa (para backup)
- `IPCA_WRITER_DATABASE_URL` — connection string do role `ipca_writer`

**Como configurar o `ipca_writer`:** a migração `0001_rls.sql` cria o role, mas não define senha. Configure pelo SQL Editor do Neon Console:

```sql
ALTER ROLE ipca_writer WITH LOGIN PASSWORD 'escolha-uma-senha-forte';
```

10. **Fazer push** — a Vercel vai detectar automaticamente e publicar.

```bash
git push
```

### 10. Adaptar o rateio

Para adaptar ao seu caso:

- Edite `scripts/migrar-planilha.mjs` com seus dados
- O app suporta **n participantes** com cotas livres (somam 100%)
- Cotas podem ser ajustadas a qualquer momento em Configurações
- Correção IPCA é opcional por rateio; pode usar qualquer série BCB (variável `BCB_SERIE`)

---

## Deploy

Hospedagem na **Vercel** (plano Hobby). Instruções completas em [`.ai/deploy/DEPLOY.md`](.ai/deploy/DEPLOY.md).

---

## Desenvolvimento local

```bash
npm run dev       # servidor de desenvolvimento
npm run build     # build de produção
npm test          # testes (vitest)
npm run test:coverage
npm run lint      # oxlint
```

### Verificar schema no banco

```bash
npx tsx scripts/verificar-schema.ts
```

---

## Scripts

| Script | Descrição |
|--------|-----------|
| `scripts/migrar.ts` | Aplica todas as migrações SQL (0000, 0001, 0002) via node-postgres |
| `scripts/verificar-schema.ts` | Exibe tabelas, políticas RLS, triggers e funções do schema |
| `scripts/seed-taxas.mjs` | Busca série BCB e faz upsert em `taxas_ipca` |
| `scripts/migrar-planilha.mjs` | Popula rateio "Apartamento" com dados históricos (idempotente) |

---

## Workflows GitHub Actions

| Workflow | Gatilho | Secrets/Vars |
|----------|---------|--------------|
| `deploy.yml` | ~~push em `master`~~ — **obsoleto** (substituído pela Vercel) | — |
| `smoke-bcb.yml` | dia 9 de cada mês | — |
| `ipca.yml` | dias 9–15 de cada mês | secret: `IPCA_WRITER_DATABASE_URL` |
| `backup.yml` | domingo 02:00 UTC | secret: `DATABASE_URL` |

> **Atenção**: O GitHub desativa workflows agendados em repositórios públicos após **60 dias sem commits**. Para reativar: faça um commit qualquer, ou ative manualmente em Actions → Enable workflow.

---

## Modelo de cálculo (Forma B)

```
U_total        = Σ valor_pago / índice(data)       ← apenas despesas com data ≤ hoje
compromisso_i  = cota_i × U_total
pago_efetivo_i = pago_i + reembolsos_pagos_i − reembolsos_recebidos_i
excesso_i      = max(0, pago_efetivo_i − compromisso_i)
déficit_i      = max(0, compromisso_i − pago_efetivo_i)
deve(i → j)    = déficit_i × excesso_j / Σ excesso   ← já é o líquido
saldo_reais_i  = (Σ deve(i→j) − Σ deve(k→i)) × índice(hoje)
```

Invariantes: `Σ excesso = Σ déficit` e `Σ saldo = 0`.

---

## Segurança

- Nenhuma credencial no bundle — o front fala apenas com a Data API via JWT
- RLS (Row Level Security) obrigatória em todas as tabelas
- Busca de usuário por e-mail via RPC `SECURITY DEFINER` (não expõe dados de outros usuários)
- Criação de rateio via RPC atômica (evita estado intermediário com Σ cotas ≠ 1)
- Role `ipca_writer` restrita a INSERT/UPDATE em `taxas_ipca` — sem acesso a dados dos usuários

---

## Licença

MIT
