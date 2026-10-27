import { describe, it, expect } from 'vitest'
import { D } from '../decimal'
import { type TaxaIPCA } from '../indice'
import { paraUnidades, paraReais, D2 } from '../unidades'

const TAXAS: TaxaIPCA[] = [
  { mes: '2026-01-01', taxa: 0.33 },
  { mes: '2026-02-01', taxa: 0.70 },
]

describe('paraUnidades', () => {
  it('corrigir=false retorna valor inalterado', () => {
    const v = D('100.00')
    expect(paraUnidades(v, '2026-01-15', false, TAXAS).equals(v)).toBe(true)
  })

  it('corrigir=true divide pelo índice do início do mês', () => {
    const v = D('1000.00')
    const u = paraUnidades(v, '2026-01-01', true, TAXAS)
    // indice(2026-01-01) = 1000 (base)
    expect(u.toNumber()).toBeCloseTo(1, 8)
  })

  it('corrigir=true produz valor diferente de corrigir=false', () => {
    const v = D('500.00')
    const semCorrecao = paraUnidades(v, '2026-02-01', false, TAXAS)
    const comCorrecao = paraUnidades(v, '2026-02-01', true, TAXAS)
    expect(semCorrecao.equals(comCorrecao)).toBe(false)
  })
})

describe('paraReais', () => {
  it('corrigir=false retorna unidades inalteradas', () => {
    const u = D('50.00')
    expect(paraReais(u, '2026-01-15', false, TAXAS).equals(u)).toBe(true)
  })

  it('corrigir=true multiplica pelo índice do início do mês', () => {
    const u = D('1')
    const r = paraReais(u, '2026-01-01', true, TAXAS)
    // indice(2026-01-01) = 1000
    expect(r.toNumber()).toBeCloseTo(1000, 4)
  })

  it('paraReais inverte paraUnidades', () => {
    const original = D('250.50')
    const u = paraUnidades(original, '2026-02-01', true, TAXAS)
    const de_volta = paraReais(u, '2026-02-01', true, TAXAS)
    expect(de_volta.toNumber()).toBeCloseTo(original.toNumber(), 8)
  })
})

describe('D2', () => {
  it('aceita string', () => {
    expect(D2('3.14').toNumber()).toBeCloseTo(3.14, 10)
  })

  it('aceita number', () => {
    expect(D2(42).toNumber()).toBe(42)
  })

  it('aceita Decimal', () => {
    expect(D2(D('1.5')).toNumber()).toBe(1.5)
  })
})
