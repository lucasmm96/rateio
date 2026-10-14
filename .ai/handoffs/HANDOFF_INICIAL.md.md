# HANDOFF — App "Controle de Repasses"

Você é o Claude Code executando este projeto. Este único arquivo contém
tudo o que você precisa: contexto, decisões fechadas, modelo de dados,
regras de cálculo, dados de origem, telas, ordem de execução e os textos
completos dos quatro artefatos de spec que devem existir no repositório
(`.ai/constitution.md`, `.ai/spec.md`, `.ai/casos-de-teste.json`,
`.ai/tasks.md`).

Idioma de trabalho: português do Brasil. Código, comentários, commits e
documentação em português.

---

## INSTRUÇÕES INICIAIS (leia antes de tudo)

1. O repositório já existe, público, vazio (ou quase). Você está na raiz.
2. Antes de qualquer código, **crie os quatro arquivos de spec dentro
   da pasta `.ai/`** na raiz, com o conteúdo exato das seções 14 a 17
   deste documento:
   - `.ai/constitution.md`
   - `.ai/spec.md`
   - `.ai/casos-de-teste.json` (esqueleto da seção 16; você completa os
     27 casos na Fase 1 do `.ai/tasks.md`)
   - `.ai/tasks.md`
3. Depois, siga a ordem de execução da seção 9, parando ao final de cada
   fase para mostrar o resultado antes de prosseguir.
4. Não reabra decisões da seção 2. Se algo parecer ambíguo, pergunte ao
   usuário antes de assumir.

---

## 1. VISÃO GERAL

Transformar a planilha `Controle.xlsx` de um casal (Lucas e Letícia) em um
PWA web instalável no celular, para registrar despesas compartilhadas e
repasses entre duas pessoas, com correção monetária por IPCA (série SGS
433 do BCB, configurável).

O app **não é específico de apartamento**. É um app genérico de "contas a
repassar" com correção por índice. O caso do apartamento é a primeira
dívida cadastrada. O usuário pode criar quantas dívidas independentes
quiser (ex.: "Apartamento", "Celular no cartão", "Empréstimo X"), cada
uma com credor, devedor, despesas, repasses e saldo próprios.

O repositório é **público** e o código é **open source reutilizável**.
Qualquer pessoa pode fazer fork e usar para cenários parecidos. Nenhum
dado pessoal, credencial ou configuração específica vai no repositório.

---

## 2. DECISÕES FECHADAS (NÃO REABRIR)

### Stack
- Monolito de código em **React + Vite + TypeScript**.
- **PWA** com `vite-plugin-pwa`. Sem offline de dados (só cache do shell).
- **Sem backend separado**. Front estático.
- **Sem SSR**. SPA pura.

### Hospedagem
- **GitHub Pages** (repositório público, plano free).
- Base path do Vite e escopo do service worker configurados para a
  subpasta do repo (`/nome-do-repo/`).
- Rotas via **hash routing** (`#/dividas`, etc.) para evitar 404 do Pages.
- Nenhum segredo no bundle.

### Banco
- **Neon Postgres** (free tier).
- Acesso do front via **Neon Data API** (compatível com PostgREST) usando
  `@neondatabase/neon-js` ou `postgrest-js`.
- **Neon Auth** (JWT) para login.
- **RLS** (Row Level Security) obrigatório em todas as tabelas.
- Cadastro aberto **desativado**. Apenas e-mails autorizados.
- Schema e RLS versionados com **Drizzle ORM**. Migrações rodam localmente
  ou em CI com a connection string direta (apenas em secrets, nunca no
  front).
- O front **nunca** vê connection string. Só Data API + JWT.

### Rotina do IPCA
- GitHub Action agendado (dias 9 a 15 de cada mês) + `workflow_dispatch`.
- Busca `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{serie}/dados?formato=json`
  (serie default 433).
- Faz **upsert idempotente** em `taxas_ipca(mes, taxa)`.
- Usa uma **role do Postgres restrita** a INSERT/UPDATE nessa tabela.
- Credencial em secrets do repo.
- **Fallback**: cadastro manual da taxa na tela de configurações.
- **Smoke test obrigatório**: um workflow trivial que faz `curl` em
  `api.bcb.gov.br` e imprime. Se falhar, usar fallback manual até resolver.

### Backup
- GitHub Action semanal faz `pg_dump` e publica como **artifact**.
- Retenção 90 dias (limite free).

### Anexos
- Boleto e comprovante são apenas **links https opcionais** (OneDrive,
  Drive etc.). Sem upload, sem storage.

### Offline
- **Nenhum**. Leitura e escrita exigem conexão. Sem IndexedDB.

### Notificações
- **Nenhuma** na v1.

### Usuários
- 2 na v1: Lucas e Letícia.
- Membros são **por dívida** (tabela `membros`).

### Spec-driven
- Usar **GitHub Spec Kit enxuto**: apenas `constitution.md`, `spec.md`,
  `tasks.md`. Sem os outros comandos.
- Constitution é **reutilizável** para futuros apps derivados de planilhas.
- Todos os artefatos de spec ficam em **`.ai/`** na raiz do repositório.

### Direitos
- Código open source, repositório público, reutilizável.

### Fuso horário
- Cálculo em UTC. Exibição no fuso do navegador. Datas persistidas como
  `date` (sem hora).

---

## 3. MODELO DE DADOS

### 3.1 Conceitos

- **Dívida**: contexto isolado com credor, devedor, despesas, repasses e
  saldo próprios. Ex.: "Apartamento".
- **Credor**: quem desembolsou e tem a receber.
- **Devedor**: quem deve e fará os repasses.
- **Despesa**: valor pago a um terceiro. Tem um pagador (credor ou
  devedor da dívida). Pode estar `paga` ou `prevista`.
- **Repasse**: transferência do devedor para o credor. Sempre **sobre o
  total da dívida**, nunca vinculado a item.
- **Taxa IPCA**: global, uma linha por mês.

### 3.2 Regra de saldo (Leitura A)

Somente despesas pagas pelo **credor** geram dívida. Despesas pagas pelo
devedor são apenas registro histórico. Repasses do devedor abatem.

### 3.3 SQL (referência para o Drizzle)

```sql
create table users (
  id uuid primary key,
  email text unique not null,
  criado_em timestamptz not null default now()
);

create table dividas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  credor_user_id uuid not null references users(id),
  devedor_user_id uuid not null references users(id),
  criado_em timestamptz not null default now(),
  arquivada_em timestamptz,
  constraint credor_dif_devedor check (credor_user_id <> devedor_user_id)
);

create table membros (
  divida_id uuid not null references dividas(id) on delete cascade,
  user_id uuid not null references users(id),
  papel text not null check (papel in ('credor','devedor','observador')),
  primary key (divida_id, user_id)
);

create table despesas (
  id uuid primary key default gen_random_uuid(),
  divida_id uuid not null references dividas(id) on delete cascade,
  data date not null,
  descricao text not null,
  pagador_user_id uuid not null references users(id),
  valor numeric(14,2) not null check (valor > 0),
  situacao text not null check (situacao in ('paga','prevista')),
  boleto_url text,
  comprovante_url text,
  criado_em timestamptz not null default now()
);

create table repasses (
  id uuid primary key default gen_random_uuid(),
  divida_id uuid not null references dividas(id) on delete cascade,
  data date not null,
  valor numeric(14,2) not null check (valor > 0),
  observacao text,
  criado_em timestamptz not null default now()
);

create table taxas_ipca (
  mes date primary key,
  taxa numeric(8,4) not null
);

create table config (
  chave text primary key,
  valor jsonb not null
);
```

### 3.4 RLS

- `dividas`, `despesas`, `repasses`: filtradas por
  `divida_id in (select divida_id from membros where user_id = auth.uid())`.
- `membros`: leitura restrita a quem já é membro da mesma dívida; escrita
  restrita aos já membros.
- `taxas_ipca`: leitura para qualquer autenticado; escrita apenas pela role
  do Action (role dedicada criada via migração).
- `config`: leitura autenticada; escrita apenas pelo service role.
- `users`: cada usuário só vê a própria linha.

### 3.5 Constraints e regras estruturais

- `credor_user_id != devedor_user_id`.
- `pagador_user_id` de uma despesa deve pertencer a `{credor, devedor}` da
  dívida (validar na aplicação e, se possível, via trigger).
- Credor e devedor são **imutáveis após o primeiro lançamento** (despesa ou
  repasse). Antes disso, editáveis. Validar na aplicação.
- Ao criar uma dívida, inserir automaticamente dois registros em `membros`:
  o credor com papel `credor` e o devedor com papel `devedor`.

---

## 4. REGRAS DE CÁLCULO

### 4.1 Série do IPCA (SGS 433)

A série é buscada do BCB e armazenada como **variação percentual mensal**
em `taxas_ipca(mes, taxa)`. O índice acumulado é calculado em runtime.

Base default: **1000 em 2025-12-01**.

Defasagem de 1 mês:

```
indice(01/mes M) = indice(01/mes M-1) * (1 + taxa(M-1)/100)
```

Interpretação: a taxa do mês M-1 é publicada no início do mês M e é
aplicada para mover o índice de 01/M-1 para 01/M.

Exemplos reais (validados):

| mes        | taxa  | indice                     |
|------------|-------|----------------------------|
| 2025-12-01 | 0.33  | 1000.0000000000000         |
| 2026-01-01 | 0.33  | 1003.3000000000001         |
| 2026-02-01 | 0.70  | 1006.6108900000002         |
| 2026-03-01 | 0.88  | 1013.6571662300000         |
| 2026-04-01 | 0.67  | 1022.5773492928239         |
| 2026-05-01 | 0.58  | 1029.4286175330858         |
| 2026-06-01 | 0.16  | 1035.3993035147778         |
| 2026-07-01 | 0.07  | 1037.0559424004014         |
| 2026-08-01 | -0.32 | 1037.7818815600815         |

Observação sobre a última linha: a taxa -0.32 é a variação de **agosto
de 2026**. Ela será aplicada no índice de setembro de 2026, que ainda não
existe. Portanto, para qualquer data em agosto de 2026, o índice **não é
interpolado** — usa-se o índice de 01/08/2026 (última linha conhecida).

### 4.2 Índice diário — pro-rata composto

Para uma data `d` dentro do mês `M` (ano-mês), com `taxa(M)` publicada:

```
indice(d) = indice(01/M) * (1 + taxa(M)/100) ^ ((d - 1) / dias_em_M)
```

- `d` é o dia do mês (1 a 31).
- `dias_em_M` é o número de dias do mês (28–31, respeitando bissexto).
- Para o mês mais recente **sem taxa seguinte publicada**, `indice(d) =
  indice(01/M)` (sem interpolação; `d` é ignorado).
- Para datas anteriores a 2025-12-01 (data base): **erro** de cadastro
  (`data fora da série do índice`).

### 4.3 Correção de valor entre duas datas

```
valor_corrigido = valor_original * indice(data_destino) / indice(data_origem)
```

### 4.4 Saldo devedor de uma dívida

```
unidades_devedoras = soma(valor / indice(data) para despesas com
                          pagador = credor e situacao = 'paga')
unidades_abatidas  = soma(valor / indice(data) para repasses)
saldo_reais        = (unidades_devedoras - unidades_abatidas) * indice(hoje)
```

- `hoje` = data atual **no fuso do navegador do usuário**.
- Saldo pode ser negativo (devedor pagou mais que devia). Exibir normal.
- Despesas `prevista` **não** entram no saldo. Só contam quando `paga`.

### 4.5 Visão derivada de quitação (FIFO)

Para apresentação no extrato: cada repasse "abate" as despesas mais antigas
em aberto, em ordem cronológica. Não altera o saldo real.

### 4.6 Precisão numérica

- **Nunca** usar `number` do JS para dinheiro ou índices. Usar
  `decimal.js`.
- Índices internos com precisão alta (mínimo 20 dígitos significativos).
- Dinheiro arredondado para 2 casas **apenas na exibição**. Persistir com
  a precisão original.

### 4.7 Fuso horário

- Cálculo em UTC.
- "Hoje" e datas exibidas no **fuso do navegador**.
- Datas persistidas como `date` (sem hora).

---

## 5. DADOS DE ORIGEM (planilha Controle.xlsx)

### 5.1 Dívida a ser criada na migração

- Nome: **Apartamento**
- Credor: Lucas
- Devedor: Letícia

### 5.2 Despesas da planilha (27 linhas)

Formato: `data | descricao | pagador | valor | situacao | data_repasse`

```
2025-12-26 | Sinal compra                 | LETICIA |  500.00 | paga | 2025-12-26
2026-01-20 | Parcela Entrada 01/32        | LETICIA |  158.46 | paga | 2026-01-20
2026-02-06 | Parcela Entrada 02/32        | LETICIA |  158.79 | paga | 2026-02-06
2026-03-03 | Parcela Entrada 03/32        | LETICIA |  159.93 | paga | 2026-03-03
2026-03-31 | Taxa de Fidelizacao Caixa    | LUCAS   | 2500.00 | paga | 2026-03-31
2026-04-03 | Parcela Entrada 04/32        | LETICIA |  160.38 | paga | 2026-04-03
2026-05-11 | Parcela Entrada 05/32        | LUCAS   |  161.25 | paga | 2026-05-11
2026-05-25 | Juros Obra Caixa 01          | LUCAS   |  200.75 | paga | 2026-05-25
2026-06-04 | Parcela Entrada 06/32        | LUCAS   |  162.86 | paga | 2026-06-04
2026-06-25 | Juros Obra Caixa 02          | LUCAS   |  455.73 | paga | 2026-06-25
2026-07-05 | Parcela Entrada 07/32        | LUCAS   |  164.29 | paga | 2026-07-05
2026-07-25 | Juros Obra Caixa 03          | LUCAS   |  542.15 | paga | (vazio)
2026-08-03 | Parcela Entrada 08/32        | LUCAS   |  165.57 | paga | (vazio)
2026-09-02 | Parcela Entrada 09/32        | LUCAS   |  166.58 | prevista | (vazio)
2026-10-01 | Parcela Entrada 10/32        | LUCAS   |  167.68 | prevista | (vazio)
2026-12-10 | ITBI 01/12                   | LUCAS   |  367.80 | prevista | (vazio)
2027-01-10 | ITBI 02/12                   | LUCAS   |  367.80 | prevista | (vazio)
2027-02-10 | ITBI 03/12                   | LUCAS   |  367.80 | prevista | (vazio)
2027-03-10 | ITBI 04/12                   | LUCAS   |  367.80 | prevista | (vazio)
2027-04-10 | ITBI 05/12                   | LUCAS   |  367.80 | prevista | (vazio)
2027-05-10 | ITBI 06/12                   | LUCAS   |  367.80 | prevista | (vazio)
2027-06-10 | ITBI 07/12                   | LUCAS   |  367.80 | prevista | (vazio)
2027-07-10 | ITBI 08/12                   | LUCAS   |  367.80 | prevista | (vazio)
2027-08-10 | ITBI 09/12                   | LUCAS   |  367.80 | prevista | (vazio)
2027-09-10 | ITBI 10/12                   | LUCAS   |  367.80 | prevista | (vazio)
2027-10-10 | ITBI 11/12                   | LUCAS   |  367.80 | prevista | (vazio)
2027-11-10 | ITBI 12/12                   | LUCAS   |  367.80 | prevista | (vazio)
```

Observações:
- Linha 6 (Taxa de Fidelização Caixa): data real de repasse confirmada pelo
  Lucas = **2026-03-31** (mesmo dia do pagamento, correção = 1).
- Linhas com pagador = LETICIA e sem repasse são registros históricos, **sem
  impacto** no saldo (Leitura A).
- ITBI entra como **prevista**; não gera dívida até ser paga.

### 5.3 Repasses a criar na migração

Para cada linha com pagador = LUCAS e com data de repasse preenchida,
criar um repasse em `repasses` com a mesma data e o valor corrigido
calculado (arredondado a 2 casas). Registrar em `observacao`:
"migrado da planilha; conferir contra extrato".

Para as linhas 13 e 14 (em aberto), não criar repasse.

---

## 6. CASOS DE TESTE (oráculo)

Arquivo `.ai/casos-de-teste.json`. Gerado por você (Claude Code) a partir
dos dados da seção 5 e das regras da seção 4. Deve conter:

- `metadata`: data de referência = **2026-08-15**, método, série default.
- `casos`: 27 entradas (uma por linha da planilha), cada uma com:
  - `id`: número da linha na planilha (2 a 28).
  - `data_pagamento`, `descricao`, `pagador`, `valor_original`,
    `situacao`, `data_repasse`, `valor_repasse`.
  - `indice_pagamento`: calculado pela fórmula pro-rata.
  - `indice_repasse`: calculado pela fórmula pro-rata (ou `null`).
  - `indice_referencia`: índice em 2026-08-15.
  - `valor_corrigido_na_data_repasse`: se houver repasse.
  - `valor_corrigido_na_referencia`: se não houver repasse (dívida em
    aberto).
  - `impacto_divida_reais`: quanto essa linha contribui para o saldo hoje.
  - `observacao`: texto livre.

### 6.1 Validações esperadas

- Linhas com repasse no mesmo dia do pagamento: `valor_corrigido =
  valor_original`. Isso vale para as linhas 2 a 12.
- Linha 13 (Juros Obra Caixa 03, 2026-07-25, em aberto): corrigido em
  2026-08-15 pela pro-rata. Valor **> R$ 542,15** e próximo de
  **R$ 542,30**.
- Linha 14 (Parcela Entrada 08/32, 2026-08-03, em aberto): como a data e a
  referência estão ambas em agosto de 2026 e não há taxa de setembro, o
  índice é o mesmo → corrigido = R$ 165,57.
- Linhas 15 em diante (ITBI): `prevista`, não geram dívida.
  `impacto_divida_reais = 0` e `valor_corrigido_na_referencia = null`.

### 6.2 Saldo esperado em 2026-08-15

- Itens em aberto: linhas 13 e 14.
- Saldo devedor esperado: **entre R$ 707,00 e R$ 708,00**.

O módulo de cálculo puro deve ser implementado **primeiro**, rodado sobre
os 27 casos e verificado contra as expectativas acima. Se não bater, **não
prossiga** — investigar a fórmula.

---

## 7. TELAS

### 7.1 Lista de dívidas (home)
- Lista todas as dívidas em que o usuário logado é membro.
- Cada item: nome, credor, devedor, saldo atual, data de referência,
  número de itens em aberto.
- Botão "nova dívida".

### 7.2 Detalhe da dívida
- Saldo em destaque no topo.
- Extrato cronológico (despesas e repasses misturados, mais recente
  primeiro).
- Cada linha do extrato: data, descrição, valor original, valor corrigido,
  saldo acumulado após.
- Botões "nova despesa", "novo repasse".

### 7.3 Memória de cálculo
- Ao clicar em uma linha do extrato: modal ou tela com
  - índices usados (pagamento, repasse, referência);
  - fórmula aplicada;
  - valor original, valor corrigido;
  - composição do saldo após essa linha.

### 7.4 Nova/editar despesa
- Campos: data, descrição, pagador (select credor/devedor), valor,
  situação (`paga`/`prevista`), boleto_url, comprovante_url.

### 7.5 Novo/editar repasse
- Campos: data, valor, observação.

### 7.6 Configurações
- Globais: série BCB, data base, índice base.
- Por dívida: editar membros (adicionar observador, remover).

---

## 8. ESTRUTURA DE PASTAS (sugestão)

```
/
├── HANDOFF.md
├── LICENSE
├── README.md
├── .gitignore
├── .ai/
│   ├── constitution.md
│   ├── spec.md
│   ├── tasks.md
│   └── casos-de-teste.json
├── package.json
├── vite.config.ts
├── tsconfig.json
├── drizzle.config.ts
├── .github/
│   └── workflows/
│       ├── ipca.yml
│       ├── backup.yml
│       └── smoke-bcb.yml
├── drizzle/
│   └── migrations/
│       └── 0000_init.sql
├── scripts/
│   ├── smoke-bcb.mjs
│   ├── migrar-planilha.mjs
│   └── seed-taxas.mjs
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── pwa.ts
│   ├── core/
│   │   ├── indice.ts
│   │   ├── correcao.ts
│   │   ├── saldo.ts
│   │   ├── decimal.ts
│   │   └── __tests__/
│   ├── db/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   └── schema.ts
│   ├── features/
│   │   ├── dividas/
│   │   ├── despesas/
│   │   ├── repasses/
│   │   └── config/
│   ├── components/
│   └── routes/
└── public/
```

---

## 9. ORDEM DE EXECUÇÃO

Siga nesta ordem. Não pule etapas. Rode testes entre elas.

1. **Scaffold** — Vite + React + TS + PWA + Drizzle + Neon Auth + hash
   router + base path.
2. **Módulo de cálculo puro (`src/core/`)** — implementar e rodar contra
   `.ai/casos-de-teste.json`. Todos os 27 devem passar. Validar saldo.
3. **Schema e migrações Drizzle** — incluir RLS e role do Action de IPCA.
4. **Autenticação** — Neon Auth, cadastro desativado, login/logout.
5. **Cliente de dados** — Neon Data API, funções tipadas.
6. **Telas** — lista, detalhe, memória, cadastro, config.
7. **Workflows do GitHub** — smoke-bcb, ipca, backup.
8. **Script de migração da planilha** — cria a dívida "Apartamento",
   insere despesas e repasses.
9. **Deploy** — GitHub Pages via Action, PWA instalável.
10. **Documentação** — README, .env.example.

---

## 10. ARMADILHAS CONHECIDAS

- **Base path do Vite em GitHub Pages**: `/nome-do-repo/`. Service worker
  e manifest devem respeitar. Testar em produção.
- **Hash routing**: usar `createHashRouter` do react-router-dom.
- **Decimal**: nunca misturar `number` e `Decimal`.
- **Data sem hora**: strings ISO `YYYY-MM-DD`. Nunca `new Date()` como
  valor persistido.
- **Pro-rata composto**: expoente é `(dia - 1) / dias_no_mes`.
- **Último mês sem taxa seguinte**: não interpolar; usar índice do dia 1.
- **RLS testada** com dois usuários diferentes.
- **Workflows agendados**: GitHub desativa workflows em repos públicos
  após 60 dias sem atividade. Documentar no README.
- **Cold start do Neon**: ~5s na primeira requisição após inatividade.
  Mostrar loading elegante.
- **api.bcb.gov.br**: pode bloquear IPs de datacenter. Smoke test resolve.
- **JSON de casos fora do `src/`**: importar `.ai/casos-de-teste.json`
  pode esbarrar em restrição do Vite. Se acontecer, copiar para
  `src/core/__fixtures__/` no build ou usar `resolve.alias`.

---

## 11. DEFINIÇÃO DE PRONTO (v1)

- [ ] Repositório público no GitHub com o código.
- [ ] Deploy funcionando no GitHub Pages.
- [ ] PWA instalável no celular.
- [ ] Login com Neon Auth funcionando.
- [ ] 2 usuários cadastrados (Lucas, Letícia).
- [ ] Dívida "Apartamento" migrada com os 27 lançamentos.
- [ ] Saldo devedor em 2026-08-15 entre R$ 707,00 e R$ 708,00.
- [ ] Telas: lista, detalhe, memória de cálculo, cadastro, config.
- [ ] Módulo de cálculo com 27 testes passando.
- [ ] Workflow do IPCA rodando (ou fallback manual documentado).
- [ ] Workflow de backup rodando.
- [ ] RLS validada com 2 usuários.
- [ ] README com instruções de fork.
- [ ] `.ai/constitution.md`, `.ai/spec.md`, `.ai/tasks.md` e
      `.ai/casos-de-teste.json` no repositório.

---

## 12. AO TERMINAR

Reporte:

1. Quais tarefas foram concluídas.
2. Quais não foram e por quê.
3. O saldo calculado em 2026-08-15 e se está dentro do intervalo esperado.
4. Se o smoke test do BCB passou.
5. Qualquer decisão de implementação que você teve que tomar por conta
   própria.

---

## 13. INSTRUÇÃO IMEDIATA

Antes de qualquer código:

1. Crie a pasta `.ai/` na raiz do repositório e, dentro dela, os
   arquivos `constitution.md`, `spec.md`, `tasks.md` e
   `casos-de-teste.json`, usando exatamente o conteúdo das seções 14 a
   17 abaixo.
2. Depois comece a Fase 0 do `.ai/tasks.md` (scaffold), parando ao final
   dela para reportar.

---

## 14. CONTEÚDO DE `.ai/constitution.md`

```markdown
# Constitution — Apps de Controle de Repasses

Princípios reutilizáveis para qualquer app derivado de planilha de controle
de repasses entre pessoas. O app piloto é o "Controle de Repasses"
(apartamento Lucas + Letícia). Estes princípios valem para os próximos.

## Princípios

### 1. Cálculo em módulo puro, com testes
Toda regra financeira (correção, saldo, juros) vive em funções puras, sem
dependência de UI, banco ou rede. Testadas com dados reais migrados como
oráculo. Nenhum cálculo financeiro no componente visual nem na query.

### 2. Dinheiro e índices em decimal
Nunca usar `number` (float binário) para dinheiro ou índices. Usar lib
decimal (`decimal.js`). Arredondamento explícito e documentado em cada
operação. Valores gravados com precisão para reproduzir o oráculo.

### 3. Séries e taxas configuráveis
A fonte da correção (BCB SGS, código da série) é parâmetro, não hardcoded.
Um fork pode trocar IPCA por IGP-M, INCC, etc. sem editar o núcleo do
cálculo.

### 4. Correção pro-rata diária composta
A correção entre duas datas usa a taxa mensal composta diariamente, com
defasagem de 1 mês embutida (índice do mês M incorpora a taxa do mês M−1).
Datas antes do início da série são bloqueadas com erro claro.

### 5. RLS obrigatório; nenhuma credencial no cliente
Autenticação JWT (Neon Auth) + RLS por grupo/membro. Nenhuma connection
string, service key ou segredo no bundle. O front fala apenas com a Data
API. Role do Postgres para escrita de taxas é separada e restrita à tabela
de taxas.

### 6. Schema versionado por Drizzle
Schema e políticas RLS vivem em migrações Drizzle versionadas no
repositório. Migrações rodam localmente/CI com connection string direta
(apenas em secrets). Nunca aplicar mudança manual em produção sem migração
correspondente.

### 7. Oráculo de dados reais
Antes de implementar, migrar os dados reais da planilha para um JSON de
casos de teste com entrada e saída esperada. A verificação real é bater o
cálculo; specs em prosa são guia, não prova.

### 8. Open source by default
Repositório público, código reutilizável, documentação clara para fork.
Nenhum dado pessoal no repositório. Configuração específica (séries,
e-mails autorizados, credenciais) fica em variáveis de ambiente/secrets.

### 9. Sem offline não solicitado
Offline (leitura ou escrita) só entra se for requisito explícito. Por
padrão, o app exige conexão; cache é apenas o shell do PWA.

### 10. Modelo de dados mínimo
Só criar tabela/campo quando houver regra que o justifique. Repasse parcial
vinculado a item, cota variável, notificações e upload de arquivo só entram
se pedidos. Preferir visão derivada a coluna gravada quando o dado é
calculável.

### 11. Migração com o dono do processo
Antes de codar, o dono do processo revisa e aprova: regras de cálculo,
casos de teste, schema e convenções. Nada de "assumir" regra financeira.

### 12. Multi-dívida por padrão
O app não é específico de um caso. Toda entidade de negócio (despesa,
repasse, saldo) é escopada por `divida_id`. Nada global exceto a série de
índices e as configurações de base. Um fork pode usar para qualquer
cenário de rateio com correção.

## Anti-princípios (o que evitar)
- Cálculo financeiro no front sem passar pelo módulo puro.
- `number` para dinheiro.
- Hardcoded de código de série, e-mail autorizado ou connection string.
- Aplicar migração direto em produção sem commit correspondente.
- "Depois eu testo" — o oráculo é pré-requisito, não etapa final.
- Tratar o app como específico do apartamento.
```

---

## 15. CONTEÚDO DE `.ai/spec.md`

```markdown
# Spec — App Controle de Repasses (v1)

## 1. Contexto
PWA pessoal para registrar despesas e repasses entre duas pessoas,
ajustados por uma série de correção configurável (default: IPCA / BCB SGS
433). Substitui a planilha Controle.xlsx (caso piloto: apartamento Lucas +
Letícia). O app suporta múltiplas dívidas independentes, cada uma com seu
próprio credor, devedor, despesas, repasses e saldo.

Código aberto e reutilizável: qualquer pessoa pode fazer fork e usar para
cenários parecidos (rateio de despesas com correção por índice).

## 2. Glossário
- **Dívida**: contexto isolado com credor, devedor, despesas, repasses e
  saldo próprios. Ex.: "Apartamento", "Celular no cartão".
- **Credor**: quem desembolsou e tem a receber.
- **Devedor**: quem deve e fará os repasses.
- **Despesa**: valor pago a um terceiro (Caixa, vendedor, ITBI...).
- **Repasse**: transferência do devedor para o credor. Sempre sobre o
  total da dívida, nunca vinculado a item.
- **Índice**: número acumulado da série (base configurável, default 1000
  em 2025-12-01).
- **Leitura A**: apenas despesas pagas pelo credor geram dívida. Despesas
  pagas pelo devedor são apenas registro.

## 3. Modelo de dados
(ver HANDOFF.md seções 3.1 a 3.5)

## 4. Regras de cálculo
(ver HANDOFF.md seções 4.1 a 4.7)

## 5. Validações
- Valor de despesa/repasse > 0.
- Data de repasse anterior à data da dívida: permitido (adiantamento).
- Data de despesa < data base da série: bloqueada com erro claro.
- Editar credor/devedor após primeiro lançamento: bloqueado.

## 6. Telas
(ver HANDOFF.md seção 7)

## 7. Autenticação e acesso
- Neon Auth (JWT) + RLS.
- Cadastro aberto desativado; e-mails autorizados.
- Cada dívida tem sua própria lista de membros.

## 8. Rotina do IPCA (GitHub Action)
- Agendado (dias 9 a 15) + `workflow_dispatch`.
- Busca série configurada no BCB; upsert idempotente em `taxas_ipca`.
- Smoke test prévio obrigatório. Fallback manual.

## 9. Backup
- Action semanal faz `pg_dump` como artifact.

## 10. Migração da planilha
(ver HANDOFF.md seção 5)

## 11. Fora de escopo (v1)
- Offline. Notificações. Upload de arquivo. Repasse parcial vinculado a
  item. Mais de um credor/devedor por dívida. Pagador terceiro. Edição de
  credor/devedor após primeiro lançamento.

## 12. Riscos
- Data API do Neon em Beta.
- Cold start do compute (~5s).
- Workflows agendados desativados após 60 dias sem atividade.
- Restauração do Neon free: 6 horas. Backup próprio é obrigatório.
- api.bcb.gov.br pode bloquear IPs de datacenter.
```

---

## 16. CONTEÚDO INICIAL DE `.ai/casos-de-teste.json`

Deixe assim por enquanto. Na Fase 1 do `.ai/tasks.md`, você preenche o
array `casos` com as 27 entradas.

```json
{
  "metadata": {
    "referencia": "2026-08-15",
    "serie_bcb": 433,
    "data_base": "2025-12-01",
    "indice_base": 1000,
    "metodo_correcao": "pro-rata diaria composta, defasagem 1 mes"
  },
  "taxas_ipca": [
    {"mes": "2025-12-01", "taxa": 0.33},
    {"mes": "2026-01-01", "taxa": 0.33},
    {"mes": "2026-02-01", "taxa": 0.70},
    {"mes": "2026-03-01", "taxa": 0.88},
    {"mes": "2026-04-01", "taxa": 0.67},
    {"mes": "2026-05-01", "taxa": 0.58},
    {"mes": "2026-06-01", "taxa": 0.16},
    {"mes": "2026-07-01", "taxa": 0.07},
    {"mes": "2026-08-01", "taxa": -0.32}
  ],
  "casos": []
}
```

---

## 17. CONTEÚDO DE `.ai/tasks.md`

```markdown
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
- [ ] T103 Criar `src/core/correcao.ts`.
- [ ] T104 Criar `src/core/saldo.ts`.
- [ ] T105 Preencher `.ai/casos-de-teste.json` com os 27 casos.
- [ ] T106 Escrever testes contra o JSON. Todos os 27 devem passar.
- [ ] T107 Validar saldo em 2026-08-15 entre R$ 707,00 e R$ 708,00.

## Fase 2 — Banco e RLS
- [ ] T201 Criar `src/db/schema.ts` com Drizzle.
- [ ] T202 Gerar migração inicial com `drizzle-kit generate`.
- [ ] T203 Escrever migração de RLS (SQL puro).
- [ ] T204 Criar role restrita para o Action de IPCA.
- [ ] T205 Aplicar migrações em ambiente de dev.
- [ ] T206 Testar RLS com 2 usuários distintos.

## Fase 3 — Autenticação
- [ ] T301 Configurar Neon Auth. Desativar cadastro aberto.
- [ ] T302 Criar tela de login/logout.
- [ ] T303 Hook `useSession` e `useUser`.

## Fase 4 — Cliente de dados
- [ ] T401 Criar `src/db/client.ts` usando Neon Data API.
- [ ] T402 Funções tipadas: listar dívidas, criar despesa, criar repasse.

## Fase 5 — Telas
- [ ] T501 Tela "lista de dívidas".
- [ ] T502 Tela "detalhe da dívida" com extrato.
- [ ] T503 Tela "memória de cálculo".
- [ ] T504 Formulário de despesa.
- [ ] T505 Formulário de repasse.
- [ ] T506 Tela de configurações.

## Fase 6 — Workflows GitHub
- [ ] T601 `smoke-bcb.yml` — testa acesso ao BCB.
- [ ] T602 `ipca.yml` — busca série, faz upsert.
- [ ] T603 `backup.yml` — pg_dump semanal.
- [ ] T604 Documentar no README que workflows são desativados após 60
      dias sem atividade.

## Fase 7 — Migração da planilha
- [ ] T701 `scripts/migrar-planilha.mjs`.
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
      `.ai/tasks.md` e `.ai/casos-de-teste.json` estão no repo.
```