# Tasks: Busca de Usuário por Prefixo de Email

**Input**: Design documents from `specs/008-busca-username/`

**Prerequisites**: plan.md, spec.md

**Organization**: Tasks agrupadas por camada (DB → query → UI).

---

## Phase 1: Migration — Função RPC Postgres

**Purpose**: Criar a função `buscar_usuarios_por_prefixo_email` no banco — bloqueante para tudo mais.

- [x] T001 Criar a função SQL na migration Drizzle. Opções:
  - Se Drizzle suportar funções customizadas: adicionar em `src/db/schema.ts` via `sql\`CREATE OR REPLACE FUNCTION...\``
  - Senão: criar arquivo SQL raw em `drizzle/migrations/` com conteúdo:
    ```sql
    CREATE OR REPLACE FUNCTION buscar_usuarios_por_prefixo_email(p_prefixo TEXT)
    RETURNS TABLE(id UUID, email TEXT)
    LANGUAGE sql
    SECURITY DEFINER
    STABLE
    AS $$
      SELECT id, email FROM users
      WHERE LOWER(email) LIKE LOWER(p_prefixo) || '%'
      ORDER BY email
      LIMIT 10;
    $$;
    ```
  - Gerar/verificar migration com `npm run db:generate` e aplicar com `npx tsx scripts/migrar.ts`

**Checkpoint**: `npx tsx scripts/verificar-schema.ts` (ou consulta direta) confirma que a função existe no banco de produção.

---

## Phase 2: Query — `src/db/queries.ts`

**Purpose**: Expor a nova função RPC como query tipada.

- [x] T002 Adicionar em `src/db/queries.ts`:
  ```typescript
  export async function buscarUsuariosPorPrefixo(
    prefixo: string,
  ): Promise<{ id: string; email: string }[]> {
    const { data, error } = await neon.rpc('buscar_usuarios_por_prefixo_email', {
      p_prefixo: prefixo,
    })
    if (error) throw new Error(error.message)
    return (data as { id: string; email: string }[]) ?? []
  }
  ```
  Importar em `Configuracoes.tsx` nas etapas seguintes.

**Checkpoint**: Chamar `buscarUsuariosPorPrefixo('lu')` no browser console retorna lista de usuários com email começando em "lu".

---

## Phase 3: User Story 1 — Refatorar UI de Busca em Configuracoes.tsx

**Purpose**: Substituir busca por email exato por busca por prefixo com lista de seleção.

- [x] T003 Em `src/routes/Configuracoes.tsx`, no estado da busca de participante:
  - Adicionar `candidatos: { id: string; email: string }[]` (inicia `[]`)
  - Manter `novoMembro` para o candidato selecionado
  - Remover o estado `buscando` (substituído por debounce no useEffect)

- [x] T004 Adicionar `useEffect` com debounce de 300ms que dispara `buscarUsuariosPorPrefixo` quando `emailBusca.length >= 2`:
  ```typescript
  useEffect(() => {
    if (emailBusca.length < 2) { setCandidatos([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await buscarUsuariosPorPrefixo(emailBusca.trim())
        setCandidatos(res)
      } catch { setCandidatos([]) }
    }, 300)
    return () => clearTimeout(timer)
  }, [emailBusca])
  ```

- [x] T005 Renderizar dropdown de candidatos abaixo do campo de busca:
  - Para cada candidato: exibir email; se `rateio?.membros.some(m => m.user_id === c.id)`, marcar como "já membro" e desabilitar clique
  - Ao clicar num candidato habilitado: `setNovoMembro(c); setCandidatos([])`
  - Quando `candidatos.length === 0 && emailBusca.length >= 2 && !buscando`: exibir "Nenhum usuário encontrado"
  - Usar tokens de design: `bg-surface-container`, `border-outline-variant`, `hover:bg-surface-variant`

**Checkpoint**: Digitar 2+ caracteres no campo de busca exibe a lista de candidatos; clicar num seleciona; membros atuais estão desabilitados.

---

## Phase 4: User Story 2 — Guard de mínimo de caracteres

**Purpose**: Verificar que o guard de 2 caracteres funciona corretamente.

- [x] T006 [P] Verificar no browser: campo com 0 ou 1 caractere → sem lista e sem busca disparada; campo com 2+ → lista aparece após 300ms

---

## Phase 5: Polish e Validação

- [x] T007 [P] Remover botão "Buscar" do fluxo anterior se ainda existir — a busca agora é automática (debounce)
- [x] T008 [P] Manter `buscarUsuarioPorEmail` (exato) em `queries.ts` sem alteração — não remover
- [x] T009 [P] Testar edge cases no browser: prefixo com @, com ponto, com maiúscula — verificar que LOWER() funciona
- [x] T010 [P] Rodar `npm run test:coverage` — thresholds 90% mantidos
- [x] T011 Atualizar `.ai/planning/STATUS.md`: D-010 → ✅ com data

---

## Dependencies & Execution Order

### Dependências entre phases

- **Phase 1 (Migration)**: sem dependências — iniciar imediatamente; requer `DATABASE_URL` no `.env.local`
- **Phase 2 (Query)**: depende de T001 (função no banco)
- **Phase 3 (UI)**: depende de T002 (query disponível)
- **Phase 4**: depende de T003–T005 (UI implementada)
- **Phase 5**: após Phases 1–4

### Dependências internas

- T001 → T002 → T003 → T004 → T005 (cadeia sequencial)
- T006, T007, T008, T009, T010: paralelos entre si após T005

---

## Notes

- Verificar se `DATABASE_URL` está em `.env.local` antes de aplicar a migration — sem ela `migrar.ts` falha
- `buscarUsuarioPorEmail` (exato) em `queries.ts` e a função RPC `buscar_usuario_por_email` no banco: **não remover** — mantidos para uso interno
- Se o Drizzle não suportar criação de função via schema, criar o SQL diretamente em `drizzle/migrations/<timestamp>_busca_prefixo.sql`
- Após cada push: `gh run list --limit 5`
