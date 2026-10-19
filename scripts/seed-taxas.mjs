/**
 * Busca a série IPCA do BCB (SGS) e faz upsert em taxas_ipca.
 *
 * Variáveis de ambiente:
 *   IPCA_WRITER_DATABASE_URL  — role restrita (INSERT/UPDATE em taxas_ipca)
 *   DATABASE_URL              — fallback para desenvolvimento local
 *   BCB_SERIE                 — código da série (padrão: 433 = IPCA mensal)
 *
 * Execução local:
 *   pnpm exec node scripts/seed-taxas.mjs
 *
 * No GitHub Actions:
 *   Configurar secret IPCA_WRITER_DATABASE_URL e rodar via ipca.yml
 */

import pg from 'pg'

const { Client } = pg

const DATABASE_URL = process.env.IPCA_WRITER_DATABASE_URL || process.env.DATABASE_URL
const SERIE = process.env.BCB_SERIE || '433'

if (!DATABASE_URL) {
  console.error('❌ Defina IPCA_WRITER_DATABASE_URL ou DATABASE_URL')
  process.exit(1)
}

const BCB_URL = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${SERIE}/dados?formato=json`

async function buscarSerie() {
  console.log(`→ Buscando série ${SERIE} em ${BCB_URL}`)
  const resp = await fetch(BCB_URL, { signal: AbortSignal.timeout(30_000) })
  if (!resp.ok) throw new Error(`BCB respondeu ${resp.status}`)
  const dados = await resp.json()
  console.log(`   ${dados.length} registros recebidos`)
  return dados
}

function parsarData(dataStr) {
  // Formato BCB: "DD/MM/YYYY" → "YYYY-MM-DD"
  const [d, m, y] = dataStr.split('/')
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

async function upsert(client, taxas) {
  let inseridos = 0
  let atualizados = 0

  for (const { mes, taxa } of taxas) {
    const result = await client.query(
      `INSERT INTO taxas_ipca (mes, taxa)
       VALUES ($1, $2)
       ON CONFLICT (mes) DO UPDATE SET taxa = EXCLUDED.taxa
       RETURNING xmax`,
      [mes, taxa],
    )
    if (Number(result.rows[0].xmax) === 0) inseridos++
    else atualizados++
  }

  console.log(`   ✅ ${inseridos} inseridos, ${atualizados} atualizados`)
}

async function main() {
  const dados = await buscarSerie()

  // Filtra registros com valor não-nulo e os converte para o schema
  const taxas = dados
    .filter(r => r.valor !== null && r.valor !== '')
    .map(r => ({
      mes: parsarData(r.data),
      taxa: parseFloat(r.valor),
    }))

  if (taxas.length === 0) {
    console.error('❌ Nenhum dado válido recebido do BCB')
    process.exit(1)
  }

  console.log(`→ Primeiros 3: ${JSON.stringify(taxas.slice(0, 3))}`)
  console.log(`→ Últimos 3:   ${JSON.stringify(taxas.slice(-3))}`)

  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  console.log('✅ Conectado ao banco')

  try {
    await upsert(client, taxas)
    console.log('✅ Série IPCA atualizada com sucesso.')
  } finally {
    await client.end()
  }
}

main().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
