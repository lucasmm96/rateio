# Tasks: Transparência IPCA com Gráfico e Filtros

**Input**: Design documents from `specs/007-transparencia-ipca/`

**Prerequisites**: plan.md, spec.md

**Organization**: Tasks agrupadas por componente (gráfico, tabela, filtros, link).

---

## Phase 1: Setup e Carregamento de Dados

**Purpose**: Preparar estado e busca de dados — bloqueante para tudo mais.

- [ ] T001 Em `src/routes/Configuracoes.tsx`, adicionar no bloco `!rateioId`:
  - `useAsync(() => listarTaxasIpca(), [])` para buscar todas as taxas
  - Estado local: `dataInicio` (hoje - 24 meses) e `dataFim` (hoje)
  - Função helper `filtrarTaxasPorIntervalo(taxas, dataInicio, dataFim): TaxaIpca[]`

**Checkpoint**: Taxas carregadas; estado de datas inicializado com padrão de 24 meses.

---

## Phase 2: User Story 1 — Gráfico com Tooltip

**Purpose**: Renderizar gráfico de série histórica do índice acumulado.

- [ ] T002 Criar ou reutilizar component gráfico. Opções:
  - Se Recharts está no package.json: usar `<ResponsiveContainer><LineChart>` com eixo X (mês) e Y (índice acumulado)
  - Senão: criar SVG customizado com `<line>` e `<circle>` para pontos
  - Adicionar tooltip ao hover com formato: "[Mês]: Índice = X.XX, Taxa = Y.YY%"

- [ ] T003 Calcular dados do gráfico:
  - Para cada mês filtrado, chamar `indiceEmData(taxas, mes)` — retorna índice acumulado
  - Armazenar array `graficoDados = [{mes, indice, taxa}]` para plotar

- [ ] T004 Renderizar o gráfico usando `graficoDados`. Loading: skeleton enquanto `taxas` é buscado.

**Checkpoint**: Gráfico aparece com série completa dos últimos 24 meses; tooltip funciona.

---

## Phase 3: User Story 2 — Tabela de Taxas com Ordenação

**Purpose**: Renderizar tabela com colunas: Mês, Taxa (%), Índice acumulado, Variação (%).

- [ ] T005 Criar estrutura da tabela com headers clicáveis para ordenação:
  - Colunas: "Mês", "Taxa (%)", "Índice acumulado", "Variação (%)"
  - Estado: `sortBy` (coluna) + `sortDir` (asc/desc)
  - Ao clicar header: toggle asc/desc para aquela coluna

- [ ] T006 Calcular variação mensal: `(taxa_n / taxa_n-1 - 1) * 100`. Para o primeiro mês, deixar vazio ou "—".

- [ ] T007 Renderizar linhas da tabela:
  - Filtrar por intervalo `[dataInicio, dataFim]`
  - Ordenar conforme `sortBy` + `sortDir`
  - Formatar: data como "mês/2026", taxa e variação com 2 decimais + "%", índice com 2 decimais

**Checkpoint**: Tabela aparece com dados corretos; clique em header reordena; variação é calculada.

---

## Phase 4: Filtro de Datas

**Purpose**: Adicionar campos De/Até e recarregar gráfico + tabela.

- [ ] T008 Adicionar acima do gráfico: inputs de data (date picker ou manual "YYYY-MM-DD") com labels "De" e "Até".

- [ ] T009 Adicionar validação: se `dataInicio > dataFim`, exibir erro inline sem recarregar (manter valores anteriores). Botão "Aplicar" ou onChange automático.

- [ ] T010 Ao mudar intervalo: refiltar `taxas` → atualizar `graficoDados` + reordena a tabela. Revalidar `sortBy` (se a coluna ativa mudou).

**Checkpoint**: Mudar De/Até recarrega gráfico e tabela em < 1s. Validação previne estados inválidos.

---

## Phase 5: User Story 3 — Link para Fonte Oficial

**Purpose**: Exibir link BCB SGS 433.

- [ ] T011 Adicionar rodapé na seção IPCA: "Fonte: Banco Central do Brasil — Série 433" com link (`<a href="..." target="_blank">`).

- [ ] T012 Link: https://www3.bcb.gov.br/sgspub/localizarseries/localizar.jsp?measure=612&serie=433

**Checkpoint**: Link aparece e abre a página do BCB em aba nova.

---

## Phase 6: Estado Vazio e Erros

**Purpose**: Tratar ausência de dados e falhas.

- [ ] T013 Se `taxas.length === 0`: exibir "Nenhuma taxa disponível — verifique o workflow ipca.yml no GitHub Actions" + link para BCB. Gráfico e tabela não renderizados.

- [ ] T014 Se fetch falhar: exibir erro com botão retry; permitir rolar de volta ao estado anterior.

- [ ] T015 Validação de intervalo: se `dataInicio > dataFim`, mensagem de erro + rejeitar mudança.

**Checkpoint**: App não quebra com dados vazios; usuário recebe mensagem clara.

---

## Phase 7: Polish e Validação

- [ ] T016 [P] Verificar formatação de datas: usar `Intl.DateTimeFormat` com `{ month: 'short', year: 'numeric' }` consistente com o app.
- [ ] T017 [P] Verificar formatação de taxas: `taxa` é decimal (ex.: 0.33) — exibir como "0,33%". Testar valor real no DB.
- [ ] T018 [P] Testar no browser: acessar `/config` sem rateio → seção aparece; com `?rateio=<id>` → seção NÃO aparece.
- [ ] T019 [P] Testar filtro: mudar De/Até → gráfico e tabela recarregam; ordenação mantém-se.
- [ ] T020 [P] Testar tooltip: hover no gráfico → informações aparecem; sai do hover → desaparece.
- [ ] T021 [P] Testar edge cases: intervalo com 1 mês, com 100 meses, com mês futuro.
- [ ] T022 [P] Rodar `npm run test:coverage` — thresholds 90% mantidos.
- [ ] T023 Atualizar `.ai/planning/STATUS.md`: D-009 → ✅ com data

---

## Dependencies & Execution Order

### Dependências internas

- T001 (setup de dados) → T002–T004 (gráfico), T005–T007 (tabela) — paralelos
- T008–T010 (filtro): depende de T002 + T005 (usar dados filtrados)
- T011–T012 (link): independente
- T013–T015 (erros): após T001–T010
- T016–T022 (polish): últimos

---

## Notes

- Não criar nova rota — seção adicionada em `Configuracoes.tsx` bloco `!rateioId`
- `indiceEmData(taxas, mes)` pode lançar erro se `taxas` vazia — proteger com guard
- `taxas_ipca.taxa`: verificar schema Drizzle — é `0.33` (percentual) ou `0.0033` (decimal puro)?
- Biblioteca gráfico: verificar se Recharts já está em `package.json`. Se não, use SVG customizado ou instale Recharts
- Padrão de intervalo: `hoje - 24 meses` até `hoje`. Se série < 24 meses, usar toda a série.
- Cache: taxas mudam 1x/mês; reutilizar `listarTaxasIpca()` sem necessidade de cache local
- Ícone sugerido: `trending_up` para a seção; `calendar` para os date pickers
- Tokens de design: `bg-surface-container`, `text-on-surface`, `text-on-surface-variant`, `border-outline-variant`, `hover:bg-surface-variant`
- Após cada push: `gh run list --limit 5`
