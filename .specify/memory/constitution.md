# Constitution — Apps de Controle de Rateios

Princípios reutilizáveis para qualquer app derivado de planilha de controle
de despesas compartilhadas entre pessoas. O app piloto é o "Controle de
Rateios" (apartamento Lucas + Letícia). Estes princípios valem para os
próximos.

## Princípios

### 1. Cálculo em módulo puro, com testes
Toda regra financeira (correção, saldo, rateio) vive em funções puras,
sem dependência de UI, banco ou rede. Testadas com dados reais migrados
como oráculo. Nenhum cálculo financeiro no componente visual nem na query.

### 2. Dinheiro e índices em decimal
Nunca usar `number` (float binário) para dinheiro ou índices. Usar lib
decimal (`decimal.js`). Arredondamento explícito e documentado em cada
operação. Valores gravados com precisão para reproduzir o oráculo.

### 3. Séries e taxas configuráveis, e opcionais
A fonte da correção (BCB SGS, código da série) é parâmetro, não hardcoded.
Um fork pode trocar IPCA por IGP-M, INCC, etc. sem editar o núcleo do
cálculo. Correção é **opcional por rateio** — se desligada, tudo é
nominal.

### 4. Correção pro-rata diária composta, sobre o que foi pago
A correção entre duas datas usa a taxa mensal composta diariamente, com
defasagem de 1 mês embutida (índice do mês M incorpora a taxa do mês M−1).
Datas antes do início da série são bloqueadas com erro claro. **Só o que
já foi pago é corrigido** — nunca valores previstos.

### 5. RLS obrigatório; nenhuma credencial no cliente
Autenticação JWT (Neon Auth) + RLS por membro. Nenhuma connection
string, service key ou segredo no bundle. O front fala apenas com a Data
API. Role do Postgres para escrita de taxas é separada e restrita à tabela
de taxas.

### 6. Schema versionado por Drizzle
Schema, políticas RLS e triggers vivem em migrações Drizzle versionadas
no repositório. Migrações rodam localmente/CI com connection string direta
(apenas em secrets). Nunca aplicar mudança manual em produção sem migração
correspondente.

### 7. Oráculo de dados reais
Antes de implementar, migrar os dados reais da planilha para um JSON de
casos de teste com entrada e saída esperada. A verificação real é bater o
cálculo; specs em prosa são guia, não prova.

### 8. Open source by default
Repositório público, código reutilizável, documentação clara para fork.
Nenhum dado pessoal no repositório. Configuração específica (séries,
e-mails autorizados, credenciais) fica em variáveis de ambiente/secrets.

### 9. Sem offline não solicitado
Offline (leitura ou escrita) só entra se for requisito explícito. Por
padrão, o app exige conexão; cache é apenas o shell do PWA.

### 10. Modelo de dados mínimo
Só criar tabela/campo quando houver regra que o justifique. Preferir visão
derivada a coluna gravada quando o dado é calculável.

### 11. Multi-rateio e n participantes por padrão
O app não é específico de um caso. Toda entidade de negócio (despesa,
reembolso, saldo) é escopada por `rateio_id`. Um rateio tem **n
participantes** com cotas, e o cálculo é o mesmo para n=2 ou n=10.

### 12. Cotas são parâmetros, não fatos
Pagamentos e reembolsos são fatos históricos, imutáveis. Cotas são
parâmetros de cálculo e podem ser reajustadas — o saldo é recomposto. Não
guardar snapshot de cotas em despesas.

### 13. Reembolsos entram no `pago_efetivo`
Um reembolso move crédito: soma no `pago_efetivo` do pagador e subtrai no
do recebedor. **Nunca** subtrair reembolsos de novo na hora de calcular
`deve(i → j)` — eles já estão contabilizados. Essa foi uma fonte de bug
identificada e corrigida.

### 14. Terminologia explícita
Termos do domínio (rateio, pagamento, reembolso, cota, compromisso,
excesso, déficit) devem estar definidos no spec e usados consistentemente
na UI e no código. Evitar sinônimos.

### 15. Adição de participantes por email via RPC

Adicionar participantes a um rateio é feito por email. A busca por email
usa uma função RPC `SECURITY DEFINER` que retorna apenas `id` e `email`. A
RLS de `users` continua restrita à própria linha; não relaxar. A criação
do rateio (rateio + membros) é feita em uma única transação via RPC.

### 16. Design system como fonte da verdade visual

Todas as cores, tipografia, espaçamento, raios e sombras vêm do
`DESIGN.md` e devem existir como **tokens do Tailwind**. Componentes não
usam cores hardcoded. Dark mode é suportado desde o dia 1 via
`darkMode: "class"`. Mockups visuais (HTML do Stitch) são **referência
para o design**, não código a copiar.

## Anti-princípios (o que evitar)
- Cálculo financeiro no front sem passar pelo módulo puro.
- `number` para dinheiro.
- Hardcoded de código de série, e-mail autorizado ou connection string.
- Aplicar migração direto em produção sem commit correspondente.
- "Depois eu testo" — o oráculo é pré-requisito, não etapa final.
- Tratar o app como específico do apartamento.
- Ratear excesso proporcional à cota (deve ser proporcional ao déficit).
- Corrigir valores previstos (só o pago é corrigido).
- Subtrair reembolsos duas vezes (eles já estão no `pago_efetivo`).
