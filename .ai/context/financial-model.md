# Mecânica de cálculo — Forma B com correção IPCA

Este documento explica como o sistema calcula saldos. É o complemento executável
de `context/spec.md §4`. Leia aqui para entender o math; leia o código em `src/core/`
para ver a implementação exata.

---

## 1. O problema central

Despesas compartilhadas são pagas em momentos diferentes. R$300 pagos em
dezembro de 2025 não equivalem a R$300 em agosto de 2026 em termos de poder de
compra. A Forma B resolve isso convertendo todos os valores para uma **moeda
normalizada** (unidades), operando inteiramente nessa moeda, e só convertendo
de volta para reais no momento da exibição.

Quando `corrigir_ipca = false`, 1 unidade = R$1 e o cálculo é equivalente a
uma divisão nominal simples.

---

## 2. Unidades — a moeda normalizada

**Converter para unidades** (`paraUnidades` em `src/core/unidades.ts`):

```
unidades = valor_reais / indice(data)
```

**Converter de volta para reais** (`paraReais`):

```
reais = unidades × indice(hoje)
```

O índice IPCA em qualquer data é calculado por `indiceEmData` em
`src/core/indice.ts` (detalhado na seção 3).

**Intuição**: ao dividir pelo índice da data de pagamento e multiplicar pelo
índice de hoje, o sistema preserva o poder de compra. R$300 pagos quando o
índice era 1000, num momento em que o índice é 1050, valem:

```
0,3 unidades × 1050 = R$315 hoje
```

---

## 3. Índice IPCA em uma data

### 3.1 Construção da série acumulada

A tabela `taxas_ipca` armazena a variação percentual mensal da série BCB SGS
433. O índice é construído a partir de um valor-âncora arbitrário (1000 no
primeiro mês da série):

```
indice(mês_0) = 1000
indice(mês_n) = indice(mês_n-1) × (1 + taxa(mês_n-1) / 100)
```

**Defasagem de 1 mês**: o índice de janeiro reflete a taxa de dezembro. Isso
corresponde ao IPCA divulgado — a taxa do mês M é conhecida apenas quando M
termina.

Exemplo com dados reais da série (dez/2025 = base):

| Mês        | Taxa mês anterior | Índice acumulado  |
|------------|------------------|-------------------|
| 2025-12-01 | —                | 1000,000          |
| 2026-01-01 | 0,33%            | 1003,300          |
| 2026-02-01 | 0,33%            | 1006,610          |
| 2026-03-01 | 0,70%            | 1013,657          |
| 2026-04-01 | 0,88%            | 1022,590          |

### 3.2 Pro-rata diária intra-mês

Para datas após o dia 1 do mês, o sistema interpola de forma composta:

```
indice(dia d do mês M) = indice(01/M) × (1 + taxa(M) / 100) ^ ((d-1) / diasNoMes(M))
```

Exemplo: 26 de dezembro de 2025, taxa dez = 0,33%, 31 dias no mês:

```
indice(2025-12-26) = 1000 × (1,0033) ^ (25/31) = 1000 × 1,002660 ≈ 1002,660
```

**Quando não há pro-rata**: se o mês da data for o último da série (sem taxa
seguinte publicada), o sistema retorna o índice do dia 1 sem interpolação.

### 3.3 Data fora dos limites

- `data < primeiro mês da série` → lança erro (`Data anterior à série do IPCA`)
- `data > último mês da série` → retorna o último índice conhecido (sem extrapolar)

---

## 4. O algoritmo de cálculo — passo a passo

Implementado em `src/core/saldo.ts:calcularSaldo()`.

### Entradas

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `rateio.participantes` | `{userId, cota: Decimal}[]` | Cotas somam exatamente 1 |
| `rateio.despesas` | `{pagadorUserId, valor, data}[]` | Todas as despesas registradas |
| `rateio.reembolsos` | `{pagadorUserId, recebedorUserId, valor, data}[]` | Todos os reembolsos |
| `corrigir` | `boolean` | Habilita correção IPCA |
| `hoje` | `string` (YYYY-MM-DD) | Data de referência para "paga vs. prevista" |
| `taxas` | `TaxaIPCA[]` | Série histórica do IPCA |

### Passo 1 — U_total

Soma das **despesas pagas** convertidas para unidades. Despesas com
`data > hoje` são **previstas** e excluídas.

```
U_total = Σ paraUnidades(d.valor, d.data)   para cada d com d.data ≤ hoje
```

### Passo 2 — Compromisso por participante

Quanto cada participante deveria ter pago, em unidades:

```
compromisso(i) = cota(i) × U_total
```

### Passo 3 — Pago efetivo por participante

Quanto cada participante de fato contribuiu, em unidades. Parte das despesas,
parte dos reembolsos:

```
pago_efetivo(i) = Σ paraUnidades(d.valor, d.data)   [despesas pagas por i]
                + Σ paraUnidades(r.valor, r.data)   [reembolsos onde i é o pagador]
                − Σ paraUnidades(r.valor, r.data)   [reembolsos onde i é o recebedor]
```

O reembolso soma no pagador (quem reembolsa "pagou" mais) e subtrai no
recebedor (quem recebeu já tem essa parte coberta). Veja a seção 5 para o
raciocínio completo.

### Passo 4 — Excesso e déficit

```
diff(i) = pago_efetivo(i) − compromisso(i)

excesso(i) = max(0,  diff(i))
deficit(i)  = max(0, −diff(i))
```

### Passo 5 — deve(i → j): distribuição proporcional

Cada devedor distribui seu déficit proporcionalmente ao excesso de cada credor:

```
deve(i → j) = deficit(i) × excesso(j) / Σ_k excesso(k)
```

Se `Σ excesso = 0` (saldo zerado ou rateio vazio), não há transferências.

### Passo 6 — Saldo líquido em unidades

Para cada participante, o saldo líquido é a diferença entre o que deve e o
que tem a receber de outros:

```
saldo_unidades(i) = Σ deve(i → j)   [o que i deve a outros]
                  − Σ deve(j → i)   [o que outros devem a i]
```

Convenção de sinal (usada nas telas):
- `saldo_unidades > 0` → participante **deve** (devedor líquido)
- `saldo_unidades < 0` → participante **tem a receber** (credor líquido)

### Passo 7 — Conversão final para reais (exibição)

Feita por `saldoEmReais()`, que chama `paraReais(saldo_unidades, hoje)`:

```
saldo_reais(i) = saldo_unidades(i) × indice(hoje)
```

---

## 5. Reembolsos — por que somam e subtraem em pago_efetivo

Um reembolso representa a quitação (total ou parcial) de uma dívida. Quando B
reembolsa A:

- B está pagando a sua parte da dívida que A adiantou. Do ponto de vista do
  pool, B "pagou" aquele valor — `pago_efetivo(B) += reembolso`.
- A recebeu de volta o que havia adiantado. Aquela quantia não é mais "pago
  por A" — `pago_efetivo(A) -= reembolso`.

O efeito líquido é transferir crédito de A para B dentro do pool de unidades,
sem alterar `U_total` (que só conta despesas pagas a terceiros).

---

## 6. Despesas previstas

Uma despesa com `data > hoje` é **prevista**: não entra em `U_total` (passo 1)
e não entra em `pago_efetivo` (passo 3). Ela existe no banco e aparece no
extrato com badge "prevista", mas não afeta nenhum saldo atual.

Não há coluna `situacao` no banco — a classificação é derivada em runtime
comparando `data` com `hoje`.

---

## 7. Invariantes

O algoritmo garante dois invariantes que os testes verificam:

```
Σ excesso(i)         = Σ deficit(i)         (todo crédito tem um débito correspondente)
Σ saldo_unidades(i)  = 0                    (dinheiro é conservado no pool)
```

Se os invariantes falharem, há um bug na lógica de distribuição.

---

## 8. Exemplo numérico

### 8.1 Sem correção IPCA

**Cenário**: A (50%) e B (50%). A paga R$300; B paga R$100.

| Passo | A | B |
|-------|---|---|
| `U_total` | — | 400 |
| `compromisso` | 200 | 200 |
| `pago_efetivo` | 300 | 100 |
| `excesso` | 100 | 0 |
| `deficit` | 0 | 100 |
| `deve(B→A)` | — | 100 × 100 / 100 = **100** |
| `saldo_reais` | −100 (a receber) | +100 (deve) |

**Com reembolso parcial**: B reembolsa A R$60.

| | A | B |
|-|---|---|
| `pago_efetivo` após reembolso | 300 − 60 = 240 | 100 + 60 = 160 |
| `excesso / deficit` | excesso 40 | deficit 40 |
| `deve(B→A)` | — | **40** |
| `saldo_reais` | −40 | +40 |

B liquidou R$60 da dívida de R$100; restam R$40.

### 8.2 Com correção IPCA

**Cenário**: mesmos A e B (50%/50%). Ambos pagam na data base onde o índice
é 1000. Hoje o índice é 1050 (+5%).

| Item | Cálculo | Unidades |
|------|---------|----------|
| A paga R$300 | 300 / 1000 | 0,3 |
| B paga R$100 | 100 / 1000 | 0,1 |
| `U_total` | | **0,4** |
| `compromisso` A e B | 0,5 × 0,4 | 0,2 cada |
| `pago_efetivo` A | | 0,3 |
| `pago_efetivo` B | | 0,1 |
| `excesso` A | 0,3 − 0,2 | 0,1 |
| `deficit` B | 0,2 − 0,1 | 0,1 |
| `deve(B→A)` | 0,1 × 0,1 / 0,1 | **0,1 unidades** |
| `saldo_reais` A | −0,1 × 1050 | **−R$105** |
| `saldo_reais` B | +0,1 × 1050 | **+R$105** |

Sem IPCA B deveria R$100. Com IPCA B deve R$105 — o poder de compra original
de A é preservado.

### 8.3 Três participantes, dois credores

**Cenário**: A (50%), B (30%), C (20%). A paga R$400; B paga R$200; C não paga.
Sem IPCA.

```
U_total    = 600
compromisso: A=300, B=180, C=120
pago_efetivo: A=400, B=200, C=0
excesso:  A=100, B=20,  C=0
deficit:  A=0,   B=0,   C=120
Σ excesso = 120
```

Distribuição do déficit de C:
```
deve(C→A) = 120 × 100 / 120 = 100
deve(C→B) = 120 ×  20 / 120 =  20
```

| | A | B | C |
|-|---|---|---|
| `saldo_reais` | −100 | −20 | +120 |

Verificação: −100 − 20 + 120 = 0 ✅

---

## 9. Comportamentos de borda

| Situação | Comportamento |
|----------|---------------|
| Rateio sem despesas | `U_total = 0`, todos compromissos e saldos são zero |
| `Σ excesso = 0` | Nenhum `deve(i→j)` gerado; todos saldos são zero |
| Data de pagamento = hoje | Despesa é paga (usa `data <= hoje`, não `<`) |
| Data no futuro | Despesa prevista; excluída do cálculo |
| Cota zero | Compromisso zero; participante nunca deve, mas pode ter pago |
| Série IPCA incompleta para data | Retorna último índice disponível (sem extrapolar) |
| Data anterior à série | Lança erro; bloqueado também no formulário de despesa |

---

## 10. Referência ao código

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/core/decimal.ts` | Re-exporta `Decimal` (decimal.js); construtor `D()` |
| `src/core/indice.ts` | `indiceEmData()` — série acumulada + pro-rata diária |
| `src/core/unidades.ts` | `paraUnidades()` / `paraReais()` — conversão BRL ↔ unidades |
| `src/core/saldo.ts` | `calcularSaldo()` — algoritmo completo; `saldoEmReais()` — exibição |
| `src/core/__tests__/` | Testes contra os oráculos em `__tests__/fixtures/` |
| `src/core/__tests__/fixtures/test-cases-2p.json` | Oráculo: caso real (2 participantes, IPCA real) |
| `src/core/__tests__/fixtures/test-cases-np.json` | Oráculo: casos parametrizados (n participantes) |
