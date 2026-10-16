# HANDOFF — App "Controle de Rateios"

Você é o Claude Code executando este projeto. Este único arquivo contém
tudo o que você precisa: contexto, decisões fechadas, modelo de dados,
regras de cálculo, dados de origem, telas, ordem de execução e os textos
completos dos artefatos de spec que devem existir no repositório
(`.ai/constitution.md`, `.ai/spec.md`, `.ai/casos-de-teste.json`,
`.ai/casos-de-teste-n-pessoas.json`, `.ai/tasks.md`).

Idioma de trabalho: português do Brasil. Código, comentários, commits e
documentação em português.

---

## INSTRUÇÕES INICIAIS (leia antes de tudo)

1. O repositório já existe, público, vazio (ou quase). Você está na raiz.
2. Antes de qualquer código, **crie os arquivos de spec dentro da pasta
   `.ai/`** na raiz, com o conteúdo exato das seções 14 a 17 deste
   documento e da seção 6.3.
3. Depois, siga a ordem de execução da seção 9, parando ao final de cada
   fase para mostrar o resultado antes de prosseguir.
4. Não reabra decisões da seção 2. Se algo parecer ambíguo, pergunte ao
   usuário antes de assumir.

---

## 1. VISÃO GERAL

Transformar a planilha `Controle.xlsx` de um casal (Lucas e Letícia) em um
PWA web instalável no celular, para gerenciar **rateios** — divisões de
despesas compartilhadas entre participantes — com registro de despesas,
cálculo de saldos, reembolsos entre participantes, e correção monetária
por IPCA (série SGS 433 do BCB, configurável e **opcional por rateio**).

O app **não é específico de apartamento**. É um app genérico de "controle
de rateios" com correção por índice. O caso do apartamento é o primeiro
rateio cadastrado. O usuário pode criar quantos rateios independentes
quiser (ex.: "Apartamento", "Celular", "Carro"), cada um com seus
próprios participantes, cotas, despesas, reembolsos e saldo.

Cada rateio pode ter **n participantes** (n ≥ 2), com **cotas** que somam
100%. O modelo é o **Forma B** (compromisso/excesso): cada participante
tem um compromisso com o rateio (`total pago × sua cota`); pagamentos a
terceiros abatem esse compromisso; quem paga mais que o compromisso vira
credor dos demais; quem paga menos fica devendo.

O repositório é **público** e o código é **open source reutilizável**.
Qualquer pessoa pode fazer fork e usar para cenários parecidos. Nenhum
dado pessoal, credencial ou configuração específica vai no repositório.

### Terminologia (aplicada em todo o app)

- **Rateio**: contexto isolado que representa a divisão de uma dívida
  compartilhada entre n participantes, conforme suas cotas. Cada rateio
  tem seus próprios participantes, despesas, reembolsos e saldo. Ex.:
  "Apartamento".
- **Pagamento**: ato de pagar uma conta a um terceiro. A conta pode ou não
  lhe caber — você pode estar adiantando a parte de outra pessoa.
- **Reembolso**: ato de ressarcir uma pessoa que pagou uma conta que lhe
  cabia (total ou parcialmente), com o devido ajuste monetário pela série
  configurada. É a operação que liquida as diferenças apuradas pelo
  rateio.
- **Participante**: pessoa com cota no rateio. Pode ter cota 0 (não
  carrega dívida, mas pode pagar).
- **Cota**: fração do rateio atribuída a um participante. Soma 100% no
  rateio.
- **Compromisso**: `total_pago × cota` do participante. Muda quando o
  total pago muda.
- **Excesso**: valor que o participante pagou além do compromisso dele.
- **Déficit**: valor que falta para o participante atingir o compromisso.
- **Credor líquido**: participante com excesso. Tem a receber.
- **Devedor líquido**: participante com déficit. Tem a pagar.
- **Pool**: o que ainda falta pagar a terceiros.

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
- Rotas via **hash routing** (`#/rateios`, etc.) para evitar 404 do Pages.
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
- 2 na v1 (Lucas e Letícia), mas o modelo suporta **n participantes**.
- Membros são **por rateio** (tabela `membros`).

### Modelo de saldo — Forma B (compromisso/excesso)

- Cada rateio tem um **total pago** (U_total) = soma das despesas com
  situação `paga` (em unidades de índice).
- Cada participante tem um **compromisso** = `U_total × cota`.
- Quem pagou mais que o compromisso tem **excesso** (crédito).
- Quem pagou menos tem **déficit** (deve).
- O excesso é rateado entre os que têm déficit, **proporcional ao déficit
  de cada um** (não proporcional à cota).
- Reembolsos são **fatos** (com data, pagador, recebedor) e entram no
  `pago_efetivo` do pagador (soma) e do recebedor (subtrai).
- A **data de origem** da dívida interna é a **data do pagamento original**
  de quem gerou o excesso.
- Quando U_total muda (novo boleto pago), os compromissos e excessos são
  recalculados. Reembolsos já feitos permanecem como fatos. O app avisa
  o usuário quando uma mudança de U_total altera os saldos internos.

### Cotas e participantes

- Cotas **podem ser reajustadas** a qualquer momento. Reajuste recompõe o
  cálculo. Não há snapshot histórico (cota é parâmetro, não fato).
- **Cota 0 é permitida** (participante que não carrega dívida, mas pode
  pagar — caso Lucas no piloto).
- **Observadores não existem** na v1. Cota 0 + não pagar já cumpre o
  papel.
- **Override por despesa não existe** na v1. Necessidades de rateio
  diferente → rateio separado.
- **Plano automático de reembolsos não existe** na v1. Reembolsos são
  criados manualmente pelo usuário.

### Correção IPCA

- **Opcional por rateio.** Flag `corrigir_ipca` na criação do rateio.
- Se ligado, aplica IPCA. Se desligado, valores nominais.
- Quando ligado, a correção é feita em **unidades de índice** (valor ÷
  índice da data), o que resolve o problema de datas diferentes entre
  despesas, reembolsos e hoje.

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

- **Rateio**: contexto isolado com participantes, cotas, despesas,
  reembolsos e saldo próprios.
- **Participante**: pessoa com cota no rateio. Pode ter cota 0.
- **Despesa**: valor pago a um terceiro. Tem pagador (qualquer
  participante do rateio) e situação (`paga` ou `prevista`).
- **Reembolso**: transferência de um participante a outro, com pagador e
  recebedor explícitos.
- **Taxa IPCA**: global, uma linha por mês.

### 3.2 Regras estruturais

- Cotas do rateio somam exatamente **1** (100%).
- Cada despesa tem `pagador_user_id` ∈ membros do rateio.
- Cada reembolso tem `pagador_user_id` e `recebedor_user_id` ∈ membros,
  e são diferentes entre si.
- Apenas despesas com situação `paga` entram no cálculo do saldo.

### 3.3 SQL (referência para o Drizzle)

```sql
create table users (
  id uuid primary key,
  email text unique not null,
  criado_em timestamptz not null default now()
);

create table rateios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  corrigir_ipca boolean not null default true,
  criado_em timestamptz not null default now(),
  arquivado_em timestamptz
);

create table membros (
  rateio_id uuid not null references rateios(id) on delete cascade,
  user_id uuid not null references users(id),
  cota numeric(9,6) not null default 0
    check (cota >= 0 and cota <= 1),
  criado_em timestamptz not null default now(),
  primary key (rateio_id, user_id)
);
-- Trigger garante Σ cota = 1 por rateio.

create table despesas (
  id uuid primary key default gen_random_uuid(),
  rateio_id uuid not null references rateios(id) on delete cascade,
  data date not null,
  descricao text not null,
  pagador_user_id uuid not null references users(id),
  valor numeric(14,2) not null check (valor > 0),
  situacao text not null check (situacao in ('paga','prevista')),
  boleto_url text,
  comprovante_url text,
  criado_em timestamptz not null default now()
);

create table reembolsos (
  id uuid primary key default gen_random_uuid(),
  rateio_id uuid not null references rateios(id) on delete cascade,
  data date not null,
  pagador_user_id uuid not null references users(id),
  recebedor_user_id uuid not null references users(id),
  valor numeric(14,2) not null check (valor > 0),
  observacao text,
  criado_em timestamptz not null default now(),
  check (pagador_user_id <> recebedor_user_id)
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

- `rateios`, `despesas`, `reembolsos`: filtradas por
  `rateio_id in (select rateio_id from membros where user_id = auth.uid())`.
- `membros`: leitura restrita a quem já é membro do mesmo rateio; escrita
  restrita aos já membros.
- `taxas_ipca`: leitura para qualquer autenticado; escrita apenas pela
  role do Action (role dedicada criada via migração).
- `config`: leitura autenticada; escrita apenas pelo service role.
- `users`: cada usuário só vê a própria linha.

### 3.5 Validações por trigger (não expressáveis como CHECK simples)

1. `Σ cota = 1` por rateio.
2. `despesas.pagador_user_id` ∈ membros do rateio.
3. `reembolsos.pagador_user_id` e `recebedor_user_id` ∈ membros do rateio.
4. Cotas e conjunto de participantes **não são imutáveis** (podem ser
   reajustados). Reajuste recompõe o cálculo; nada é congelado.

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

### 4.3 Unidades de índice (base do cálculo)

Para trabalhar com datas diferentes sem complicação, todo valor é
convertido em **unidades de índice**:

```
unidades(valor, data) = valor / indice(data)
```

Unidades são atemporais. Para exibir em reais hoje:

```
reais_hoje = unidades × indice(hoje)
```

Essa é a base de todo o cálculo. Datas diferentes (pagamento, reembolso,
hoje) são automaticamente reconciliadas porque tudo é normalizado pelo
índice da data.

**Quando `corrigir_ipca = false`:** índice é sempre 1, então
`unidades = valor nominal`.

### 4.4 Saldo por participante — Forma B (compromisso/excesso)

Seja `D` o conjunto de despesas com situação `paga`. Para cada
participante `i`:

```
U_total        = Σ_{d ∈ D} valor_d / indice(data_d)          (unidades totais pagas)
compromisso_i  = cota_i × U_total                            (em unidades)

pago_i             = Σ_{d ∈ D, pagador_d = i} valor_d / indice(data_d)
reemb_pagos_i      = Σ_{r: pagador_r = i} valor_r / indice(data_r)
reemb_recebidos_i  = Σ_{r: recebedor_r = i} valor_r / indice(data_r)

pago_efetivo_i = pago_i + reemb_pagos_i − reemb_recebidos_i

excesso_i = max(0, pago_efetivo_i − compromisso_i)
deficit_i = max(0, compromisso_i − pago_efetivo_i)
```

**Propriedades:**
- `Σ excesso_i = Σ deficit_i` (conservação).
- `Σ (compromisso_i) = U_total`.

**Dívida líquida entre pares:** cada excesso `E_j` de um credor `j` é
distribuído entre os devedores proporcionalmente ao déficit de cada um.
O valor que o devedor `i` deve ao credor `j` **já é o líquido**:

```
deve(i → j) = deficit_i × excesso_j / Σ_k excesso_k
```

Não há subtração adicional de reembolsos: eles já foram incorporados em
`pago_efetivo_i`. A fórmula acima é a única operação entre pares.

**Saldo do participante `i` em reais hoje:**

```
saldo_reais_i = (Σ_j deve(i → j) − Σ_k deve(k → i)) × indice(hoje)
```

- Positivo = `i` deve (devedor líquido).
- Negativo = `i` tem a receber (credor líquido).

### 4.5 Data de origem da dívida interna (para correção)

Quando `i` deve a `j`, a **data de origem** é a data do **pagamento
original** que gerou o excesso de `j`. Isso é irrelevante para o cálculo
(que já trabalha em unidades), mas é exibido na UI quando o usuário quer
entender a correção.

Se a dívida inverteu (porque U_total mudou), a data de origem continua
sendo a do pagamento original que gerou o crédito.

### 4.6 Visão derivada de quitação (FIFO) — apenas n=2

Quando o rateio tem exatamente 2 participantes, mostrar uma visão
derivada de "cada reembolso abate as despesas mais antigas em aberto",
em ordem cronológica. Não altera o saldo real. Só apresentação.

Em rateios com n > 2, não mostrar essa visão.

### 4.7 Aviso de recálculo

Quando `U_total` muda (despesa nova paga, ou situação muda de `prevista`
para `paga`), os compromissos e excessos mudam. Reembolsos já feitos
permanecem como fatos, mas o líquido entre pares pode mudar.

O app deve **avisar o usuário** quando isso acontecer:
"O total do rateio mudou. Os saldos internos foram recalculados."

### 4.8 Precisão numérica

- **Nunca** usar `number` do JS para dinheiro ou índices. Usar
  `decimal.js`.
- Índices internos com precisão alta (mínimo 20 dígitos significativos).
- Dinheiro arredondado para 2 casas **apenas na exibição**. Persistir com
  a precisão original.

### 4.9 Fuso horário

- Cálculo em UTC.
- "Hoje" e datas exibidas no **fuso do navegador**.
- Datas persistidas como `date` (sem hora).

### 4.10 Pseudocódigo de referência

O núcleo do cálculo é `src/core/saldo.ts`, com a função
`calcularSaldo(rateio, corrigir)`. Implementação esperada:

```ts
import Decimal from 'decimal.js'

interface Participante { userId: string; cota: Decimal }
interface Despesa {
  pagadorUserId: string
  valor: Decimal
  data: string
  situacao: 'paga' | 'prevista'
}
interface Reembolso {
  pagadorUserId: string
  recebedorUserId: string
  valor: Decimal
  data: string
}
interface Rateio {
  participantes: Participante[]
  despesas: Despesa[]
  reembolsos: Reembolso[]
}

declare function indiceEmData(data: string): Decimal

function unidades(valor: Decimal, data: string, corrigir: boolean): Decimal {
  if (!corrigir) return valor
  return valor.dividedBy(indiceEmData(data))
}

export function calcularSaldo(rateio: Rateio, corrigir: boolean) {
  const userIds = rateio.participantes.map(p => p.userId)

  // 1) U_total
  let uTotal = new Decimal(0)
  for (const d of rateio.despesas) {
    if (d.situacao !== 'paga') continue
    uTotal = uTotal.plus(unidades(d.valor, d.data, corrigir))
  }

  // 2) Compromisso
  const compromisso = new Map<string, Decimal>()
  for (const p of rateio.participantes) {
    compromisso.set(p.userId, uTotal.times(p.cota))
  }

  // 3) pago_efetivo
  const pagoEfetivo = new Map<string, Decimal>(
    userIds.map(id => [id, new Decimal(0)]),
  )
  for (const d of rateio.despesas) {
    if (d.situacao !== 'paga') continue
    const u = unidades(d.valor, d.data, corrigir)
    pagoEfetivo.set(d.pagadorUserId, pagoEfetivo.get(d.pagadorUserId)!.plus(u))
  }
  for (const r of rateio.reembolsos) {
    const u = unidades(r.valor, r.data, corrigir)
    pagoEfetivo.set(r.pagadorUserId, pagoEfetivo.get(r.pagadorUserId)!.plus(u))
    pagoEfetivo.set(r.recebedorUserId, pagoEfetivo.get(r.recebedorUserId)!.minus(u))
  }

  // 4) Excesso e déficit
  const excesso = new Map<string, Decimal>()
  const deficit = new Map<string, Decimal>()
  for (const id of userIds) {
    const diff = pagoEfetivo.get(id)!.minus(compromisso.get(id)!)
    excesso.set(id, diff.greaterThan(0) ? diff : new Decimal(0))
    deficit.set(id, diff.lessThan(0) ? diff.negated() : new Decimal(0))
  }

  // 5) Distribuição do excesso, proporcional ao déficit
  const somaExcesso = userIds.reduce(
    (acc, id) => acc.plus(excesso.get(id)!),
    new Decimal(0),
  )
  const deveDePara: Array<{ de: string; para: string; unidades: Decimal }> = []
  if (!somaExcesso.isZero()) {
    for (const devedor of userIds) {
      const dDef = deficit.get(devedor)!
      if (dDef.isZero()) continue
      for (const credor of userIds) {
        const eCred = excesso.get(credor)!
        if (eCred.isZero()) continue
        const valor = dDef.times(eCred).dividedBy(somaExcesso)
        if (valor.isZero()) continue
        deveDePara.push({ de: devedor, para: credor, unidades: valor })
      }
    }
  }

  // 6) Saldo líquido por participante
  const saldoUnidades = new Map<string, Decimal>(
    userIds.map(id => [id, new Decimal(0)]),
  )
  for (const { de, para, unidades: u } of deveDePara) {
    saldoUnidades.set(de, saldoUnidades.get(de)!.plus(u))
    saldoUnidades.set(para, saldoUnidades.get(para)!.minus(u))
  }

  return {
    uTotal, pagoEfetivo, compromisso, excesso, deficit,
    saldoUnidades, deveDePara,
  }
}
```

**Propriedades que os testes devem verificar:**
1. `Σ excesso = Σ déficit` (conservação).
2. `Σ saldoUnidades = 0`.
3. Casos do `.ai/casos-de-teste-n-pessoas.json` batem com
   `saldo_esperado` e `deve_de_para`.
4. Com cotas 0/1, o resultado bate com os 27 casos do piloto.

---

## 5. DADOS DE ORIGEM (planilha Controle.xlsx)

### 5.1 Rateio a ser criado na migração

- Nome: **Apartamento**
- Participantes e cotas:
  - **Lucas**: cota **0**
  - **Letícia**: cota **1**
- `corrigir_ipca`: **true**

### 5.2 Despesas da planilha (27 linhas)

Formato: `data | descricao | pagador | valor | situacao | data_reembolso`

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
- Linha 6 (Taxa de Fidelização Caixa): data real de reembolso confirmada
  pelo Lucas = **2026-03-31** (mesmo dia do pagamento, correção = 1).
- Linhas com pagador = LETICIA e sem reembolso são registros históricos,
  **sem impacto** no saldo (cota de Letícia é 100; ela paga a própria
  parte).
- ITBI entra como **prevista**; não gera dívida até ser paga.

### 5.3 Reembolsos a criar na migração

Para cada linha com pagador = LUCAS e com data de reembolso preenchida,
criar um reembolso em `reembolsos` com:
- `pagador_user_id` = Letícia
- `recebedor_user_id` = Lucas
- `data` = data de reembolso da planilha
- `valor` = valor corrigido calculado (arredondado a 2 casas)
- `observacao` = "migrado da planilha; conferir contra extrato"

Para as linhas 13 e 14 (em aberto), não criar reembolso.

---

## 6. CASOS DE TESTE (oráculo)

Arquivo `.ai/casos-de-teste.json`. Gerado por você (Claude Code) a partir
dos dados da seção 5 e das regras da seção 4. Deve conter:

- `metadata`: data de referência = **2026-08-15**, método, série default,
  e cotas do rateio (`{ "LUCAS": 0, "LETICIA": 1 }`).
- `casos`: 27 entradas (uma por linha da planilha), cada uma com:
  - `id`: número da linha na planilha (2 a 28).
  - `data_pagamento`, `descricao`, `pagador`, `valor_original`,
    `situacao`, `data_reembolso`, `valor_reembolso`.
  - `indice_pagamento`: calculado pela fórmula pro-rata.
  - `indice_reembolso`: calculado pela fórmula pro-rata (ou `null`).
  - `indice_referencia`: índice em 2026-08-15.
  - `valor_corrigido_na_data_reembolso`: se houver reembolso.
  - `valor_corrigido_na_referencia`: se não houver reembolso (dívida em
    aberto).
  - `impacto_rateio_reais`: quanto essa linha contribui para o saldo hoje.
  - `observacao`: texto livre.

### 6.1 Validações esperadas

- Linhas com reembolso no mesmo dia do pagamento: `valor_corrigido =
  valor_original`. Isso vale para as linhas 2 a 12.
- Linha 13 (Juros Obra Caixa 03, 2026-07-25, em aberto): corrigido em
  2026-08-15 pela pro-rata. Valor **> R$ 542,15** e próximo de
  **R$ 542,30**.
- Linha 14 (Parcela Entrada 08/32, 2026-08-03, em aberto): como a data e a
  referência estão ambas em agosto de 2026 e não há taxa de setembro, o
  índice é o mesmo → corrigido = R$ 165,57.
- Linhas 15 em diante (ITBI): `prevista`, não geram dívida.
  `impacto_rateio_reais = 0` e `valor_corrigido_na_referencia = null`.

### 6.2 Saldo esperado em 2026-08-15

- Itens em aberto: linhas 13 e 14.
- Saldo devedor de Letícia para com Lucas esperado: **entre R$ 707,00 e
  R$ 708,00**.

O módulo de cálculo puro deve ser implementado **primeiro**, rodado sobre
os 27 casos e verificado contra as expectativas acima. Se não bater, **não
prossiga** — investigar a fórmula.

### 6.3 Casos adicionais (arquivo separado)

Além dos 27 casos do piloto, criar `.ai/casos-de-teste-n-pessoas.json`
com 10 cenários sintéticos cobrindo:

- **n01**: 50/50 com uma despesa paga por cada um → saldo zero.
- **n02**: 50/50 com despesa paga só por P1 → P2 deve 50 a P1.
- **n03**: 80/20 com despesa paga só por P2 → P1 deve 80 a P2.
- **n04**: 4 pessoas 20/30/10/40 com despesas pagas por P1, P2 e P4.
- **n05**: cota 0 paga despesa → só os outros acumulam dívida.
- **n06**: cota 100 paga despesa → sem impacto líquido.
- **n07**: reembolso parcial → saldo residual.
- **n08**: reembolso excessivo inverte a dívida.
- **n09**: 4 pessoas iguais, P1 e P2 pagam, P3 e P4 devem.
- **n10**: mudança de U_total após reembolso feito → recálculo.

Todos usam `corrigir_ipca: false` no metadata, para isolar a lógica de
rateio (unidades = valores nominais). Cada caso traz `saldo_esperado` e
`deve_de_para`, além de `calculo` com os intermediários
(`U_total`, `compromisso`, `pago_efetivo`, `excesso`, `deficit`).

---

## 7. TELAS

### 7.1 Lista de rateios (home)
- Lista todos os rateios em que o usuário logado é membro.
- Cada item: nome, participantes, **seu saldo** em cada (positivo = você
  deve; negativo = você tem a receber), data de referência, número de
  itens em aberto.
- Botão "novo rateio".

### 7.2 Detalhe do rateio
- Saldo em destaque no topo (por participante).
- Painel de **saldos por participante**: quem tem a receber, quem deve.
- Extrato cronológico (despesas e reembolsos misturados, mais recente
  primeiro).
- Cada linha do extrato: data, descrição, valor original, valor corrigido.
- Botões "nova despesa", "novo reembolso".

### 7.3 Memória de cálculo
- Ao clicar em uma linha do extrato: modal ou tela com
  - índices usados (pagamento, reembolso, referência);
  - fórmula aplicada;
  - valor original, valor corrigido;
  - composição do saldo após essa linha.

### 7.4 Nova/editar despesa
- Campos: data, descrição, **pagador** (select entre participantes),
  valor, situação (`paga`/`prevista`), boleto_url, comprovante_url.

### 7.5 Novo/editar reembolso
- Campos: data, **pagador** (select), **recebedor** (select), valor,
  observação.

### 7.6 Configurações
- Globais: série BCB, data base, índice base.
- Por rateio: editar membros e cotas. Edição de cotas recompõe o cálculo;
  o app avisa quando isso altera saldos internos.

### 7.7 Aviso de recálculo
- Sempre que `U_total` mudar (despesa nova paga), mostrar um toast:
  "O total do rateio mudou. Os saldos internos foram recalculados."

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
│   ├── casos-de-teste.json
│   └── casos-de-teste-n-pessoas.json
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
│   │   ├── unidades.ts
│   │   ├── saldo.ts
│   │   ├── decimal.ts
│   │   └── __tests__/
│   ├── db/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   └── schema.ts
│   ├── features/
│   │   ├── rateios/
│   │   ├── despesas/
│   │   ├── reembolsos/
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
   Rodar também contra `.ai/casos-de-teste-n-pessoas.json`.
3. **Schema e migrações Drizzle** — incluir triggers (Σ cota = 1,
   pagador ∈ membros) e RLS e role do Action de IPCA.
4. **Autenticação** — Neon Auth, cadastro desativado, login/logout.
5. **Cliente de dados** — Neon Data API, funções tipadas.
6. **Telas** — lista, detalhe, memória, cadastro de despesa, cadastro de
   reembolso, config.
7. **Workflows do GitHub** — smoke-bcb, ipca, backup.
8. **Script de migração da planilha** — cria o rateio "Apartamento" com
   cotas 0/1, insere despesas e reembolsos.
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
- **Trabalhar em unidades**, não em reais, para evitar erro de correção em
  datas diferentes.
- **RLS testada** com dois usuários diferentes.
- **Workflows agendados**: GitHub desativa workflows em repos públicos
  após 60 dias sem atividade. Documentar no README.
- **Cold start do Neon**: ~5s na primeira requisição após inatividade.
  Mostrar loading elegante.
- **api.bcb.gov.br**: pode bloquear IPs de datacenter. Smoke test resolve.
- **JSON de casos fora do `src/`**: importar `.ai/casos-de-teste.json`
  pode esbarrar em restrição do Vite. Se acontecer, copiar para
  `src/core/__fixtures__/` no build ou usar `resolve.alias`.
- **Rateio do excesso**: sempre proporcional ao **déficit** (o que cada
  um ainda deve), **nunca** proporcional à cota. Testar com cotas
  desiguais.
- **Reembolsos entram no `pago_efetivo`** (positivo para pagador, negativo
  para recebedor). **Não** subtrair de novo no cálculo de `deve(i → j)`.
- **Mudança de U_total**: recalcula compromissos e excessos. Reembolsos
  permanecem. Avisar o usuário.

---

## 11. DEFINIÇÃO DE PRONTO (v1)

- [ ] Repositório público no GitHub com o código.
- [ ] Deploy funcionando no GitHub Pages.
- [ ] PWA instalável no celular.
- [ ] Login com Neon Auth funcionando.
- [ ] 2 usuários cadastrados (Lucas, Letícia).
- [ ] Rateio "Apartamento" migrado com os 27 lançamentos (cotas 0/1).
- [ ] Saldo devedor de Letícia para com Lucas em 2026-08-15 entre
      R$ 707,00 e R$ 708,00.
- [ ] Telas: lista, detalhe, memória de cálculo, cadastro de despesa,
      cadastro de reembolso, config.
- [ ] Módulo de cálculo com 27 testes passando + 10 casos n-pessoas
      passando.
- [ ] Workflow do IPCA rodando (ou fallback manual documentado).
- [ ] Workflow de backup rodando.
- [ ] RLS validada com 2 usuários.
- [ ] README com instruções de fork.
- [ ] `.ai/constitution.md`, `.ai/spec.md`, `.ai/tasks.md`,
      `.ai/casos-de-teste.json` e `.ai/casos-de-teste-n-pessoas.json`
      no repositório.

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
   arquivos `constitution.md`, `spec.md`, `tasks.md`,
   `casos-de-teste.json` e `casos-de-teste-n-pessoas.json`, usando
   exatamente o conteúdo das seções 14 a 17 abaixo e da seção 6.3.
2. Depois comece a Fase 0 do `.ai/tasks.md` (scaffold), parando ao final
   dela para reportar.

---

## 14. CONTEÚDO DE `.ai/constitution.md`

(vide arquivo separado — copiar exatamente o conteúdo do Arquivo 1)

---

## 15. CONTEÚDO DE `.ai/spec.md`

(vide arquivo separado — copiar exatamente o conteúdo do Arquivo 2)

---

## 16. CONTEÚDO INICIAL DE `.ai/casos-de-teste.json`

(vide arquivo separado — copiar exatamente o conteúdo do Arquivo 3)

---

## 17. CONTEÚDO DE `.ai/tasks.md`

(vide arquivo separado — copiar exatamente o conteúdo do Arquivo 5)