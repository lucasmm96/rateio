# Feature Specification: Perfil do Usuário

**Feature Branch**: `005-perfil-usuario`

**Created**: 2026-10-27

**Status**: Draft

**Input**: Perfil do usuário (D-007). Nova tela em `/perfil`. Campo nome editável. Se o usuário entrou com Google OAuth, o nome vem preenchido do Google (editável). Email read-only.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Editar Nome de Exibição (Priority: P1)

Um usuário autenticado acessa `/perfil` e vê seu nome atual (preenchido do Google se entrou via OAuth, ou do cadastro se usou email/senha). Ele edita o nome e salva. O novo nome aparece imediatamente no Sidebar, TopNav e demais pontos de exibição.

**Why this priority**: O nome de exibição é o único dado identificável do usuário na interface. Sem edição, usuários com email/senha ficam com nome vazio ou com o valor digitado no cadastro; usuários OAuth ficam presos ao nome do Google.

**Independent Test**: Pode ser testado abrindo `/perfil`, alterando o nome, salvando, e verificando que a Sidebar exibe o novo nome sem recarregar a página.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado, **When** acessa `/perfil`, **Then** vê um formulário com seu nome atual no campo "Nome" e seu email no campo "E-mail" (read-only).
2. **Given** um usuário autenticado via Google OAuth, **When** acessa `/perfil`, **Then** o campo "Nome" está pré-preenchido com o nome vindo do Google (editável).
3. **Given** um nome válido no campo, **When** o usuário salva, **Then** recebe confirmação de sucesso e o nome na Sidebar/TopNav atualiza sem reload de página.
4. **Given** um campo de nome vazio, **When** o usuário tenta salvar, **Then** a operação é rejeitada com mensagem de erro.
5. **Given** um nome com mais de 80 caracteres, **When** o usuário tenta salvar, **Then** a operação é rejeitada com mensagem de erro.

---

### User Story 2 - Visualizar Informações da Conta (Priority: P2)

Um usuário vê, na tela de perfil, além do nome editável, o seu e-mail (read-only) e um indicador visual do provedor de login (Google OAuth ou e-mail/senha).

**Why this priority**: Confirmar o método de autenticação ajuda o usuário a entender se deve usar "Entrar com Google" ou digitar a senha.

**Independent Test**: Pode ser testado verificando que usuários Google veem um badge "Google" e usuários email/senha não veem esse badge.

**Acceptance Scenarios**:

1. **Given** um usuário que entrou via Google OAuth, **When** acessa `/perfil`, **Then** vê um indicador "Conta Google" próximo ao e-mail.
2. **Given** um usuário que entrou via e-mail e senha, **When** acessa `/perfil`, **Then** não vê o indicador de conta Google.
3. **Given** qualquer usuário autenticado, **When** acessa `/perfil`, **Then** o campo e-mail está visível e não é editável.

---

### Edge Cases

- O que acontece se a chamada de atualização de nome falhar (rede)? O formulário exibe mensagem de erro e o nome antigo é mantido.
- O que acontece se o usuário salvar o mesmo nome sem alteração? A operação é executada normalmente (idempotente).
- O que acontece com usuário não autenticado que tenta acessar `/perfil`? Redirecionado para `/login` pelo `RequireAuth` (comportamento já existente em todas as rotas protegidas).
- O que acontece se `user.name` for `null` ou `undefined` (usuário criado antes do campo existir)? O campo "Nome" aparece vazio e pode ser preenchido.
- Avatar real (foto do Google): fora do escopo desta feature. A tela mostra apenas as iniciais do nome, como os demais pontos de exibição do app.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE disponibilizar a rota `/perfil` acessível somente a usuários autenticados.
- **FR-002**: A tela de perfil DEVE exibir um campo "Nome" pré-preenchido com `user.name` da sessão ativa (pode ser vazio).
- **FR-003**: Se o usuário autenticou via Google OAuth, o campo "Nome" DEVE estar pré-preenchido com o nome fornecido pelo Google (editável).
- **FR-004**: A tela de perfil DEVE exibir o e-mail do usuário em campo read-only (não editável).
- **FR-005**: O sistema DEVE salvar o nome editado via `neon.auth.updateUser({ name })` — sem nova coluna no banco da aplicação.
- **FR-006**: Após salvar com sucesso, o nome atualizado DEVE refletir imediatamente nos componentes Sidebar, TopNav e demais pontos que exibem o nome/iniciais, sem reload de página.
- **FR-007**: O campo "Nome" NÃO DEVE aceitar valor vazio; a validação deve ocorrer no cliente antes de chamar a API.
- **FR-008**: O campo "Nome" NÃO DEVE aceitar valores com mais de 80 caracteres.
- **FR-009**: O sistema DEVE exibir feedback de sucesso (toast ou mensagem inline) após salvar o nome com sucesso.
- **FR-010**: O sistema DEVE exibir feedback de erro se a chamada de atualização falhar, sem perder o valor digitado.
- **FR-011**: A tela de perfil DEVE ser acessível via link no Sidebar (desktop), TopNav (tablet) e BottomNav (mobile).
- **FR-012**: A tela de perfil DEVE exibir um indicador visual do provedor de login (Google vs e-mail/senha) quando identificável a partir dos dados de sessão.

### Key Entities

- **Usuário**: conta autenticada. Atributos relevantes: `id`, `email` (imutável), `name` (editável), `image` (opcional, vem do Google OAuth — não exibido como foto nesta feature).
- **Sessão**: dados retornados por `neon.auth.useSession()`. O campo `data.user.name` é a fonte de verdade para o nome atual; `data.user.image` presente indica origem OAuth.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário consegue editar e salvar o nome em menos de 30 segundos a partir da abertura da tela.
- **SC-002**: 100% das edições de nome refletem imediatamente no Sidebar/TopNav sem recarregar a página.
- **SC-003**: A tela de perfil é alcançável com no máximo 1 clique a partir de qualquer tela autenticada (link na navegação).
- **SC-004**: Usuários não autenticados são redirecionados para `/login` ao tentar acessar `/perfil` (0% de acesso não autorizado).
- **SC-005**: 100% das tentativas de salvar nome vazio são rejeitadas no cliente com mensagem clara.

## Assumptions

- O Better Auth SDK expõe `neon.auth.updateUser({ name })` para atualização de nome do lado do cliente — sem chamar RPC Postgres diretamente.
- `user.name` vem preenchido do Google OAuth quando o usuário autenticou por esse método; pode ser `null`/`undefined` para usuários criados via e-mail/senha antes desta feature.
- Upload de foto de perfil está fora do escopo desta feature; a UI continua usando as iniciais do nome.
- Alteração de senha está fora do escopo desta feature (fluxo de reset de senha já existe em `/redefinir-senha`).
- Exclusão de conta está fora do escopo desta feature.
- A coluna `users.nome` NÃO será adicionada ao banco da aplicação — o nome é gerenciado inteiramente pelo Better Auth.
