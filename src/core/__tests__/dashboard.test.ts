import { describe, it, expect } from 'vitest'
import { D } from '../decimal'
import { type TaxaIPCA } from '../indice'
import { calcularMetricas, type RateioParaMetricas } from '../dashboard'
import { saldoEmReais, calcularSaldo } from '../saldo'

const TAXAS: TaxaIPCA[] = [
  { mes: '2026-01-01', taxa: 0.33 },
  { mes: '2026-02-01', taxa: 0.70 },
  { mes: '2026-03-01', taxa: 0.88 },
]

const HOJE = '2026-03-15'

describe('calcularMetricas', () => {
  it('soma totalPago e totalPrevisto de 2 rateios', () => {
    const rateios: RateioParaMetricas[] = [
      {
        corrigirIpca: false,
        rateio: {
          participantes: [
            { userId: 'U1', cota: D('0.5') },
            { userId: 'U2', cota: D('0.5') },
          ],
          despesas: [
            { data: '2026-01-10', situacao: 'paga' as const,     pagadorUserId: 'U1', valor: D('100') },
            { data: '2026-04-01', situacao: 'prevista' as const, pagadorUserId: 'U1', valor: D('200') },
          ],
          reembolsos: [],
        },
      },
      {
        corrigirIpca: false,
        rateio: {
          participantes: [
            { userId: 'U1', cota: D('0.5') },
            { userId: 'U2', cota: D('0.5') },
          ],
          despesas: [
            { data: '2026-02-05', situacao: 'paga' as const,     pagadorUserId: 'U1', valor: D('300') },
            { data: '2026-05-01', situacao: 'prevista' as const, pagadorUserId: 'U2', valor: D('400') },
          ],
          reembolsos: [],
        },
      },
    ]

    const result = calcularMetricas(rateios, 'U1', HOJE, TAXAS)

    // totalPago: 100 (rateio1, U1, paga) + 300 (rateio2, U1, paga) = 400
    expect(result.totalPago.toNumber()).toBe(400)
    // totalPrevisto: 200 (rateio1, futura) + 400 (rateio2, futura, U2 paga mas ainda conta) = 600
    expect(result.totalPrevisto.toNumber()).toBe(600)
  })

  it('totalAcertar usa valor corrigido quando corrigir_ipca=true', () => {
    const rateioComIpca: RateioParaMetricas = {
      corrigirIpca: true,
      rateio: {
        participantes: [
          { userId: 'U1', cota: D('0.5') },
          { userId: 'U2', cota: D('0.5') },
        ],
        despesas: [
          { data: '2026-01-10', situacao: 'paga' as const, pagadorUserId: 'U2', valor: D('1000') },
        ],
        reembolsos: [],
      },
    }

    const rateioSemIpca: RateioParaMetricas = {
      corrigirIpca: false,
      rateio: {
        participantes: [
          { userId: 'U1', cota: D('0.5') },
          { userId: 'U2', cota: D('0.5') },
        ],
        despesas: [
          { data: '2026-01-10', situacao: 'paga' as const, pagadorUserId: 'U2', valor: D('1000') },
        ],
        reembolsos: [],
      },
    }

    const comIpca = calcularMetricas([rateioComIpca], 'U1', HOJE, TAXAS)
    const semIpca = calcularMetricas([rateioSemIpca], 'U1', HOJE, TAXAS)

    // Com IPCA, saldo deve ser maior que 500 (correção positiva)
    expect(comIpca.totalAcertar.greaterThan(D('500'))).toBe(true)
    // Sem IPCA, saldo é exatamente 500
    expect(semIpca.totalAcertar.toNumber()).toBeCloseTo(500, 2)
  })

  it('usuário sem despesas retorna D(0) em todas as métricas', () => {
    const rateios: RateioParaMetricas[] = [
      {
        corrigirIpca: false,
        rateio: {
          participantes: [
            { userId: 'U1', cota: D('0.5') },
            { userId: 'U2', cota: D('0.5') },
          ],
          despesas: [
            { data: '2026-01-10', situacao: 'paga' as const, pagadorUserId: 'U2', valor: D('200') },
          ],
          reembolsos: [],
        },
      },
    ]

    const result = calcularMetricas(rateios, 'U1', HOJE, TAXAS)

    expect(result.totalPago.toNumber()).toBe(0)
    // totalPrevisto não filtra por pagador — mas não há futuras aqui
    expect(result.totalPrevisto.toNumber()).toBe(0)
    // U1 deve 100 (metade de 200 pago por U2)
    expect(result.totalAcertar.toNumber()).toBeCloseTo(100, 2)
  })

  it('totalAcertar é consistente com saldoEmReais de 2 participantes', () => {
    const rateio: RateioParaMetricas = {
      corrigirIpca: false,
      rateio: {
        participantes: [
          { userId: 'U1', cota: D('0.5') },
          { userId: 'U2', cota: D('0.5') },
        ],
        despesas: [
          { data: '2026-01-10', situacao: 'paga' as const, pagadorUserId: 'U1', valor: D('500') },
          { data: '2026-02-05', situacao: 'paga' as const, pagadorUserId: 'U2', valor: D('300') },
        ],
        reembolsos: [],
      },
    }

    const resultado = calcularSaldo(rateio.rateio, false, HOJE, TAXAS)
    const saldoU1 = saldoEmReais(resultado, 'U1', HOJE, false, TAXAS)
    const saldoU2 = saldoEmReais(resultado, 'U2', HOJE, false, TAXAS)

    const metricas = calcularMetricas([rateio], 'U1', HOJE, TAXAS)

    expect(metricas.totalAcertar.toFixed(2)).toBe(saldoU1.toFixed(2))
    // invariante: saldos somam zero
    expect(saldoU1.plus(saldoU2).abs().toNumber()).toBeLessThan(0.01)
  })
})
