# Decisões — Roadmap das 10 demandas

- **D-001** — Desativar a URL antiga `https://lucasmm96.github.io/rateio/`
  de fato (GitHub Pages → Source: None). Aceitar 404 para quem tinha
  link salvo. Manter somente `https://meurateio.vercel.app`.
- **D-002** — Google OAuth já existe no app; o campo "nome" do perfil
  pode vir do Google (editável) ou ser preenchido após cadastro.
- **D-003** — Links em despesas e reembolsos são **ilimitados**. Tabela
  auxiliar `links` (não array JSON). Campos atuais `boleto_url` /
  `comprovante_url` serão **substituídos** (migração obrigatória).
- **D-004** — Busca por usuário via **prefixo do email** (`LIKE
  'lucasmm%'`). Sem campo `username` novo. Aceitar que usuários com
  prefixo em comum apareçam juntos na busca.
- **D-005** — Dashboard mostra **3 métricas**: total pago, total
  previsto, total a acertar. Aba nova em `#/dashboard`.
- **D-006** — Bug "Config. Rateio vazio" reproduz no rateio chamado
  "teste". Investigação focada.
- **D-007** — Transparência IPCA fica em **Configurações Globais**
  (`#/config`).
- **D-008** — Edição de despesas e reembolsos: todos os campos são
  editáveis. Precisa de auditoria (tabela `audit_log`) e visualização
  mínima no front (o que mudou, quem, quando).
- **D-009** — Coverage de testes cobre `src/core/` e `src/components/`.
- **D-010** — Perfil do usuário: nova tela em `#/perfil`.
- **D-011** — Workflows: investigar via `gh run list` + `gh run view
  <id> --log`. Não perguntar ao usuário, ler os logs.
- **D-012** — Roadmap das 5 ondas aprovado (ver ROADMAP.md).
