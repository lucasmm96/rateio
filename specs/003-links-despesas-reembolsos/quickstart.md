# Quickstart — Validação: Links em Despesas e Reembolsos

**Date**: 2026-10-27

## Pré-requisitos

- `DATABASE_URL` configurado em `.env.local`
- App rodando: `npm run dev` (http://localhost:5173/)
- Usuário autenticado como membro de ao menos um rateio com despesas

## 1. Validar migração forward

```bash
# Aplicar migrations (inclui a nova migration de links)
npx tsx scripts/migrar.ts

# Verificar schema
npx tsx scripts/verificar-schema.ts
```

**Esperado**:
- Tabela `links` existe com colunas `id, entidade_tipo, entidade_id, rateio_id, url, rotulo, criado_em`
- Colunas `boleto_url` e `comprovante_url` NÃO existem em `despesas`
- Dados migrados: para cada despesa com `boleto_url` original, deve existir uma linha em `links` com `rotulo = 'Boleto'`

**Validar contagem**:
```sql
-- Execute via Drizzle Studio (npm run db:studio) ou psql
SELECT COUNT(*) FROM links WHERE entidade_tipo = 'despesa' AND rotulo = 'Boleto';
-- Deve ser igual ao número de despesas que tinham boleto_url não-nulo antes da migração
```

## 2. Validar UI — Adicionar link a uma despesa

1. Abrir o app → acessar um rateio → clicar em uma despesa
2. Na seção "Links", clicar em "Adicionar link"
3. Preencher URL: `https://www.exemplo.com/boleto.pdf` e rótulo: `Boleto Teste`
4. Clicar em "Adicionar"

**Esperado**:
- Link aparece imediatamente na lista com rótulo "Boleto Teste" e URL clicável
- Após recarregar a página, o link ainda aparece

## 3. Validar UI — Adicionar link inválido

1. Na seção "Links", clicar em "Adicionar link"
2. Preencher URL: `boleto.pdf` (sem esquema)
3. Clicar em "Adicionar"

**Esperado**: Mensagem de validação visível. Link NÃO é salvo.

## 4. Validar UI — Remover link

1. Despesa com dois links (adicionar um segundo se necessário)
2. Clicar em "Remover" no primeiro link
3. Confirmar a remoção

**Esperado**: Apenas o segundo link permanece na lista. Após recarregar, a lista mantém o estado.

## 5. Validar UI — Links em reembolso

1. Navegar para a seção de reembolsos
2. Clicar em um reembolso existente
3. Adicionar um link com URL `https://example.com/comprovante.jpg` e rótulo `Comprovante`

**Esperado**: Link aparece na lista do reembolso. Após recarregar, persiste.

## 6. Validar cascade delete

1. Criar uma despesa temporária
2. Adicionar 2 links a ela
3. Confirmar links existem: `SELECT COUNT(*) FROM links WHERE entidade_id = '<id_da_despesa>'` → deve retornar 2
4. Excluir a despesa pelo app
5. Verificar: `SELECT COUNT(*) FROM links WHERE entidade_id = '<id_da_despesa>'` → deve retornar 0

**Esperado**: Nenhum link órfão após exclusão.

## 7. Validar RLS

1. Fazer login com um segundo usuário que NÃO é membro do rateio
2. Tentar acessar links de uma despesa desse rateio diretamente pela Data API

**Esperado**: Query retorna lista vazia (RLS oculta as linhas).

## 8. Executar testes

```bash
npm test
# ou
npm run test:coverage
```

**Esperado**: 209+ testes passando, thresholds de cobertura mantidos (≥ 90%).

## Rollback (emergencial)

```bash
# Aplicar script de rollback manualmente
psql $DATABASE_URL -f drizzle/rollbacks/XXXX_rollback_links.sql

# Verificar
npx tsx scripts/verificar-schema.ts
```

**Esperado**: Colunas `boleto_url` e `comprovante_url` restauradas em `despesas`. Tabela `links` removida. Links além dos dois primeiros por despesa perdidos (comportamento documentado).
