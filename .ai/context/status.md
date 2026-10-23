# Status de implementação — Rateio

Última atualização: 2026-10-23

## Fases concluídas

Todas as fases do projeto original foram implementadas:

| Fase | Descrição | Status |
|------|-----------|--------|
| 0 | Infraestrutura (Vite, Tailwind, Drizzle, Neon) | ✅ |
| 1 | Auth (Neon Auth, Better Auth, Google OAuth) | ✅ |
| 2 | Schema e RLS (Postgres, triggers, RPCs) | ✅ |
| 3 | Core financeiro (`src/core/`: Decimal, IPCA, saldo Forma B) | ✅ |
| 4 | Data API e queries (`src/db/`) | ✅ |
| 5 | Telas principais (Home, DetalheRateio, NovaDespesa, NovoReembolso) | ✅ |
| 6 | Configurações (globais, cotas, membros, IPCA toggle) | ✅ |
| 7 | Memória de cálculo (MemoriaCalculo) | ✅ |
| 8 | Design system e UI polish (tokens, dark mode, ThemeProvider) | ✅ |
| 9 | Deploy (Vercel, BrowserRouter, vercel.json, GitHub Actions IPCA/backup) | ✅ |

## Itens verificados em revisão de código (out/2026)

Todos os itens abaixo foram inspecionados diretamente no código-fonte:

| Item | Descrição | Status |
|------|-----------|--------|
| BF-01 | Recebedor padrão em NovoReembolso inicializado via useEffect | ✅ |
| BF-02 | Estado de erro em DetalheRateio com ícone, mensagem e retry | ✅ |
| BF-04 | Toast de sucesso em Configurações só dispara quando há mudanças | ✅ |
| BF-05 | Seção de Cotas protegida por guard `isOwner` | ✅ |
| BF-06 | Race condition em `useAsync.ts` corrigida (`setData(null)` antes do fetch) | ✅ |
| FI-01 | Adicionar/remover membro em Configurações implementado | ✅ |
| FI-02 | Excluir despesa/reembolso com dialog de confirmação em DetalheRateio | ✅ |
| ID-01 | Hero Balance Card do usuário corrente em SaldosContent | ✅ |
| ID-02 | Extrato agrupado por mês com cabeçalho sticky | ✅ |
| ID-03 | Layout de cotas em Configurações (card com email, input %, remove) | ✅ |
| ID-04 | Button com `rounded` (não `rounded-lg`) | ✅ |
| ID-05 | `SaldosContent` e `ExtratoContent` como funções autônomas fora do `Component` | ✅ |
| UI-02 | Painel brand do Login com `relative overflow-hidden` | ✅ |
| UI-04 | Toggle de senha em RedefinirSenha (dois campos independentes) | ✅ |
| UI-05 | Empty state no extrato ("Nenhuma movimentação ainda.") | ✅ |
| UI-06 | Empty states no saldos (sem participantes / sem despesas) | ✅ |

## Itens em aberto

| Item | Descrição | Prioridade |
|------|-----------|-----------|
| UI-01 | Tokens de espaçamento (`space-xs/sm/md/lg/xl`) usados em JSX mas não definidos em `tailwind.config.ts` — provavelmente classes sem efeito | Baixa |
| UI-03 | Ícones de navegação (BottomNav) não usam `fontVariationSettings: 'FILL' 1` no estado ativo | Baixa |

## Arquitetura atual

- **Roteamento**: `createBrowserRouter` (não hash routing)
- **Deploy**: Vercel (Hobby) com `vercel.json` SPA rewrite
- **Auth**: Neon Auth (JWT) — `garantirUsuario` deve ser chamado após login
- **DB**: Neon Postgres + Drizzle ORM + RLS em todas as tabelas
- **Core financeiro**: `src/core/saldo.ts:calcularSaldo()` — função pura, testável
