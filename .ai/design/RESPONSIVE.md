# Responsive Design — Rateio

Especificação de adaptação das telas entre mobile, tablet e desktop. Os
mockups em `.ai/design/screens/` são mobile-first; este documento define
como cada tela se transforma em telas maiores. **Mockups de desktop não
existem** — a implementação em React segue as regras abaixo.

## Princípios

- **Mobile-first** no CSS: classes base são mobile, `md:` e `lg:`
  adicionam comportamento desktop. Nunca o contrário.
- **Nenhuma tela usa `max-w-[390px]`** (frame de celular). O container
  de conteúdo usa `max-w-6xl` (ou `max-w-2xl` em formulários), sempre
  centralizado com margem.
- **A experiência desktop não é a mobile esticada.** Muda estrutura, não
  só largura: sidebars aparecem, grids se abrem, telas viram modais.

## Breakpoints

| Nome | Largura | Alvo |
|---|---|---|
| Mobile | < 768px | Celular |
| Tablet | 768px – 1023px | iPad portrait, foldable |
| Desktop | ≥ 1024px | Laptop e monitor |

Tailwind: `md:` = ≥ 768px, `lg:` = ≥ 1024px.

## Navegação global (AppShell)

Componente `src/components/layout/AppShell.tsx` que envolve todas as
telas logadas. Três comportamentos:

**Mobile (< 768px)**
- Sem sidebar.
- `BottomNav` fixo no rodapé, 2 itens (Rateios, Configurações).
- FAB apenas nas telas que têm (Home, Detalhe).

**Tablet (768–1023px)**
- Sem sidebar.
- **Top nav** no header: logo à esquerda, tabs "Rateios" / "Configurações"
  no centro, avatar à direita.
- Sem bottom nav. Sem FAB — as ações ficam em botões no header ou inline.

**Desktop (≥ 1024px)**
- **Sidebar esquerda** fixa, `w-60` (240px), altura total.
  - Topo: logo "Rateio".
  - Meio: links "Rateios" e "Configurações" com ícone + label, item
    ativo com fundo `bg-primary/10` e texto primary.
  - Rodapé: avatar + nome do usuário + botão "Sair" (ícone `logout`,
    tooltip).
- **Área de conteúdo** ocupa o restante (`flex-1`), com `max-w-6xl`
  centralizado e padding horizontal 32px.
- Sem bottom nav. Sem FAB — ações primárias ficam no header de cada tela.

## Adaptação por tela

### Login (`#/login`)

| | Mobile | Tablet | Desktop |
|---|---|---|---|
| Layout | Coluna única, full-width | Card `max-w-md` centralizado | **Split 50/50** |
| Esquerda | — | — | Painel verde (`bg-primary` ou gradiente suave) com logo grande + tagline "Controle de despesas compartilhadas" + ilustração/pattern sutil |
| Direita | Formulário | Card com formulário | Formulário `max-w-md` centralizado verticalmente |

### Cadastro (`#/cadastro`)

Mesmo padrão do Login (split 50/50 no desktop, com painel verde à
esquerda).

### Home (`#/rateios`)

| | Mobile | Tablet | Desktop |
|---|---|---|---|
| Container | Full-width, px-4 | `max-w-3xl` centralizado | Área do AppShell (`max-w-6xl`) |
| Lista de rateios | Empilhada | Empilhada, cards mais largos | **Grid 2 colunas** (`grid-cols-2`) ou 3 em telas muito largas (`xl:grid-cols-3`) |
| Card de resumo global | Topo | Topo | Topo, ocupa largura toda |
| CTA "Novo rateio" | FAB circular | Botão no header | Botão no header (`+ Novo rateio`, primary) |

### Detalhe do Rateio (`#/rateios/:id`)

| | Mobile | Tablet | Desktop |
|---|---|---|---|
| Layout | Coluna única empilhada | Coluna única, `max-w-2xl` | **Duas colunas** |
| Coluna esquerda | — | — | `w-96` (384px): card de saldo + 2 botões (Nova despesa, Novo reembolso) + card "Saldos por participante" |
| Coluna direita | — | — | `flex-1`: extrato cronológico (sticky month headers funcionam) |
| Ordem no mobile | Saldo → botões → participantes → extrato | Igual mobile | — |

### Memória de Cálculo (`#/rateios/:id/lancamento/:id`)

| | Mobile | Tablet | Desktop |
|---|---|---|---|
| Formato | Página cheia | **Modal `max-w-2xl`** sobre a tela de Detalhe | **Modal `max-w-3xl`** sobre a tela de Detalhe |
| Estrutura interna | Empilhada | **Duas colunas**: esquerda dados + índices, direita fórmula + impacto | Igual tablet |
| Backdrop | Sem | `bg-black/40 backdrop-blur-sm` | Igual |
| Fechar | Botão no header | X no canto do modal + `Esc` + click no backdrop | Igual |

### Formulários (Nova Despesa, Novo Reembolso, Novo Rateio, Config Rateio, Config Globais)

| | Mobile | Tablet | Desktop |
|---|---|---|---|
| Formato | Página cheia | **Modal `max-w-xl`** ou card `max-w-xl` centralizado | **Card `max-w-2xl` centralizado** com espaço generoso em volta |
| Área em branco | Nenhuma | 32px em volta | 48px+ em volta |
| Botões (Salvar / Cancelar) | Footer fixo no rodapé da página | Footer do card | Footer do card, alinhado à direita |

**Formulários que são Modal** (abrem sobre a tela anterior): Nova Despesa,
Novo Reembolso, Novo Rateio, Memória de Cálculo, Config Rateio.
**Páginas cheias** (rotas próprias): Login, Cadastro, Home, Detalhe,
Config Globais.

### Configurações Globais (`#/config`)

| | Mobile | Tablet | Desktop |
|---|---|---|---|
| Formato | Página cheia | `max-w-2xl` centralizado | `max-w-3xl` centralizado, grid de 2 colunas nos cards de seção (Conta/Aparência à esquerda, Índice/Sobre à direita) |

## Componentes com comportamento responsivo

### `BottomNav`
- Só renderiza em `< 768px` (`md:hidden`).
- Em `≥ 768px`: `hidden`.

### `Sidebar`
- Só renderiza em `≥ 1024px` (`hidden lg:flex`).
- `w-60`, `fixed` ou `sticky` à esquerda, altura `100vh`.

### `TopNav` (tablet)
- Renderiza em `768px ≤ w < 1024px` (`hidden md:flex lg:hidden`).

### `FAB`
- Só mobile (`md:hidden`).
- Tablet e desktop usam botão no header.

### `Modal`
- Mobile: full-screen (via `dialog` element ou `fixed inset-0`).
- `≥ 768px`: card centralizado com backdrop.

## Regras de implementação

1. **Nenhuma classe `max-w-[390px] mx-auto border-x`.** Substituir por
   `w-full` no container raiz de cada tela.
2. **`darkMode: "class"`** continua como está — não muda com o
   breakpoint.
3. **Imagens e ilustrações**: em desktop, no painel do login, usar
   `object-cover` para preencher o split.
4. **Não redesenhar componentes.** O `DESIGN.md` continua sendo a fonte
   dos tokens. Só a **composição** das telas muda por breakpoint.
5. **Testar sempre 3 widths**: 390px (iPhone), 834px (iPad portrait),
   1440px (laptop).

## Checklist de validação

Para cada tela, verificar em 390 / 834 / 1440:
- [ ] Sem scroll horizontal.
- [ ] Textos legíveis (nada menor que 14px em mobile).
- [ ] Áreas de toque com ≥ 44×44px em mobile.
- [ ] Bottom nav some em tablet/desktop.
- [ ] Sidebar aparece em desktop.
- [ ] Cards/grids mudam de coluna.
- [ ] Formulários: página cheia em mobile, modal/card em tablet/desktop.
- [ ] Navegação por teclado funciona em desktop (Tab, Enter, Esc).
