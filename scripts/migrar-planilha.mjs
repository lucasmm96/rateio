/**
 * Popula o banco com o rateio "Apartamento" da planilha Controle.xlsx.
 *
 * Variáveis de ambiente (obrigatórias):
 *   DATABASE_URL   — connection string com permissão de escrita (service role)
 *   LUCAS_EMAIL    — e-mail cadastrado do Lucas no Neon Auth
 *   LETICIA_EMAIL  — e-mail cadastrado da Letícia no Neon Auth
 *
 * Execução:
 *   LUCAS_EMAIL=... LETICIA_EMAIL=... pnpm exec node scripts/migrar-planilha.mjs
 *
 * O script é idempotente: se o rateio "Apartamento" já existe, encerra sem
 * alterar nada. Rode scripts/seed-taxas.mjs antes para garantir que as taxas
 * IPCA estejam carregadas (necessário para validar os reembolsos na UI).
 */

import pg from 'pg'

const { Client } = pg

const DATABASE_URL = process.env.DATABASE_URL
const LUCAS_EMAIL  = process.env.LUCAS_EMAIL
const LETICIA_EMAIL = process.env.LETICIA_EMAIL

if (!DATABASE_URL || !LUCAS_EMAIL || !LETICIA_EMAIL) {
  console.error('❌ Defina DATABASE_URL, LUCAS_EMAIL e LETICIA_EMAIL')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// Dados da planilha (seção 5.2 do HANDOFF)
// ---------------------------------------------------------------------------

const DESPESAS = [
  { data: '2025-12-26', descricao: 'Sinal compra',               pagador: 'LETICIA', valor: 500.00 },
  { data: '2026-01-20', descricao: 'Parcela Entrada 01/32',       pagador: 'LETICIA', valor: 158.46 },
  { data: '2026-02-06', descricao: 'Parcela Entrada 02/32',       pagador: 'LETICIA', valor: 158.79 },
  { data: '2026-03-03', descricao: 'Parcela Entrada 03/32',       pagador: 'LETICIA', valor: 159.93 },
  { data: '2026-03-31', descricao: 'Taxa de Fidelizacao Caixa',   pagador: 'LUCAS',   valor: 2500.00 },
  { data: '2026-04-03', descricao: 'Parcela Entrada 04/32',       pagador: 'LETICIA', valor: 160.38 },
  { data: '2026-05-11', descricao: 'Parcela Entrada 05/32',       pagador: 'LUCAS',   valor: 161.25 },
  { data: '2026-05-25', descricao: 'Juros Obra Caixa 01',         pagador: 'LUCAS',   valor: 200.75 },
  { data: '2026-06-04', descricao: 'Parcela Entrada 06/32',       pagador: 'LUCAS',   valor: 162.86 },
  { data: '2026-06-25', descricao: 'Juros Obra Caixa 02',         pagador: 'LUCAS',   valor: 455.73 },
  { data: '2026-07-05', descricao: 'Parcela Entrada 07/32',       pagador: 'LUCAS',   valor: 164.29 },
  { data: '2026-07-25', descricao: 'Juros Obra Caixa 03',         pagador: 'LUCAS',   valor: 542.15 },
  { data: '2026-08-03', descricao: 'Parcela Entrada 08/32',       pagador: 'LUCAS',   valor: 165.57 },
  { data: '2026-09-02', descricao: 'Parcela Entrada 09/32',       pagador: 'LUCAS',   valor: 166.58 },
  { data: '2026-10-01', descricao: 'Parcela Entrada 10/32',       pagador: 'LUCAS',   valor: 167.68 },
  { data: '2026-12-10', descricao: 'ITBI 01/12',                  pagador: 'LUCAS',   valor: 367.80 },
  { data: '2027-01-10', descricao: 'ITBI 02/12',                  pagador: 'LUCAS',   valor: 367.80 },
  { data: '2027-02-10', descricao: 'ITBI 03/12',                  pagador: 'LUCAS',   valor: 367.80 },
  { data: '2027-03-10', descricao: 'ITBI 04/12',                  pagador: 'LUCAS',   valor: 367.80 },
  { data: '2027-04-10', descricao: 'ITBI 05/12',                  pagador: 'LUCAS',   valor: 367.80 },
  { data: '2027-05-10', descricao: 'ITBI 06/12',                  pagador: 'LUCAS',   valor: 367.80 },
  { data: '2027-06-10', descricao: 'ITBI 07/12',                  pagador: 'LUCAS',   valor: 367.80 },
  { data: '2027-07-10', descricao: 'ITBI 08/12',                  pagador: 'LUCAS',   valor: 367.80 },
  { data: '2027-08-10', descricao: 'ITBI 09/12',                  pagador: 'LUCAS',   valor: 367.80 },
  { data: '2027-09-10', descricao: 'ITBI 10/12',                  pagador: 'LUCAS',   valor: 367.80 },
  { data: '2027-10-10', descricao: 'ITBI 11/12',                  pagador: 'LUCAS',   valor: 367.80 },
  { data: '2027-11-10', descricao: 'ITBI 12/12',                  pagador: 'LUCAS',   valor: 367.80 },
]

// Reembolsos: para cada linha com pagador=LUCAS e data_reembolso preenchida.
// Reembolso na mesma data do pagamento → correção = 1 → valor_reembolso = valor_original.
// pagador_user_id = Leticia (quem reembolsa), recebedor_user_id = Lucas (quem recebe).
// Linhas 13 e 14 (Juros Caixa 03 e Parcela 08/32) estão em aberto — sem reembolso.
const REEMBOLSOS_PLANILHA = [
  { data: '2026-03-31', pagador: 'LETICIA', recebedor: 'LUCAS', valor: 2500.00 },
  { data: '2026-05-11', pagador: 'LETICIA', recebedor: 'LUCAS', valor: 161.25  },
  { data: '2026-05-25', pagador: 'LETICIA', recebedor: 'LUCAS', valor: 200.75  },
  { data: '2026-06-04', pagador: 'LETICIA', recebedor: 'LUCAS', valor: 162.86  },
  { data: '2026-06-25', pagador: 'LETICIA', recebedor: 'LUCAS', valor: 455.73  },
  { data: '2026-07-05', pagador: 'LETICIA', recebedor: 'LUCAS', valor: 164.29  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function buscarUsuario(client, email, label) {
  const { rows } = await client.query(
    'SELECT id FROM users WHERE lower(email) = lower($1)',
    [email],
  )
  if (rows.length === 0) {
    throw new Error(
      `Usuário "${label}" (${email}) não encontrado. ` +
      'Certifique-se de que ele se cadastrou no app antes de rodar a migração.',
    )
  }
  return rows[0].id
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  console.log('✅ Conectado ao banco')

  try {
    // 0) Idempotência: verificar se o rateio já existe
    const { rows: existente } = await client.query(
      "SELECT id FROM rateios WHERE nome = 'Apartamento' LIMIT 1",
    )
    if (existente.length > 0) {
      console.log(`✅ Rateio "Apartamento" já existe (id: ${existente[0].id}). Nada a fazer.`)
      return
    }

    // 1) Buscar usuários
    console.log('→ Buscando usuários...')
    const lucasId   = await buscarUsuario(client, LUCAS_EMAIL,   'Lucas')
    const leticiaId = await buscarUsuario(client, LETICIA_EMAIL, 'Letícia')
    console.log(`   Lucas:   ${lucasId}`)
    console.log(`   Letícia: ${leticiaId}`)

    const idDe = { LUCAS: lucasId, LETICIA: leticiaId }

    await client.query('BEGIN')

    // 2) Criar rateio
    const { rows: [rateio] } = await client.query(
      `INSERT INTO rateios (nome, corrigir_ipca, criado_por_user_id)
       VALUES ('Apartamento', true, $1)
       RETURNING id`,
      [lucasId],
    )
    const rateioId = rateio.id
    console.log(`→ Rateio criado: ${rateioId}`)

    // 3) Criar membros (Lucas cota=0, Letícia cota=1)
    await client.query(
      `INSERT INTO membros (rateio_id, user_id, cota) VALUES ($1, $2, $3), ($1, $4, $5)`,
      [rateioId, lucasId, 0, leticiaId, 1],
    )
    console.log('→ Membros inseridos (Lucas 0%, Letícia 100%)')

    // 4) Inserir despesas
    console.log(`→ Inserindo ${DESPESAS.length} despesas...`)
    for (const d of DESPESAS) {
      await client.query(
        `INSERT INTO despesas (rateio_id, data, descricao, pagador_user_id, valor)
         VALUES ($1, $2, $3, $4, $5)`,
        [rateioId, d.data, d.descricao, idDe[d.pagador], d.valor],
      )
    }
    console.log('   ✅ Despesas inseridas')

    // 5) Inserir reembolsos
    console.log(`→ Inserindo ${REEMBOLSOS_PLANILHA.length} reembolsos...`)
    for (const r of REEMBOLSOS_PLANILHA) {
      await client.query(
        `INSERT INTO reembolsos (rateio_id, data, pagador_user_id, recebedor_user_id, valor, observacao)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          rateioId,
          r.data,
          idDe[r.pagador],
          idDe[r.recebedor],
          r.valor,
          'migrado da planilha; conferir contra extrato',
        ],
      )
    }
    console.log('   ✅ Reembolsos inseridos')

    await client.query('COMMIT')
    console.log(`\n✅ Migração concluída! Rateio "Apartamento" → ${rateioId}`)
    console.log(`   ${DESPESAS.length} despesas + ${REEMBOLSOS_PLANILHA.length} reembolsos`)
    console.log(`   Em aberto: Juros Obra Caixa 03 (2026-07-25) e Parcela Entrada 08/32 (2026-08-03)`)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    await client.end()
  }
}

main().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
