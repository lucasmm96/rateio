# Prompt: Implementar correções de funcionalidade e UI

Você está trabalhando no repositório `rateio` (C:\Users\lucas\Documents\git\rateio).

Leia o handoff completo em `.ai/handoffs/correcoes-funcionalidade-ui.md` antes de começar. Ele contém 20 itens catalogados com arquivo, linha, problema e fix.

## Sua tarefa

Implemente **todos os itens** do handoff, na ordem sugerida abaixo. Para cada item, crie uma task no TaskCreate, marque como `in_progress` ao iniciar, e `completed` ao terminar.

## Ordem de execução

### Fase 1 — Crítico (UI e dados)
1. **UI-01** — Adicionar tokens de cor ausentes em `tailwind.config.ts` mapeando de `.ai/design/DESIGN.md`. Tokens faltando: `secondary-container`, `on-secondary-container`, `surface-container`, `surface-container-high`, `surface-container-low`, `surface-container-lowest`, `tertiary`.
2. **BF-06** — `src/hooks/useAsync.ts`: resetar `data` para `null` no início do `useEffect` quando as dependências mudarem, antes de iniciar o novo fetch.

### Fase 2 — Bugs funcionais
3. **BF-01** — `src/routes/NovoReembolso.tsx`: trocar `useState(outrosMembros[0]?.user_id ?? '')` por `useState('')` + `useEffect` que chama `setRecebedorUserId(outrosMembros[0]?.user_id ?? '')` quando `outrosMembros` carregar.
4. **BF-02** — `src/routes/DetalheRateio.tsx`: tratar os `error` retornados pelos 4 `useAsync` hooks; renderizar mensagem de erro e botão de retry se qualquer um falhar.
5. **BF-04** — `src/routes/Configuracoes.tsx`: mover `setSucessoRateio(true)` para dentro do bloco `if (diferente)`.
6. **BF-05** — `src/routes/Configuracoes.tsx`: envolver a seção de cotas em `{isOwner && ...}` (ou desabilitar inputs e botão para não-donos com tooltip explicativo).

### Fase 3 — Polish de UI
7. **UI-02** — `src/routes/Login.tsx`: adicionar `relative overflow-hidden` ao painel de branding (o pai do overlay radial `absolute inset-0`).
8. **UI-03** — Padronizar ícone de "Rateios" entre `src/components/BottomNav.tsx` e `src/components/Sidebar.tsx` (checar `.ai/design/DESIGN.md` ou os mockups em `.ai/design/screens/` para saber o ícone correto).
9. **UI-04** — `src/routes/RedefinirSenha.tsx`: separar em `mostrarNovaSenha` / `mostrarConfirmarSenha`, adicionar botão de toggle em cada campo individualmente.
10. **UI-05** — `src/routes/DetalheRateio.tsx`: adicionar empty state na aba "Saldos" quando `resultado === null` ou `membros.length === 0`.
11. **UI-06** — `src/routes/DetalheRateio.tsx`: renderizar empty state na coluna de saldos no layout desktop quando `resultado === null && !loading`.

### Fase 4 — Quick fixes de design
12. **ID-04** — `src/components/ui/Button.tsx`: trocar `rounded-lg` por `rounded`.
13. **ID-05** — `src/routes/DetalheRateio.tsx`: mover `SaldosContent` e `ExtratoContent` para fora do componente pai (podem ser funções no mesmo arquivo, só precisam estar no escopo do módulo, não dentro de outro componente).

### Fase 5 — Rotas faltando
14. **BF-03 + FI-03** — Criar rotas `/termos` e `/privacidade` em `src/App.tsx` com componentes mínimos (conteúdo placeholder). Remover ou corrigir os links em `src/routes/Cadastro.tsx` para apontar para as rotas corretas.

### Fase 6 — Alinhamento com design spec
15. **ID-01** — `src/routes/DetalheRateio.tsx`: na aba Saldos, adicionar Hero Balance Card no topo destacando o saldo do usuário logado (`resultado.deve` ou `resultado.aReceber` para o `currentUser`) com badge contextual ("Você deve" / "Líquido favorável") e quick-stats "Você pagou / Sua cota real".
16. **ID-02** — `src/routes/DetalheRateio.tsx` (extrato): agrupar itens por mês/ano com cabeçalhos sticky; adicionar badge "Paga" (verde) em despesas com `data <= hoje`; calcular e exibir correção IPCA percentual por item quando `corrigir_ipca=true`.
17. **ID-03** — `src/routes/Configuracoes.tsx` (seção de cotas): exibir e-mail completo do participante; adicionar botão de remoção de membro (owner-only) com confirmação.

### Fase 7 — Features incompletas (maior esforço)
18. **FI-02** — Adicionar botão de exclusão com diálogo de confirmação em cada item do extrato (despesas e reembolsos). `deletarDespesa` já existe em `src/db/queries.ts:163`; verificar se existe equivalente para reembolsos.
19. **FI-01** — Adicionar participante após criação: criar RPC `adicionar_membro` no banco (migração Drizzle), adicionar query em `src/db/queries.ts`, adicionar UI em `src/routes/Configuracoes.tsx` com busca por e-mail (reutilizar `buscar_usuario_por_email` já existente).

## Restrições importantes

- **Nunca use `number` para dinheiro ou índices** — sempre `decimal.js` via `D()`.
- **Nunca use hex hardcoded em componentes** — apenas tokens CSS (`bg-surface`, `text-primary`, etc.).
- **Toda lógica financeira fica em `src/core/`**, nunca inline em componentes.
- **Novas tabelas ou RPCs exigem migração Drizzle** — nunca DDL manual.
- **Não adicione comentários desnecessários** — só quando o "porquê" for não óbvio.

## Verificação ao final

Execute `pnpm dev` e teste manualmente:
- [ ] Tokens Tailwind corretos no DevTools (UI-01)
- [ ] Trocar de rateio não mostra dados do anterior (BF-06)
- [ ] NovoReembolso abre com recebedor pré-selecionado (BF-01)
- [ ] Falha de rede mostra mensagem de erro em DetalheRateio (BF-02)
- [ ] Salvar sem mudanças não exibe toast (BF-04)
- [ ] Não-dono não vê seção de cotas editável (BF-05)
- [ ] Extrato agrupa por mês e mostra badge "Paga" (ID-02)
- [ ] Botão rounded correto em todos os lugares (ID-04)

Execute `pnpm test` para garantir que nenhum teste de `src/core/` quebrou.
