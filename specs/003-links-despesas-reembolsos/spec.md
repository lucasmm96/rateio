# Feature Specification: Links em Despesas e Reembolsos

**Feature Branch**: `003-links-despesas-reembolsos`

**Created**: 2026-10-27

**Status**: Draft

**Input**: D-005 — Links ilimitados por despesa/reembolso via tabela auxiliar `links`; campos `boleto_url` e `comprovante_url` substituídos (migração obrigatória).

## Contexto

Atualmente, cada despesa pode ter no máximo dois links fixos: `boleto_url` e `comprovante_url`. Reembolsos não têm nenhum campo de link. A decisão D-003 estabelece que links devem ser ilimitados e gerenciados numa tabela auxiliar `links`, substituindo os campos fixos. A migração é obrigatória: os dados existentes em `boleto_url` e `comprovante_url` devem ser movidos para a nova tabela antes de os campos serem removidos.

## Regras de Negócio

- Cada despesa ou reembolso pode ter zero ou mais links.
- Cada link tem: URL (obrigatória) e rótulo/descrição (opcional).
- Links de despesas e reembolsos compartilham a mesma tabela auxiliar, discriminados por `entidade_tipo` (`'despesa'` ou `'reembolso'`) e `entidade_id`.
- Ao excluir uma despesa ou reembolso, todos os seus links são excluídos em cascata.
- Não há limite de links por lançamento.

## Migração de dados

### Aplicar (forward)

1. Criar tabela `links` com colunas: `id` (UUID PK), `entidade_tipo` (text, CHECK `'despesa'` ou `'reembolso'`), `entidade_id` (UUID NOT NULL), `url` (text NOT NULL), `rotulo` (text), `criado_em` (timestamptz NOT NULL DEFAULT now()).
2. Inserir na tabela `links` todos os registros de `despesas` onde `boleto_url IS NOT NULL`, com `entidade_tipo = 'despesa'` e `rotulo = 'Boleto'`.
3. Inserir na tabela `links` todos os registros de `despesas` onde `comprovante_url IS NOT NULL`, com `entidade_tipo = 'despesa'` e `rotulo = 'Comprovante'`.
4. Remover colunas `boleto_url` e `comprovante_url` de `despesas`.

### Rollback (reverse)

1. Recriar colunas `boleto_url text` e `comprovante_url text` em `despesas`.
2. Para cada despesa, copiar o primeiro link com `rotulo = 'Boleto'` (ou qualquer link sem rótulo correspondente) de volta para `boleto_url`; copiar o primeiro link com `rotulo = 'Comprovante'` para `comprovante_url`. Links adicionais são perdidos no rollback — comportamento aceitável e documentado.
3. Remover tabela `links`.

**Nota de rollback**: O rollback descarta links além dos dois primeiros por despesa. Nenhum link de reembolso é recuperável após rollback. O rollback deve ser executado apenas em ambiente de desenvolvimento ou antes de qualquer dado de produção ser inserido na nova estrutura.

## User Scenarios & Testing

### User Story 1 — Adicionar link a uma despesa (P1)

O usuário abre uma despesa existente e adiciona um ou mais links (boleto, comprovante, nota fiscal, etc.) com URL e rótulo opcional.

**Why this priority**: É a ação principal da feature; sem ela, nenhum valor é entregue.

**Independent Test**: Abrir uma despesa, adicionar dois links com URLs e rótulos distintos, salvar e verificar que ambos aparecem listados na despesa.

**Acceptance Scenarios**:

1. **Given** o usuário está na tela de uma despesa,
   **When** insere uma URL válida e clica em "Adicionar link",
   **Then** o link aparece na lista de links da despesa imediatamente.

2. **Given** o usuário inseriu URL e rótulo,
   **When** salva e reabre a despesa,
   **Then** o link persiste com a URL e o rótulo corretos.

3. **Given** o usuário insere uma URL inválida (sem esquema http/https),
   **When** tenta adicionar,
   **Then** o sistema exibe mensagem de validação e não salva o link.

---

### User Story 2 — Remover link de uma despesa (P1)

O usuário remove um link específico de uma despesa sem afetar os demais links.

**Why this priority**: Complemento indispensável de adicionar — sem remoção, erros não têm correção.

**Independent Test**: Despesa com dois links. Remover um. Verificar que apenas o outro permanece.

**Acceptance Scenarios**:

1. **Given** uma despesa com dois links,
   **When** o usuário clica em remover no segundo link e confirma,
   **Then** apenas o primeiro link permanece na lista.

2. **Given** uma despesa com um único link,
   **When** o usuário remove o link,
   **Then** a seção de links fica vazia (sem links); a despesa continua existindo.

---

### User Story 3 — Adicionar link a um reembolso (P2)

O usuário adiciona um ou mais links a um reembolso (comprovante de transferência, recibo, etc.).

**Why this priority**: Reembolsos atualmente não têm nenhum campo de link; a feature estende o mesmo mecanismo para eles.

**Independent Test**: Abrir um reembolso, adicionar um link, salvar e verificar que aparece listado.

**Acceptance Scenarios**:

1. **Given** o usuário está na tela de um reembolso,
   **When** adiciona um link com URL válida,
   **Then** o link aparece na lista de links do reembolso após salvar.

---

### User Story 4 — Visualizar links de um lançamento (P2)

O usuário vê a lista de links de uma despesa ou reembolso, podendo clicar em cada link para abri-lo.

**Why this priority**: Links são inúteis se não são exibidos e clicáveis.

**Independent Test**: Despesa com dois links. Verificar que ambos aparecem, com rótulo (se houver) e URL clicável que abre em nova aba.

**Acceptance Scenarios**:

1. **Given** uma despesa com dois links,
   **When** o usuário abre a tela da despesa,
   **Then** ambos os links aparecem listados com rótulo e URL.

2. **Given** um link na lista,
   **When** o usuário clica na URL,
   **Then** a URL abre em nova aba do navegador.

3. **Given** uma despesa sem links,
   **When** o usuário abre a tela,
   **Then** a seção de links aparece vazia ou com mensagem "Nenhum link adicionado".

---

### User Story 5 — Migração transparente de dados existentes (P1)

Os links existentes em `boleto_url` e `comprovante_url` das despesas são preservados após a migração, sem perda de dados e sem ação manual do usuário.

**Why this priority**: Migração incorreta destrói dados existentes; deve ser validada antes do deploy.

**Independent Test**: Antes da migração, registrar despesas com `boleto_url` e `comprovante_url` preenchidos. Após a migração, verificar que cada despesa tem os links correspondentes na nova tabela com os rótulos "Boleto" e "Comprovante".

**Acceptance Scenarios**:

1. **Given** existem despesas com `boleto_url` preenchida,
   **When** a migração é aplicada,
   **Then** cada despesa tem um link com a URL original e rótulo "Boleto".

2. **Given** existem despesas com `comprovante_url` preenchida,
   **When** a migração é aplicada,
   **Then** cada despesa tem um link com a URL original e rótulo "Comprovante".

3. **Given** uma despesa com ambos `boleto_url` e `comprovante_url` preenchidos,
   **When** a migração é aplicada,
   **Then** a despesa tem exatamente dois links, um de cada tipo.

4. **Given** a migração é aplicada,
   **When** o schema é verificado,
   **Then** as colunas `boleto_url` e `comprovante_url` não existem mais em `despesas`.

---

### Edge Cases

- O que acontece se a URL tiver mais de 2048 caracteres?
- O que acontece se dois links da mesma despesa tiverem a mesma URL?
- O que acontece se o usuário tentar adicionar um link enquanto a requisição de salvar anterior ainda está em andamento?
- O que acontece ao excluir uma despesa que tem links — os links são excluídos junto?
- O rollback descarta links além dos dois primeiros por despesa; isso deve estar documentado no procedimento de rollback.
- O que acontece se `boleto_url` e `comprovante_url` contiverem a mesma URL na mesma despesa?

## Requirements

### Functional Requirements

- **FR-001**: O sistema DEVE permitir adicionar zero ou mais links a qualquer despesa ou reembolso.
- **FR-002**: Cada link DEVE ter uma URL (obrigatória, válida) e um rótulo (opcional, texto livre).
- **FR-003**: O sistema DEVE exibir todos os links de um lançamento como lista, com URL clicável e rótulo.
- **FR-004**: O sistema DEVE permitir remover qualquer link individualmente, sem afetar os demais.
- **FR-005**: Ao excluir uma despesa ou reembolso, todos os seus links DEVEM ser excluídos em cascata.
- **FR-006**: A migração DEVE mover `boleto_url` → link com rótulo "Boleto" e `comprovante_url` → link com rótulo "Comprovante" para cada despesa onde esses campos não são nulos.
- **FR-007**: Após a migração, as colunas `boleto_url` e `comprovante_url` NÃO DEVEM existir no schema.
- **FR-008**: O sistema DEVE validar o formato da URL antes de salvar (mínimo: presença de esquema `http://` ou `https://`).
- **FR-009**: URLs DEVEM abrir em nova aba ao serem clicadas.
- **FR-010**: O plano de rollback DEVE ser documentado e testável em ambiente de desenvolvimento antes do deploy.

### Key Entities

- **Link**: associação entre um lançamento (despesa ou reembolso) e uma URL. Atributos: id, tipo de entidade, id da entidade, URL, rótulo (opcional), data de criação.
- **Despesa**: lançamento de saída. Passa a ter zero ou mais links (em vez de dois campos fixos).
- **Reembolso**: lançamento de transferência entre participantes. Passa a ter zero ou mais links.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% dos links existentes em `boleto_url` e `comprovante_url` antes da migração estão acessíveis na nova estrutura após a migração, sem perda de URL.
- **SC-002**: Usuário consegue adicionar, visualizar e remover links de uma despesa em menos de 30 segundos por operação.
- **SC-003**: Nenhuma despesa ou reembolso perde dados de links após o deploy em produção (verificado por contagem pré/pós migração).
- **SC-004**: 100% das URLs inválidas são rejeitadas com mensagem visível antes de chegar ao servidor.
- **SC-005**: Excluir uma despesa com links não deixa registros órfãos na tabela `links`.

## Assumptions

- URLs são livres de conteúdo — o sistema não valida o destino, apenas o formato.
- Rótulos são texto livre sem restrição de conteúdo; não há lista predefinida de tipos.
- A migração é irreversível em produção — o rollback é documentado para uso emergencial em desenvolvimento.
- Não há limite de tamanho de URL imposto pela feature (o banco aceitará até o máximo da coluna `text`).
- A UI de adição de links é parte do formulário de edição da despesa/reembolso existente — não é uma tela separada.
- RLS da tabela `links` seguirá o mesmo padrão de acesso que a entidade pai: apenas membros do rateio podem ler/escrever links de suas despesas/reembolsos.
