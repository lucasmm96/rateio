# Deploy — Rateio

Deploy na Vercel. Documento complementar ao HANDOFF.

## Visão geral

- Front hospedado na **Vercel** (plano Hobby).
- GitHub Actions (IPCA, backup, smoke-bcb) continuam no **GitHub** —
  não migrar.
- Banco continua no **Neon**.

## Pré-requisitos

- Conta na Vercel (plano Hobby, gratuita).
- Repositório `lucasmm96/rateio` no GitHub.
- `vercel.json` no repo (criado na etapa de código).
- Env vars do front configuradas na Vercel.

## Arquivo `vercel.json` (referência)

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/manifest.webmanifest",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

## Configuração inicial na Vercel

1. Acessar vercel.com → **Add New Project** → **Import Git Repository**.
2. Selecionar `lucasmm96/rateio`.
3. Framework Preset: **Vite** (auto-detectado).
4. Build Command: `npm run build`.
5. Output Directory: `dist`.
6. Install Command: `npm install`.
7. **Environment Variables**: adicionar todas as variáveis `VITE_*` do
   `.env.example`. Prefixadas com `VITE_` são embutidas no bundle no
   build (não são secrets em runtime).
8. Clicar **Deploy**.

## Environment Variables esperadas

Conferir no `.env.example` do repo. Tipicamente:

- `VITE_NEON_DATA_API_URL`
- `VITE_NEON_AUTH_URL`

Nunca expor no front: connection string do Postgres, service role do
Neon, secrets de OAuth. Essas ficam em **GitHub Actions secrets** (para
os workflows), não em env vars da Vercel.

## Neon — CORS allowlist

O Neon Data API bloqueia origens não autorizadas. Depois do primeiro
deploy da Vercel:

1. Copiar o domínio de produção (ex.: `https://rateio-xyz.vercel.app`
   ou `https://rateio.lucasmm96.dev` se usar domínio custom).
2. No console do Neon → projeto → **Data API** → **CORS** (ou
   **Allowed Origins**): adicionar o domínio exato.
3. Salvar.

**Preview deployments** (`https://rateio-git-*.vercel.app`) têm URL
aleatória por PR. Duas opções:

- **(a)** Não adicionar na allowlist. Previews servem para revisar
  layout sem dados. O app mostra tela de erro ao tentar carregar dados
  — aceitável para review visual.
- **(b)** Adicionar wildcard `https://*.vercel.app` na allowlist. Menos
  seguro, mas facilita testes com dados reais em previews.

Recomendado: **(a)**.

## Preview Deployments

Cada Pull Request gera automaticamente uma URL de preview
(`https://rateio-git-<branch>-<hash>.vercel.app`). Útil para revisar o
design responsivo antes do merge.

- URL pública (acessível sem login na Vercel? Sim, se o projeto for
  público no GitHub e a opção "Vercel Authentication" estiver
  desabilitada).
- Para desabilitar o password gate: Project Settings → Deployment
  Protection → Vercel Authentication → Disable (ou "Only Production").

## Custom domain (opcional)

Vercel oferece subdomínio `*.vercel.app` gratuito. Domínio custom
(`rateio.lucasmm96.dev`) também é gratuito no Hobby, mas requer comprar
o domínio em um registrador.

Para usar custom domain:

1. Project Settings → Domains → Add.
2. Seguir instruções de DNS (CNAME para `cname.vercel-dns.com`).
3. Aguardar propagação (5 min a 24h).

## PWA e service worker

- O `vite-plugin-pwa` gera `sw.js` e `manifest.webmanifest` em `dist/`.
- Os headers do `vercel.json` garantem que ambos são servidos com
  `Cache-Control: max-age=0, must-revalidate` (para que a atualização
  chegue aos usuários).
- Assets com hash no nome (`/assets/app-abc123.js`) usam
  `max-age=31536000, immutable` — cache agressivo é seguro.
- O escopo do service worker muda: no GitHub Pages era `/rateio/`, agora
  é `/`. Se o `vite.config.ts` tiver `base: '/rateio/'`, remover.

## Rollback

Vercel guarda todos os deploys:

1. Project → Deployments.
2. Localizar o deploy anterior saudável.
3. Menu `⋮` → **Promote to Production**.

Instantâneo, sem re-deploy.

## Migração: desligar GitHub Pages

**Só depois de validar a Vercel em produção por pelo menos 48h:**

1. GitHub → repo → Settings → Pages → Source: **None**.
2. Remover o workflow de deploy do GitHub Pages (`.github/workflows/deploy.yml`
   ou equivalente, se existir).
3. Manter os workflows `ipca.yml`, `backup.yml`, `smoke-bcb.yml`.

## Checklist pós-migração

- [ ] Deploy de produção funcionando (`https://<domínio>/`).
- [ ] Login funciona (Neon Auth).
- [ ] Dados carregam (Neon Data API, CORS configurado).
- [ ] Rota direta funciona (ex.: colar `https://<domínio>/rateios/123`
      no navegador → carrega a tela de detalhe, não 404).
- [ ] PWA instalável no celular (menu "Instalar app").
- [ ] Dark mode funciona.
- [ ] GitHub Actions continuam verdes (IPCA, backup).
- [ ] Preview deployment gerado em um PR de teste funciona.
- [ ] GitHub Pages desligado após 48h de validação.

## Custos e limites (plano Hobby)

- 100 GB/mês de banda (suficiente para app pessoal).
- 6.000 min/mês de build, 1 build concorrente.
- Deployments ilimitados, preview deployments ilimitados.
- Cron jobs: 100 por projeto, **máximo 1 execução/dia** cada.
  (Ação de IPCA continua no GitHub, não afetada.)
- Funções serverless: 100 GB-horas/mês (não usadas nesta v1).
- Projetos inativos podem ser pausados após tempo prolongado sem
  tráfego.

## Se algo der errado na Vercel

1. **Deploy falha no build**: ver logs em Vercel → Deployments →
   Logs. Checar env vars faltantes.
2. **Tela branca em produção**: abrir DevTools → Console. Geralmente é
   variável `VITE_*` faltando ou erro de CORS no Neon.
3. **Rota 404**: `vercel.json` não está sendo respeitado. Verificar se
   está na raiz do repo (não em `public/`).
4. **PWA não instala**: manifest com caminho errado. Checar
   `vite.config.ts` (`base: '/'`).
