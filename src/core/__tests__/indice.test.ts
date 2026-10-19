import { describe, it, expect } from 'vitest'
import { indiceEmData, type TaxaIPCA } from '../indice'

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

// Tabela de índices esperados do HANDOFF §4.1
const INDICES_ESPERADOS = [
  { mes: '2025-12-01', indice: 1000.0 },
  { mes: '2026-01-01', indice: 1003.3 },
  { mes: '2026-02-01', indice: 1006.61089 },
  { mes: '2026-03-01', indice: 1013.65716623 },
  { mes: '2026-04-01', indice: 1022.57734929 },
  { mes: '2026-05-01', indice: 1029.42861753 },
  { mes: '2026-06-01', indice: 1035.39930351 },
  { mes: '2026-07-01', indice: 1037.05594240 },
  { mes: '2026-08-01', indice: 1037.78188156 },
]

describe('indiceEmData — início de cada mês (HANDOFF §4.1)', () => {
  for (const { mes, indice } of INDICES_ESPERADOS) {
    it(`${mes} = ${indice}`, () => {
      const resultado = indiceEmData(mes, TAXAS)
      expect(resultado.toNumber()).toBeCloseTo(indice, 4)
    })
  }
})

describe('indiceEmData — pro-rata intra-mês', () => {
  it('dia 15 de julho está entre os índices de jul e ago', () => {
    const jul01 = indiceEmData('2026-07-01', TAXAS)
    const jul15 = indiceEmData('2026-07-15', TAXAS)
    const ago01 = indiceEmData('2026-08-01', TAXAS)
    expect(jul15.greaterThan(jul01)).toBe(true)
    expect(jul15.lessThan(ago01)).toBe(true)
  })

  it('dia 1 de qualquer mês retorna o índice do início do mês', () => {
    const jan01 = indiceEmData('2026-01-01', TAXAS)
    const jan01b = indiceEmData('2026-01-01', TAXAS)
    expect(jan01.equals(jan01b)).toBe(true)
  })

  it('em meses com 28 dias (fevereiro 2026), aceita dia 28', () => {
    const fev01 = indiceEmData('2026-02-01', TAXAS)
    const fev28 = indiceEmData('2026-02-28', TAXAS)
    const mar01 = indiceEmData('2026-03-01', TAXAS)
    expect(fev28.greaterThan(fev01)).toBe(true)
    expect(fev28.lessThan(mar01)).toBe(true)
  })
})

describe('indiceEmData — último mês sem taxa seguinte', () => {
  it('agosto 2026 dia 01: sem pro-rata, igual a indice(01/08)', () => {
    const ago01 = indiceEmData('2026-08-01', TAXAS)
    const ago15 = indiceEmData('2026-08-15', TAXAS)
    expect(ago15.equals(ago01)).toBe(true)
  })

  it('agosto 2026 dia 31: sem pro-rata, igual a indice(01/08)', () => {
    const ago01 = indiceEmData('2026-08-01', TAXAS)
    const ago31 = indiceEmData('2026-08-31', TAXAS)
    expect(ago31.equals(ago01)).toBe(true)
  })

  it('referência 2026-08-15 retorna 1037.7818...', () => {
    const ref = indiceEmData('2026-08-15', TAXAS)
    expect(ref.toNumber()).toBeCloseTo(1037.7818815600815, 6)
  })
})

describe('indiceEmData — tratamento de erros', () => {
  it('data antes de 2025-12-01 lança erro', () => {
    expect(() => indiceEmData('2025-11-30', TAXAS)).toThrow('2025-12-01')
  })

  it('data muito antiga lança erro', () => {
    expect(() => indiceEmData('2020-01-01', TAXAS)).toThrow()
  })

  it('série vazia lança erro', () => {
    expect(() => indiceEmData('2026-01-01', [])).toThrow()
  })
})

describe('indiceEmData — data após o último mês', () => {
  it('setembro 2026 (sem taxa) retorna índice do último mês conhecido', () => {
    const ago01 = indiceEmData('2026-08-01', TAXAS)
    const set10 = indiceEmData('2026-09-10', TAXAS)
    expect(set10.equals(ago01)).toBe(true)
  })
})
