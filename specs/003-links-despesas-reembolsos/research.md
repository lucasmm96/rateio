# Research: Links em Despesas e Reembolsos

**Date**: 2026-10-27

## Decisão 1 — Estrutura da tabela `links`

**Opções avaliadas**:

| Opção | Descrição | Prós | Contras |
|-------|-----------|------|---------|
| A — Tabela única polimórfica | `links(entidade_tipo, entidade_id, ...)` | Schema simples, UI unificada | Sem FK nativo; cascade via trigger |
| B — Duas tabelas separadas | `despesa_links` + `reembolso_links` | FK nativo, cascade declarativo | Duplicação de schema; código de query duplicado |
| C — Coluna JSONB | `despesas.links jsonb[]` | Sem tabela nova | Viola princípio 10 (dado calculável → tabela); sem RLS granular |

**Decisão**: Opção A — tabela única polimórfica com coluna `entidade_tipo CHECK ('despesa','reembolso')` e `entidade_id`.

**Rationale**: Mantém UI e código de queries unificados. Cascade de exclusão implementado via triggers (ver migration). A ausência de FK polimórfico nativo é aceitável: os triggers cobrem o caso de exclusão via app; exclusões diretas no banco (manutenção) devem executar o trigger de qualquer forma.

---

## Decisão 2 — RLS na tabela `links`

**Problema**: `links` não tem `rateio_id` direto — acesso precisa ser verificado via entidade pai.

**Opções avaliadas**:

| Opção | Política RLS | Custo |
|-------|-------------|-------|
| A — Subquery em cada policy | `entidade_id IN (SELECT id FROM despesas WHERE rateio_id IN (...))` | Dois subqueries aninhados; potencialmente lento |
| B — `rateio_id` denormalizado em `links` | `rateio_id IN (SELECT rateio_id FROM membros WHERE user_id = auth.uid())` | Coluna extra; simplifica RLS e índice |

**Decisão**: Opção B — adicionar `rateio_id` como coluna denormalizada com FK e NOT NULL em `links`. Preenchido na inserção (app passa `rateio_id` junto com `entidade_id`).

**Rationale**: Alinha com o padrão já usado por `despesas` e `reembolsos` (ambas têm `rateio_id` explícito). RLS simples e índice eficiente. O custo de denormalização é trivial: `rateio_id` não muda após criação.

---

## Decisão 3 — Cascade delete sem FK polimórfico

**Problema**: Postgres não suporta FK polimórfico. Ao excluir uma despesa, os links dela devem ser excluídos.

**Opções avaliadas**:

| Opção | Descrição |
|-------|-----------|
| A — Trigger BEFORE DELETE | Trigger em `despesas` e `reembolsos` que deleta links antes do DELETE |
| B — Aplicação deleta links antes de deletar entidade | Duas queries na app; risco se a segunda falhar |
| C — Cron de limpeza | Eventual; aceita órfãos temporários |

**Decisão**: Opção A — triggers `BEFORE DELETE` em `despesas` e `reembolsos`.

**Rationale**: Garante integridade mesmo para deletes feitos fora da app (scripts de manutenção, DBA). A lógica é atômica com o DELETE da entidade.

---

## Decisão 4 — Rollback de migração

**Problema**: Drizzle não tem rollback automático. Como documentar e executar um rollback?

**Decisão**: Script SQL manual em `drizzle/rollbacks/XXXX_rollback_links.sql`, **fora** do diretório de migrations Drizzle. Aplicado via `psql` ou adaptando `scripts/migrar.ts`.

**Rationale**: Rollback é emergencial e consciente (destrói dados de links além dos dois primeiros). Manter fora do fluxo automático evita aplicação acidental.

**Limitação documentada**: Links além de 2 por despesa e todos os links de reembolso são perdidos no rollback. Aceitável para uso emergencial pré-produção.

---

## Decisão 5 — Validação de URL no cliente

**Decisão**: Validar presença de esquema `http://` ou `https://` no cliente antes de enviar. Não rejeitar URLs que o servidor não conseguiria abrir (domínios privados, IPs internos) — o sistema não faz requisições às URLs.

**Rationale**: Validação mínima suficiente para prevenir erros de digitação. Mais restritivo quebraria casos legítimos (links de intranet, etc.).
