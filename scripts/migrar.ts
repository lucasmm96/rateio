/**
 * Aplica as migrações SQL no Neon via pg (node-postgres).
 * Executar com: pnpm exec tsx scripts/migrar.ts
 * Requer: DATABASE_URL definido no ambiente ou em .env.local
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import pg from 'pg'

// Carrega .env.local se existir (não disponível no ambiente de CI, mas útil localmente)
try {
  const envPath = join(import.meta.dirname, '../.env.local')
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    if (key && !(key in process.env)) process.env[key] = val
  }
} catch { /* arquivo não existe — env já deve estar no process.env */ }

const { Client } = pg

const url = process.env.DATABASE_URL
if (!url) {
  console.error('❌ DATABASE_URL não definida')
  process.exit(1)
}

// Divide o SQL em statements respeitando blocos $$ ... $$ e comentários
function splitStatements(conteudo: string): string[] {
  const resultado: string[] = []
  let buffer = ''
  let dentroDeDollar = false
  let dentroComentario = false  // comentário de linha (--)

  for (let i = 0; i < conteudo.length; i++) {
    const ch = conteudo[i]
    const dois = conteudo.slice(i, i + 2)

    // Fim de comentário de linha
    if (dentroComentario) {
      buffer += ch
      if (ch === '\n') dentroComentario = false
      continue
    }

    // Início de comentário de linha (fora de $$ ... $$)
    if (!dentroDeDollar && dois === '--') {
      dentroComentario = true
      buffer += '--'
      i += 1
      continue
    }

    // $$ toggle
    if (dois === '$$') {
      dentroDeDollar = !dentroDeDollar
      buffer += '$$'
      i += 1
      continue
    }

    // Separador de statement (fora de $$, fora de comentário)
    if (ch === ';' && !dentroDeDollar) {
      const stmt = buffer.trim()
      // Ignora blocos que são só comentários
      const semComentarios = stmt.replace(/--[^\n]*/g, '').trim()
      if (semComentarios.length > 0) resultado.push(stmt)
      buffer = ''
      continue
    }

    buffer += ch
  }

  const stmt = buffer.trim()
  const semComentarios = stmt.replace(/--[^\n]*/g, '').trim()
  if (semComentarios.length > 0) resultado.push(stmt)

  return resultado
}

async function aplicar(client: InstanceType<typeof Client>, arquivo: string): Promise<void> {
  const caminho = join(import.meta.dirname, '../drizzle/migrations', arquivo)
  const conteudo = readFileSync(caminho, 'utf-8')

  const statements = splitStatements(conteudo)
  console.log(`\n→ Aplicando ${arquivo} (${statements.length} statements)...`)

  for (const stmt of statements) {
    const preview = stmt.slice(0, 70).replace(/\n/g, ' ')
    try {
      await client.query(stmt)
      console.log(`  ✅ ${preview}`)
    } catch (err: unknown) {
      const msg = (err as Error).message
      if (/already exists|duplicate/i.test(msg)) {
        console.log(`  ⚠️  já existe: ${preview}`)
        continue
      }
      console.error(`  ❌ Erro: ${msg}`)
      console.error(`     stmt: ${preview}`)
      throw err
    }
  }
  console.log(`  ✅ ${arquivo} aplicado`)
}

async function main() {
  const client = new Client({ connectionString: url })
  await client.connect()
  console.log('✅ Conectado ao Neon')

  try {
    await aplicar(client, '0000_init.sql')
    await aplicar(client, '0001_rls.sql')
    await aplicar(client, '0002_grant_auth.sql')
    await aplicar(client, '0003_fix_rls_recursion.sql')
    await aplicar(client, '0004_sync_users.sql')
    await aplicar(client, '0005_atualizar_cotas.sql')
    await aplicar(client, '0006_adicionar_remover_membro.sql')
    console.log('\n✅ Todas as migrações aplicadas com sucesso.')
  } finally {
    await client.end()
  }
}

main().catch(() => process.exit(1))
