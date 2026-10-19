# Clarificações — Controle de Rateios

*Gerado em 2026-10-19 pelo speckit-clarify (execução manual baseada em .ai/spec.md e .ai/handoffs/HANDOFF_INICIAL.md)*

## Contexto

O spec em `.ai/spec.md` foi produzido a partir de um handoff detalhado (`.ai/handoffs/HANDOFF_INICIAL.md`) que fecha explicitamente todas as decisões de arquitetura e de domínio. A varredura de ambiguidades identificou 4 categorias com status **Parcial**; as clarificações abaixo foram extraídas diretamente do HANDOFF e incorporadas ao spec.

## Clarificações (Sessão 2026-10-19)

- Q: Quando um pagador tem cota 0 e paga uma despesa, como o excesso é calculado? → A: O excesso é simplesmente `pago_efetivo − compromisso = pago_efetivo − 0 = pago_efetivo`. Quem tem cota 0 não tem compromisso; tudo o que paga vira excesso. (HANDOFF §4.4)
- Q: Reembolsos feitos antes da data do pagamento original são permitidos? → A: Sim. Reembolsos são fatos com data própria; a data pode ser anterior à do pagamento. A correção usa o índice da data do reembolso. (HANDOFF §5)
- Q: A classificação paga/prevista de uma despesa é armazenada no banco? → A: Não. É derivada em runtime: `data <= hoje` → paga; `data > hoje` → prevista. Nenhuma coluna `situacao` no banco. (HANDOFF §3.1, §4.4)
- Q: Como lidar com o mês mais recente sem taxa seguinte publicada? → A: Sem interpolação. Para datas dentro do mês M sem taxa para M+1, `indice(d) = indice(01/M)` (ignora pro-rata). (HANDOFF §4.2)
- Q: O que acontece quando U_total muda por causa de uma despesa nova? → A: Compromissos e excessos são recalculados. Reembolsos já feitos permanecem como fatos. O app exibe toast "O total do rateio mudou. Os saldos internos foram recalculados." (HANDOFF §4.7)

## Sumário de Cobertura

| Categoria | Status |
|-----------|--------|
| Escopo Funcional | Resolvido |
| Modelo de Dados / Entidades | Resolvido |
| Fluxos de Interação / UX | Claro |
| Atributos Não-Funcionais | Resolvido |
| Integração e Dependências Externas | Resolvido |
| Casos de Borda e Tratamento de Falhas | Resolvido |
| Restrições e Tradeoffs | Claro |
| Terminologia | Claro |
| Sinais de Conclusão | Resolvido |

## Recomendação

Spec sem ambiguidades bloqueadoras. Prosseguir com `/speckit-plan`.
