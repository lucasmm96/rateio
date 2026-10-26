# Feature Specification: Fix Config. Rateio — modal vazio

**Feature Branch**: `002-fix-config-rateio`

**Created**: 2026-10-26

**Status**: Draft

**Input**: Bug D-001 — Config. Rateio às vezes não carrega e exibe modal vazio no rateio "teste".

## Contexto

A tela "Config. Rateio" abre como modal ao navegar para `?rateio=<id>`. Ela
mostra seções de edição de nome/IPCA, cotas, adição de participantes e arquivamento.
Toda a UI dessas seções é protegida pela flag `isOwner`, que depende de dois
valores carregados de forma assíncrona: o rateio (via Data API) e o usuário
autenticado (via sessão de auth). Quando os dois não ficam prontos na ordem
correta, ou quando há erro silencioso, o modal abre completamente vazio.

## Causas raiz identificadas

| # | Causa | Localização |
|---|-------|-------------|
| C1 | `isPending` do auth ignorado — query dispara antes do JWT estar pronto | `Configuracoes.tsx:29` |
| C2 | `buscarRateio` usa apenas `[rateioId]` nos deps — não espera auth resolver | `Configuracoes.tsx:30–33` |
| C3 | `error` do `useAsync` nunca é renderizado dentro do modal | `Configuracoes.tsx:30–33` |
| C4 | Todo conteúdo guardado por `isOwner` sem estado de fallback (carregando / erro / acesso negado) | `Configuracoes.tsx:209,247,328,384` |

## User Scenarios & Testing

### User Story 1 — Abrir modal com conteúdo visível (P1)

O usuário abre Config. Rateio de um rateio do qual é dono e vê o formulário
completo: nome, toggle IPCA, cotas, adicionar participante, zona de perigo.

**Why this priority**: Esse é o caminho principal; sem ele, a tela é inutilizável.

**Independent Test**: Abrir `?rateio=<id>` com usuário autenticado e ser dono do rateio. O modal deve exibir o formulário preenchido.

**Acceptance Scenarios**:

1. **Given** o usuário está logado e é dono do rateio "teste",
   **When** abre `/configuracoes?rateio=<id>`,
   **Then** o modal exibe todos os campos preenchidos com os dados do rateio em até 3 s.

2. **Given** o rateio tem 2 membros com cotas iguais (50 % cada),
   **When** o modal abre,
   **Then** os campos de cota mostram "50" para cada membro.

---

### User Story 2 — Feedback de carregamento enquanto dados não chegaram (P1)

Enquanto o rateio ainda está sendo buscado, ou enquanto a sessão de auth ainda
está sendo confirmada, o modal mostra um indicador de carregamento — não tela em branco.

**Why this priority**: O branco é o bug principal relatado; dar feedback visual é o mínimo de usabilidade.

**Independent Test**: Abrir o modal em conexão lenta. Deve aparecer "Carregando…" em vez de branco.

**Acceptance Scenarios**:

1. **Given** o usuário navega para o modal,
   **When** os dados ainda estão sendo buscados ou o auth ainda está resolvendo,
   **Then** o modal exibe "Carregando…" visível, não uma tela completamente vazia.

2. **Given** o auth resolve antes do rateio chegar,
   **When** o rateio finalmente chega,
   **Then** a UI transiciona automaticamente para o formulário completo sem recarregar a página.

---

### User Story 3 — Feedback de erro quando a busca falha (P2)

Se a busca do rateio falhar (rede, auth expirado, RLS, rateio não encontrado),
o modal mostra uma mensagem de erro acionável — não tela em branco.

**Why this priority**: Erro silencioso impede diagnóstico e deixa o usuário sem alternativa.

**Independent Test**: Forçar falha na query (e.g., rateio inexistente ou sem rede) e confirmar que aparece mensagem de erro.

**Acceptance Scenarios**:

1. **Given** o rateio não existe ou o usuário não é membro,
   **When** `buscarRateio` retorna `null`,
   **Then** o modal exibe mensagem "Rateio não encontrado ou sem acesso." com botão de voltar.

2. **Given** ocorre erro de rede ou da API,
   **When** `buscarRateio` lança exceção,
   **Then** o modal exibe a mensagem de erro e um botão "Tentar novamente".

---

### User Story 4 — Modal vazio não aparece para não-donos (P3)

Se o usuário autenticado é membro mas não é dono, o modal mostra algum conteúdo
relevante (ex.: cotas somente leitura) — não tela em branco.

**Why this priority**: Atualmente `isOwner = false` → tela totalmente vazia. É confuso mesmo se a intenção é "não-donos não editam".

**Independent Test**: Abrir o modal como membro não-dono e confirmar que não é branco.

**Acceptance Scenarios**:

1. **Given** o usuário é membro do rateio mas não é o criador,
   **When** abre o modal de config,
   **Then** vê uma mensagem "Apenas o criador do rateio pode alterar as configurações." com botão de voltar.

---

### Edge Cases

- O que acontece se `rateioId` está na URL mas é inválido (não UUID)?
- O que acontece se o JWT expira entre montar o componente e a requisição partir?
- O que acontece se o auth demora mais de 5 s para resolver?
- O que acontece se o usuário recarrega a página com a URL do modal diretamente?

## Requirements

### Functional Requirements

- **FR-001**: O sistema DEVE aguardar a resolução do estado de autenticação (`isPending === false`) antes de disparar a busca do rateio.
- **FR-002**: O modal DEVE exibir um indicador de carregamento visível enquanto `isPending` ou `loading` for `true`.
- **FR-003**: O sistema DEVE exibir a mensagem de erro do `useAsync` dentro do modal quando a busca falhar, com botão "Tentar novamente".
- **FR-004**: O sistema DEVE exibir "Rateio não encontrado ou sem acesso." quando `buscarRateio` retornar `null` e o carregamento tiver terminado.
- **FR-005**: O sistema DEVE exibir "Apenas o criador do rateio pode alterar as configurações." quando o rateio carregou mas `isOwner === false`.
- **FR-006**: Os deps do `useAsync` DEVEM incluir o estado de `isPending` do auth, garantindo re-execução após a sessão ser confirmada.
- **FR-007**: A função passada ao `useAsync` DEVE retornar `Promise.resolve(null)` enquanto `isPending === true`, sem disparar requisição à Data API.

### Key Entities

- **Rateio**: registro com `id`, `nome`, `corrigir_ipca`, `criado_por_user_id`, membros aninhados.
- **Sessão de auth**: estado assíncrono com campos `data.user` e `isPending` fornecido pelo `neon.auth.useSession()`.

## Success Criteria

### Measurable Outcomes

- **SC-001**: O modal exibe o formulário preenchido em até 3 s para 100 % das aberturas com auth já resolvido (cache quente).
- **SC-002**: Nenhuma abertura do modal resulta em tela completamente branca — sempre aparece carregando, formulário, erro ou mensagem de acesso negado.
- **SC-003**: 100 % dos erros de busca (rede, RLS, não encontrado) produzem mensagem visível ao usuário.
- **SC-004**: O bug relatado no rateio "teste" não se reproduz após a correção em nenhuma das 10 tentativas de abertura consecutivas.

## Assumptions

- A prop `isPending` do `useUser()` / `neon.auth.useSession()` é o sinal confiável de que a sessão ainda não foi confirmada.
- O `BetterAuthReactAdapter` injeta o JWT automaticamente após `isPending === false`; não é necessário pré-buscar o token manualmente.
- O rateio "teste" é válido no banco e o usuário é dono — o bug é de timing/estado, não de dados corrompidos.
- Não há mudança de schema, migração ou lógica financeira envolvida — apenas estado de UI e ordem de chamadas.
