# Prompts por demanda — Rateio

Arquivo de referência. Cada seção é um prompt autocontido, para colar
individualmente numa sessão do Claude Code.

**Estado:** setup concluído (`.ai/planning/` e `specs/002`–`specs/008`
criados). Executar apenas os 10 blocos abaixo, por onda.

**Contexto comum a todas as sessões** (lido pelo Claude Code via
`.ai/planning/`):
- `.ai/planning/STATUS.md` — progresso
- `.ai/planning/ROADMAP.md` — ondas e dependências
- `.ai/planning/DECISIONS.md` — decisões D-001 a D-012
- `.ai/planning/TEMPLATE-ONDA.md` — instruções detalhadas por tipo

**Regra de uso:** abrir este arquivo, copiar **apenas o bloco da
demanda que vai executar** e colar numa sessão nova. Nunca colar mais
de um bloco de uma vez.

---

## Onda 1 — Correções

### D-001 — Fix: Config. Rateio vazio (spec `002-fix-config-rateio`)

```
Leia .ai/planning/STATUS.md, ROADMAP.md e DECISIONS.md. Vamos executar
D-001 (Fix: Config. Rateio vazio), spec specs/002-fix-config-rateio/.

Repro: o bug aparece no rateio chamado "teste" — a tela Config. Rateio
às vezes não carrega, mostra modal vazio.

Passos:
1. Investigue a causa (código de Config. Rateio + chamada de dados +
   possível race condition ou erro silencioso).
2. Rode /speckit.specify para criar spec.md com o bug descrito,
   repro, comportamento esperado e critério de aceite.
3. Rode /speckit.plan e /speckit.tasks.
4. Pare e me mostre os 3 arquivos antes de implementar.
5. Ao final de cada etapa, atualize .ai/planning/STATUS.md.
```

### D-002 — Auditoria de workflows (sem spec)

```
Leia .ai/planning/STATUS.md, ROADMAP.md e DECISIONS.md. Vamos fazer
D-002 (auditoria de workflows).

Passos:
1. Rode `gh auth status` para confirmar autenticação.
2. Rode `gh run list --limit 30` para listar execuções recentes.
3. Para cada workflow que falhou, `gh run view <id> --log` e analise.
4. Produza .ai/planning/workflows-audit.md com: lista de workflows,
   frequência, últimos status, causa provável de cada falha,
   recomendação (manter / ajustar / remover, com justificativa).
5. NÃO altere nenhum workflow ainda. Pare e aguarde minha decisão.

Reporte o relatório completo.
```

---

## Onda 2 — Infra e limpeza

### D-003 — Remover GitHub Pages (sem spec)

```
Leia .ai/planning/STATUS.md, ROADMAP.md e DECISIONS.md. Vamos fazer
D-003 (remover GitHub Pages).

Objetivo: desativar a URL antiga https://lucasmm96.github.io/rateio/ e
manter apenas https://meurateio.vercel.app. Aceitar 404 para links
antigos (decisão D-001 do DECISIONS.md).

Passos:
1. Verificar .github/workflows/ — se existe workflow de deploy de
   GitHub Pages, marcar como obsoleto com comentário no topo. NÃO
   apagar.
2. Verificar vite.config.ts — se tem base: '/rateio/', remover (deixar
   '/').
3. Verificar src/routes/ — se usa createHashRouter, trocar por
   createBrowserRouter. Substituir todos os href="#/" por href="/".
4. Verificar index.html — nenhum caminho absoluto com /rateio/.
5. Verificar service worker / manifest PWA — scope deve ser '/'.
6. Rodar npm run build && npm run preview e validar em localhost:4173.
7. Reportar o que mudou e me instruir sobre como desligar GitHub Pages
   manualmente no console do GitHub (Settings → Pages → Source: None).

Atualize .ai/planning/STATUS.md ao final. Commit único com mensagem
"chore(deploy): remove GitHub Pages, mantém apenas Vercel".
```

---

## Onda 3 — Qualidade

### D-004 — Coverage de testes (sem spec)

```
Leia .ai/planning/STATUS.md, ROADMAP.md e DECISIONS.md. Vamos fazer
D-004 (coverage de testes).

Escopo (D-009 do DECISIONS.md): src/core/ e src/components/.

Passos:
1. Levantar estado atual: listar arquivos em src/core/ e
   src/components/ com e sem teste. Verificar se vitest já está
   configurado e se há coverage rodando.
2. Adicionar princípio em .ai/constitution.md: "Toda regra de negócio
   em src/core/ e todo componente reutilizável em src/components/ tem
   teste automatizado. Coverage mínimo: definir meta com o usuário
   antes de fechar."
3. Configurar @vitest/coverage-v8 (v8 é o provider mais rápido).
4. Adicionar script npm run test:coverage no package.json.
5. Configurar CI (GitHub Actions) para rodar cobertura em push.
6. Produzir .ai/planning/coverage-report.md com gap por arquivo.
7. Reportar % atual e o que falta cobrir. Aguardar minha definição da
   meta antes de escrever testes novos.

Atualize .ai/planning/STATUS.md ao final.
```

---

## Onda 4 — Features pequenas

### D-005 — Links em despesas/reembolsos (spec `003-links-despesas-reembolsos`)

```
Leia .ai/planning/STATUS.md, ROADMAP.md e DECISIONS.md. Vamos executar
D-005 (links em despesas/reembolsos), spec
specs/003-links-despesas-reembolsos/.

Regra (D-003 do DECISIONS.md): links ilimitados por despesa/reembolso,
via tabela auxiliar `links` (não array JSON). Os campos atuais
boleto_url e comprovante_url serão substituídos.

Passos:
1. Rode /speckit.specify para criar spec.md com: regra de negócio,
   migração dos campos antigos para a nova tabela, UI (lista de links
   com add/remove), critérios de aceite.
2. Rode /speckit.plan (incluir migração Drizzle com plano de rollback).
3. Rode /speckit.tasks.
4. Pare e me mostre os 3 arquivos antes de implementar.
5. Atualize .ai/planning/STATUS.md a cada etapa.
```

### D-006 — Editar lançamentos + auditoria (spec `004-editar-lancamentos-auditoria`)

```
Leia .ai/planning/STATUS.md, ROADMAP.md e DECISIONS.md. Vamos executar
D-006 (editar lançamentos + auditoria), spec
specs/004-editar-lancamentos-auditoria/.

Regras (D-008 do DECISIONS.md): todos os campos editáveis. Precisa de
auditoria (tabela audit_log) e visualização mínima no front (o que
mudou, quem, quando).

Dependência: D-005 (links) já implementada? Se não, avisar e sugerir
ordem.

Passos:
1. Rode /speckit.specify com: campos editáveis por tipo, estrutura da
   tabela audit_log (entidade, entidade_id, user_id, ação,
   diff_json, timestamp), UI de auditoria (lista de alterações por
   lançamento), critérios de aceite.
2. Rode /speckit.plan (incluir trigger no Postgres ou lógica
   server-side para gravar auditoria).
3. Rode /speckit.tasks.
4. Pare e me mostre os 3 arquivos antes de implementar.
5. Atualize .ai/planning/STATUS.md a cada etapa.
```

### D-007 — Perfil do usuário (spec `005-perfil-usuario`)

```
Leia .ai/planning/STATUS.md, ROADMAP.md e DECISIONS.md. Vamos executar
D-007 (perfil do usuário), spec specs/005-perfil-usuario/.

Regras (D-002 e D-010 do DECISIONS.md): nova tela em #/perfil. Campo
nome editável. Se o usuário entrou com Google OAuth, o nome vem
preenchido do Google (editável). Google OAuth já existe.

Passos:
1. Rode /speckit.specify com: campos do perfil (nome, email read-only,
   avatar?), origem do nome (Google ou manual), UI da tela, critérios
   de aceite.
2. Rode /speckit.plan.
3. Rode /speckit.tasks.
4. Pare e me mostre os 3 arquivos antes de implementar.
5. Atualize .ai/planning/STATUS.md a cada etapa.
```

---

## Onda 5 — Features grandes

### D-008 — Dashboard (spec `006-dashboard`)

```
Leia .ai/planning/STATUS.md, ROADMAP.md e DECISIONS.md. Vamos executar
D-008 (dashboard), spec specs/006-dashboard/.

Regras (D-005 do DECISIONS.md): aba nova em #/dashboard. Mostra 3
métricas: total pago, total previsto, total a acertar. Gráficos
opcionais.

Dependência: D-004 (coverage) concluída? Se não, avisar.

Passos:
1. Rode /speckit.specify com: definição exata das 3 métricas (fórmula
   de cada uma), layout da aba, gráficos sugeridos, critérios de
   aceite.
2. Rode /speckit.plan.
3. Rode /speckit.tasks.
4. Pare e me mostre os 3 arquivos antes de implementar.
5. Atualize .ai/planning/STATUS.md a cada etapa.
```

### D-009 — Transparência IPCA (spec `007-transparencia-ipca`)

```
Leia .ai/planning/STATUS.md, ROADMAP.md e DECISIONS.md. Vamos executar
D-009 (transparência IPCA), spec specs/007-transparencia-ipca/.

Regras (D-007 do DECISIONS.md): tela em Configurações Globais
(#/config). Usuário visualiza índices, aplica filtros, vê gráficos, e
enxerga de onde vêm os dados (BCB SGS 433, link para fonte oficial).

Passos:
1. Rode /speckit.specify com: dados exibidos (tabela taxas_ipca + link
   para BCB), filtros (intervalo de datas), gráfico (série histórica
   do índice acumulado), fonte (URL oficial do BCB), critérios de
   aceite.
2. Rode /speckit.plan (considerar cache dos dados).
3. Rode /speckit.tasks.
4. Pare e me mostre os 3 arquivos antes de implementar.
5. Atualize .ai/planning/STATUS.md a cada etapa.
```

### D-010 — Busca por username (spec `008-busca-username`)

```
Leia .ai/planning/STATUS.md, ROADMAP.md e DECISIONS.md. Vamos executar
D-010 (busca por username), spec specs/008-busca-username/.

Regras (D-004 do DECISIONS.md): busca via prefixo do email. Sem campo
username novo. Usuário digita "lucasmm" e aparece lista de
"lucasmm@gmail.com", "lucasmm@hotmail.com", etc. — o usuário escolhe.

Passos:
1. Rode /speckit.specify com: RPC buscar_usuario_por_prefixo (LIKE),
   UI de busca (autocomplete com lista), casos de borda (prefixo
   vazio, muitos resultados), critérios de aceite.
2. Rode /speckit.plan (atenção à RLS — busca por prefixo expõe emails,
   precisa ser SECURITY DEFINER com retorno limitado a id + email).
3. Rode /speckit.tasks.
4. Pare e me mostre os 3 arquivos antes de implementar.
5. Atualize .ai/planning/STATUS.md a cada etapa.
```

---

## Ordem recomendada de execução

| # | Onda | Demanda | Spec | Sessões estimadas |
|---|---|---|---|---|
| 1 | 1 | D-001 Fix config | `specs/002-*` | 1–2 |
| 2 | 1 | D-002 Workflows | — | 1 |
| 3 | 2 | D-003 Remove GH Pages | — | 1 |
| 4 | 3 | D-004 Coverage | — | 1–2 |
| 5 | 4 | D-005 Links | `specs/003-*` | 2 |
| 6 | 4 | D-006 Editar | `specs/004-*` | 2–3 |
| 7 | 4 | D-007 Perfil | `specs/005-*` | 1–2 |
| 8 | 5 | D-008 Dashboard | `specs/006-*` | 2–3 |
| 9 | 5 | D-009 IPCA | `specs/007-*` | 2 |
| 10 | 5 | D-010 Username | `specs/008-*` | 1–2 |

"Cadências estimadas" é a quantidade de conversas no Claude Code. O
`/speckit.implement` pode ser feito no mesmo dia que o `/specify`, ou
em sessão separada, à sua escolha.

## Regras ao longo das sessões

- **Nunca apagar** `specs/001-controle-de-rateios/`.
- **Sempre atualizar** `.ai/planning/STATUS.md` ao fim de cada sessão.
- **Commit ao final** de cada sessão (ou a cada passo, se preferir
  histórico granular).
- **Se a spec não estiver clara**, parar no `/specify` e pedir mais
  contexto ao dono do projeto antes de rodar `/plan`.
- **Se o agente sugerir alterar `DECISIONS.md`**, avaliar caso a caso —
  decisões são do dono do projeto, não do agente.