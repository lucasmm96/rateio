import {
  boolean,
  date,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = pgTable('users', {
  id:        uuid('id').primaryKey(),
  email:     text('email').notNull().unique(),
  criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// rateios
// ---------------------------------------------------------------------------
export const rateios = pgTable('rateios', {
  id:              uuid('id').primaryKey().defaultRandom(),
  nome:            text('nome').notNull(),
  corrigirIpca:   boolean('corrigir_ipca').notNull().default(true),
  criadoPorUserId: uuid('criado_por_user_id')
    .notNull()
    .references(() => users.id),
  criadoEm:   timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  arquivadoEm: timestamp('arquivado_em', { withTimezone: true }),
})

// ---------------------------------------------------------------------------
// membros
// Σ cota = 1 por rateio garantido por trigger (não expressável como CHECK
// de tabela no Drizzle sem extensão).
// ---------------------------------------------------------------------------
export const membros = pgTable(
  'membros',
  {
    rateioId: uuid('rateio_id')
      .notNull()
      .references(() => rateios.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    cota:     numeric('cota', { precision: 9, scale: 6 }).notNull().default('0'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
)

// ---------------------------------------------------------------------------
// despesas
// Sem coluna "situacao" — derivada em runtime: data <= hoje → paga
// ---------------------------------------------------------------------------
export const despesas = pgTable('despesas', {
  id:              uuid('id').primaryKey().defaultRandom(),
  rateioId:        uuid('rateio_id')
    .notNull()
    .references(() => rateios.id, { onDelete: 'cascade' }),
  data:            date('data').notNull(),
  descricao:       text('descricao').notNull(),
  pagadorUserId:   uuid('pagador_user_id')
    .notNull()
    .references(() => users.id),
  valor:           numeric('valor', { precision: 14, scale: 2 }).notNull(),
  criadoEm:        timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// reembolsos
// ---------------------------------------------------------------------------
export const reembolsos = pgTable('reembolsos', {
  id:              uuid('id').primaryKey().defaultRandom(),
  rateioId:        uuid('rateio_id')
    .notNull()
    .references(() => rateios.id, { onDelete: 'cascade' }),
  data:            date('data').notNull(),
  pagadorUserId:   uuid('pagador_user_id')
    .notNull()
    .references(() => users.id),
  recebedorUserId: uuid('recebedor_user_id')
    .notNull()
    .references(() => users.id),
  valor:           numeric('valor', { precision: 14, scale: 2 }).notNull(),
  observacao:      text('observacao'),
  criadoEm:        timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// taxas_ipca
// ---------------------------------------------------------------------------
export const taxasIpca = pgTable('taxas_ipca', {
  mes:  date('mes').primaryKey(),
  taxa: numeric('taxa', { precision: 8, scale: 4 }).notNull(),
})

// ---------------------------------------------------------------------------
// links
// FK polimórfica via entidade_tipo + entidade_id (sem FK nativa — triggers
// garantem cascata; CHECK em migration — Drizzle não gera automaticamente)
// ---------------------------------------------------------------------------
export const links = pgTable('links', {
  id:           uuid('id').primaryKey().defaultRandom(),
  entidadeTipo: text('entidade_tipo').notNull(),
  entidadeId:   uuid('entidade_id').notNull(),
  rateioId:     uuid('rateio_id').notNull().references(() => rateios.id, { onDelete: 'cascade' }),
  url:          text('url').notNull(),
  rotulo:       text('rotulo'),
  criadoEm:     timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
})

// ---------------------------------------------------------------------------
// config
// ---------------------------------------------------------------------------
export const config = pgTable('config', {
  chave: text('chave').primaryKey(),
  valor: jsonb('valor').notNull(),
})

// ---------------------------------------------------------------------------
// audit_log
// FK polimórfica para despesas/reembolsos via entidade + entidade_id (sem FK
// nativa — mesmo padrão de links). RLS SELECT via membros. Inserção somente
// via RPCs SECURITY DEFINER (editar_despesa, editar_reembolso).
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Tipos inferidos
// ---------------------------------------------------------------------------
export type User              = typeof users.$inferSelect
export type NewUser           = typeof users.$inferInsert
export type Rateio            = typeof rateios.$inferSelect
export type NewRateio         = typeof rateios.$inferInsert
export type Membro            = typeof membros.$inferSelect
export type NewMembro         = typeof membros.$inferInsert
export type Despesa           = typeof despesas.$inferSelect
export type NewDespesa        = typeof despesas.$inferInsert
export type Reembolso         = typeof reembolsos.$inferSelect
export type NewReembolso      = typeof reembolsos.$inferInsert
export type TaxaIpca          = typeof taxasIpca.$inferSelect
export type NewTaxaIpca       = typeof taxasIpca.$inferInsert
export type Config            = typeof config.$inferSelect
export type Link              = typeof links.$inferSelect
export type NewLink           = typeof links.$inferInsert
export type AuditLog          = typeof auditLog.$inferSelect
export type NewAuditLog       = typeof auditLog.$inferInsert
