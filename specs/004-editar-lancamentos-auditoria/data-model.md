# Data Model: Editar Lançamentos e Auditoria (D-006)

## Tabela nova: audit_log

```sql
CREATE TABLE audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade    text        NOT NULL CHECK (entidade IN ('despesa', 'reembolso')),
  entidade_id uuid        NOT NULL,
  rateio_id   uuid        NOT NULL REFERENCES rateios(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES users(id),
  acao        text        NOT NULL DEFAULT 'update' CHECK (acao IN ('update', 'delete')),
  diff_json   jsonb       NOT NULL,
  criado_em   timestamptz NOT NULL DEFAULT now()
);
```

**Índices**:
```sql
CREATE INDEX audit_log_entidade_idx ON audit_log (entidade, entidade_id);
CREATE INDEX audit_log_rateio_idx   ON audit_log (rateio_id);
CREATE INDEX audit_log_criado_em_idx ON audit_log (criado_em DESC);
```

**RLS** (mesma pattern de `links`):
```sql
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Leitura: membros do rateio
CREATE POLICY audit_log_select ON audit_log FOR SELECT
  USING (rateio_id IN (
    SELECT rateio_id FROM membros WHERE user_id = auth_user_id()::uuid
  ));

-- Inserção: somente via RPC (SECURITY DEFINER) — sem policy INSERT direta
-- Nota: as funções RPC são SECURITY DEFINER e inserem com o role do owner,
-- portanto não precisam de policy INSERT na tabela.
```

**Relacionamentos**:
- `rateio_id` → `rateios.id` (ON DELETE CASCADE — exclui logs se o rateio for apagado)
- `user_id` → `users.id` (sem CASCADE — o log preserva quem editou mesmo se o usuário sair)
- `entidade_id` → referência lógica a `despesas.id` ou `reembolsos.id` (sem FK nativa — polimórfico, mesmo padrão de `links`)

---

## Novos RPCs Postgres

### editar_despesa

```
Entrada:
  p_id            UUID   -- despesa a editar
  p_data          DATE
  p_descricao     TEXT
  p_pagador_id    UUID   -- pagador_user_id
  p_valor         NUMERIC(14,2)
  p_user_id       UUID   -- usuário que faz a edição (do JWT)

Saída: void (lança exceção em caso de erro de negócio)

Comportamento:
  1. Busca valores atuais da despesa (valida que pertence a rateio do user_id)
  2. Constrói diff_json com apenas os campos que mudaram
  3. UPDATE em despesas
  4. INSERT em audit_log
  — tudo na mesma transação
```

### editar_reembolso

```
Entrada:
  p_id              UUID
  p_data            DATE
  p_pagador_id      UUID
  p_recebedor_id    UUID
  p_valor           NUMERIC(14,2)
  p_observacao      TEXT (nullable)
  p_user_id         UUID

Saída: void

Comportamento:
  1. Valida pagador ≠ recebedor
  2. Busca valores atuais
  3. Constrói diff_json
  4. UPDATE em reembolsos
  5. INSERT em audit_log
```

---

## Tabelas existentes (sem alteração de schema)

| Tabela | Mudança |
|--------|---------|
| `despesas` | Nenhuma — campos existentes já suportam edição |
| `reembolsos` | Nenhuma |
| `links` | Nenhuma |

---

## Tipo TypeScript novo (queries.ts)

```typescript
export interface AuditLogItem {
  id: string
  entidade: 'despesa' | 'reembolso'
  entidade_id: string
  rateio_id: string
  user_id: string
  acao: 'update' | 'delete'
  diff_json: Record<string, { de: unknown; para: unknown }>
  criado_em: string
  ator: { email: string } | null  // join com users
}
```

---

## Drizzle schema (src/db/schema.ts)

```typescript
export const auditLog = pgTable('audit_log', {
  id:         uuid('id').primaryKey().defaultRandom(),
  entidade:   text('entidade').notNull(),
  entidadeId: uuid('entidade_id').notNull(),
  rateioId:   uuid('rateio_id').notNull().references(() => rateios.id, { onDelete: 'cascade' }),
  userId:     uuid('user_id').notNull().references(() => users.id),
  acao:       text('acao').notNull().default('update'),
  diffJson:   jsonb('diff_json').notNull(),
  criadoEm:   timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

export type AuditLog    = typeof auditLog.$inferSelect
export type NewAuditLog = typeof auditLog.$inferInsert
```
