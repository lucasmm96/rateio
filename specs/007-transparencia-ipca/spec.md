# Feature Specification: Transparência IPCA com Gráfico e Filtros

**Feature Branch**: `007-transparencia-ipca`

**Created**: 2026-11-01

**Status**: Draft

**Input**: D-009 — Dashboard IPCA em Configurações Globais (`/config`) com taxas históricas, gráfico da série acumulada, filtro de datas e link para fonte oficial (BCB SGS 433).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver Gráfico Histórico do Índice IPCA (Priority: P1)

Um usuário autenticado acessa `/config` (visão global, sem rateio específico) e encontra uma seção "IPCA" com um gráfico de linha mostrando a série histórica do índice acumulado. O gráfico mostra meses no eixo X e valores de índice (ou percentual acumulado) no eixo Y. O usuário pode selecionar um intervalo de datas (data inicial e data final) para filtrar a série exibida no gráfico.

**Why this priority**: Visualizar a série histórica permite que o usuário entenda o padrão de inflação ao longo do tempo e conheça o impacto da correção IPCA nos seus rateios.

**Independent Test**: Acessar `/config` sem `?rateio=`, verificar que o gráfico aparece com série completa; mudar o intervalo de datas e verificar que o gráfico recarrega refletindo apenas os meses no intervalo.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado em `/config`, **When** não há parâmetro `?rateio=` na URL, **Then** vê uma seção "IPCA" com gráfico da série histórica do índice acumulado.
2. **Given** taxas disponíveis no banco, **When** o gráfico é renderizado, **Then** exibe no mínimo os últimos 24 meses (ou toda a série se < 24 meses disponíveis).
3. **Given** campos de data "De" e "Até", **When** o usuário muda o intervalo e a seção recarrega, **Then** o gráfico reflete apenas os meses no intervalo selecionado.
4. **Given** o gráfico carregado, **When** o usuário posiciona o cursor sobre um ponto, **Then** aparece tooltip com mês, taxa mensal (%) e índice acumulado.
5. **Given** nenhuma taxa no banco, **When** a seção IPCA é carregada, **Then** exibe mensagem "Nenhuma taxa disponível" + link para [BCB SGS 433](https://www3.bcb.gov.br/sgspub/localizarseries/localizar.jsp?measure=612&serie=433).

---

### User Story 2 - Visualizar Tabela de Taxas Mensais Filtradas (Priority: P2)

Abaixo do gráfico, o usuário vê uma tabela com as taxas mensais do intervalo selecionado. Cada linha mostra: mês, taxa mensal (%), índice acumulado até aquele mês, variação em relação ao mês anterior.

**Why this priority**: Alguns usuários preferem dados tabulares para análise detalhada; a tabela complementa o gráfico e facilita auditar valores específicos.

**Independent Test**: Verificar que os valores da tabela batem com os dados plotados no gráfico; verificar que filtro de datas atualiza ambos (gráfico e tabela) sincronamente.

**Acceptance Scenarios**:

1. **Given** gráfico carregado com intervalo selecionado, **When** o usuário rola para baixo, **Then** vê tabela com colunas: "Mês", "Taxa (%)", "Índice acumulado", "Variação (%)".
2. **Given** tabela exibida, **When** o usuário altera o intervalo de datas, **Then** a tabela é recarregada refletindo apenas os meses no novo intervalo.
3. **Given** múltiplos meses na tabela, **When** o usuário clica no header de uma coluna, **Then** a tabela ordena por essa coluna (ascending/descending toggle).

---

### User Story 3 - Verificar Fonte Oficial (Priority: P2)

Na seção IPCA, o usuário vê um indicador "Dados do BCB — Série 433" com um link para a página oficial do [Banco Central do Brasil (SGS 433)](https://www3.bcb.gov.br/sgspub/localizarseries/localizar.jsp?measure=612&serie=433). Isso permite verificar a autenticidade dos dados exibidos.

**Why this priority**: Transparência — usuários precisam saber de onde vêm os dados e ter acesso à fonte oficial para auditar.

**Independent Test**: Verificar que o link aponta para a URL correta do BCB; clicar nele abre a página em aba nova.

**Acceptance Scenarios**:

1. **Given** a seção IPCA carregada, **When** o usuário vê o rodapé, **Then** exibe "Fonte: BCB — Série 433" com link clicável.
2. **Given** o link, **When** o usuário clica, **Then** abre https://www3.bcb.gov.br/sgspub/localizarseries/localizar.jsp?measure=612&serie=433 em aba nova (target="_blank").

---

### Edge Cases

- Nenhuma taxa IPCA no banco: mensagem com link para BCB SGS 433 + instrução "Atualize via workflow GitHub Actions ou consulte o Banco Central".
- Somente 1 ou 2 meses de dados: exibir os disponíveis no gráfico e tabela sem erro.
- Taxa futura parcialmente publicada: excluir meses > hoje da exibição; avisar "Série até [último mês completo]".
- Carregamento lento: skeleton no gráfico e tabela.
- Intervalo inválido (data_de > data_ate): rejeitar com mensagem de erro; voltar ao intervalo anterior.
- Gráfico com muitos pontos (série longa): usar zoom automático ou paginação na tabela (mostrar primeiros 50, botão "Carregar mais").
- A seção IPCA aparece mesmo quando um rateio NÃO usa correção (`corrigir_ipca=false`) — é informação global, não específica do rateio.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A seção IPCA DEVE aparecer na tela `/config` quando acessada sem o parâmetro `?rateio=` (visão global).
- **FR-002**: A seção DEVE exibir um gráfico de linha com série histórica do índice acumulado. Eixo X: meses. Eixo Y: índice ou percentual acumulado.
- **FR-003**: O gráfico DEVE permitir filtro de datas: campos "De" e "Até" (data picker). Padrão: últimos 24 meses ou toda a série se < 24 meses.
- **FR-004**: O gráfico DEVE ter tooltip ao passar o cursor: exibe mês, taxa mensal (%), índice acumulado.
- **FR-005**: Abaixo do gráfico, exibir tabela com colunas: Mês, Taxa (%), Índice acumulado, Variação (%). Dados refletem o intervalo selecionado.
- **FR-006**: A tabela DEVE permitir ordenação por clique no header (ascending/descending toggle).
- **FR-007**: Mostrar "Fonte: BCB — Série 433" com link para https://www3.bcb.gov.br/sgspub/localizarseries/localizar.jsp?measure=612&serie=433 (abre em aba nova).
- **FR-008**: Se não houver taxas no banco, exibir mensagem explicativa com link para BCB.
- **FR-009**: Exibir estado de loading (skeleton) no gráfico e tabela enquanto dados são buscados.
- **FR-010**: Intervalo inválido (De > Até): rejeitar com mensagem; voltar ao intervalo anterior.

### Key Entities

- **Taxa IPCA**: registro da tabela `taxas_ipca` com `mes` (YYYY-MM-DD) e `taxa` (percentual mensal).
- **Série acumulada**: índice derivado pelo produto das taxas, calculado via `indiceEmData()` de `src/core/indice.ts`.
- **Intervalo de filtro**: (data_de, data_ate); padrão: (hoje - 24 meses, hoje).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário consegue visualizar a série histórica completa do IPCA em menos de 3 segundos.
- **SC-002**: O filtro de datas (De/Até) recarrega o gráfico e tabela em menos de 1 segundo (dados em cache ou query otimizada).
- **SC-003**: 100% dos valores no gráfico e tabela são matematicamente idênticos aos usados em `calcularSaldo()`.
- **SC-004**: O link para BCB SGS 433 funciona e aponta para a página oficial (status 200).
- **SC-005**: Tooltip no gráfico aparece ao passar cursor e desaparece ao sair (UX fluida).

## Assumptions

- A seção IPCA aparece sempre em `/config` sem `?rateio=`, independentemente de o usuário ter rateios com IPCA ligado ou desligado.
- A rota `/config` (sem parâmetro) já renderiza uma área de configurações globais (tema, etc.) — a seção IPCA é adicionada como nova seção nessa área.
- Padrão de intervalo: últimos 24 meses. Se série tiver < 24 meses, exibir toda a série.
- A série BCB 433 é a única série em uso; não é necessário suportar seleção de série na UI.
- Não há botão de "Atualizar agora" — atualização ocorre via workflow `ipca.yml` no GitHub Actions.
- Biblioteca de gráficos sugerida: Recharts (já pode estar no projeto) ou D3.js. Se nenhuma, usar SVG nativo com `<line>` e `<circle>`.
- Dados em cache: taxas mudam 1x/mês; reutilizar resultado de `listarTaxasIpca()` por 1 hora com cache local (localStorage) ou sem cache se o projeto não usar.
