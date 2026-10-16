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

## 4. Regras de cálculo
(ver HANDOFF.md seções 4.1 a 4.9)

Resumo da Forma B:
- `U_total = Σ valores pagos / índice da data` (em unidades).
- `compromisso_i = cota_i × U_total`.
- `pago_i` = o que `i` pagou (em unidades).
- Excesso de `i` = `max(0, pago_i − compromisso_i)`.
- Déficit de `i` = `max(0, compromisso_i − pago_i)`.
- O excesso de cada credor é rateado entre os devedores **proporcional
  ao déficit de cada um**.
- Reembolsos são fatos e abatem a dívida entre pares.

## 5. Validações
- Valor de despesa/reembolso > 0.
- Reembolso: pagador ≠ recebedor.
- Data de reembolso anterior à data do rateio: permitido (adiantamento).
- Data de despesa < data base da série: bloqueada com erro claro.
- Σ cota = 1 por rateio (trigger + app).
- Pagador de despesa e partes do reembolso ∈ membros do rateio.

## 6. Telas
(ver HANDOFF.md seção 7)

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