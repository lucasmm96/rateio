# Quickstart / Validation Guide: Fix Config. Rateio

**Date**: 2026-10-26

## Pré-requisitos

- App rodando localmente: `npm run dev` → `http://localhost:5173`
- Conta com acesso ao rateio "teste" (usuário dono)
- Conta sem acesso ao rateio "teste" (usuário membro não-dono, ou conta diferente)

## Cenários de validação

### V-1 — Dono abre o modal e vê o formulário (SC-001, SC-004)

1. Autenticar como dono do rateio "teste".
2. Navegar para `/configuracoes?rateio=<id-do-teste>`.
3. **Esperado**: em até 3 s, o modal exibe todos os campos preenchidos:
   - Nome do rateio com o valor atual
   - Toggle IPCA no estado correto
   - Cotas de cada membro
   - Seção "Adicionar participante"
   - Seção "Zona de perigo" com botão arquivar

### V-2 — Loading visível durante fetch (SC-002)

1. Abrir DevTools → Network → throttle para "Slow 4G".
2. Navegar para `/configuracoes?rateio=<id-do-teste>`.
3. **Esperado**: "Carregando…" aparece imediatamente; formulário aparece quando dados chegam.
4. Remover throttle.

### V-3 — Reabertura rápida não causa branco (SC-004 — repro do bug)

1. Autenticar como dono.
2. Navegar para `/` (home).
3. Abrir o rateio "teste".
4. Clicar em "Config." / ícone de configurações.
5. Fechar o modal (botão voltar ou Escape).
6. Repetir passos 3–5 por 10 vezes consecutivas.
7. **Esperado**: em nenhuma das 10 tentativas o modal abre completamente vazio.

### V-4 — Erro de query exibe mensagem (SC-003)

1. Autenticar.
2. Navegar para `/configuracoes?rateio=uuid-inexistente-aaaaaaaa-0000-0000-0000-000000000000`.
3. **Esperado**: modal exibe "Rateio não encontrado ou sem acesso." (não tela branca).

### V-5 — Não-dono vê mensagem de acesso (US-4)

1. Autenticar como membro não-dono do rateio "teste".
2. Navegar para `/configuracoes?rateio=<id-do-teste>`.
3. **Esperado**: modal exibe "Apenas o criador do rateio pode alterar as configurações." com botão de voltar.

## Comandos de desenvolvimento

```bash
npm run dev           # inicia servidor em http://localhost:5173
npm test              # roda suite Vitest (sem testes de rede)
npm run lint          # oxlint — sem warnings novos esperados
```

## Critério de "feito"

Todos os 5 cenários acima passam manualmente E `npm run lint` sem erros novos.
