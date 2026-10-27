# Tasks: Perfil do Usuário

**Input**: Design documents from `specs/005-perfil-usuario/`

**Prerequisites**: plan.md, spec.md

**Organization**: Tasks agrupadas por user story para implementação e teste independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de task incompleta)
- **[Story]**: User story a que pertence ([US1], [US2])

---

## Phase 1: Auth Helper + Rota Base

**Purpose**: Criar a função de atualização e a rota `/perfil` — bloqueante para tudo mais.

- [X] T001 [US1] Adicionar `atualizarNome(name: string): Promise<void>` em `src/db/auth.ts`: chama `neon.auth.updateUser({ name })`; lança erro se a resposta contiver `error`
- [X] T002 [US1] Criar `src/routes/Perfil.tsx`: componente `Component` exportado; lê `user` via `useUser()`; formula com campo "Nome" (text input, max 80, required) pré-preenchido com `user?.name ?? ''` e campo "E-mail" (text input, disabled) com `user?.email ?? ''`; ao submeter chama `atualizarNome()`; exibe mensagem de sucesso inline ("Nome atualizado") por 3 segundos; exibe erro inline em caso de falha; usa tokens de design (sem hex hardcoded)
- [X] T003 [US1] Registrar rota `/perfil` em `src/App.tsx`: lazy import de `./routes/Perfil.tsx` envolta em `RequireAuth`, seguindo o padrão das demais rotas protegidas

**Checkpoint**: Acessar `/perfil` exibe a tela com nome e e-mail do usuário autenticado; salvar nome persiste via Better Auth e reflete em `useUser()`.

---

## Phase 2: User Story 2 — Informações de Conta

**Purpose**: Exibir provedor de login; complemento visual da tela.

- [X] T004 [P] [US2] Adicionar badge de provedor em `src/routes/Perfil.tsx`: se `user?.image` estiver preenchido, exibir chip "Conta Google" com ícone `google` ao lado do campo e-mail; caso contrário, nada (usuário e-mail/senha)

**Checkpoint**: US2 funcional — usuários Google veem badge; usuários e-mail/senha não veem.

---

## Phase 3: Navegação Global

**Purpose**: Tornar o perfil alcançável com 1 clique de qualquer tela autenticada.

- [X] T005 [P] Atualizar `src/components/layout/Sidebar.tsx`: transformar a área de avatar do usuário (div com iniciais + email + logout) em um link `NavLink to="/perfil"` clicável no bloco do avatar; manter botão de logout separado; o avatar exibe iniciais de `user?.name || user?.email` (usar nome se disponível)
- [X] T006 [P] Atualizar `src/components/layout/TopNav.tsx`: substituir o botão de avatar (atualmente faz logout) por um `NavLink to="/perfil"` com o avatar; adicionar botão de logout separado (ícone `logout`) ao lado do avatar
- [X] T007 [P] Atualizar `src/components/ui/BottomNav.tsx`: adicionar item `{ to: '/perfil', label: 'Perfil', icon: 'account_circle' }` ao array `NAV_ITEMS`

**Checkpoint**: Link para `/perfil` visível e funcional em Sidebar (desktop), TopNav (tablet) e BottomNav (mobile).

---

## Phase 4: Atualização de Initials para Usar Nome

**Purpose**: Tornar as iniciais do usuário coerentes com o nome editado.

- [X] T008 [P] Atualizar `src/routes/Home.tsx`: função `initiais()` e o "Olá," usam `user.name || user.email?.split('@')[0]` em vez de só o email prefix
- [X] T009 [P] Atualizar `src/components/layout/Sidebar.tsx`: `username` exibido no bloco do avatar usa `user?.name || user?.email?.split('@')[0]`; iniciais calculadas do `user?.name` se disponível, senão do email prefix

**Checkpoint**: Após editar o nome em `/perfil`, as iniciais e o "Olá" na Home refletem o novo nome sem reload.

---

## Phase 5: Polish e Validação

- [ ] T010 Testar fluxo completo no browser: login Google → `/perfil` mostra nome Google e badge → editar nome → sidebar/topnav atualizam; login email/senha → `/perfil` mostra campo vazio ou nome do cadastro → sem badge
- [ ] T011 [P] Testar edge cases: nome vazio rejeitado com mensagem; nome com 80 chars aceito; nome com 81 chars rejeitado; falha de rede exibe erro sem perder o valor
- [X] T012 [P] Rodar `npm run test:coverage` e confirmar que thresholds 90% continuam atingidos
- [X] T013 [P] Atualizar `.ai/planning/STATUS.md`: D-007 → ✅ com data 2026-10-27

---

## Dependencies & Execution Order

### Dependências entre phases

- **Phase 1 (Auth + Rota)**: sem dependências — iniciar imediatamente
- **Phase 2 (Badge provedor)**: depende de T002 (rota Perfil.tsx existir)
- **Phase 3 (Navegação)**: pode rodar em paralelo com Phase 1 (arquivos diferentes: Sidebar, TopNav, BottomNav)
- **Phase 4 (Initials)**: depende de T001 estar disponível (usa user.name); paralela a Phase 2
- **Phase 5 (Polish)**: após Phases 1–4 prontas

### Dependências internas

- T001 → T002 (Perfil.tsx importa `atualizarNome`)
- T002 → T003 (router precisa do componente)
- T002 → T004 (badge é adição inline no mesmo arquivo)
- T005, T006, T007 são independentes entre si e de Phase 1 (arquivos separados)
- T008, T009 dependem apenas de que `user.name` esteja disponível (já está via Better Auth)

### Oportunidades de paralelismo

```bash
# Após T001: T002 e T003 sequenciais
# T004 paralelo a T003 (mesmo arquivo T002 já criado)

# Paralelo a Phase 1 (desde o início):
T005: atualizar Sidebar.tsx
T006: atualizar TopNav.tsx
T007: atualizar BottomNav.tsx
T008: atualizar Home.tsx
T009: atualizar Sidebar.tsx — coordenar com T005 (mesmo arquivo)
```

> **Atenção**: T005 e T009 tocam o mesmo arquivo (`Sidebar.tsx`) — implementar juntos.

---

## Implementation Strategy

### MVP (User Story 1 apenas)

1. Completar Phase 1 (T001–T003) — rota + função de update
2. Completar Phase 3 (T005–T007) — navegação
3. **Parar e validar**: tela acessível, nome editável, sidebar atualiza
4. Demo/review antes de Phase 2 e 4

### Entrega incremental

1. Phase 1 → rota funcional
2. Phase 3 → navegação integrada
3. Phase 2 → badge de provedor
4. Phase 4 → initials coerentes com nome
5. Phase 5 → validação e polish

---

## Notes

- Nenhuma migration Drizzle necessária — não tocar em `drizzle/` nem em `src/db/schema.ts`
- Tokens de design obrigatórios: `bg-surface`, `text-on-surface`, `text-primary`, `bg-primary`, `text-error` — nunca hex hardcoded
- Após cada push: `gh run list --limit 5` para verificar CI (regra do CLAUDE.md)
- Se `neon.auth.updateUser` não existir nesta versão do SDK: investigar API alternativa (`neon.auth.user.update`) antes de criar RPC Postgres — preferir a solução sem migration
