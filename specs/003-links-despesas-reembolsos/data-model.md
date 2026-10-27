# Data Model: Links em Despesas e Reembolsos

**Date**: 2026-10-27

## Nova tabela: `links`

| Coluna | Tipo | Restrição | Descrição |
|--------|------|-----------|-----------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Identificador único do link |
| `entidade_tipo` | `text` | NOT NULL, CHECK IN ('despesa','reembolso') | Tipo da entidade pai |
| `entidade_id` | `uuid` | NOT NULL | ID da despesa ou reembolso |
| `rateio_id` | `uuid` | NOT NULL, FK → rateios(id) ON DELETE CASCADE | Denormalizado para RLS |
| `url` | `text` | NOT NULL | URL do link |
| `rotulo` | `text` | NULL | Rótulo/descrição opcional |
| `criado_em` | `timestamptz` | NOT NULL DEFAULT now() | Data de criação |

**Índices**:
- `links_entidade_idx ON links (entidade_tipo, entidade_id)` — query principal
- `links_rateio_idx ON links (rateio_id)` — RLS policy

**Nota**: Sem FK de `entidade_id` para `despesas`/`reembolsos` (FK polimórfico não existe em Postgres). Cascade implementado via triggers (ver plan.md).

## Mudanças em tabelas existentes

### `despesas`

| Coluna removida | Tipo | Substituído por |
|-----------------|------|-----------------|
| `boleto_url` | `text NULL` | Linha em `links` com `rotulo = 'Boleto'` |
| `comprovante_url` | `text NULL` | Linha em `links` com `rotulo = 'Comprovante'` |

### `reembolsos`

Sem alteração de colunas. A tabela passa a ter links associados via `links(entidade_tipo='reembolso', entidade_id=reembolso.id)`.

## Schema Drizzle (src/db/schema.ts)

```typescript
// Nova tabela
export const links = pgTable('links', {
  id:           uuid('id').primaryKey().defaultRandom(),
  entidadeTipo: text('entidade_tipo').notNull(),  // 'despesa' | 'reembolso'
  entidadeId:   uuid('entidade_id').notNull(),
  rateioId:     uuid('rateio_id').notNull().references(() => rateios.id, { onDelete: 'cascade' }),
  url:          text('url').notNull(),
  rotulo:       text('rotulo'),
  criadoEm:     timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

// CHECK constraint (adicionado via SQL na migration — Drizzle não gera automaticamente)
// CHECK (entidade_tipo IN ('despesa', 'reembolso'))
```

## Tipos TypeScript (inferidos)

```typescript
export type Link    = typeof links.$inferSelect
export type NewLink = typeof links.$inferInsert

// Para uso nas queries e componentes
export interface LinkItem {
  id: string
  entidade_tipo: 'despesa' | 'reembolso'
  entidade_id: string
  rateio_id: string
  url: string
  rotulo: string | null
  criado_em: string
}
```

## RLS Policies

```sql
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- SELECT: qualquer membro do rateio pode ler
CREATE POLICY links_select ON links FOR SELECT
  USING (rateio_id IN (
    SELECT rateio_id FROM membros WHERE user_id = auth.uid()
  ));

-- INSERT: qualquer membro do rateio pode inserir
CREATE POLICY links_insert ON links FOR INSERT
  WITH CHECK (rateio_id IN (
    SELECT rateio_id FROM membros WHERE user_id = auth.uid()
  ));

-- DELETE: qualquer membro do rateio pode remover
CREATE POLICY links_delete ON links FOR DELETE
  USING (rateio_id IN (
    SELECT rateio_id FROM membros WHERE user_id = auth.uid()
  ));
```

**Nota**: Sem política UPDATE — links são imutáveis após criação (para alterar, remover e recriar).

## Invariantes

- Toda linha de `links` tem `rateio_id` consistente com a entidade pai (verificado na inserção pela app e pelo RLS).
- Ao excluir uma despesa ou reembolso, todos os links com `entidade_id` correspondente são excluídos pelos triggers antes do DELETE.
- Não há limite de links por entidade.
