# Como funciona o cálculo dos saldos

Este guia explica, sem exigir conhecimento de matemática ou programação, como
o app decide quanto cada pessoa pagou, quanto deveria pagar e quem deve para
quem.

Você pode ler o guia inteiro sem abrir uma fórmula. As contas aparecem apenas
em blocos marcados com **“Para quem quiser conferir”**. Se quiser o detalhe
técnico completo, ele está em
[`.ai/context/financial-model.md`](https://github.com/lucasmm96/rateio/blob/master/.ai/context/financial-model.md).

---

## 1. Para quem é este guia

Serve para qualquer participante de um rateio que queira entender:

- por que o saldo muda mesmo sem ninguém lançar uma despesa nova;
- por que um reembolso de R$100 nem sempre quita uma dívida de R$100;
- por que a data de cada lançamento importa tanto;
- o que significam “unidade”, “compromisso”, “excesso”, “déficit” e
  “transferência sugerida”.

Os exemplos usam valores redondos e uma série de IPCA parcial, só para facilitar
a leitura. Os valores reais do seu rateio vêm da série do Banco Central e da data
de hoje.

---

## 2. A ideia central: dinheiro no tempo

R$100 hoje e R$100 daqui a um ano não compram a mesma coisa. Se o preço das
coisas sobe, o segundo R$100 compra menos. Se os preços caem, compra mais.

O app resolve isso com uma regra simples: **cada lançamento é convertido para
uma moeda interna chamada unidade, usando o índice da data do lançamento.**
Depois, tudo é calculado nessa moeda. No fim, o resultado volta para reais
usando o índice de hoje.

A unidade é invisível. Você digita reais; o app guarda unidades; as telas
mostram reais.

> **Para quem quiser conferir**
>
> ```
> unidades = valor em reais ÷ índice da data do lançamento
> valor em reais hoje = unidades × índice de hoje
> ```

Por que isso preserva o poder de compra: se uma despesa de R$100 foi paga
quando o índice valia 1000, ela virou 0,1 unidade. Se hoje o índice vale 1083,80,
essa mesma despesa vale `0,1 × 1083,80 = R$108,38`. O app não “cobrou juros”;
ele apenas manteve o valor de compra daquele dinheiro.

O número 1083,80 é só um exemplo. O que importa é a variação do índice entre a
data do lançamento e hoje.

---

## 3. Glossário rápido

| Termo | O que significa | Onde aparece |
|---|---|---|
| **Rateio** | Conjunto de participantes, despesas, reembolsos e cotas que dividem os mesmos gastos. | Tela inicial, “Rateios” |
| **Participante** | Pessoa incluída no rateio. | Cartões de saldo |
| **Cota** | Percentual de responsabilidade de cada participante. As cotas somam 100%. | “Sua cota”, “% das despesas” |
| **Despesa paga** | Gasto que já aconteceu e já saiu do bolso de alguém. Entra no cálculo. | Badge “Paga” |
| **Despesa prevista** | Gasto futuro, ainda não realizado. Não entra no cálculo. | Badge “prevista” |
| **Reembolso** | Devolução de dinheiro de um participante para outro. Não é despesa nova; transfere crédito. | Aba “Reembolsos” |
| **Índice IPCA** | Número que mede a variação de preços. O app usa a série mensal do Banco Central. | “Índice IPCA”, “IPCA +x,xx%” |
| **Unidade** | Moeda interna do cálculo. Não é digitada nem exibida. | — |
| **U_total** | Soma de todas as despesas pagas, já convertidas para unidades. | “U_total” |
| **Compromisso** | Quanto cada participante deveria ter pago: `cota × U_total`. | “Compromisso (cota × U_total)” |
| **Pago efetivo** | Quanto cada participante realmente contribuiu, contando despesas e reembolsos. | “Pago efetivo” |
| **Excesso** | Quanto a pessoa pagou **a mais** que o compromisso dela. | “Excesso (pagou a mais)” |
| **Déficit** | Quanto a pessoa pagou **a menos** que o compromisso dela. | “Déficit (pagou a menos)” |
| **Saldo líquido** | Resultado final depois de distribuir os déficits entre os credores. | “Saldo líquido”, “Seu saldo” |
| **Transferência sugerida** | Quem deve pagar quanto para quem. | “Transferências sugeridas” |
| **Quitado** | Saldo igual a zero, dentro da margem de R$0,01 para cima ou para baixo. | Badge “Quitado” |

---

## 4. O cálculo em seis passos

Todo o motor cabe em seis passos. O exemplo abaixo é sem IPCA, com duas pessoas
e cotas de 50% cada.

**Cenário:** Ana e Bruno dividem tudo meio a meio. Ana pagou R$300 e Bruno pagou
R$100 em despesas já realizadas.

| Passo | O que faz | Ana | Bruno | Total |
|---|---|---|---|---|
| 1 | Soma as despesas pagas em unidades: `U_total` | — | — | 400 |
| 2 | Calcula o compromisso: `cota × U_total` | 200 | 200 | 400 |
| 3 | Calcula o pago efetivo: despesas + reembolsos pagos − reembolsos recebidos | 300 | 100 | 400 |
| 4 | Compara pago efetivo com compromisso | excesso 100 | déficit 100 | 0 |
| 5 | Distribui o déficit entre os credores | recebe 100 | paga 100 | 0 |
| 6 | Converte o saldo para reais de hoje | −R$100 (a receber) | +R$100 (deve) | 0 |

Resultado: Bruno deve R$100 para Ana.

Os passos seguintes explicam cada etapa com calma.

---

## 5. Cotas e compromisso

A **cota** é a fatia de responsabilidade de cada pessoa. Em um rateio de duas
pessoas, 50% e 50% significa que cada uma deve metade de tudo. Em um rateio de
três pessoas, 50%, 30% e 20% significa que a primeira deve metade, a segunda
30% e a terceira 20%.

As cotas precisam somar exatamente 100%. O banco de dados recusa um rateio cuja
soma seja diferente disso.

O **compromisso** é quanto cada pessoa deveria ter pago, considerando o total
das despesas pagas:

> **Para quem quiser conferir**
>
> ```
> compromisso(i) = cota(i) × U_total
> ```

Exemplo: se o total das despesas pagas é R$500 e a cota de Carla é 20%, o
compromisso dela é R$100.

Cotas não são “fatos históricos”. Se alguém mudar a cota de 50% para 60%, o app
recalcula todo o histórico com a nova cota. Isso é intencional: a cota é um
parâmetro atual do rateio, não uma fotografia do passado.

---

## 6. Despesa paga e despesa prevista

Uma despesa **paga** já aconteceu. Ela entra no `U_total` e no pago efetivo de
quem pagou.

Uma despesa **prevista** ainda não aconteceu. Ela aparece no extrato com o badge
“prevista”, mas não entra em nenhum saldo. Também não entra no `U_total`, nem no
pago efetivo, nem nas transferências sugeridas.

O status fica gravado na despesa. Ele **não muda sozinho** quando a data passa.
Ao cadastrar, o app marca como “paga” se a data for hoje ou passada, e como
“prevista” se a data for futura. Quando a despesa prevista for realmente paga,
é preciso editar a despesa e marcar “paga”. O app só permite “paga” com data de
hoje ou anterior, e “prevista” com data futura. Se o pagamento acontecer antes
do previsto, ajuste a data para o dia real do pagamento.

Exemplo curto: Ana cadastra uma despesa de R$200 para o mês que vem, como
prevista. Os saldos continuam iguais. No mês seguinte, depois de pagar, Ana
edita a despesa para “paga”. Aí sim o `U_total` sobe R$200 e os saldos são
recalculados.

---

## 7. Reembolsos: transferir crédito, não criar despesa

Um reembolso é um pagamento de um participante para outro. Ele não é uma despesa
nova. O reembolso apenas transfere crédito dentro do rateio.

A regra é:

- quem **pagou** o reembolso passa a ter pago mais;
- quem **recebeu** o reembolso passa a ter pago menos.

O `U_total` não muda. O que muda é quem carrega a parte já paga.

Exemplo sem IPCA: Ana pagou R$300, Bruno pagou R$100, total R$400, cotas 50/50.
O compromisso de cada um é R$200. Bruno deve R$100. Se Bruno reembolsar R$60
para Ana:

| | Ana | Bruno |
|---|---|---|
| Pago antes do reembolso | 300 | 100 |
| Reembolso de 60 | −60 | +60 |
| Pago efetivo | 240 | 160 |
| Compromisso | 200 | 200 |
| Excesso / déficit | excesso 40 | déficit 40 |
| Resultado | recebe 40 | deve 40 |

Bruno quitou R$60 e continua devendo R$40.

> **Para quem quiser conferir**
>
> ```
> pago_efetivo(i) = despesas que i pagou
>                 + reembolsos que i pagou
>                 − reembolsos que i recebeu
> ```

---

## 8. Excesso, déficit e transferências

Depois de calcular o compromisso e o pago efetivo, o app compara os dois:

- **excesso**: pagou mais do que devia;
- **déficit**: pagou menos do que devia.

Quem tem excesso é credor. Quem tem déficit é devedor. O motor então distribui
o déficit de cada devedor entre os credores, na proporção do excesso de cada
credor.

Exemplo com três pessoas, cotas 50%, 30% e 20%:

- Ana pagou R$400;
- Bruno pagou R$200;
- Carla não pagou nada.

O total é R$600. O compromisso é Ana R$300, Bruno R$180, Carla R$120.

| | Ana | Bruno | Carla |
|---|---|---|---|
| Compromisso | 300 | 180 | 120 |
| Pago efetivo | 400 | 200 | 0 |
| Excesso | 100 | 20 | 0 |
| Déficit | 0 | 0 | 120 |
| Resultado | recebe 100 | recebe 20 | deve 120 |

Carla deve R$100 para Ana e R$20 para Bruno.

Dois invariantes garantem que a conta fecha:

- todo crédito tem um débito do mesmo tamanho;
- a soma dos saldos de todos os participantes é zero.

> **Para quem quiser conferir**
>
> ```
> excesso(i) = max(0, pago_efetivo(i) − compromisso(i))
> déficit(i)  = max(0, compromisso(i) − pago_efetivo(i))
> deve(i→j)   = déficit(i) × excesso(j) ÷ soma dos excessos
> ```

---

## 9. Saldo líquido: deve ou a receber

A tela **Saldos** usa esta convenção:

- saldo **positivo** = a pessoa **deve**;
- saldo **negativo** = a pessoa **tem a receber**;
- saldo entre −R$0,01 e +R$0,01 = **quitado**.

No exemplo Ana/Bruno, Bruno tem saldo +R$100 (deve) e Ana tem saldo −R$100
(a receber).

**Atenção a uma diferença de tela.** A tela **Memória de Cálculo** mostra o
saldo com o sinal invertido: ela calcula “pago efetivo − compromisso”, então
quem pagou a mais aparece positivo (em verde). O número é o mesmo, mas a leitura
é a contrária. Para saber quem paga quem, use **“Transferências sugeridas”**:
ela mostra a direção explícita, sem depender de sinal. Este guia usa a convenção
da tela Saldos.

---

## 10. IPCA: como o índice é montado

O IPCA é o índice oficial de inflação. O app usa, por padrão, a série mensal do
Banco Central (SGS 433). Cada mês tem uma taxa percentual, por exemplo +0,16%
em janeiro de 2025.

O app transforma essas taxas em um **índice acumulado**. O primeiro mês da série
recebe um valor de referência, 1000. Cada mês seguinte multiplica o índice
anterior pela taxa do mês:

> **Para quem quiser conferir**
>
> ```
> índice(01 do mês seguinte) = índice(01 do mês) × (1 + taxa do mês ÷ 100)
> ```

Com a tabela parcial usada nos exemplos, e base 1000 em 01/01/2025:

| Mês | Taxa do mês | Índice em 01 do mês seguinte |
|---|---|---|
| Janeiro/2025 | +0,16% | 1001,60 |
| Fevereiro/2025 | +1,31% | 1014,72 |
| Março/2025 | +0,56% | 1020,40 |
| Abril/2025 | +0,43% | 1024,79 |
| Maio/2025 | +0,26% | 1027,46 |
| Junho/2025 | +0,24% | 1029,92 |
| Julho/2025 | +0,26% | 1032,60 |

Leia a tabela assim: a linha “Junho/2025” vai de 01/06 até 01/07. O valor
1029,92 é o índice em **01/07**, não em 01/06. A linha “Julho/2025” vai de
01/07 até 01/08; o valor 1032,60 é o índice em **01/08**.

Os valores da tabela estão arredondados para centavos. O app calcula com
precisão decimal, por isso uma conta manual pode diferir em um centavo.

Dentro do mês, o app distribui a taxa por dia, de forma composta. O dia 1 não
tem rateio diário: usa o índice do início do mês. No mês mais recente da série,
quando a taxa seguinte ainda não foi publicada, também não há rateio diário.

Se a data for anterior ao primeiro mês da série, o app bloqueia o lançamento.
Se for posterior ao último mês publicado, o app usa o último índice conhecido,
sem inventar correção para o futuro.

> **Para quem quiser conferir**
>
> ```
> índice(dia d do mês M) =
>   índice(01/M) × (1 + taxa(M) ÷ 100) ^ ((d − 1) ÷ dias do mês)
> ```

Nos exemplos deste guia, usamos 1000 em 01/01/2025 para facilitar a conta. O
valor inicial da série não importa; o que importa é a variação percentual.

---

## 11. Reembolso em data diferente: por que não quita

Aqui está o ponto que mais confunde. Um reembolso de R$100 feito dias ou meses
depois de uma despesa de R$100 **não quita a dívida**, porque os dois valores
entraram no cálculo em datas diferentes.

Cenário simplificado: Ana adiantou R$100 em 01/01/2025 por uma despesa que era
100% de Bruno. Bruno tem cota 100%; Ana tem cota 0%. Neste exemplo, suponha que
o índice de hoje seja 1083,80, ou seja, +8,38% desde 01/01/2025. Assim, a
despesa de Ana vale R$108,38 hoje.

No app, o índice de hoje muda todo mês. Os números desta tabela são uma
fotografia; no seu rateio, valem os índices atuais.

Bruno decide reembolsar R$100. O valor do reembolso é convertido pelo índice da
data em que ele foi feito. Quanto mais tarde o reembolso, menos unidades ele
compra, e maior o resíduo que fica em aberto.

| Data do reembolso | Índice na data | R$100 valem hoje | Resíduo hoje | Reembolso que quitaria |
|---|---|---|---|---|
| 01/01/2025 | 1000,00 | R$108,38 | R$0,00 | R$100,00 |
| 01/06/2025 | 1027,46 | R$105,48 | R$2,90 | R$102,75 |
| 01/07/2025 | 1029,92 | R$105,23 | R$3,15 | R$102,99 |
| 01/08/2025 | 1032,60 | R$104,96 | R$3,42 | R$103,26 |

Leitura da tabela:

- **mesma data**: R$100 valem R$100; quita tudo;
- **01/06**: R$100 valem R$105,48 hoje; faltam R$2,90;
- **01/07**: R$100 valem R$105,23 hoje; faltam R$3,15;
- **01/08**: R$100 valem R$104,96 hoje; faltam R$3,42.

Para quitar em 01/06, Bruno precisaria reembolsar o valor corrigido até 01/06:
R$102,75. Esse valor, corrigido até hoje, vale R$108,38. Reembolsar só R$100
deixa os R$2,75 de diferença daquela data, que viram R$2,90 hoje.

> **Para quem quiser conferir**
>
> ```
> resíduo em unidades =
>   100 ÷ índice(01/01/2025) − 100 ÷ índice(data do reembolso)
>
> resíduo em reais hoje = resíduo em unidades × índice(hoje)
> ```

A frase para guardar: **o reembolso entra pelo valor da data em que foi feito.
Quanto mais tarde ele acontece, menos poder de compra devolve.**

---

## 12. O que acontece quando o saldo zera

Se o saldo em unidades chega a zero, ele permanece zero. O IPCA pode subir ou
cair; `0 × qualquer índice = 0`. Uma dívida realmente quitada não “volta a
aparecer” por causa da inflação.

O que continua variando é um resíduo que **não foi pago**. Ele fica guardado em
unidades e é corrigido até ser quitado. Pode aumentar, diminuir ou oscilar em
torno de um centavo.

Exemplo: uma despesa de R$100 feita com índice 1000 e um reembolso de R$100
feito com índice 1100 deixam um resíduo de 0,009091 unidade. Esse resíduo vale
R$10,00 quando o índice está em 1100. Se o índice cair para 1050, passa a valer
R$9,55. Se subir para 1150, passa a valer R$10,45.

Também existe a questão dos centavos. O app calcula com precisão decimal, mas as
telas mostram duas casas. Um reembolso de R$100 um dia depois da despesa deixa
um resíduo de aproximadamente R$0,0056, que aparece como R$0,01. É arredondamento
de exibição, não uma dívida nova.

Pagar exatamente o valor mostrado (por exemplo, R$2,90) pode deixar uma fração
de centavo para um lado ou para o outro. O app considera quitado quando o saldo
está entre −R$0,01 e +R$0,01.

**E o que o extrato mostra para cada despesa?** Quando uma despesa foi
**quitada** (tudo o que se devia dela foi coberto pelos reembolsos), o app
**congela a correção na data da quitação**: os números pararam de crescer, e o
modal mostra “Quitada em DD/MM/AAAA”. Um badge “quitada” aparece ao lado do
IPCA. Se ainda houver **resíduo em aberto**, o modal mostra esse resíduo — o
valor que de fato falta — e, como referência discreta, o valor corrigido da
despesa inteira; aí sim os ajustes continuam até a quitação.

---

## 13. Exemplos completos

Cada exemplo é independente. Os valores são redondos para facilitar a conta.
Salvo indicação contrária, a correção do IPCA está desligada.

### Exemplo 1 — Divisão simples 50/50

**Enunciado:** Ana e Bruno dividem tudo meio a meio. Ana pagou R$300 e Bruno
pagou R$100.

| Item | Ana | Bruno | Total |
|---|---|---|---|
| Cota | 50% | 50% | 100% |
| Compromisso | R$200 | R$200 | R$400 |
| Pago efetivo | R$300 | R$100 | R$400 |
| Excesso / déficit | excesso R$100 | déficit R$100 | — |
| Resultado | recebe R$100 | deve R$100 | R$0 |

**Passo a passo:**

1. `U_total = 300 + 100 = 400`.
2. Compromisso de cada um: `50% × 400 = 200`.
3. Ana pagou 300; Bruno pagou 100.
4. Ana pagou 100 a mais; Bruno pagou 100 a menos.
5. Bruno deve R$100 para Ana.

### Exemplo 2 — Reembolso parcial

**Enunciado:** mesmo cenário do Exemplo 1. Bruno reembolsa R$60 para Ana.

| Item | Ana | Bruno |
|---|---|---|
| Pago efetivo antes | R$300 | R$100 |
| Reembolso | −R$60 | +R$60 |
| Pago efetivo depois | R$240 | R$160 |
| Compromisso | R$200 | R$200 |
| Excesso / déficit | excesso R$40 | déficit R$40 |
| Resultado | recebe R$40 | deve R$40 |

**Conclusão:** o reembolso de R$60 reduziu a dívida de R$100 para R$40. Não
alterou o `U_total`.

### Exemplo 3 — Três participantes e dois credores

**Enunciado:** Ana (50%), Bruno (30%) e Carla (20%). Ana pagou R$400, Bruno
pagou R$200 e Carla não pagou nada.

| Item | Ana | Bruno | Carla |
|---|---|---|---|
| Compromisso | R$300 | R$180 | R$120 |
| Pago efetivo | R$400 | R$200 | R$0 |
| Excesso | R$100 | R$20 | R$0 |
| Déficit | R$0 | R$0 | R$120 |
| Resultado | recebe R$100 | recebe R$20 | deve R$120 |

**Distribuição do déficit de Carla:**

- para Ana: `120 × 100 ÷ 120 = 100`;
- para Bruno: `120 × 20 ÷ 120 = 20`.

**Conclusão:** Carla paga R$100 para Ana e R$20 para Bruno. A soma dos saldos é
`−100 − 20 + 120 = 0`.

### Exemplo 4 — Despesa prevista e despesa paga

**Enunciado:** Ana e Bruno, 50/50. Ana cadastra uma despesa de R$200 para o mês
que vem, como **prevista**.

| Item | Ana | Bruno | Total |
|---|---|---|---|
| U_total | — | — | R$0 |
| Compromisso | R$0 | R$0 | R$0 |
| Pago efetivo | R$0 | R$0 | R$0 |
| Resultado | quitado | quitado | R$0 |

Depois de pagar, Ana edita a despesa para **paga**:

| Item | Ana | Bruno | Total |
|---|---|---|---|
| U_total | — | — | R$200 |
| Compromisso | R$100 | R$100 | R$200 |
| Pago efetivo | R$200 | R$0 | R$200 |
| Resultado | recebe R$100 | deve R$100 | R$0 |

**Conclusão:** enquanto o status for “prevista”, a despesa não afeta nada. O
status não vira “paga” sozinho quando a data chega.

### Exemplo 5 — Cota 0% e cota 100%

**Enunciado:** Ana tem cota 0% e Bruno tem cota 100%. Bruno não pagou nada; Ana
adiantou uma despesa de R$50.

| Item | Ana | Bruno |
|---|---|---|
| Compromisso | R$0 | R$50 |
| Pago efetivo | R$50 | R$0 |
| Excesso / déficit | excesso R$50 | déficit R$50 |
| Resultado | recebe R$50 | deve R$50 |

**Conclusão:** cota 0% não significa “fora do rateio”. Significa que a pessoa
não tem responsabilidade sobre as despesas, mas pode ter pago algo e virar
credora. Cota 100% significa que a pessoa deve tudo.

### Exemplo 6 — IPCA ligado: uma despesa ao longo do tempo

**Enunciado:** Ana pagou R$100 em 01/01/2025. O IPCA está ligado. Usando os
índices da seção 10:

| Data | Índice | Valor da despesa naquela data |
|---|---|---|
| 01/01/2025 | 1000,00 | R$100,00 |
| 01/06/2025 | 1027,46 | R$102,75 |
| 01/07/2025 | 1029,92 | R$102,99 |
| 01/08/2025 | 1032,60 | R$103,26 |
| Hoje (no exemplo) | 1083,80 | R$108,38 |

**Passo a passo:**

1. A despesa vira `100 ÷ 1000 = 0,1 unidade`.
2. A unidade não muda com o tempo.
3. Em cada data, o valor em reais é `0,1 × índice da data`.
4. Hoje: `0,1 × 1083,80 = R$108,38`.

**Conclusão:** o valor de hoje é 8,38% maior que o valor original. Esse é o
“IPCA +8,38%” que aparece no extrato.

### Exemplo 7 — Mesmo reembolso, datas diferentes

**Enunciado:** Ana adiantou R$100 em 01/01/2025 por uma despesa 100% de Bruno.
Bruno reembolsa R$100 em datas diferentes. Neste exemplo, o índice de hoje é
1083,80.

| Data do reembolso | R$100 valem hoje | Resíduo hoje | Reembolso que quitaria |
|---|---|---|---|
| 01/01/2025 | R$108,38 | R$0,00 | R$100,00 |
| 01/06/2025 | R$105,48 | R$2,90 | R$102,75 |
| 01/07/2025 | R$105,23 | R$3,15 | R$102,99 |
| 01/08/2025 | R$104,96 | R$3,42 | R$103,26 |

**Passo a passo (reembolso em 01/06):**

1. A despesa virou `100 ÷ 1000 = 0,1 unidade`.
2. O reembolso virou `100 ÷ 1027,46 = 0,097328 unidade`.
3. Sobraram `0,1 − 0,097328 = 0,002672 unidade`.
4. Em reais de hoje: `0,002672 × 1083,80 = R$2,90`.

**Conclusão:** o reembolso nominal de R$100 não quita a despesa de R$100 porque
foi feito com reais que valiam menos. Para quitar em 01/06, seriam necessários
R$102,75 naquela data.

### Exemplo 8 — Deflação

**Enunciado:** uma despesa de R$100 foi paga com índice 1000. Um reembolso de
R$100 foi feito quando o índice era 1100. O resíduo em unidades é:

`100 ÷ 1000 − 100 ÷ 1100 = 0,009091 unidade`.

Se a inflação ficar negativa depois disso, o valor em reais do resíduo cai:

| Índice hoje | Valor do resíduo hoje |
|---|---|
| 1050 | R$9,55 |
| 1100 | R$10,00 |
| 1150 | R$10,45 |

**Conclusão:** o resíduo não é imune à deflação. Ele é corrigido para cima ou
para baixo, conforme o índice. Mas a dívida não “desaparece” por conta própria:
as unidades continuam as mesmas.

### Exemplo 9 — Centavos e o R$0,01

**Enunciado:** despesa de R$100 em 01/01/2025; reembolso de R$100 em 02/01/2025.

| Item | Valor |
|---|---|
| Índice em 01/01 | 1000,000000 |
| Índice em 02/01 | 1000,051573 |
| Despesa em unidades | 0,10000000 |
| Reembolso em unidades | 0,09999484 |
| Resíduo em unidades | 0,00000516 |
| Resíduo em reais hoje | R$0,0056 |
| Exibição | R$0,01 |

**Conclusão:** a dívida real é menor que um centavo. O app mostra R$0,01 por
arredondamento e considera quitado qualquer saldo dentro de ±R$0,01. Não há
como pagar “meio centavo” pelo app.

---

## 14. Mal-entendidos comuns

**“Reembolsar o mesmo valor nominal sempre quita.”**
Falso. Quita apenas se o reembolso tiver o poder de compra equivalente ao valor
corrigido naquela data. Em datas diferentes, o valor nominal representa menos
poder de compra.

**“O saldo em reais só muda quando entra uma despesa ou reembolso.”**
Falso. O saldo em unidades não muda, mas a conversão para reais usa o índice de
hoje. A inflação muda o valor exibido todos os dias.

**“A linha de julho vale em 01/07.”**
Falso. A linha “Julho/2025” vai de 01/07 até 01/08. O valor acumulado no fim da
linha é o de 01/08.

**“Uma dívida quitada pode voltar com a inflação.”**
Falso para saldo zero em unidades. `0 × índice = 0`. Só um resíduo de fração de
centavo pode oscilar e reaparecer como R$0,01.

**“Despesa prevista vira paga sozinha quando a data passa.”**
Falso. O status é gravado e só muda por edição.

**“O IPCA é um juro cobrado pelo app.”**
Falso. O IPCA é correção monetária. O app não cobra juros; ele preserva o poder
de compra dos valores.

**“O valor corrigido que o extrato mostra é o valor que o reembolso precisa
ter.”**
O extrato mostra a despesa corrigida até hoje. O reembolso é convertido pela
data em que foi feito. Para quitar, ele precisa ser o valor corrigido até a
data do reembolso, não até hoje.

**“Depois de quitada, a despesa continua mostrando a correção crescendo.”**
Falso. Quando uma despesa é quitada, a correção dela congela na data da
quitação — o badge mostra “quitada”. O que continua crescendo é o resíduo de
uma despesa que segue **em aberto**.

---

## 15. Casos de borda

| Situação | O que acontece |
|---|---|
| Rateio sem despesas pagas | `U_total = 0`; todos os compromissos e saldos são zero |
| Soma dos excessos igual a zero | Nenhuma transferência é sugerida |
| Cota zero | Compromisso zero; a pessoa nunca deve, mas pode ter pago e virar credora |
| Cota 100% | A pessoa deve todo o `U_total` |
| Data anterior ao início da série IPCA | O cadastro é bloqueado; o motor lança erro |
| Data posterior ao último mês publicado | Usa o último índice conhecido, sem extrapolar; no mês mais recente não há rateio diário |
| Reembolso maior que o saldo devedor | O saldo inverte; a pessoa passa a ter crédito |
| Valores com centavos | O cálculo usa precisão decimal; as telas arredondam para duas casas |
| Soma das cotas diferente de 100% | O banco de dados recusa o rateio |
| Despesa prevista com data já passada | Continua prevista e fora do cálculo até ser editada para paga |

---

## 16. Para quem quiser conferir: o motor completo

As fórmulas abaixo são exatamente as usadas pelo código em `src/core/`.

**Converter valores:**

```
unidades = valor em reais ÷ índice(data do lançamento)
valor em reais hoje = unidades × índice(hoje)
```

**Calcular o saldo:**

```
U_total = soma das despesas pagas em unidades

compromisso(i) = cota(i) × U_total

pago_efetivo(i) = despesas que i pagou
                + reembolsos que i pagou
                − reembolsos que i recebeu

excesso(i) = max(0, pago_efetivo(i) − compromisso(i))
déficit(i)  = max(0, compromisso(i) − pago_efetivo(i))

deve(i→j) = déficit(i) × excesso(j) ÷ soma dos excessos

saldo_unidades(i) = soma de deve(i→j) − soma de deve(j→i)
saldo_reais(i)    = saldo_unidades(i) × índice(hoje)
```

**Construir o índice:**

```
índice(01 do mês seguinte) = índice(01 do mês) × (1 + taxa do mês ÷ 100)

índice(dia d do mês M) =
  índice(01/M) × (1 + taxa(M) ÷ 100) ^ ((d − 1) ÷ dias do mês)
```

**Invariantes:**

```
soma dos excessos = soma dos déficits
soma dos saldos   = 0
```

---

## 17. Onde ver esses números no app

- **Extrato do rateio**: mostra o valor original de cada despesa, o badge
  “Paga” ou “prevista” e, quando o IPCA está ligado, um link
  “IPCA +x,xx%”. Esse link abre o modal de correção: se a despesa foi
  **quitada**, ele congela a tabela na data da quitação (badge “quitada”);
  se ainda está **em aberto**, mostra o resíduo pendente (o que falta de
  fato), que continua sendo corrigido até a quitação.
- **Aba Saldos**: mostra “Seu saldo”, o valor de cada participante, o badge
  “deve”, “a receber” ou “Quitado” e, em cada cartão, para quem a pessoa deve.
- **Memória de Cálculo**: mostra `U_total`, o compromisso, o pago efetivo, o
  excesso, o déficit, o saldo líquido por participante e a correção IPCA de
  cada despesa. O link fica em “Ver memória de cálculo”, dentro do rateio.
  A linha `U_total` é exibida em reais, embora o valor interno esteja em
  unidades; é só uma conversão para leitura.
- **Configurações → Índice IPCA**: mostra a série importada do Banco Central,
  com gráfico e tabela de taxas.

---

## 18. Referências técnicas

- [`src/core/saldo.ts`](https://github.com/lucasmm96/rateio/blob/master/src/core/saldo.ts) — algoritmo completo do saldo.
- [`src/core/unidades.ts`](https://github.com/lucasmm96/rateio/blob/master/src/core/unidades.ts) — conversão entre reais e
  unidades.
- [`src/core/indice.ts`](https://github.com/lucasmm96/rateio/blob/master/src/core/indice.ts) — construção do índice IPCA e
  rateio diário.
- [`src/core/correcao.ts`](https://github.com/lucasmm96/rateio/blob/master/src/core/correcao.ts) — rastro mês a mês da
  correção de uma despesa.
- [`src/routes/MemoriaCalculo.tsx`](https://github.com/lucasmm96/rateio/blob/master/src/routes/MemoriaCalculo.tsx) — tela da
  memória de cálculo.
- [`.ai/context/financial-model.md`](https://github.com/lucasmm96/rateio/blob/master/.ai/context/financial-model.md) —
  documentação técnica completa, com os mesmos conceitos em notação formal.
