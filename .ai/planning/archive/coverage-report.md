# Coverage Report — D-004

Gerado em: 2026-10-27  
Provider: v8 (`@vitest/coverage-v8`)  
Escopo: `src/core/**`, `src/components/**`

## Resumo geral

| Métrica   | % atual |
|-----------|---------|
| Statements| 23.81%  |
| Branches  | 81.15%  |
| Functions | 56.00%  |
| Lines     | 23.81%  |

O número baixo é puxado pelos componentes (0% de linhas em todos). O core já está em ~98%.

---

## src/core/ — estado atual

| Arquivo       | Stmts  | Branch | Funcs  | Lines  | Linhas descobertas |
|---------------|--------|--------|--------|--------|--------------------|
| `decimal.ts`  | 100%   | 100%   | 100%   | 100%   | —                  |
| `indice.ts`   | 100%   | 94.11% | 100%   | 100%   | 16                 |
| `saldo.ts`    | 100%   | 93.33% | 100%   | 100%   | 109, 142           |
| `unidades.ts` | 91.3%  | 100%   | 66.66% | 91.3%  | 25–26 (`D2`)       |

**Gaps no core:**
- `indice.ts:16` — branch não exercitado (provavelmente o caminho de data fora da série)
- `saldo.ts:109` e `saldo.ts:142` — branches de edge-case no cálculo de excesso/déficit
- `unidades.ts:25–26` — função `D2` (alias de `D()`) sem teste; candidata a remoção se não usada

---

## src/components/ — estado atual

Nenhum componente tem teste. Cobertura de linhas = 0% em todos.

| Arquivo                     | Stmts | Branch | Funcs | Lines | Observação                          |
|-----------------------------|-------|--------|-------|-------|-------------------------------------|
| `ThemeProvider.tsx`         | 0%    | 0%     | 0%    | 0%    | Gerencia dark/light mode            |
| `layout/AppShell.tsx`       | 0%    | 100%   | 100%  | 0%    | Shell de layout (sem lógica)        |
| `layout/FormShell.tsx`      | 0%    | 0%     | 0%    | 0%    | Layout de formulários               |
| `layout/Sidebar.tsx`        | 0%    | 0%     | 0%    | 0%    | Sidebar de navegação                |
| `layout/TopNav.tsx`         | 0%    | 0%     | 0%    | 0%    | Barra de navegação superior         |
| `ui/Avatar.tsx`             | 0%    | 100%   | 100%  | 0%    | Sem lógica condicional              |
| `ui/Badge.tsx`              | 0%    | 100%   | 100%  | 0%    | Sem lógica condicional              |
| `ui/BottomNav.tsx`          | 0%    | 0%     | 0%    | 0%    | Navegação inferior mobile           |
| `ui/Button.tsx`             | 0%    | 0%     | 0%    | 0%    | Variantes: primary/secondary/ghost  |
| `ui/Card.tsx`               | 0%    | 100%   | 100%  | 0%    | Sem lógica condicional              |
| `ui/FAB.tsx`                | 0%    | 100%   | 100%  | 0%    | Sem lógica condicional              |
| `ui/GoogleButton.tsx`       | 0%    | 0%     | 0%    | 0%    | Dispara signInWithGoogle            |
| `ui/Header.tsx`             | 0%    | 0%     | 0%    | 0%    | Header de página                    |
| `ui/Input.tsx`              | 0%    | 0%     | 0%    | 0%    | Input controlado com label/error    |
| `ui/Switch.tsx`             | 0%    | 0%     | 0%    | 0%    | Toggle booleano                     |

**Observação sobre branch %**: v8 reporta 100% de branches em arquivos como `Avatar.tsx`, `Badge.tsx`, `Card.tsx`, `FAB.tsx` porque não têm condicionais no nível do módulo — isso não significa que o componente foi renderizado ou testado.

---

## Análise de prioridade para testes

### Alta prioridade (têm lógica condicional)
- `ui/Button.tsx` — variantes, disabled, loading
- `ui/Input.tsx` — estado com/sem erro, label
- `ui/Switch.tsx` — toggle on/off, disabled
- `ui/BottomNav.tsx` — item ativo vs inativo
- `ThemeProvider.tsx` — alternância de tema
- `layout/Sidebar.tsx` — estado aberto/fechado, item selecionado

### Média prioridade (renderização básica)
- `ui/Header.tsx`
- `layout/FormShell.tsx`
- `layout/TopNav.tsx`
- `ui/GoogleButton.tsx`

### Baixa prioridade (sem lógica, render direto)
- `ui/Avatar.tsx`, `ui/Badge.tsx`, `ui/Card.tsx`, `ui/FAB.tsx`
- `layout/AppShell.tsx`

### Core — gaps mínimos (< 10% de esforço)
- `unidades.ts:25–26` — testar `D2` ou remover se não usada
- `indice.ts:16` — verificar qual branch não é exercitado
- `saldo.ts:109,142` — edge-cases de excesso/déficit

---

## Meta de coverage — 90% (aprovada)

Thresholds configurados em `vitest.config.ts`:
```ts
coverage: {
  thresholds: { statements: 90, branches: 90, functions: 90, lines: 90 },
}
```

## Resultado final (D-004 ✅)

| Métrica   | Resultado | Threshold |
|-----------|-----------|-----------|
| Statements| 100%      | ≥ 90% ✓  |
| Branches  | 94.33%    | ≥ 90% ✓  |
| Functions | 93.33%    | ≥ 90% ✓  |
| Lines     | 100%      | ≥ 90% ✓  |

**Total de testes**: 209 (18 arquivos)

### Branches restantes não cobertas (não são bugs)

| Arquivo | Linha | Motivo |
|---|---|---|
| `indice.ts:16` | `return mapa` em `construirIndicesAcumulados` | Código defensivo; chamador já valida array vazio antes |
| `saldo.ts:109` | `if (valor.isZero()) continue` | Matematicamente inalcançável com Decimal.js (produto de dois não-zeros) |
| `ThemeProvider.tsx:32` | `catch {}` em `getStoredTheme` | localStorage não lança no ambiente de produção |
| `ThemeProvider.tsx:61-62` | `setTheme` com `userIdRef` definido | Branch de path menos comum |
| `Sidebar.tsx:12` e `TopNav.tsx:12` | `?? ''` quando user=null | Caso de logout em progresso |
| `Sidebar.tsx:59` e `TopNav.tsx:51` | `catch` do signOut | Erro de rede no logout |
