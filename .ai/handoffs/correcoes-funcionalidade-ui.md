# Handoff: Correções de Funcionalidade e UI

**Data:** 2026-10-20  
**Origem:** Auditoria completa do repositório  
**Total de itens:** 20 (6 bugs funcionais, 3 features incompletas, 6 bugs de UI, 5 inconsistências de design)

---

## Bugs Funcionais

### BF-01 — `NovoReembolso.tsx:25` — recebedor inicia vazio

`useState(outrosMembros[0]?.user_id ?? '')` é avaliado no mount quando `rateio` ainda é `null`, então `outrosMembros` está vazio e o estado fica `''`. O botão "Registrar reembolso" fica desabilitado até o usuário clicar manualmente em alguém — mesmo quando só existe uma outra pessoa no rateio.

**Fix:** trocar para um `useEffect` que seta o primeiro membro disponível quando `outrosMembros` carregar.

---

### BF-02 — `DetalheRateio.tsx:33–36` — erros de query silenciados

Os 4 `useAsync` hooks retornam `error`, mas o componente só desestrutura `data` e `loading`. Se qualquer query falhar (rede, RLS, token expirado), o usuário vê a página em branco sem nenhuma mensagem.

**Fix:** checar cada `error` e renderizar um componente de erro com mensagem e botão de retry.

---

### BF-03 — `Cadastro.tsx:185–187` — links para rotas inexistentes

Links para `/termos` e `/privacidade` são renderizados no formulário de cadastro, mas essas rotas não existem em `App.tsx`. Clicando neles o usuário cai na página 404.

**Fix (simples):** remover os links ou substituir por `href="#"` até as páginas existirem. **(Fix completo):** criar as rotas em FI-03.

---

### BF-04 — `Configuracoes.tsx:88–91` — toast "Rateio atualizado" sem mudança real

`setSucessoRateio(true)` é chamado incondicionalmente após o try, mesmo quando nenhuma mudança foi feita (`if (diferente)` guarda o `editarRateio`, mas não o toast).

**Fix:** mover `setSucessoRateio(true)` para dentro do bloco `if (diferente)`.

---

### BF-05 — `Configuracoes.tsx:157` — não-donos podem tentar salvar cotas

A seção de cotas não tem guarda `isOwner`. Não-donos veem os inputs e o botão "Salvar cotas"; clicando recebem um erro genérico do banco sem explicação.

**Fix:** envolver a seção de cotas em `{isOwner && ...}` ou desabilitar inputs + botão com tooltip explicativo para não-donos.

---

### BF-06 — `useAsync.ts:19` — dados antigos visíveis ao trocar de rateio

`data` não é resetado para `null` quando as dependências mudam (apenas `loading` vai para `true`). Ao navegar de `/rateios/A` para `/rateios/B`, os dados do rateio A ficam exibidos durante o carregamento do B.

**Fix:** resetar `data` para `null` no início do `useEffect` quando as dependências mudarem.

---

## Features Incompletas

### FI-01 — Adicionar participante após criação do rateio

O design spec mostra botão "Adicionar participante" na tela de configurações. Atualmente só é possível adicionar membros na criação.

**Arquivos:** `src/routes/Configuracoes.tsx`, `src/db/queries.ts`  
**Fix:** criar RPC `adicionar_membro` no banco + UI em Configuracoes com busca por e-mail (`buscar_usuario_por_email` já existe e pode ser reutilizada).

---

### FI-02 — Excluir/editar despesa e reembolso

`deletarDespesa` existe em `src/db/queries.ts:163` e está exportada, mas nenhum componente a chama. Não há como excluir ou editar uma despesa/reembolso pelo app.

**Fix:** adicionar botão de exclusão (com diálogo de confirmação) no card de cada despesa/reembolso no extrato.

---

### FI-03 — Rotas `/termos` e `/privacidade` não implementadas

Linkadas em `Cadastro.tsx` mas sem componente nem rota em `App.tsx`.

**Fix:** criar componentes mínimos (conteúdo placeholder aceitável) e registrar as rotas.

---

## Bugs de UI

### UI-01 — Tokens de cor ausentes → elementos transparentes *(crítico)*

Classes usadas extensivamente não existem em `tailwind.config.ts` nem em `globals.css`:
- `bg-secondary-container`, `text-on-secondary-container`
- `bg-surface-container`, `bg-surface-container-high`, `bg-surface-container-low`, `bg-surface-container-lowest`
- `text-tertiary`

Tailwind não gera essas classes → fundos transparentes em: avatar do logo (Sidebar e TopNav), painel de branding no Login/Cadastro, hover de cards de rateio na Home, vários estados em DetalheRateio e Configuracoes.

**Fix:** mapear os tokens faltantes de `.ai/design/DESIGN.md` para `tailwind.config.ts`.

---

### UI-02 — `Login.tsx:42` — gradiente vaza do painel de branding

O overlay radial usa `absolute inset-0`, mas o painel pai não tem `relative`. `Cadastro.tsx` tem `relative overflow-hidden` corretamente na linha 55; `Login.tsx` não tem.

**Fix:** adicionar `relative overflow-hidden` ao painel pai no Login.

---

### UI-03 — Ícone inconsistente para "Rateios" entre mobile e desktop

`BottomNav.tsx:10` usa ícone `calculate`. `Sidebar.tsx:6` usa `payments`. Mesmo item de nav, ícones diferentes.

**Fix:** padronizar para um único ícone (checar qual o design spec usa).

---

### UI-04 — `RedefinirSenha.tsx` — toggle de senha compartilhado entre campos

Ambos os campos ("Nova senha" e "Confirmar senha") usam o mesmo estado `mostrarSenha`. O botão de toggle só existe no primeiro campo. Quando o usuário revela a nova senha, a confirmação também é revelada involuntariamente.

**Fix:** estados separados `mostrarNovaSenha` / `mostrarConfirmarSenha`, com botão de toggle em cada campo.

---

### UI-05 — `DetalheRateio.tsx:302` — aba "Saldos" sem empty state

Se `resultado === null` ou `membros.length === 0`, a aba exibe nada — nenhuma mensagem, spinner ou orientação.

**Fix:** adicionar empty state com ícone e mensagem orientativa.

---

### UI-06 — `DetalheRateio.tsx:331` — coluna de saldos some no desktop sem aviso

No layout `lg:grid`, quando `resultado === null && !loading`, a coluna esquerda de saldos desaparece silenciosamente.

**Fix:** renderizar empty state na coluna de saldos mesmo no layout desktop.

---

## Inconsistências com o Design Spec

### ID-01 — DetalheRateio — Hero Balance Card do usuário logado ausente

O design mostra um card proeminente no topo com o saldo líquido do usuário logado, badge contextual ("Líquido favorável" / "Você deve") e quick-stats "Você pagou / Sua cota real". A implementação exibe todos os participantes igualmente sem destacar o usuário atual.

**Fix:** calcular saldo do `currentUser` em `resultado` e renderizar card destacado no topo da aba Saldos.

---

### ID-02 — DetalheRateio — Extrato sem agrupamento mensal, sem badges, sem IPCA por item

O design mostra: cabeçalhos mensais sticky, badge "Paga" (verde) em despesas quitadas, anotação de correção IPCA por item ("+1,57%"). A implementação lista tudo flat sem agrupamento, sem badges e sem indicação de correção.

**Fix:** agrupar itens por mês/ano, adicionar badge condicional "Paga" e calcular + exibir a correção IPCA percentual por item.

---

### ID-03 — Configuracoes — layout de cotas diverge do design

O design mostra: e-mail completo do participante + cota em linha única + botão de remoção. A implementação exibe só username truncado + input de cota, sem e-mail e sem botão de remoção.

**Fix:** exibir e-mail completo do participante e adicionar botão de remoção de membro (owner-only).

---

### ID-04 — `Button.tsx:37` — raio de borda errado

Design spec: botões devem usar 8px (`rounded`). `Button.tsx` usa `rounded-lg` = 16px. Todos os botões do app ficam mais arredondados que o especificado.

**Fix:** trocar `rounded-lg` por `rounded` em `Button.tsx`.

---

### ID-05 — `DetalheRateio.tsx` — componentes inline causam remount

`SaldosContent` e `ExtratoContent` são declarados como `const` dentro do componente pai. React os trata como novos tipos a cada render → unmount/remount desnecessário. Não quebra agora (sem estado local), mas vai gerar bugs ao adicionar interatividade.

**Fix:** mover para fora do componente pai ou extrair para arquivos próprios.

---

## Ordem de execução sugerida

| Ordem | ID | Justificativa |
|---|---|---|
| 1 | UI-01 | Crítico — tokens ausentes afetam visual de quase tudo |
| 2 | BF-06 | Afeta todos os fluxos de navegação entre rateios |
| 3 | BF-01, BF-02 | Bugs de formulário e erros silenciosos |
| 4 | BF-04, BF-05 | Bugs de lógica em Configurações |
| 5 | UI-02, UI-03, UI-04, UI-05, UI-06 | Polish de UI |
| 6 | ID-04, ID-05 | Quick fixes de design |
| 7 | BF-03, FI-03 | Rotas faltando |
| 8 | ID-01, ID-02, ID-03 | Alinhamento com design spec (mais trabalhoso) |
| 9 | FI-01, FI-02 | Features incompletas (maior esforço, requer mudança de schema) |

## Verificação por item

- **UI-01**: Inspecionar DevTools → garantir que as classes Tailwind são geradas e aplicam cor
- **BF-06**: Navegar rapidamente entre dois rateios; dados do anterior não devem aparecer
- **BF-01**: Abrir NovoReembolso em rateio com 2 membros; botão deve estar habilitado sem clique manual
- **BF-02**: Simular falha de rede; página deve mostrar mensagem de erro
- **BF-05**: Logar como membro não-dono; seção de cotas não deve ser editável
- **ID-02**: Extrato deve agrupar por mês com cabeçalho e mostrar badge "Paga"
