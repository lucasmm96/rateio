# Quickstart — Validação: Editar Lançamentos e Auditoria (D-006)

Guia de validação end-to-end. Não inclui código de implementação.

## Pré-requisitos

- `npm run dev` rodando em `http://localhost:5173/`
- `DATABASE_URL` em `.env.local` (para rodar migrations)
- Pelo menos 1 rateio com 2 membros e pelo menos 1 despesa e 1 reembolso cadastrados

## 1. Aplicar a migration

```bash
npx tsx scripts/migrar.ts
```

Verificar que a tabela `audit_log` existe:

```bash
npx tsx scripts/verificar-schema.ts
```

Ou via Drizzle Studio:

```bash
npm run db:studio
```

## 2. Editar uma despesa

1. Abrir o app → entrar em um rateio → aba "Despesas"
2. Clicar em editar em qualquer despesa
3. Alterar valor e descrição → salvar
4. Verificar que os novos valores aparecem na lista

**Resultado esperado**: despesa atualizada, saldo recalculado automaticamente na tela.

## 3. Verificar registro de auditoria da despesa

1. Na mesma despesa, expandir o painel "Histórico de alterações"
2. Verificar que há 1 entrada com:
   - email do usuário que editou
   - data/hora da edição
   - `valor`: `{ de: X, para: Y }` e `descricao`: `{ de: A, para: B }`
   - campos não alterados ausentes do diff

**Resultado esperado**: log exibe exatamente os campos alterados.

## 4. Editar um reembolso

1. Aba "Reembolsos" → clicar em editar
2. Alterar valor e observação → salvar
3. Verificar que o reembolso foi atualizado

## 5. Verificar registro de auditoria do reembolso

1. Expandir "Histórico de alterações" no reembolso
2. Verificar estrutura idêntica ao passo 3

## 6. Testar validações

| Ação | Resultado esperado |
|------|-------------------|
| Salvar despesa com `valor = 0` | Mensagem de erro: "Valor deve ser maior que zero" |
| Salvar reembolso com `pagador = recebedor` | Mensagem de erro |
| Tentar editar lançamento de rateio alheio via API | 403 / erro de RLS |

## 7. Verificar RLS da auditoria

Fazer login com um usuário que não é membro do rateio:

```sql
-- no Drizzle Studio ou psql com role do usuário não-membro
SELECT * FROM audit_log WHERE entidade_id = '<id da despesa>';
```

**Resultado esperado**: 0 linhas retornadas.

## 8. Rodar testes

```bash
npm test
```

Todos os 209+ testes devem continuar passando.

```bash
npm run test:coverage
```

Thresholds 90% em todos os critérios.

## Referências

- Contratos de queries: [`contracts/queries.md`](contracts/queries.md)
- Modelo de dados: [`data-model.md`](data-model.md)
- Spec funcional: [`spec.md`](spec.md)
