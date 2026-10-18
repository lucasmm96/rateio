# HANDOFF — App "Controle de Rateios"

Você é o Claude Code executando este projeto. Este único arquivo contém
tudo o que você precisa: contexto, decisões fechadas, modelo de dados,
regras de cálculo, dados de origem, telas, ordem de execução e os textos
completos dos artefatos de spec que devem existir no repositório.

Idioma de trabalho: português do Brasil. Código, comentários, commits e
documentação em português.

---

## INSTRUÇÕES INICIAIS (leia antes de tudo)

1. O repositório já existe, público, vazio (ou quase). Você está na raiz.
2. Antes de qualquer código, **crie a pasta `.ai/` e popule os arquivos
   de spec base** (`constitution.md`, `spec.md`, `tasks.md`,
   `casos-de-teste.json`, `casos-de-teste-n-pessoas.json`) com o conteúdo
   exato das seções 14 a 17 deste documento e da seção 6.3. Estes são
   seus **artefatos de referência enxutos**.
3. Em seguida, **inicialize o GitHub Spec Kit** e execute os comandos
   para gerar os **artefatos de qualidade completos** (`plan.md`,
   `clarify.md`, `checklist.md`, `analyze.md`), conforme detalhado na
   seção 9 (Ordem de Execução).
4. Depois, siga a ordem de execução da seção 9, parando ao final de cada
   fase para mostrar o resultado antes de prosseguir.
5. Não reabra decisões da seção 2. Se algo parecer ambíguo, pergunte ao
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

### Busca de usuários por email

- Ao criar/editar um rateio, o usuário adiciona participantes por email.
- O front usa a RPC `buscar_usuario_por_email(email)` para verificar se o
  email existe e obter o `id` do usuário.
- Se o email não existir, mostra erro "Usuário não encontrado. Peça para se
  cadastrar primeiro."
- A RPC é `SECURITY DEFINER` e retorna apenas `id` e `email`.
- A RLS de `users` permanece restrita à própria linha (não relaxar).

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
- Usar **GitHub Spec Kit**: os artefatos enxutos (`constitution.md`,
  `spec.md`, `tasks.md`) são a base. Os comandos do Spec Kit
  (`/speckit.clarify`, `/speckit.plan`, `/speckit.checklist`,
  `/speckit.analyze`) geram os artefatos de qualidade adicionais
  (`plan.md`, `checklist.md`, `clarify.md`, `analyze.md`).
- Constitution é **reutilizável** para futuros apps derivados de planilhas.
- Todos os artefatos de spec enxutos ficam em **`.ai/`** na raiz do
  repositório. Os artefatos gerados pelo Spec Kit ficam em **`specs/`**
  (estrutura padrão do Spec Kit).

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
  criado_por_user_id uuid not null references users(id),
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
- `users`: cada usuário só vê a própria linha. Para busca por email, usar
  a função RPC `buscar_usuario_por_email(text)` (SECURITY DEFINER), que
  retorna apenas `id` e `email`.
- `rateios` INSERT: permitido a qualquer usuário autenticado (o criador é
  registrado em `criado_por_user_id`).
- `membros` INSERT: permitido se `auth.uid() = rateios.criado_por_user_id`
  (criador adiciona membros) OU se `auth.uid()` já é membro do rateio.

### 3.5 Validações por trigger (não expressáveis como CHECK simples)

1. `Σ cota = 1` por rateio.
2. `despesas.pagador_user_id` ∈ membros do rateio.
3. `reembolsos.pagador_user_id` e `recebedor_user_id` ∈ membros do rateio.
4. Cotas e conjunto de participantes **não são imutáveis** (podem ser
   reajustados). Reajuste recompõe o cálculo; nada é congelado.
5. A inserção de membros ao criar um rateio deve ser feita via RPC
   `criar_rateio` (transação única), para evitar estado intermediário com
   soma de cotas ≠ 1.

### 3.6 Funções RPC (`buscar_usuario_por_email` e `criar_rateio`)

Como a RLS de `users` restringe cada usuário à própria linha, a busca por
email precisa de uma função `SECURITY DEFINER` que retorna apenas `id` e
`email` (não expõe outros dados). A criação de um rateio (rateio + membros)
é feita em uma única transação, também via RPC, para evitar estado
intermediário com soma de cotas ≠ 1.

```sql
create or replace function public.buscar_usuario_por_email(p_email text)
returns table (id uuid, email text)
language sql
security definer
set search_path = public
as $$
  select u.id, u.email
  from users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.buscar_usuario_por_email(text) from public;
grant execute on function public.buscar_usuario_por_email(text) to authenticated;

create or replace function public.criar_rateio(
  p_nome text,
  p_corrigir_ipca boolean,
  p_participantes jsonb  -- array de { user_id, cota }
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rateio_id uuid;
  v_criador uuid := auth.uid();
  v_soma_cota numeric := 0;
begin
  if v_criador is null then
    raise exception 'não autenticado';
  end if;

  select coalesce(sum((p->>'cota')::numeric), 0) into v_soma_cota
  from jsonb_array_elements(p_participantes) p;

  if abs(v_soma_cota - 1) > 0.000001 then
    raise exception 'soma das cotas deve ser 1 (recebido: %)', v_soma_cota;
  end if;

  insert into rateios (nome, corrigir_ipca, criado_por_user_id)
  values (p_nome, p_corrigir_ipca, v_criador)
  returning id into v_rateio_id;

  insert into membros (rateio_id, user_id, cota)
  select v_rateio_id, (p->>'user_id')::uuid, (p->>'cota')::numeric
  from jsonb_array_elements(p_participantes) p;

  return v_rateio_id;
end;
$$;

revoke all on function public.criar_rateio(text, boolean, jsonb) from public;
grant execute on function public.criar_rateio(text, boolean, jsonb) to authenticated;
```

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

> **Derivação de `situacao`**: como o campo `situacao` foi removido do
> banco, o conjunto `D` de despesas pagas é derivado em runtime:
> `D = { d ∈ despesas : d.data <= hoje }`. Despesas com `d.data > hoje`
> são consideradas previstas e não entram no cálculo.

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

> A coluna `situacao` não existe no banco; a classificação de paga/prevista
> é derivada em runtime: `data <= data_referencia` → paga;
> `data > data_referencia` → prevista.

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
  valor, boleto_url, comprovante_url.
- A situação (`paga`/`prevista`) é **derivada da data**: `data <= hoje`
  → paga; `data > hoje` → prevista. A UI mostra um badge dinâmico ao
  lado do campo data indicando o estado.

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
├── .specify/                    # gerado pelo Spec Kit
├── specs/                       # gerado pelo Spec Kit
│   └── 001-controle-de-rateios/
│       ├── spec.md
│       ├── plan.md
│       ├── research.md
│       ├── data-model.md
│       ├── quickstart.md
│       ├── contracts/
│       ├── checklist.md
│       └── tasks.md
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

Observação: a pasta `.specify/` e a pasta `specs/` são criadas
automaticamente pelo `specify init`. Os arquivos `.ai/*` são criados por
você (Claude Code) e servem de **entrada** para os comandos do Spec Kit.

---

## 9. ORDEM DE EXECUÇÃO

**Siga rigorosamente esta ordem.** A Fase 0 prepara o terreno. A Fase 1
usa o GitHub Spec Kit para validar e enriquecer nossos artefatos de
referência antes de escrevermos qualquer código de produção.

### Fase 0 — Scaffold e Preparação do Projeto

1. **Scaffold do Projeto**: Vite + React + TS + PWA + Drizzle + Neon
   Auth + hash router + base path (base path para GitHub Pages,
   `createHashRouter`).
2. **Criação dos Artefatos de Referência (`.ai/`)**: Copie o conteúdo
   exato das seções 14 a 17 (e 6.3) deste HANDOFF para os arquivos
   correspondentes dentro da pasta `.ai/`. Estes arquivos são a fonte da
   verdade e serão usados como entrada para o Spec Kit.

### Fase 1 — Integração com o GitHub Spec Kit

1. **Instalar o `specify` CLI**:
   ```bash
   uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.0.6
   ```
   (Use a versão mais recente estável disponível no momento da execução;
   consulte https://github.com/github/spec-kit para a versão atual.)

2. **Inicializar o Spec Kit no Projeto**:
   ```bash
   specify init --here --force --integration claude
   ```
   - `--here`: Inicializa no diretório atual.
   - `--force`: Permite a mesclagem com os arquivos existentes
     (`HANDOFF.md`, `.ai/`, etc.) sem sobrescrever.
   - `--integration claude`: Configura os prompts para o Claude Code.

3. **Executar os Comandos de Qualidade**: Use os comandos de barra no
   chat para gerar os artefatos faltantes, usando os arquivos `.ai/`
   como contexto.
   - `/speckit.clarify`: Para resolver ambiguidades no `spec.md`.
   - `/speckit.plan`: Para gerar o `plan.md` com decisões técnicas.
   - `/speckit.checklist`: Para gerar os critérios de aceite e testes.
   - `/speckit.analyze`: Para verificar a consistência entre todos os
     artefatos.

4. **Pare e reporte**: Mostre os artefatos gerados pelo Spec Kit ao
   usuário antes de prosseguir.

### Fase 2 — Módulo de Cálculo Puro

1. **Implementar `src/core/`**: Criar `decimal.ts`, `indice.ts`,
   `unidades.ts` e `saldo.ts` conforme a seção 4.10 deste documento.
2. **Rodar os Testes**: Executar os testes contra os arquivos
   `.ai/casos-de-teste.json` e `.ai/casos-de-teste-n-pessoas.json`.
   Todos os 27 + 10 casos devem passar.
3. **Validar o Saldo**: Confirmar que o saldo em 2026-08-15 está entre
   R$ 707,00 e R$ 708,00.
4. **Pare e reporte** o resultado dos testes.

### Fase 3 — Banco de Dados e Autenticação

1. **Schema e Migrações**: Criar `src/db/schema.ts` com Drizzle (tabela
   `rateios`, `membros`, `despesas`, `reembolsos`, etc.). Gerar as
   migrações e aplicar as políticas de RLS e triggers.
2. **Autenticação**: Configurar o Neon Auth, desativar o cadastro
   aberto e criar as telas de login/logout.
3. **Pare e reporte**.

### Fase 4 — Cliente de Dados e Telas

1. **Cliente de Dados**: Criar `src/db/client.ts` usando a Neon Data API
   e funções tipadas.
2. **Telas**: Implementar as telas de lista, detalhe, memória de
   cálculo, cadastro de despesa/reembolso e configurações.
3. **Pare e reporte**.

### Fase 5 — Workflows e Migração

1. **Workflows do GitHub**: Criar `smoke-bcb.yml`, `ipca.yml` e
   `backup.yml`.
2. **Script de Migração**: Criar `scripts/migrar-planilha.mjs` para
   popular o banco com os dados do rateio "Apartamento".
3. **Pare e reporte**.

### Fase 6 — Deploy e Documentação

1. **Deploy**: Configurar o GitHub Pages via Action e testar a
   instalação do PWA.
2. **Documentação**: Escrever o `README.md` com instruções de fork e o
   `.env.example`.
3. **Pare e reporte**.

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
- **Spec Kit e `.ai/`**: o `specify init` cria uma pasta `specs/` com
  seus próprios arquivos. Não sobrescrever `.ai/`; usar o conteúdo
  `.ai/` como entrada para os comandos `/speckit.*`.
- **Busca de usuário por email**: a RLS de `users` bloqueia leitura de
  outras linhas. Usar a RPC `buscar_usuario_por_email` (SECURITY DEFINER).
  Não relaxar a RLS de `users`.
- **Criação de rateio**: usar a RPC `criar_rateio` para inserir rateio +
  membros em uma única transação. Insert direto de membros pelo front falha
  na RLS porque o usuário ainda não é membro.
- **Busca por email permite enumeração**: um usuário autenticado pode
  descobrir se um email tem conta. Para o caso de uso (casal/família) é
  aceitável. Se virar problema, adicionar rate limiting ou exigir convite.

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
- [ ] **Artefatos do Spec Kit gerados**: `plan.md`, `checklist.md`,
      `clarify.md` e `analyze.md` presentes na pasta `specs/`.
- [ ] `.ai/constitution.md`, `.ai/spec.md`, `.ai/tasks.md`,
      `.ai/casos-de-teste.json` e `.ai/casos-de-teste-n-pessoas.json`
      no repositório.
- [ ] RPC `buscar_usuario_por_email` criada e testada.
- [ ] RPC `criar_rateio` criada e testada (transação atômica).
- [ ] Adicionar participante por email funciona no formulário de novo
      rateio.
- [ ] Adicionar participante por email em rateio existente funciona (via
      config).

---

## 12. AO TERMINAR

Reporte:

1. Quais tarefas foram concluídas.
2. Quais não foram e por quê.
3. O saldo calculado em 2026-08-15 e se está dentro do intervalo esperado.
4. Se o smoke test do BCB passou.
5. Quais artefatos o Spec Kit gerou e onde estão.
6. Qualquer decisão de implementação que você teve que tomar por conta
   própria.

---

## 13. INSTRUÇÃO IMEDIATA

Antes de qualquer código:

1. Crie a pasta `.ai/` na raiz do repositório e popule os arquivos
   `constitution.md`, `spec.md`, `tasks.md`, `casos-de-teste.json` e
   `casos-de-teste-n-pessoas.json` com o conteúdo exato das seções 14 a
   17 e 6.3.
2. Em seguida, execute os passos da **Fase 1 — Integração com o GitHub
   Spec Kit** descritos na seção 9 para gerar os artefatos de qualidade
   adicionais. Pare e reporte os artefatos gerados.
3. Depois, comece a **Fase 2 — Módulo de Cálculo Puro** e pare ao final
   dela para reportar os resultados dos testes.

---

## 14. CONTEÚDO DE `.ai/constitution.md`

```markdown
# Constitution — Apps de Controle de Rateios

Princípios reutilizáveis para qualquer app derivado de planilha de controle
de despesas compartilhadas entre pessoas. O app piloto é o "Controle de
Rateios" (apartamento Lucas + Letícia). Estes princípios valem para os
próximos.

## Princípios

### 1. Cálculo em módulo puro, com testes
Toda regra financeira (correção, saldo, rateio) vive em funções puras,
sem dependência de UI, banco ou rede. Testadas com dados reais migrados
como oráculo. Nenhum cálculo financeiro no componente visual nem na query.

### 2. Dinheiro e índices em decimal
Nunca usar `number` (float binário) para dinheiro ou índices. Usar lib
decimal (`decimal.js`). Arredondamento explícito e documentado em cada
operação. Valores gravados com precisão para reproduzir o oráculo.

### 3. Séries e taxas configuráveis, e opcionais
A fonte da correção (BCB SGS, código da série) é parâmetro, não hardcoded.
Um fork pode trocar IPCA por IGP-M, INCC, etc. sem editar o núcleo do
cálculo. Correção é **opcional por rateio** — se desligada, tudo é
nominal.

### 4. Correção pro-rata diária composta, sobre o que foi pago
A correção entre duas datas usa a taxa mensal composta diariamente, com
defasagem de 1 mês embutida (índice do mês M incorpora a taxa do mês M−1).
Datas antes do início da série são bloqueadas com erro claro. **Só o que
já foi pago é corrigido** — nunca valores previstos.

### 5. RLS obrigatório; nenhuma credencial no cliente
Autenticação JWT (Neon Auth) + RLS por membro. Nenhuma connection
string, service key ou segredo no bundle. O front fala apenas com a Data
API. Role do Postgres para escrita de taxas é separada e restrita à tabela
de taxas.

### 6. Schema versionado por Drizzle
Schema, políticas RLS e triggers vivem em migrações Drizzle versionadas
no repositório. Migrações rodam localmente/CI com connection string direta
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
Só criar tabela/campo quando houver regra que o justifique. Preferir visão
derivada a coluna gravada quando o dado é calculável.

### 11. Multi-rateio e n participantes por padrão
O app não é específico de um caso. Toda entidade de negócio (despesa,
reembolso, saldo) é escopada por `rateio_id`. Um rateio tem **n
participantes** com cotas, e o cálculo é o mesmo para n=2 ou n=10.

### 12. Cotas são parâmetros, não fatos
Pagamentos e reembolsos são fatos históricos, imutáveis. Cotas são
parâmetros de cálculo e podem ser reajustadas — o saldo é recomposto. Não
guardar snapshot de cotas em despesas.

### 13. Reembolsos entram no `pago_efetivo`
Um reembolso move crédito: soma no `pago_efetivo` do pagador e subtrai no
do recebedor. **Nunca** subtrair reembolsos de novo na hora de calcular
`deve(i → j)` — eles já estão contabilizados. Essa foi uma fonte de bug
identificada e corrigida.

### 14. Terminologia explícita
Termos do domínio (rateio, pagamento, reembolso, cota, compromisso,
excesso, déficit) devem estar definidos no spec e usados consistentemente
na UI e no código. Evitar sinônimos.

### 15. Adição de participantes por email via RPC

Adicionar participantes a um rateio é feito por email. A busca por email
usa uma função RPC `SECURITY DEFINER` que retorna apenas `id` e `email`. A
RLS de `users` continua restrita à própria linha; não relaxar. A criação
do rateio (rateio + membros) é feita em uma única transação via RPC.

## Anti-princípios (o que evitar)
- Cálculo financeiro no front sem passar pelo módulo puro.
- `number` para dinheiro.
- Hardcoded de código de série, e-mail autorizado ou connection string.
- Aplicar migração direto em produção sem commit correspondente.
- "Depois eu testo" — o oráculo é pré-requisito, não etapa final.
- Tratar o app como específico do apartamento.
- Ratear excesso proporcional à cota (deve ser proporcional ao déficit).
- Corrigir valores previstos (só o pago é corrigido).
- Subtrair reembolsos duas vezes (eles já estão no `pago_efetivo`).
```

---

## 15. CONTEÚDO DE `.ai/spec.md`

```markdown
# Spec — App Controle de Rateios (v1)

## 1. Contexto
PWA pessoal para gerenciar **rateios** — divisões de despesas
compartilhadas entre participantes — com registro de despesas, cálculo de
saldos, e reembolsos entre participantes. Correção monetária por série
configurável (default: IPCA / BCB SGS 433), opcional por rateio.
Substitui a planilha Controle.xlsx (caso piloto: apartamento Lucas +
Letícia). O app suporta múltiplos rateios independentes, cada um com seus
próprios participantes, cotas, despesas, reembolsos e saldo.

Código aberto e reutilizável: qualquer pessoa pode fazer fork e usar para
cenários parecidos (rateio de despesas com correção por índice).

## 2. Glossário

- **Rateio**: contexto isolado que representa a divisão de uma dívida
  compartilhada entre n participantes, conforme suas cotas. Cada rateio
  tem seus próprios participantes, despesas, reembolsos e saldo. Ex.:
  "Apartamento", "Celular", "Carro".
- **Pagamento**: ato de pagar uma conta a um terceiro. A conta pode ou não
  lhe caber — você pode estar adiantando a parte de outra pessoa.
- **Reembolso**: ato de ressarcir uma pessoa que pagou uma conta que lhe
  cabia (total ou parcialmente), com o devido ajuste monetário pela série
  configurada. É a operação que liquida as diferenças apuradas pelo
  rateio.
- **Participante**: pessoa com cota em um rateio. Pode ter cota 0.
- **Cota**: fração do rateio atribuída a um participante. Soma 100% no
  rateio.
- **Compromisso**: `total_pago × cota` do participante. Muda quando o
  total pago muda.
- **Excesso**: valor que o participante pagou além do compromisso dele.
  Gera crédito contra os demais.
- **Déficit**: valor que falta para o participante atingir o compromisso.
  Gera dívida com os demais.
- **Credor líquido**: participante com excesso. Tem a receber.
- **Devedor líquido**: participante com déficit. Tem a pagar.
- **Pool**: o que ainda falta pagar a terceiros.

## 3. Modelo de dados
(ver HANDOFF.md seções 3.1 a 3.5)

Tabelas: `users`, `rateios`, `membros`, `despesas`, `reembolsos`,
`taxas_ipca`, `config`.

Convenções:
- Cotas em `membros` são `numeric(9,6)` entre 0 e 1, somando exatamente 1
  por rateio (trigger).
- `despesas.pagador_user_id` ∈ membros do rateio (trigger).
- `reembolsos.pagador_user_id` e `recebedor_user_id` ∈ membros do rateio
  (trigger) e diferentes entre si (CHECK).
- Despesas com situação `prevista` não entram no cálculo do saldo.

## 4. Regras de cálculo
(ver HANDOFF.md seções 4.1 a 4.10)

Resumo da Forma B (compromisso/excesso):

```
U_total        = Σ valores pagos / indice(data)         (unidades)
compromisso_i  = cota_i × U_total
pago_efetivo_i = pago_i + reembolsos_pagos_i − reembolsos_recebidos_i
excesso_i      = max(0, pago_efetivo_i − compromisso_i)
deficit_i      = max(0, compromisso_i − pago_efetivo_i)
deve(i → j)    = deficit_i × excesso_j / Σ_k excesso_k  (já é o líquido)
saldo_reais_i  = (Σ_j deve(i→j) − Σ_k deve(k→i)) × indice(hoje)
```

Invariantes:
- `Σ excesso = Σ déficit`
- `Σ saldo_unidades = 0`

## 5. Validações
- Valor de despesa/reembolso > 0.
- Reembolso: pagador ≠ recebedor.
- Data de reembolso anterior à data do rateio: permitido (adiantamento).
- Data de despesa < data base da série: bloqueada com erro claro.
- Σ cota = 1 por rateio (trigger + app).
- Pagador de despesa e partes do reembolso ∈ membros do rateio.
- Busca de usuário por email via RPC `buscar_usuario_por_email` (retorna
  id + email, ou vazio).
- Criação de rateio via RPC `criar_rateio` transacional (valida soma de
  cotas = 1 no servidor).

## 6. Telas
(ver HANDOFF.md seção 7)

- Lista de rateios (home).
- Detalhe do rateio com saldos por participante e extrato cronológico.
- Memória de cálculo por lançamento.
- Formulários de despesa e reembolso.
- Configurações (globais + cotas por rateio).
- Toast de "saldos recalculados" quando U_total muda.

## 7. Autenticação e acesso
- Neon Auth (JWT) + RLS.
- Cadastro aberto desativado; e-mails autorizados.
- Cada rateio tem sua própria lista de membros.

## 8. Rotina do IPCA (GitHub Action)
- Agendado (dias 9 a 15) + `workflow_dispatch`.
- Busca série configurada no BCB; upsert idempotente em `taxas_ipca`.
- Smoke test prévio obrigatório. Fallback manual.

## 9. Backup
- Action semanal faz `pg_dump` como artifact.

## 10. Migração da planilha
(ver HANDOFF.md seção 5)

Rateio "Apartamento", cotas Lucas=0 e Letícia=1, `corrigir_ipca=true`.

## 11. Fora de escopo (v1)
- Offline. Notificações. Upload de arquivo.
- Override de cota por despesa (usar rateio separado).
- Plano automático de reembolsos para zerar saldos.
- Observadores (cota 0 + não pagar já cumpre o papel).
- FIFO detalhado para n > 2 (só para n = 2).

## 12. Riscos
- Data API do Neon em Beta.
- Cold start do compute (~5s).
- Workflows agendados desativados após 60 dias sem atividade.
- Restauração do Neon free: 6 horas. Backup próprio é obrigatório.
- api.bcb.gov.br pode bloquear IPs de datacenter.
```

---

## 16. CONTEÚDO INICIAL DE `.ai/casos-de-teste.json`

```json
{
  "metadata": {
    "referencia": "2026-08-15",
    "serie_bcb": 433,
    "data_base": "2025-12-01",
    "indice_base": 1000,
    "metodo_correcao": "pro-rata diaria composta, defasagem 1 mes",
    "cotas": { "LUCAS": 0, "LETICIA": 1 }
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

> O array `casos` é preenchido na Fase 2 do `.ai/tasks.md` (T105) com as
> 27 linhas da planilha, calculadas pela fórmula pro-rata.

---

## 17. CONTEÚDO INICIAL DE `.ai/casos-de-teste-n-pessoas.json`
```json
{
  "metadata": {
    "descricao": "Cenarios sinteticos para validar a Forma B com n participantes e cotas desiguais. Corrigir_ipca=false para isolar a logica de rateio.",
    "referencia": "2026-08-15",
    "corrigir_ipca": false,
    "unidades_iguais_a_reais": true
  },
  "casos": [
    {
      "id": "n01",
      "descricao": "50/50 com uma despesa paga por cada um - saldo zero",
      "participantes": { "P1": 0.5, "P2": 0.5 },
      "despesas": [
        { "data": "2026-01-10", "pagador": "P1", "valor": 100 },
        { "data": "2026-01-15", "pagador": "P2", "valor": 100 }
      ],
      "reembolsos": [],
      "saldo_esperado": { "P1": 0, "P2": 0 },
      "deve_de_para": []
    },
    {
      "id": "n02",
      "descricao": "50/50 com despesa paga so por P1 - P2 deve 50 a P1",
      "participantes": { "P1": 0.5, "P2": 0.5 },
      "despesas": [
        { "data": "2026-01-10", "pagador": "P1", "valor": 100 }
      ],
      "reembolsos": [],
      "saldo_esperado": { "P1": -50, "P2": 50 },
      "deve_de_para": [
        { "de": "P2", "para": "P1", "valor": 50 }
      ]
    },
    {
      "id": "n03",
      "descricao": "80/20 com despesa paga so por P2 - P1 deve 80 a P2",
      "participantes": { "P1": 0.8, "P2": 0.2 },
      "despesas": [
        { "data": "2026-01-10", "pagador": "P2", "valor": 100 }
      ],
      "reembolsos": [],
      "saldo_esperado": { "P1": 80, "P2": -80 },
      "deve_de_para": [
        { "de": "P1", "para": "P2", "valor": 80 }
      ]
    },
    {
      "id": "n04",
      "descricao": "4 pessoas 20/30/10/40 com despesas pagas por P1, P2 e P4",
      "participantes": { "P1": 0.2, "P2": 0.3, "P3": 0.1, "P4": 0.4 },
      "despesas": [
        { "data": "2026-01-10", "pagador": "P1", "valor": 100 },
        { "data": "2026-02-10", "pagador": "P2", "valor": 200 },
        { "data": "2026-03-10", "pagador": "P4", "valor": 300 }
      ],
      "reembolsos": [],
      "calculo": {
        "U_total": 600,
        "compromissos": { "P1": 120, "P2": 180, "P3": 60, "P4": 240 },
        "pago_efetivo": { "P1": 100, "P2": 200, "P3": 0, "P4": 300 },
        "excesso": { "P1": 0, "P2": 20, "P3": 0, "P4": 60 },
        "deficit": { "P1": 20, "P2": 0, "P3": 60, "P4": 0 }
      },
      "saldo_esperado": { "P1": 20, "P2": -20, "P3": 60, "P4": -60 },
      "deve_de_para": [
        { "de": "P1", "para": "P2", "valor": 5 },
        { "de": "P1", "para": "P4", "valor": 15 },
        { "de": "P3", "para": "P2", "valor": 15 },
        { "de": "P3", "para": "P4", "valor": 45 }
      ],
      "propriedades": ["soma_saldos_zero"]
    },
    {
      "id": "n05",
      "descricao": "Cota 0 paga despesa - apenas os outros acumulam divida",
      "participantes": { "P1": 0, "P2": 1 },
      "despesas": [
        { "data": "2026-01-10", "pagador": "P1", "valor": 100 }
      ],
      "reembolsos": [],
      "saldo_esperado": { "P1": -100, "P2": 100 },
      "deve_de_para": [
        { "de": "P2", "para": "P1", "valor": 100 }
      ]
    },
    {
      "id": "n06",
      "descricao": "Cota 100 paga despesa - sem impacto liquido",
      "participantes": { "P1": 0, "P2": 1 },
      "despesas": [
        { "data": "2026-01-10", "pagador": "P2", "valor": 100 }
      ],
      "reembolsos": [],
      "saldo_esperado": { "P1": 0, "P2": 0 },
      "deve_de_para": []
    },
    {
      "id": "n07",
      "descricao": "Reembolso parcial - saldo residual de 20",
      "participantes": { "P1": 0.5, "P2": 0.5 },
      "despesas": [
        { "data": "2026-01-10", "pagador": "P1", "valor": 100 }
      ],
      "reembolsos": [
        { "data": "2026-02-10", "pagador": "P2", "recebedor": "P1", "valor": 30 }
      ],
      "calculo": {
        "pago_efetivo": { "P1": 70, "P2": 30 },
        "compromissos": { "P1": 50, "P2": 50 },
        "excesso": { "P1": 20, "P2": 0 },
        "deficit": { "P1": 0, "P2": 20 }
      },
      "saldo_esperado": { "P1": -20, "P2": 20 },
      "deve_de_para": [
        { "de": "P2", "para": "P1", "valor": 20 }
      ]
    },
    {
      "id": "n08",
      "descricao": "Reembolso excessivo inverte a divida - P1 deve 50 a P2",
      "participantes": { "P1": 0.5, "P2": 0.5 },
      "despesas": [
        { "data": "2026-01-10", "pagador": "P1", "valor": 100 }
      ],
      "reembolsos": [
        { "data": "2026-02-10", "pagador": "P2", "recebedor": "P1", "valor": 100 }
      ],
      "calculo": {
        "pago_efetivo": { "P1": 0, "P2": 100 },
        "compromissos": { "P1": 50, "P2": 50 },
        "excesso": { "P1": 0, "P2": 50 },
        "deficit": { "P1": 50, "P2": 0 }
      },
      "saldo_esperado": { "P1": 50, "P2": -50 },
      "deve_de_para": [
        { "de": "P1", "para": "P2", "valor": 50 }
      ]
    },
    {
      "id": "n09",
      "descricao": "4 pessoas iguais - P1 e P2 pagam, P3 e P4 devem",
      "participantes": { "P1": 0.25, "P2": 0.25, "P3": 0.25, "P4": 0.25 },
      "despesas": [
        { "data": "2026-01-10", "pagador": "P1", "valor": 100 },
        { "data": "2026-02-10", "pagador": "P2", "valor": 100 }
      ],
      "reembolsos": [],
      "calculo": {
        "U_total": 200,
        "compromissos": { "P1": 50, "P2": 50, "P3": 50, "P4": 50 },
        "pago_efetivo": { "P1": 100, "P2": 100, "P3": 0, "P4": 0 },
        "excesso": { "P1": 50, "P2": 50, "P3": 0, "P4": 0 },
        "deficit": { "P1": 0, "P2": 0, "P3": 50, "P4": 50 }
      },
      "saldo_esperado": { "P1": -50, "P2": -50, "P3": 50, "P4": 50 },
      "deve_de_para": [
        { "de": "P3", "para": "P1", "valor": 25 },
        { "de": "P3", "para": "P2", "valor": 25 },
        { "de": "P4", "para": "P1", "valor": 25 },
        { "de": "P4", "para": "P2", "valor": 25 }
      ],
      "propriedades": ["soma_saldos_zero"]
    },
    {
      "id": "n10",
      "descricao": "Mudanca de U_total apos reembolso - recalculo",
      "participantes": { "P1": 0.5, "P2": 0.5 },
      "despesas": [
        { "data": "2026-01-10", "pagador": "P1", "valor": 100 },
        { "data": "2026-03-10", "pagador": "P1", "valor": 100 }
      ],
      "reembolsos": [
        { "data": "2026-02-10", "pagador": "P2", "recebedor": "P1", "valor": 50 }
      ],
      "observacao": "Estado inicial (so a 1a despesa + reembolso): P2 quitado, saldos zero. Com a 2a despesa, U_total vira 200, P2 deve mais 50. O reembolso anterior permanece como fato e o saldo e recalculado.",
      "calculo_final": {
        "U_total": 200,
        "pago_efetivo": { "P1": 150, "P2": 50 },
        "compromissos": { "P1": 100, "P2": 100 },
        "excesso": { "P1": 50, "P2": 0 },
        "deficit": { "P1": 0, "P2": 50 }
      },
      "saldo_esperado": { "P1": -50, "P2": 50 },
      "deve_de_para": [
        { "de": "P2", "para": "P1", "valor": 50 }
      ]
    }
  ]
}
```

---

## 18. CONTEÚDO DE `.ai/tasks.md`

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
```

---

# Fim do documento