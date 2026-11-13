import { describe, it, expect } from 'vitest'
import { rastroCorrecao } from '../correcao'
import { indiceEmData, type TaxaIPCA } from '../indice'
import { paraUnidades, paraReais } from '../unidades'
import { D } from '../decimal'

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

function despesa(data: string, valor: number, situacao = 'paga') {
  return { data, valor: D(valor), situacao }
}

const HOJE = '2026-08-15'

/** Invariantes que valem para qualquer cenário com rastro não-nulo. */
function invariantes(d: { data: string; valor: ReturnType<typeof D> }, hoje: string, r: ReturnType<typeof rastroCorrecao>) {
  expect(r).not.toBeNull()
  if (!r) return
  const iData = indiceEmData(d.data, TAXAS)
  const iHoje = indiceEmData(hoje, TAXAS)
  const unidades = paraUnidades(d.valor, d.data, true, TAXAS)
  const corrigido = paraReais(unidades, hoje, true, TAXAS)

  expect(r.valorCorrigido.toNumber()).toBeCloseTo(corrigido.toNumber(), 8)
  const somaAjustes = r.etapas.reduce((acc, e) => acc.plus(e.ajusteReais), D(0))
  expect(somaAjustes.toNumber()).toBeCloseTo(
    r.valorCorrigido.minus(r.valorOriginal).toNumber(),
    8,
  )
  const pctTotal = r.etapas.reduce(
    (acc, e) => acc.times(D(1).plus(e.ajustePct.dividedBy(100))),
    D(1),
  )
  expect(pctTotal.minus(1).times(100).toNumber()).toBeCloseTo(r.totalAjustePct.toNumber(), 6)
  expect(r.totalAjustePct.toNumber()).toBeCloseTo(
    iHoje.dividedBy(iData).minus(1).times(100).toNumber(),
    8,
  )
}

describe('rastroCorrecao — guards (retorna null)', () => {
  it('sem correção', () => {
    expect(rastroCorrecao(despesa('2026-01-05', 100), HOJE, false, TAXAS)).toBeNull()
  })
  it('despesa prevista', () => {
    expect(rastroCorrecao(despesa('2026-01-05', 100, 'prevista'), HOJE, true, TAXAS)).toBeNull()
  })
  it('série vazia', () => {
    expect(rastroCorrecao(despesa('2026-01-05', 100), HOJE, true, [])).toBeNull()
  })
  it('data anterior ao início da série', () => {
    expect(rastroCorrecao(despesa('2025-11-30', 100), HOJE, true, TAXAS)).toBeNull()
  })
  it('data no futuro', () => {
    expect(rastroCorrecao(despesa('2026-09-01', 100), HOJE, true, TAXAS)).toBeNull()
  })
})

describe('rastroCorrecao — cenário A (pagamento mid-month, hoje mid-month)', () => {
  const d = despesa('2026-01-05', 100)
  const r = rastroCorrecao(d, HOJE, true, TAXAS)!

  it('valores pinados', () => {
    expect(r.unidades.toNumber()).toBeCloseTo(0.09962872370494108, 10)
    expect(r.valorCorrigido.toNumber()).toBeCloseTo(103.39288434394328, 8)
    expect(r.totalAjustePct.toNumber()).toBeCloseTo(3.3928843439432765, 8)
  })

  it('rótulos das 8 etapas', () => {
    expect(r.etapas.map(e => e.rotulo)).toEqual([
      '05/01/2026 → 31/01/2026',
      'Fevereiro 2026',
      'Março 2026',
      'Abril 2026',
      'Maio 2026',
      'Junho 2026',
      'Julho 2026',
      '01/08/2026 → 15/08/2026',
    ])
  })

  it('pcts: etapa 1 parcial e meses completos', () => {
    expect(r.etapas[0].ajustePct.toNumber()).toBeCloseTo(0.2873582382, 8)
    expect(r.etapas[1].ajustePct.toNumber()).toBeCloseTo(0.70, 10)
    expect(r.etapas[2].ajustePct.toNumber()).toBeCloseTo(0.88, 10)
    expect(r.etapas[3].ajustePct.toNumber()).toBeCloseTo(0.67, 10)
    expect(r.etapas[4].ajustePct.toNumber()).toBeCloseTo(0.58, 10)
    expect(r.etapas[5].ajustePct.toNumber()).toBeCloseTo(0.16, 10)
    expect(r.etapas[6].ajustePct.toNumber()).toBeCloseTo(0.07, 10)
    expect(r.etapas[7].ajustePct.toNumber()).toBeCloseTo(0, 10)
  })

  it('ajuste da etapa 1 == valor × pct1/100 (iIni == iData)', () => {
    expect(r.etapas[0].ajusteReais.toNumber()).toBeCloseTo(0.2873582382, 8)
  })

  it('invariantes', () => {
    invariantes(d, HOJE, r)
  })
})

describe('rastroCorrecao — hoje no dia 01 (sem etapa final)', () => {
  it('6 etapas, última rotulada Junho 2026, sem step 0', () => {
    const r = rastroCorrecao(despesa('2026-01-05', 100), '2026-07-01', true, TAXAS)!
    expect(r.etapas.length).toBe(6)
    expect(r.etapas[5].rotulo).toBe('Junho 2026')
    expect(r.etapas.every(e => e.ajustePct.toNumber() !== 0)).toBe(true)
    invariantes({ data: '2026-01-05', valor: D(100) }, '2026-07-01', r)
  })
})

describe('rastroCorrecao — pagamento no último mês publicado', () => {
  it('pagamento e hoje no mesmo mês (flat) → 1 etapa 0%', () => {
    const r = rastroCorrecao(despesa('2026-08-10', 100), '2026-08-15', true, TAXAS)!
    expect(r.etapas.length).toBe(1)
    expect(r.etapas[0].rotulo).toBe('10/08/2026 → 15/08/2026')
    expect(r.etapas[0].ajustePct.toNumber()).toBeCloseTo(0, 10)
    expect(r.valorCorrigido.toNumber()).toBe(100)
  })

  it('hoje além da série → 2 etapas 0%', () => {
    const r = rastroCorrecao(despesa('2026-08-10', 100), '2026-09-20', true, TAXAS)!
    expect(r.etapas.length).toBe(2)
    expect(r.etapas[0].rotulo).toBe('10/08/2026 → 31/08/2026')
    expect(r.etapas[1].rotulo).toBe('01/09/2026 → 20/09/2026')
    expect(r.etapas.every(e => e.ajustePct.toNumber() === 0)).toBe(true)
    expect(r.valorCorrigido.toNumber()).toBe(100)
  })
})

describe('rastroCorrecao — pagamento e hoje no mesmo mês (pro-rata)', () => {
  it('1 etapa parcial', () => {
    const r = rastroCorrecao(despesa('2026-07-05', 100), '2026-07-15', true, TAXAS)!
    expect(r.etapas.length).toBe(1)
    expect(r.etapas[0].rotulo).toBe('05/07/2026 → 15/07/2026')
    expect(r.etapas[0].ajustePct.toNumber()).toBeCloseTo(0.0225752935, 8)
    expect(r.valorCorrigido.toNumber()).toBeCloseTo(100.0225752935, 8)
  })
})

describe('rastroCorrecao — pagamento no dia 01 (mês completo primeiro)', () => {
  it('Janeiro 2026 pct 0.33 exato, depois pro-rata parcial', () => {
    const r = rastroCorrecao(despesa('2026-01-01', 100), '2026-03-03', true, TAXAS)!
    expect(r.etapas.map(e => e.rotulo)).toEqual([
      'Janeiro 2026',
      'Fevereiro 2026',
      '01/03/2026 → 03/03/2026',
    ])
    expect(r.etapas[0].ajustePct.toNumber()).toBeCloseTo(0.33, 10)
    expect(r.etapas[1].ajustePct.toNumber()).toBeCloseTo(0.70, 10)
    expect(r.etapas[2].ajustePct.toNumber()).toBeCloseTo(0.0565418219, 8)
    expect(r.valorCorrigido.toNumber()).toBeCloseTo(101.0894355088, 8)
  })
})

describe('rastroCorrecao — data == hoje', () => {
  it('sem etapas, valor corrigido == original', () => {
    const r = rastroCorrecao(despesa('2026-07-05', 100), '2026-07-05', true, TAXAS)!
    expect(r.etapas).toEqual([])
    expect(r.valorCorrigido.toNumber()).toBe(100)
    expect(r.totalAjustePct.toNumber()).toBe(0)
  })
})

describe('rastroCorrecao — taxa zero no meio da série', () => {
  it('etapa com 0% e etapa positiva', () => {
    const taxas: TaxaIPCA[] = [
      { mes: '2026-01-01', taxa: 0 },
      { mes: '2026-02-01', taxa: 0.5 },
      { mes: '2026-03-01', taxa: 0.2 },
    ]
    const r = rastroCorrecao(despesa('2026-01-15', 100), '2026-02-10', true, taxas)!
    expect(r.etapas.length).toBe(2)
    expect(r.etapas[0].rotulo).toBe('15/01/2026 → 31/01/2026')
    expect(r.etapas[0].ajustePct.toNumber()).toBeCloseTo(0, 10)
    expect(r.etapas[1].ajustePct.toNumber()).toBeGreaterThan(0)
  })
})

describe('rastroCorrecao — série de 1 taxa (tudo flat)', () => {
  it('todas as etapas 0% e valor inalterado', () => {
    const taxas: TaxaIPCA[] = [{ mes: '2025-12-01', taxa: 0.33 }]
    const r = rastroCorrecao(despesa('2026-01-05', 100), HOJE, true, taxas)!
    expect(r.etapas.length).toBe(8)
    expect(r.etapas.every(e => e.ajustePct.toNumber() === 0)).toBe(true)
    expect(r.valorCorrigido.toNumber()).toBe(100)
    expect(r.totalAjustePct.toNumber()).toBe(0)
  })
})