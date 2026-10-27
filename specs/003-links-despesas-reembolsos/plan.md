# Implementation Plan: Links em Despesas e Reembolsos

**Branch**: `003-links-despesas-reembolsos` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-links-despesas-reembolsos/spec.md`

## Summary

Substituir os campos fixos `boleto_url` / `comprovante_url` de `despesas` por uma tabela auxiliar `links` que suporta zero ou mais links por despesa ou reembolso. A migração move os dados existentes para a nova tabela, remove os campos antigos, e adiciona a UI de lista + add/remove em cada lançamento.

## Technical Context

**Language/Version**: TypeScript 5 (React 18, Vite)

**Primary Dependencies**: Drizzle ORM (schema + migração), Neon Data API (PostgREST), Vitest

**Storage**: PostgreSQL (Neon) — nova tabela `links`, triggers de cascata, RLS, migração Drizzle

**Testing**: Vitest (testes de schema/queries em `src/core/__tests__/` não se aplicam aqui; cobertura de componentes em `src/components/__tests__/`)

**Target Platform**: Web (SPA, Vite + React)

**Project Type**: Web application (SPA + Postgres)

**Performance Goals**: Lista de links carregada junto com a despesa/reembolso em < 1 s (join ou query separada)

**Constraints**: Nenhuma credencial no cliente; RLS obrigatório; migração versionada via Drizzle; sem `number` para valores — não se aplica aqui (links não têm valores monetários)

**Scale/Scope**: 1 tabela nova, 2 arquivos de queries, até 4 componentes afetados, 1 migration forward + 1 rollback script

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Observação |
|-----------|--------|------------|
| 1 — Cálculo em módulo puro | ✅ Não se aplica | Links não envolvem cálculo financeiro |
| 2 — Dinheiro em decimal | ✅ Não se aplica | Links não têm campos monetários |
| 5 — RLS obrigatório; nenhuma credencial no cliente | ⚠️ Requer atenção | `links` precisa de políticas RLS; acesso mediado via membros do rateio |
| 6 — Schema versionado por Drizzle | ⚠️ Requer atenção | Migration forward + rollback manual documentado; nenhum DDL manual em produção |
| 10 — Modelo de dados mínimo | ✅ Seguido | Tabela única `links` com `entidade_tipo`/`entidade_id`; alternativa de duas tabelas separadas avaliada e rejeitada (ver research.md) |
| 16 — Design system como fonte da verdade visual | ✅ A seguir | UI de links usa tokens semânticos; nenhuma cor hardcoded |

**Resultado da gate**: ✅ Nenhuma violação — restrições 5 e 6 são endereçadas no design. Prosseguir.

## Project Structure

### Documentation (this feature)

```text
specs/003-links-despesas-reembolsos/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── queries.md       # Phase 1 output — contratos das queries de links
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── db/
│   ├── schema.ts          # adicionar tabela `links`
│   └── queries.ts         # adicionar listarLinks, adicionarLink, removerLink
└── components/
    └── LinksList.tsx      # componente novo: lista + add + remove

drizzle/
├── migrations/
│   └── XXXX_add_links.sql # migration forward (gerada pelo Drizzle)
└── rollbacks/
    └── XXXX_rollback_links.sql  # script de rollback manual (não é migration Drizzle)
```

**Structure Decision**: Monorepo de app único (Option 1). Componente de links extraído como `LinksList.tsx` reutilizável entre despesas e reembolsos.

## Migração Drizzle — Forward e Rollback

### Forward (aplicar)

Gerado via `npm run db:generate` após atualizar `schema.ts`. Migration contém:

```sql
-- 1. Criar tabela links
CREATE TABLE links (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_tipo text NOT NULL CHECK (entidade_tipo IN ('despesa', 'reembolso')),
  entidade_id  uuid NOT NULL,
  rateio_id    uuid NOT NULL REFERENCES rateios(id) ON DELETE CASCADE,
  url          text NOT NULL,
  rotulo       text,
  criado_em    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX links_entidade_idx ON links (entidade_tipo, entidade_id);
CREATE INDEX links_rateio_idx   ON links (rateio_id);

-- 2. RLS
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
CREATE POLICY links_select ON links FOR SELECT
  USING (rateio_id IN (
    SELECT rateio_id FROM membros WHERE user_id = auth.uid()
  ));
CREATE POLICY links_insert ON links FOR INSERT
  WITH CHECK (rateio_id IN (
    SELECT rateio_id FROM membros WHERE user_id = auth.uid()
  ));
CREATE POLICY links_delete ON links FOR DELETE
  USING (rateio_id IN (
    SELECT rateio_id FROM membros WHERE user_id = auth.uid()
  ));

-- 3. Trigger: cascade delete quando despesa for excluída
CREATE OR REPLACE FUNCTION delete_links_for_despesa()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM links WHERE entidade_tipo = 'despesa' AND entidade_id = OLD.id;
  RETURN OLD;
END;
$$;
CREATE TRIGGER trg_delete_links_despesa
  BEFORE DELETE ON despesas
  FOR EACH ROW EXECUTE FUNCTION delete_links_for_despesa();

-- 4. Trigger: cascade delete quando reembolso for excluído
CREATE OR REPLACE FUNCTION delete_links_for_reembolso()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM links WHERE entidade_tipo = 'reembolso' AND entidade_id = OLD.id;
  RETURN OLD;
END;
$$;
CREATE TRIGGER trg_delete_links_reembolso
  BEFORE DELETE ON reembolsos
  FOR EACH ROW EXECUTE FUNCTION delete_links_for_reembolso();

-- 5. Migrar dados existentes
INSERT INTO links (entidade_tipo, entidade_id, rateio_id, url, rotulo)
  SELECT 'despesa', id, rateio_id, boleto_url, 'Boleto'
  FROM despesas
  WHERE boleto_url IS NOT NULL;

INSERT INTO links (entidade_tipo, entidade_id, rateio_id, url, rotulo)
  SELECT 'despesa', id, rateio_id, comprovante_url, 'Comprovante'
  FROM despesas
  WHERE comprovante_url IS NOT NULL;

-- 6. Remover colunas antigas
ALTER TABLE despesas DROP COLUMN boleto_url;
ALTER TABLE despesas DROP COLUMN comprovante_url;
```

### Rollback (emergencial — desenvolvimento apenas)

Script em `drizzle/rollbacks/XXXX_rollback_links.sql`. **Não é uma migration Drizzle** — aplicar manualmente via `psql` ou `scripts/migrar.ts` adaptado.

```sql
-- ROLLBACK EMERGENCIAL — perde links além dos primeiros 2 por despesa
-- e todos os links de reembolsos

-- 1. Recriar colunas
ALTER TABLE despesas ADD COLUMN boleto_url       text;
ALTER TABLE despesas ADD COLUMN comprovante_url  text;

-- 2. Restaurar dados (primeiro link de cada tipo por despesa)
UPDATE despesas d SET boleto_url = (
  SELECT url FROM links
  WHERE entidade_tipo = 'despesa' AND entidade_id = d.id AND rotulo = 'Boleto'
  ORDER BY criado_em LIMIT 1
);
UPDATE despesas d SET comprovante_url = (
  SELECT url FROM links
  WHERE entidade_tipo = 'despesa' AND entidade_id = d.id AND rotulo = 'Comprovante'
  ORDER BY criado_em LIMIT 1
);

-- 3. Remover triggers
DROP TRIGGER IF EXISTS trg_delete_links_despesa ON despesas;
DROP TRIGGER IF EXISTS trg_delete_links_reembolso ON reembolsos;
DROP FUNCTION IF EXISTS delete_links_for_despesa();
DROP FUNCTION IF EXISTS delete_links_for_reembolso();

-- 4. Remover tabela
DROP TABLE links;
```

**Aviso de rollback**: Links além dos dois primeiros e todos os links de reembolso são perdidos. Executar apenas antes de qualquer usuário produtivo inserir dados na nova estrutura.

## Complexity Tracking

> Nenhuma violação de constituição — seção não aplicável.
