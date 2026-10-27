# Research: Editar Lançamentos e Auditoria (D-006)

## Decisão 1: Gravação de auditoria via RPC, não trigger

**Decision**: A auditoria é gravada dentro do mesmo RPC que executa o UPDATE no lançamento.

**Rationale**: Triggers Postgres não têm acesso ao `user_id` do JWT Neon Auth via `auth_user_id()` de forma confiável (a função `auth_user_id()` está disponível em políticas RLS, mas não é garantida dentro do contexto de um trigger em todas as configurações). O RPC recebe `p_user_id` como parâmetro explícito e executa ambas as operações (UPDATE + INSERT em `audit_log`) dentro da mesma transação, garantindo atomicidade.

**Alternatives considered**:
- Trigger com `current_setting('request.jwt.claim.sub', true)`: possível, mas frágil — depende da configuração de GUCs no Neon, que pode mudar. Rejected.
- Dois calls separados no cliente (UPDATE + INSERT): risco de inconsistência se o segundo call falhar. Rejected.

---

## Decisão 2: Formato do diff_json

**Decision**: `{ "campo": { "de": valor_antigo, "para": valor_novo } }` — um objeto com chaves sendo os nomes dos campos alterados.

**Rationale**: Compacto, diretamente queryável via JSONB operators do Postgres (`diff_json ? 'valor'`), e fácil de renderizar no front sem parsing adicional. Campos não alterados não aparecem no diff.

**Example**:
```json
{
  "valor": { "de": "100.00", "para": "200.00" },
  "data":  { "de": "2024-01-10", "para": "2024-02-15" }
}
```

**Alternatives considered**:
- Array `[{field, from, to}]`: mais verboso, sem vantagem sobre o objeto. Rejected.
- Snapshot completo antes/depois: desperdiça espaço para campos não alterados. Rejected.

---

## Decisão 3: RLS em audit_log via rateio_id desnormalizado

**Decision**: A tabela `audit_log` inclui `rateio_id` (desnormalizado), permitindo a mesma política RLS usada em `links` e outras tabelas — JOIN com `membros`.

**Rationale**: Evita um JOIN duplo (audit_log → despesas → rateios) só para avaliar o RLS. O `rateio_id` é conhecido no momento da edição e cabe ser gravado para eficiência. Padrão já estabelecido na tabela `links`.

**Alternatives considered**:
- RLS via subquery `entidade_id IN (SELECT id FROM despesas WHERE rateio_id IN (...))`: correto mas mais custoso e complexo. Rejected.

---

## Decisão 4: Edição via RPC (não PATCH direto na tabela)

**Decision**: As funções `editar_despesa` e `editar_reembolso` são RPCs Postgres com parâmetros explícitos.

**Rationale**: Um único RPC garante atomicidade (UPDATE + INSERT em audit_log na mesma transação). Com PATCH direto + INSERT separado, o cliente precisaria de duas chamadas com risco de inconsistência. Além disso, o RPC pode conter validações de negócio (valor > 0, pagador ≠ recebedor) dentro do banco.

**Alternatives considered**:
- PATCH direto via Neon Data API + INSERT em audit_log separado: dois round-trips, sem atomicidade garantida. Rejected.

---

## Decisão 5: UI de auditoria — painel colapsável (não modal)

**Decision**: O histórico de auditoria é exibido em um painel colapsável (accordion) dentro da tela de detalhe do lançamento.

**Rationale**: Um clique para expandir, sem perda de contexto. Modal exigiria gerenciar estado de abertura/fechamento e a lista de lançamentos ficaria oculta. O painel colapsável segue o padrão já usado no app para seções expansíveis.

**Alternatives considered**:
- Modal: mais código, pior UX para comparar histórico com dados atuais. Rejected.
- Tela separada de auditoria: quebra o fluxo, exige navegação adicional. Rejected.
