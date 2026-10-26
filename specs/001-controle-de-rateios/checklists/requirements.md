# Checklist de Requisitos — Controle de Rateios

*Gerado em 2026-10-19 pelo speckit-checklist (execução manual)*

## Módulo de Cálculo Puro

- [ ] `indiceEmData('2025-12-01', taxas)` retorna exatamente `1000`
- [ ] `indiceEmData('2026-01-01', taxas)` retorna `1003.3` (±0.0001)
- [ ] `indiceEmData('2026-08-01', taxas)` retorna `1037.7818...` (±0.0001)
- [ ] Pro-rata: `indiceEmData('2026-07-15', taxas)` > `indiceEmData('2026-07-01', taxas)` e < `indiceEmData('2026-08-01', taxas)`
- [ ] Último mês sem taxa seguinte: `indiceEmData('2026-08-10', taxas)` = `indiceEmData('2026-08-01', taxas)` (sem pro-rata)
- [ ] Data antes da série (`2025-11-30`): lança `Error` com mensagem clara
- [ ] `Σ excesso = Σ deficit` em todos os 37 casos de teste
- [ ] `Σ saldoUnidades = 0` em todos os 37 casos de teste
- [ ] 27 casos do piloto (`.ai/casos-de-teste.json`) passam
- [ ] 10 casos sintéticos (`.ai/casos-de-teste-n-pessoas.json`) passam
- [ ] Saldo em 2026-08-15 (piloto, cotas 0/1): entre R$ 707,00 e R$ 708,00
- [ ] `corrigir_ipca=false`: `indice` sempre 1, `unidades = valor nominal`
- [ ] Cota 0 + pagamento: excesso = valor pago inteiro
- [ ] Reembolso excessivo: inverte o saldo corretamente (caso n08)
- [ ] Mudança de U_total recalcula compromissos sem alterar reembolsos anteriores (caso n10)
- [ ] Nenhum uso de `number` nativo no caminho de cálculo (só `Decimal`)

## Banco de Dados e RLS

- [ ] Schema Drizzle versionado em `drizzle/migrations/`
- [ ] `Σ cota = 1` por rateio: trigger bloqueia inserção inválida
- [ ] `despesas.pagador_user_id` ∈ membros: trigger bloqueia inserção inválida
- [ ] `reembolsos.pagador ≠ recebedor`: CHECK constraint
- [ ] `reembolsos.pagador, recebedor` ∈ membros: trigger valida
- [ ] Usuário A não vê rateios de usuário B (RLS `rateios`)
- [ ] Usuário A não vê despesas de rateios que não participa (RLS `despesas`)
- [ ] `buscar_usuario_por_email` retorna `{id, email}` sem expor outros campos
- [ ] `criar_rateio` com Σ cota ≠ 1 lança exceção antes de inserir
- [ ] `criar_rateio` insere rateio + membros atomicamente
- [ ] `taxas_ipca`: leitura permitida a qualquer autenticado
- [ ] `taxas_ipca`: escrita bloqueada para `authenticated` (só `ipca_writer`)
- [ ] `config`: escrita bloqueada para `authenticated` (só service role)

## Autenticação

- [ ] Login com email cadastrado funciona
- [ ] Login com email não cadastrado é negado
- [ ] JWT expirado redireciona para `/login`
- [ ] Logout limpa sessão e redireciona para `/login`

## Telas e UX

- [ ] Badge "prevista" aparece quando `data > hoje`
- [ ] Badge "paga" aparece quando `data <= hoje` (derivado dinamicamente)
- [ ] Toast "saldos recalculados" aparece ao inserir nova despesa paga
- [ ] Formulário despesa: campo pagador mostra apenas membros do rateio
- [ ] Formulário reembolso: pagador ≠ recebedor (validação no client e no banco)
- [ ] Adicionar participante por email: mostra erro claro se email não cadastrado
- [ ] Dark mode funcional: toggle Claro / Escuro / Automático em Configurações
- [ ] Saldo positivo = deve; saldo negativo = tem a receber (exibição correta)
- [ ] Memória de cálculo mostra índices, fórmula, valor original e corrigido

## PWA e Deploy

- [ ] App instalável como PWA no Android/iOS
- [ ] Service worker serve shell da aplicação (CSS, JS, HTML)
- [ ] Service worker NÃO serve dados do banco (sem offline de dados)
- [ ] Base path `/rateio/` correto em produção (GitHub Pages)
- [ ] Hash routing funciona: F5 em qualquer rota não retorna 404
- [ ] Nenhuma connection string ou secret no bundle JS

## Workflows GitHub

- [ ] `smoke-bcb.yml`: passa se `api.bcb.gov.br` acessível
- [ ] `ipca.yml`: faz upsert idempotente (rodar 2× não duplica dados)
- [ ] `backup.yml`: artifact com `pg_dump` gerado toda semana
- [ ] README documenta que workflows são desativados após 60 dias sem atividade

## Migração da Planilha

- [ ] Rateio "Apartamento" criado via `criar_rateio` (cotas LUCAS=0, LETICIA=1)
- [ ] 27 despesas inseridas na ordem cronológica
- [ ] Reembolsos inseridos para as linhas com `data_reembolso` preenchida
- [ ] Saldo calculado após migração bate com intervalo R$ 707–R$ 708

## Qualidade de Código

- [ ] `tsc --noEmit` sem erros
- [ ] `npm run build` sem erros
- [ ] Todos os testes passam (`npm test`)
- [ ] Nenhuma cor hardcoded nos componentes (apenas tokens Tailwind)
- [ ] `darkMode: "class"` configurado no Tailwind
- [ ] Todas as tabelas têm RLS habilitada
