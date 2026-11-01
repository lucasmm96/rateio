# Feature Specification: Busca de Usuário por Prefixo de Email

**Feature Branch**: `008-busca-username`

**Created**: 2026-11-01

**Status**: Draft

**Input**: D-010 — Busca por usuário via prefixo do email (`LIKE 'prefix%'`). Sem campo username novo. Aceitar que usuários com prefixo em comum apareçam juntos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Buscar Usuário por Prefixo para Adicionar ao Rateio (Priority: P1)

Em Configurações de um rateio, o dono do rateio digita o início do email de um novo participante (ex.: "lu") e vê imediatamente uma lista de usuários cadastrados cujo email começa com esse prefixo. Ele clica no usuário correto para selecioná-lo e confirma a adição.

**Why this priority**: A busca atual exige digitar o email completo e correto. Com prefixo, o fluxo é mais ágil e tolerante a incertezas sobre o email exato do convidado.

**Independent Test**: Pode ser testado digitando um prefixo parcial em `/configuracoes?rateio=<id>`, verificando que a lista de candidatos aparece e que ao clicar em um usuário ele é adicionado ao rateio.

**Acceptance Scenarios**:

1. **Given** o dono do rateio digita ≥ 2 caracteres no campo de busca, **When** a busca é disparada, **Then** vê uma lista de usuários cujo email começa com o texto digitado.
2. **Given** múltiplos usuários com o mesmo prefixo, **When** a lista é exibida, **Then** todos aparecem e o dono seleciona o correto clicando nele.
3. **Given** nenhum usuário corresponde ao prefixo, **When** a busca retorna, **Then** exibe "Nenhum usuário encontrado".
4. **Given** o usuário clica em um candidato da lista, **When** confirma a adição, **Then** o fluxo de adição de membro segue normalmente (cotas, confirmação).
5. **Given** um usuário já é membro do rateio, **When** aparece na lista de busca, **Then** está marcado como "já membro" e não pode ser selecionado para adição duplicada.

---

### User Story 2 - Minimum Characters para Disparar Busca (Priority: P2)

O sistema só dispara a busca quando o usuário digitou ao menos 2 caracteres, evitando buscas amplas demais ou exposição desnecessária de usuários.

**Why this priority**: Busca com 0 ou 1 caractere retornaria uma fração grande da base de usuários, o que não é útil e pode ser um problema de privacidade.

**Independent Test**: Verificar que com 0 ou 1 caractere nenhuma busca é disparada; com 2+, a busca ocorre.

**Acceptance Scenarios**:

1. **Given** o usuário digita 1 caractere, **When** para de digitar, **Then** nenhuma busca é disparada e nenhuma lista aparece.
2. **Given** o usuário digita 2 ou mais caracteres, **When** para de digitar, **Then** a busca é disparada e a lista aparece.
3. **Given** o usuário apaga o campo para menos de 2 caracteres, **When** isso ocorre, **Then** a lista some e nenhuma busca é feita.

---

### Edge Cases

- Busca com mais de 50 caracteres: truncar ou rejeitar com mensagem (proteção contra payloads muito longos).
- Usuário tenta adicionar a si mesmo: bloqueado na UI (o próprio user já é membro).
- Resultado retorna mais de 10 usuários: exibir os primeiros 10 com aviso "Refine a busca para ver mais resultados".
- Latência alta: debounce de 300ms para não disparar a cada tecla; exibir spinner enquanto busca.
- Prefixo com caracteres especiais (ex.: `a+b`): a função DB usa `LIKE` com escape seguro para evitar SQL injection via pattern.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O campo de busca de membro em Configurações DEVE disparar busca por prefixo de email ao atingir ≥ 2 caracteres, com debounce de 300ms.
- **FR-002**: A busca DEVE usar uma função RPC `SECURITY DEFINER` no Postgres que executa `WHERE email LIKE p_prefixo || '%'` e retorna no máximo 10 resultados (campos `id` e `email`).
- **FR-003**: A lista de resultados DEVE exibir o email de cada candidato; usuários já membros do rateio DEVEM aparecer marcados e não selecionáveis.
- **FR-004**: O usuário DEVE selecionar um candidato da lista para prosseguir com a adição (em vez de confirmar o email completo como antes).
- **FR-005**: Se nenhum usuário for encontrado, DEVE exibir mensagem "Nenhum usuário encontrado. Ele precisa ter uma conta no Rateio."
- **FR-006**: A função RPC DEVE estar coberta por RLS de forma que apenas usuários autenticados possam chamá-la (sem expor dados de outros usuários além de `id` e `email`).
- **FR-007**: O campo de busca NÃO DEVE disparar busca com menos de 2 caracteres.
- **FR-008**: A busca NÃO DEVE expor campo de senha, imagem ou outros dados sensíveis — apenas `id` e `email`.
- **FR-009**: A função de busca existente `buscarUsuarioPorEmail` (exata) DEVE ser mantida para uso interno; a nova função é adicional.

### Key Entities

- **Prefixo de busca**: string de ≥ 2 caracteres digitada pelo usuário, usada como `LIKE 'prefixo%'`.
- **Candidato**: par `{id: UUID, email: string}` retornado pela função RPC.
- **Membro atual**: candidato cujo `id` já está em `rateio.membros[].user_id` — marcado como indisponível na lista.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O usuário consegue encontrar e adicionar um membro digitando no máximo a metade do email em menos de 5 segundos.
- **SC-002**: 100% das buscas com prefixo ≥ 2 caracteres retornam resultados em menos de 1 segundo em condições normais de rede.
- **SC-003**: Nenhuma informação além de `id` e `email` é exposta pelo endpoint de busca.
- **SC-004**: A adição de membro via busca por prefixo tem a mesma taxa de sucesso que a adição via email exato anterior.

## Assumptions

- A busca é case-insensitive (`ILIKE` ou `LOWER(email) LIKE LOWER(prefixo) || '%'`) para facilitar o uso.
- O limite de 10 resultados por busca é suficiente para o volume atual de usuários.
- A nova função RPC convive com `buscar_usuario_por_email` (exata) — não substitui, apenas complementa.
- O debounce de 300ms é adequado para uma conexão normal; pode ser ajustado pelo implementador.
- A busca retorna apenas usuários da tabela `users` da aplicação (que já passaram pelo `garantirUsuario()`), não diretamente do Neon Auth.
