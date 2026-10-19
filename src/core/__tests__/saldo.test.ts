import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { Decimal } from '../decimal'
import { type TaxaIPCA } from '../indice'
import { calcularSaldo, saldoEmReais, type Rateio } from '../saldo'

// ─── Dados do piloto (HANDOFF §5.2) ──────────────────────────────────────────

const TAXAS: TaxaIPCA[] = [
  { mes: '2025-12-01', taxa: 0.33 },
  { mes: '2026-01-01', taxa: 0.33 },
  { mes: '2026-02-01', taxa: 0.70 },
  { mes: '2026-03-01', taxa: 0.88 },
  { mes: '2026-04-01', taxa: 0.67 },
  { mes: '2026-05-01', taxa: 0.58 },
  { mes: '2026-06-01', taxa: 0.16 },
  { mes: '2026-07-01', taxa: 0.07 },
  { mes: '2026-08-01', taxa: -0.32 },
]

const REFERENCIA = '2026-08-15'

// Reembolso valor = valor corrigido (mesmo dia → fator 1, valor_reembolso = valor_original)
function rateio(): Rateio {
  return {
    participantes: [
      { userId: 'LUCAS',   cota: new Decimal(0) },
      { userId: 'LETICIA', cota: new Decimal(1) },
    ],
    despesas: [
      { data: '2025-12-26', pagadorUserId: 'LETICIA', valor: new Decimal('500.00') },
      { data: '2026-01-20', pagadorUserId: 'LETICIA', valor: new Decimal('158.46') },
      { data: '2026-02-06', pagadorUserId: 'LETICIA', valor: new Decimal('158.79') },
      { data: '2026-03-03', pagadorUserId: 'LETICIA', valor: new Decimal('159.93') },
      { data: '2026-03-31', pagadorUserId: 'LUCAS',   valor: new Decimal('2500.00') },
      { data: '2026-04-03', pagadorUserId: 'LETICIA', valor: new Decimal('160.38') },
      { data: '2026-05-11', pagadorUserId: 'LUCAS',   valor: new Decimal('161.25') },
      { data: '2026-05-25', pagadorUserId: 'LUCAS',   valor: new Decimal('200.75') },
      { data: '2026-06-04', pagadorUserId: 'LUCAS',   valor: new Decimal('162.86') },
      { data: '2026-06-25', pagadorUserId: 'LUCAS',   valor: new Decimal('455.73') },
      { data: '2026-07-05', pagadorUserId: 'LUCAS',   valor: new Decimal('164.29') },
      { data: '2026-07-25', pagadorUserId: 'LUCAS',   valor: new Decimal('542.15') }, // em aberto
      { data: '2026-08-03', pagadorUserId: 'LUCAS',   valor: new Decimal('165.57') }, // em aberto
      // previstas — não entram no cálculo pois data > REFERENCIA
      { data: '2026-09-02', pagadorUserId: 'LUCAS',   valor: new Decimal('166.58') },
      { data: '2026-10-01', pagadorUserId: 'LUCAS',   valor: new Decimal('167.68') },
    ],
    // Reembolsos para os itens LUCAS com data_reembolso (valor = original, mesmo dia)
    reembolsos: [
      { pagadorUserId: 'LETICIA', recebedorUserId: 'LUCAS', data: '2026-03-31', valor: new Decimal('2500.00') },
      { pagadorUserId: 'LETICIA', recebedorUserId: 'LUCAS', data: '2026-05-11', valor: new Decimal('161.25') },
      { pagadorUserId: 'LETICIA', recebedorUserId: 'LUCAS', data: '2026-05-25', valor: new Decimal('200.75') },
      { pagadorUserId: 'LETICIA', recebedorUserId: 'LUCAS', data: '2026-06-04', valor: new Decimal('162.86') },
      { pagadorUserId: 'LETICIA', recebedorUserId: 'LUCAS', data: '2026-06-25', valor: new Decimal('455.73') },
      { pagadorUserId: 'LETICIA', recebedorUserId: 'LUCAS', data: '2026-07-05', valor: new Decimal('164.29') },
    ],
  }
}

// ─── Testes do piloto ─────────────────────────────────────────────────────────

describe('calcularSaldo — piloto (cotas 0/1, corrigir_ipca=true)', () => {
  const resultado = calcularSaldo(rateio(), true, REFERENCIA, TAXAS)

  it('Σ excesso = Σ déficit', () => {
    const somaExcesso = [...resultado.excesso.values()].reduce(
      (a, b) => a.plus(b), new Decimal(0),
    )
    const somaDeficit = [...resultado.deficit.values()].reduce(
      (a, b) => a.plus(b), new Decimal(0),
    )
    expect(somaExcesso.minus(somaDeficit).abs().toNumber()).toBeLessThan(1e-10)
  })

  it('Σ saldoUnidades = 0', () => {
    const soma = [...resultado.saldoUnidades.values()].reduce(
      (a, b) => a.plus(b), new Decimal(0),
    )
    expect(soma.abs().toNumber()).toBeLessThan(1e-10)
  })

  it('Lucas tem excesso (cota=0, pagou itens em aberto)', () => {
    expect(resultado.excesso.get('LUCAS')!.greaterThan(0)).toBe(true)
  })

  it('Leticia tem déficit (cota=1, deve a Lucas)', () => {
    expect(resultado.deficit.get('LETICIA')!.greaterThan(0)).toBe(true)
  })

  it('saldo de Leticia em reais entre R$ 707 e R$ 708', () => {
    const saldoLeticia = saldoEmReais(resultado, 'LETICIA', REFERENCIA, true, TAXAS)
    const valor = saldoLeticia.toNumber()
    expect(valor).toBeGreaterThanOrEqual(707)
    expect(valor).toBeLessThanOrEqual(708)
  })

  it('saldo de Lucas em reais é negativo (tem a receber)', () => {
    const saldoLucas = saldoEmReais(resultado, 'LUCAS', REFERENCIA, true, TAXAS)
    expect(saldoLucas.lessThan(0)).toBe(true)
  })

  it('|saldo Lucas| = |saldo Leticia|', () => {
    const sL = saldoEmReais(resultado, 'LUCAS',   REFERENCIA, true, TAXAS)
    const sLt = saldoEmReais(resultado, 'LETICIA', REFERENCIA, true, TAXAS)
    expect(sL.plus(sLt).abs().toNumber()).toBeLessThan(0.01)
  })

  it('despesas previstas (data > referencia) não entram no U_total', () => {
    // Com só as pagas (≤ 2026-08-15) o U_total deve ser menor do que com todas
    const rateioSemPrevistas: Rateio = {
      ...rateio(),
      despesas: rateio().despesas.filter(d => d.data <= REFERENCIA),
    }
    const r1 = calcularSaldo(rateio(), true, REFERENCIA, TAXAS)
    const r2 = calcularSaldo(rateioSemPrevistas, true, REFERENCIA, TAXAS)
    expect(r1.uTotal.equals(r2.uTotal)).toBe(true)
  })
})

// ─── Casos sintéticos n-pessoas (corrigir_ipca = false) ──────────────────────

const FIXTURE_N = JSON.parse(
  readFileSync(
    join(import.meta.dirname, '../../../.ai/casos-de-teste-n-pessoas.json'),
    'utf-8',
  ),
)

describe('calcularSaldo — casos sintéticos n-pessoas (corrigir_ipca=false)', () => {
  for (const caso of FIXTURE_N.casos) {
    describe(`${caso.id}: ${caso.descricao}`, () => {
      const participantes = Object.entries(caso.participantes as Record<string, number>).map(
        ([userId, cota]) => ({ userId, cota: new Decimal(cota) }),
      )
      const despesas = caso.despesas.map((d: { data: string; pagador: string; valor: number }) => ({
        data: d.data,
        pagadorUserId: d.pagador,
        valor: new Decimal(d.valor),
      }))
      const reembolsos = (caso.reembolsos ?? []).map(
        (r: { data: string; pagador: string; recebedor: string; valor: number }) => ({
          data: r.data,
          pagadorUserId: r.pagador,
          recebedorUserId: r.recebedor,
          valor: new Decimal(r.valor),
        }),
      )
      const r: Rateio = { participantes, despesas, reembolsos }
      const resultado = calcularSaldo(r, false, '2026-08-15', [])

      it('Σ excesso = Σ déficit', () => {
        const somaExcesso = [...resultado.excesso.values()].reduce(
          (a, b) => a.plus(b), new Decimal(0),
        )
        const somaDeficit = [...resultado.deficit.values()].reduce(
          (a, b) => a.plus(b), new Decimal(0),
        )
        expect(somaExcesso.minus(somaDeficit).abs().toNumber()).toBeLessThan(1e-10)
      })

      it('Σ saldoUnidades = 0', () => {
        const soma = [...resultado.saldoUnidades.values()].reduce(
          (a, b) => a.plus(b), new Decimal(0),
        )
        expect(soma.abs().toNumber()).toBeLessThan(1e-10)
      })

      if (caso.saldo_esperado) {
        for (const [userId, esperado] of Object.entries(
          caso.saldo_esperado as Record<string, number>,
        )) {
          it(`saldo ${userId} = ${esperado}`, () => {
            const saldo = saldoEmReais(resultado, userId, '2026-08-15', false, [])
            expect(saldo.toNumber()).toBeCloseTo(esperado, 6)
          })
        }
      }

      if (caso.deve_de_para && Array.isArray(caso.deve_de_para)) {
        it('deve_de_para bate com esperado', () => {
          const atual = resultado.deveDePara.map((d) => ({
            de: d.de,
            para: d.para,
            valor: d.unidades.toNumber(), // sem correção, unidades = reais
          }))
          for (const exp of caso.deve_de_para as Array<{ de: string; para: string; valor: number }>) {
            const encontrado = atual.find((a) => a.de === exp.de && a.para === exp.para)
            expect(encontrado).toBeDefined()
            expect(encontrado!.valor).toBeCloseTo(exp.valor, 6)
          }
          expect(atual).toHaveLength((caso.deve_de_para as unknown[]).length)
        })
      }
    })
  }
})
