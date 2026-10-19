# Refatoração responsiva do app Rateio

Leia o arquivo `.ai/design/RESPONSIVE.md` antes de começar. Ele define os
breakpoints, o comportamento da navegação e a adaptação de cada tela. O
`DESIGN.md` continua sendo a fonte dos tokens visuais; nada de cor ou
tipografia muda — só composição.

## Contexto

A implementação atual foi feita a partir dos mockups do Stitch que têm
`max-w-[390px] mx-auto border-x` no container. Isso força um "frame de
celular" que fica estranho em desktop. Precisa ser substituído por um
layout responsivo real.

## Objetivo

1. **Adicionar camada de layout responsivo** (`AppShell`) que compõe
   sidebar / top nav / bottom nav dependendo do breakpoint.
2. **Remover o frame de 390px** de todas as telas.
3. **Adaptar a composição de cada tela** conforme a tabela do
   `RESPONSIVE.md`.

## Tarefas

### T1 — Criar `src/components/layout/AppShell.tsx`

Envolve todas as telas logadas. Estrutura:

```tsx
<div className="min-h-screen flex bg-background text-on-surface">
  <Sidebar />                    {/* hidden lg:flex w-60 */}
  <div className="flex-1 flex flex-col min-w-0">
    <TopNav />                   {/* hidden md:flex lg:hidden */}
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6 lg:px-8 py-6">
        {children}
      </div>
    </main>
    <BottomNav />                {/* md:hidden */}
  </div>
</div>
```

Ajustar o `max-w-*` do `<div>` interno conforme a tela (ver tabela do
RESPONSIVE.md — formulários usam `max-w-2xl`). Uma prop `maxWidth` no
`AppShell` resolve isso.

### T2 — `Sidebar.tsx`, `TopNav.tsx`, `BottomNav.tsx`

Criar os 3 componentes de navegação conforme o `RESPONSIVE.md`. Todos
usam o mesmo array de items:

```ts
const navItems = [
  { label: "Rateios", icon: "payments", path: "#/rateios" },
  { label: "Configurações", icon: "settings", path: "#/config" },
];
```

Aplicar `dark:` conforme os tokens já definidos no `tailwind.config.ts`.

### T3 — Login e Cadastro

- Refatorar para split 50/50 no `lg:` (`lg:grid lg:grid-cols-2`).
- Painel esquerdo: `hidden lg:flex`, `bg-primary` (ou gradiente),
  logo grande, tagline. Adicionar um pattern sutil (SVG inline ou
  `bg-[radial-gradient(...)]` discreto).
- Painel direito: formulário `max-w-md mx-auto`.

### T4 — Home

- Remover `max-w-[390px]` do container.
- Lista de rateios: `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4`.
- FAB: `md:hidden`. Adicionar botão "+ Novo rateio" no header apenas em
  `md:` em diante.

### T5 — Detalhe do Rateio

- `lg:grid lg:grid-cols-[384px_1fr] lg:gap-6`.
- Coluna esquerda: card de saldo + 2 botões + participantes.
- Coluna direita: extrato.
- No mobile: continuar empilhado na ordem atual.
- Remover FAB no `md:` em diante. Botões de ação no header em tablet/desktop.

### T6 — Memória de Cálculo, Nova Despesa, Novo Reembolso, Novo Rateio, Config Rateio

- Transformar em **modal** em `md:` em diante (usa `dialog` ou
  `fixed inset-0 z-50 flex items-center justify-center` com card
  `max-w-2xl`).
- Em mobile: continuar como página cheia.
- Botão "Cancelar" e backdrop fecham o modal.
- `Esc` fecha.

### T7 — Configurações Globais

- `max-w-3xl` centralizado.
- Em `lg:`, `grid grid-cols-2 gap-6` nos 4 cards de seção: Conta e
  Aparência na coluna 1; Índice e Sobre na coluna 2.

### T8 — Limpeza

- Buscar `max-w-[390px]`, `mx-auto border-x`, `code-*` no código de
  produção e remover.
- Buscar `bg-[#` e `text-[#` hardcoded e trocar por tokens do
  Tailwind (`bg-background`, `text-on-surface`, etc.).
- Verificar que `darkMode: "class"` continua funcionando em todos os
  breakpoints.

### T9 — Testes manuais

Rodar `pnpm dev` e validar em 3 widths:

- **390px** (DevTools iPhone 12 Pro): tudo como antes.
- **834px** (iPad portrait): top nav aparece, bottom nav some, FAB some,
  botões de ação migram para header.
- **1440px** (laptop): sidebar aparece, home vira grid, detalhe vira 2
  colunas, formulários viram modal.

Reportar screenshot ou descrição de cada tela nos 3 breakpoints.

## O que NÃO fazer

- Não alterar cores, tipografia, espaçamento interno dos componentes,
  cantos, sombras ou ícones. O `DESIGN.md` está aprovado.
- Não redesenhar componentes. Só recompor a estrutura das telas.
- Não adicionar novas funcionalidades. Só responsividade.
- Não alterar a lógica de cálculo, dados, ou navegação.

## Definção de pronto

- [ ] `AppShell` com sidebar/topnav/bottomnav condicionais por breakpoint.
- [ ] Nenhuma tela usa `max-w-[390px]`.
- [ ] Login e Cadastro com split 50/50 em desktop.
- [ ] Home com grid em desktop.
- [ ] Detalhe com 2 colunas em desktop.
- [ ] Formulários como modal em `md:` em diante.
- [ ] Config Globais com grid de 2 colunas em `lg:`.
- [ ] Todas as telas testadas em 390 / 834 / 1440.
- [ ] `dark:` funcionando em todos os breakpoints.
- [ ] Sem cores hardcoded no código de produção.

Reporte ao final: o que foi feito, o que ficou pendente, e screenshots
ou descrição das telas principais (Home, Detalhe, Nova Despesa) em
mobile / tablet / desktop.