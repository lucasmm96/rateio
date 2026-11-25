# D-002 — Auditoria de Workflows

Data: 2026-10-26  
Fonte: `gh run list --limit 30` + `gh run view <id> --log` + leitura dos arquivos `.github/workflows/`

---

## Inventário

| # | Nome | Arquivo | Trigger | Última run | Resultado |
|---|------|---------|---------|-----------|-----------|
| 1 | Atualizar IPCA | `ipca.yml` | schedule dias 9–15 (09:00 UTC) + dispatch | 2026-10-25 22:45 | ❌ failure |
| 2 | Backup Semanal | `backup.yml` | schedule domingo 02:00 UTC + dispatch | 2026-10-25 07:18 | ❌ failure |
| 3 | Smoke Test BCB | `smoke-bcb.yml` | schedule dia 9 08:00 UTC + dispatch | nunca | — |
| 4 | Deploy — GitHub Pages | (sem arquivo — gerenciado pelo GitHub) | push para master | 2026-10-25 23:41 | ✅ success |

---

## Análise detalhada

### 1. Atualizar IPCA (`ipca.yml`)

**Propósito**: buscar série 433 (IPCA mensal) no BCB e fazer upsert em `taxas_ipca`.

**Frequência**: 7 disparos agendados por mês (dias 9–15) + `workflow_dispatch`.

**Histórico**: 1 run registrado no total (dispatch manual em 2026-10-25).
Nenhum run agendado aparece no histórico — provavelmente desativado por inatividade do repo
(GitHub desativa workflows agendados após 60 dias sem push; reativado quando houver push).

**Falha (run 40241683750)**:
```
→ Buscando série 433 em https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json
❌ BCB respondeu 502
```
Causa: o servidor BCB retornou HTTP 502 (Bad Gateway) — erro transitório, externo ao projeto.

**Inconsistência no arquivo**:
O log do run usou `pnpm/action-setup@v4` + `pnpm install --frozen-lockfile` + `pnpm exec node`.
O arquivo atual (`ipca.yml`) usa `actions/setup-node@v4` com `cache: 'npm'` + `npm ci` + `node`.
O arquivo foi alterado após o run (commit 2026-10-25 20:59). O script do IPCA não depende
de pnpm; ambas as versões funcionam. O arquivo atual (npm) está consistente com o restante
do projeto.

**Pontos de atenção**:
- Secreto `IPCA_WRITER_DATABASE_URL` está configurado (confirmado pelo log: aparece mascarado).
- O workflow não tem retry: se o BCB retornar 502 em todos os dias 9–15, o mês fica sem atualização.
- Sem notificação de falha (apenas o status vermelho do Actions).

**Recomendação**: **MANTER** — propósito essencial, falha foi transitória. Sugestão futura (não agora):
adicionar retry com `--retry` no curl dentro do script, ou aceitar falha silenciosa e deixar o
próximo dia do schedule tentar novamente.

---

### 2. Backup Semanal (`backup.yml`)

**Propósito**: gerar `pg_dump` customizado do banco e publicar como artifact no Actions (retenção 90 dias).

**Frequência**: 1x/semana (domingo 02:00 UTC) + `workflow_dispatch`.

**Histórico**: 1 run registrado (agendado em 2026-10-25 07:18). Apenas 1 run visível — provavelmente
era inativo e foi reativado pelo push recente.

**Falha (run 40172263960)**:
```
→ Gerando backup_20261025_071826.dump...
pg_dump: error: invalid sslmode value: "require
"
```
Causa: **o secreto `DATABASE_URL` tem uma quebra de linha (`\n`) no final**.
O shell interpreta `sslmode=require\n` como valor inválido ao parsear a connection string.
O pg_dump falha imediatamente (exit code 1) antes de conectar ao banco.

Raiz: ao copiar o valor do secreto no GitHub Settings, o usuário incluiu `\n` no final
(paste com newline). O Actions propaga o valor literalmente.

**Recomendação**: **MANTER, mas corrigir o secreto antes de qualquer outra coisa**.
Ação: Settings → Secrets and variables → Actions → `DATABASE_URL` → editar e remover o
`\n` do final. O workflow em si está correto.

---

### 3. Smoke Test BCB (`smoke-bcb.yml`)

**Propósito**: verificar que `api.bcb.gov.br` responde (últimos 3 registros da série 433)
antes de rodar o IPCA. Agendado às 08:00 UTC, 1 hora antes do `ipca.yml` (09:00 UTC).

**Frequência**: 1x/mês (dia 9) + `workflow_dispatch`.

**Histórico**: 0 runs — nunca executou.
Causa provável: o arquivo foi criado em 2026-10-19, depois do dia 9 de outubro.
O próximo disparo agendado é 2026-11-09.

**Problema de design**: o smoke test roda como workflow independente. Se o BCB estiver down
no dia 9, o smoke falha, mas o `ipca.yml` roda normalmente às 09:00 de qualquer jeito.
Não há acoplamento entre os dois — o smoke test não protege nada atualmente.

Para ter valor como "gate", seria necessário usar `on: workflow_run` no `ipca.yml`
dependendo da conclusão do smoke, o que introduziria complexidade.

**Recomendação**: **AJUSTAR** — duas opções mutuamente exclusivas:

- **Opção A (simples)**: remover `smoke-bcb.yml`. Em vez disso, adicionar retry no próprio
  `ipca.yml` (ex.: retentar 3x com sleep de 5min entre tentativas via script). Consolida a lógica.
- **Opção B (preservar observabilidade)**: manter o smoke test mas aceitar que é só diagnóstico —
  ele avisa via status vermelho no Actions, não bloqueia o IPCA. Documentar isso explicitamente.

Preferência sugerida: **Opção A** — menos workflows, lógica centralizada.

---

### 4. Deploy — GitHub Pages

**Propósito**: deploy de cada commit para `lucasmm96.github.io/rateio` (URL legada).

**Frequência**: todo push para master.

**Histórico**: 18 runs no período visível (Oct 19–25), todos ✅ success. Consome ~40s de Actions
a cada push.

**Arquivo**: nenhum arquivo em `.github/workflows/` corresponde a este workflow.
É o workflow interno do GitHub criado automaticamente quando "Source" do GitHub Pages
está configurado como "GitHub Actions" nas settings do repositório.

**Contexto**: o app migrou para Vercel (`https://meurateio.vercel.app`). A URL do GitHub Pages
está para ser desativada em D-003 (Onda 2).

**Recomendação**: **REMOVER** — executar D-003 agora ou junto com D-003:
1. Acessar Settings → Pages → Source → selecionar "None".
2. Isso desativa o workflow interno e para os runs futuros.
3. Qualquer visitante da URL antiga receberá 404 (comportamento aceito, conforme DECISIONS.md).

---

## Resumo executivo

| Workflow | Recomendação | Ação imediata necessária |
|----------|-------------|--------------------------|
| Atualizar IPCA | MANTER | Nenhuma — falha foi transitória (BCB 502) |
| Backup Semanal | MANTER | Corrigir secreto `DATABASE_URL` (newline no final) |
| Smoke Test BCB | AJUSTAR | Decidir: remover + retry no IPCA (opção A) ou manter como observabilidade (opção B) |
| Deploy — GitHub Pages | REMOVER | Desativar Pages Source nas Settings do repo (D-003) |

**Bloqueador ativo**: `DATABASE_URL` com newline quebra o backup toda semana.
Corrija o secreto antes de qualquer outro trabalho nesta onda.
