# Feature Specification: Editar Lançamentos e Auditoria

**Feature Branch**: `004-editar-lancamentos-auditoria`

**Created**: 2026-10-27

**Status**: Draft

**Input**: Editar lançamentos e auditoria de alterações (D-006).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Editar Despesa (Priority: P1)

Um membro do rateio abre uma despesa lançada anteriormente, corrige um ou mais campos (data, descrição, pagador ou valor) e salva. O saldo de todos os participantes é recalculado automaticamente com os novos dados.

**Why this priority**: Erros de digitação em despesas são a principal causa de saldo incorreto. Sem edição, o único recurso é excluir e relançar, perdendo o histórico.

**Independent Test**: Pode ser testado completamente editando uma despesa existente e verificando que os campos persistem e o saldo muda.

**Acceptance Scenarios**:

1. **Given** uma despesa existente no rateio, **When** um membro altera a descrição e salva, **Then** a nova descrição aparece na lista de despesas.
2. **Given** uma despesa com valor R$ 100, **When** um membro altera o valor para R$ 200 e salva, **Then** o saldo dos participantes é recalculado com o novo valor.
3. **Given** uma despesa com `data ≤ hoje` (paga), **When** um membro altera a data para um mês futuro, **Then** a despesa passa a ser tratada como prevista nos cálculos de saldo.
4. **Given** um usuário fora do rateio, **When** tenta editar uma despesa, **Then** a operação é rejeitada.

---

### User Story 2 - Editar Reembolso (Priority: P2)

Um membro do rateio abre um reembolso registrado e corrige campos (data, pagador, recebedor, valor ou observação). O saldo é recalculado.

**Why this priority**: Erros em reembolsos geram distorções no saldo assim como erros em despesas, mas são menos frequentes.

**Independent Test**: Pode ser testado editando um reembolso e verificando que os campos e o saldo são atualizados corretamente.

**Acceptance Scenarios**:

1. **Given** um reembolso existente, **When** um membro altera o valor e salva, **Then** o saldo é recalculado com o novo valor.
2. **Given** um reembolso com pagador A e recebedor B, **When** um membro inverte os campos (pagador B, recebedor A) e salva, **Then** o fluxo de crédito é invertido no saldo.
3. **Given** um reembolso com observação vazia, **When** um membro adiciona uma observação e salva, **Then** a observação aparece no detalhe do reembolso.

---

### User Story 3 - Ver Histórico de Auditoria por Lançamento (Priority: P3)

Um membro abre um lançamento (despesa ou reembolso) e visualiza o histórico de alterações: quem modificou, quando e quais campos mudaram (valor anterior vs. novo).

**Why this priority**: Transparência e rastreabilidade são secundárias à edição em si, mas essenciais para resolver disputas entre participantes.

**Independent Test**: Pode ser testado verificando que após uma edição o histórico exibe a alteração com os dados corretos.

**Acceptance Scenarios**:

1. **Given** uma despesa que nunca foi editada, **When** um membro abre o histórico, **Then** o histórico aparece vazio ou indica "sem alterações".
2. **Given** uma despesa editada duas vezes, **When** um membro abre o histórico, **Then** vê duas entradas em ordem cronológica decrescente (mais recente primeiro), cada uma com: ator, data/hora e campos alterados.
3. **Given** uma entrada de auditoria, **When** o membro a expande, **Then** vê o valor anterior e o novo valor para cada campo que mudou.
4. **Given** um usuário fora do rateio, **When** tenta acessar o histórico de um lançamento, **Then** a operação é rejeitada.

---

### Edge Cases

- O que acontece quando dois membros editam o mesmo lançamento simultaneamente? A última edição persiste; ambas geram entrada de auditoria.
- O que acontece ao editar uma despesa prevista (data > hoje) para uma data passada? Ela passa a compor o saldo pago imediatamente.
- O que acontece se o novo valor for zero? A edição é rejeitada com mensagem de erro (valor deve ser positivo).
- O que acontece se pagador e recebedor forem o mesmo usuário num reembolso? A edição é rejeitada.
- Links do lançamento são editados pelo fluxo de D-005, não por este formulário.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir que membros do rateio editem os campos data, descrição, pagador e valor de uma despesa existente.
- **FR-002**: O sistema DEVE permitir que membros do rateio editem os campos data, pagador, recebedor, valor e observação de um reembolso existente.
- **FR-003**: Os campos `id`, `rateio_id` e `criado_em` de qualquer lançamento NÃO DEVEM ser editáveis.
- **FR-004**: Toda edição bem-sucedida DEVE gerar imediatamente um registro de auditoria identificando: lançamento afetado, usuário que editou, data/hora e diferença campo a campo (valor anterior e novo).
- **FR-005**: O registro de auditoria DEVE conter exatamente os campos que mudaram, omitindo campos não alterados.
- **FR-006**: Somente membros do rateio DEVEM conseguir editar lançamentos daquele rateio.
- **FR-007**: Somente membros do rateio DEVEM conseguir consultar o histórico de auditoria dos lançamentos daquele rateio.
- **FR-008**: A UI DEVE exibir o histórico de auditoria de um lançamento sem exigir navegação para outra tela (painel colapsável ou modal).
- **FR-009**: O histórico DEVE mostrar as entradas em ordem cronológica decrescente (alteração mais recente primeiro).
- **FR-010**: O valor de um lançamento DEVE ser maior que zero; edições com valor ≤ 0 são rejeitadas.
- **FR-011**: Em um reembolso, pagador e recebedor DEVEM ser usuários distintos; edições que violem isso são rejeitadas.
- **FR-012**: Links de um lançamento são gerenciados pelo fluxo de D-005 (tabela `links`) e NÃO fazem parte do formulário de edição deste recurso.

### Key Entities

- **Despesa**: lançamento de gasto pago por um membro em nome do rateio. Campos editáveis: data, descrição, pagador, valor.
- **Reembolso**: lançamento de transferência de crédito entre dois membros. Campos editáveis: data, pagador, recebedor, valor, observação.
- **Registro de auditoria**: evento imutável que documenta uma alteração em um lançamento. Atributos: lançamento afetado, tipo do lançamento, ator, ação, diferença de campos, data/hora.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um membro consegue editar e salvar um lançamento em menos de 60 segundos a partir da abertura do formulário de edição.
- **SC-002**: 100% das edições bem-sucedidas geram um registro de auditoria completo e correto (sem edição sem log).
- **SC-003**: O histórico de um lançamento é acessível com no máximo um clique a partir da tela do lançamento.
- **SC-004**: Usuários fora do rateio não conseguem editar nem visualizar auditoria de nenhum lançamento daquele rateio (0% de vazamento de dados).
- **SC-005**: O histórico exibe corretamente o valor anterior e o novo para cada campo alterado em 100% das entradas.

## Assumptions

- Exclusão de lançamentos está fora do escopo desta feature; o campo `acao` na auditoria prevê `delete` para uso futuro.
- A edição de links (URLs anexadas a despesas/reembolsos) já é coberta por D-005 e não precisa de formulário próprio aqui.
- Um lançamento só pode ser editado por membros ativos do rateio; não há papel de "admin" separado nesta versão.
- Edição em lote (múltiplos lançamentos de uma vez) está fora do escopo.
- O histórico de auditoria é permanente e não pode ser apagado pelo usuário.
- A gravação da auditoria ocorre atomicamente com a edição (na mesma transação) para garantir consistência.
