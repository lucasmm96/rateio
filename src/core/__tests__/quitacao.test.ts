import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { D, Decimal } from '../decimal'
import { type TaxaIPCA } from '../indice'
import { calcularSaldo, type Participante, type Reembolso } from '../saldo'
import { paraReais } from '../unidades'
import { rastroCorrecao } from '../correcao'
import { atribuirQuitacoes, type DespesaQuitacao } from '../quitacao'

// ─── Mesmas taxas do protótipo numérico (handoff jan–jul + demonstração) ─────
const TAXAS: TaxaIPCA[] = [
  { mes: '2025-01-01', taxa: 0.16 },
  { mes: '2025-02-01', taxa: 1.31 },
  { mes: '2025-03-01', taxa: 0.56 },
  { mes: '2025-04-01', taxa: 0.43 },
  { mes: '2025-05-01', taxa: 0.26 },
  { mes: '2025-06-01', taxa: 0.24 },
  { mes: '2025-07-01', taxa: 0.26 },
  { mes: '2025-08-01', taxa: 0.24 },
  { mes: '2025-09-01', taxa: 0.20 },
  { mes: '2025-10-01', taxa: 0.30 },
  { mes: '2025-11-01', taxa: 0.36 },
  { mes: '2025-12-01', taxa: 0.30 },
]

const HOJE = '2026-01-01'

function desp(
  id: string,
  data: string,
  valor: number,
  pagadorUserId: string,
  situacao: 'paga' | 'prevista' = 'paga',
): DespesaQuitacao {
  return { id, data, valor: D(valor), pagadorUserId, situacao }
}

interface ArgsMini {
  participantes: Participante[]
  despesas: DespesaQuitacao[]
  reembolsos: Reembolso[]
  corrigir?: boolean
  taxas?: TaxaIPCA[]
  hoje?: string
}

function rodar({ participantes, despesas, reembolsos, corrigir = true, taxas = TAXAS, hoje = HOJE }: ArgsMini) {
  const quitacoes = atribuirQuitacoes({ participantes, despesas, reembolsos, corrigir, taxas, hoje })
  const resultado = calcularSaldo(
    {
      participantes,
      despesas: despesas.map((d) => ({
        pagadorUserId: d.pagadorUserId,
        valor: d.valor,
        data: d.data,
        situacao: d.situacao,
      })),
      reembolsos,
    },
    corrigir,
    hoje,
    taxas,
  )
  const residuoTotal = [...quitacoes.values()].reduce(
    (acc, q) => acc.plus(q.residuoUnidades),
    D(0),
  )
  const deficitTotal = [...resultado.deficit.values()].reduce(
    (acc, d) => acc.plus(d),
    D(0),
  )
  return { quitacoes, resultado, residuoTotal, deficitTotal }
}

function assertInvariante(q: { residuoTotal: Decimal; deficitTotal: Decimal }) {
  expect(q.residuoTotal.minus(q.deficitTotal).abs().toNumber()).toBeLessThan(1e-9)
}

describe('atribuirQuitacoes — cenário das três dívidas (protótipo)', () => {
  const participantes: Participante[] = [
    { userId: 'A', cota: D(0) },
    { userId: 'B', cota: D(1) },
  ]
  const despesas: DespesaQuitacao[] = [
    desp('D1', '2025-01-01', 100, 'A'),
    desp('D2', '2025-05-01', 100, 'A'),
    desp('D3', '2025-10-01', 100, 'A'),
  ]
  const reembolsos: Reembolso[] = [
    { pagadorUserId: 'B', recebedorUserId: 'A', data: '2025-06-01', valor: D(150) },
    { pagadorUserId: 'B', recebedorUserId: 'A', data: '2025-11-01', valor: D(100) },
  ]

  const c = rodar({ participantes, despesas, reembolsos })

  it('D1 e D2 saldadas nas datas do protótipo; D3 em aberto', () => {
    const d1 = c.quitacoes.get('D1')!
    const d2 = c.quitacoes.get('D2')!
    const d3 = c.quitacoes.get('D3')!

    expect(d1.saldada).toBe(true)
    expect(d1.saldadaEm).toBe('2025-06-01')
    expect(d1.residuoUnidades.toNumber()).toBeLessThan(1e-9)

    expect(d2.saldada).toBe(true)
    expect(d2.saldadaEm).toBe('2025-11-01')

    expect(d3.saldada).toBe(false)
    expect(d3.saldadaEm).toBeNull()
  })

  it('valor congelado na quitação de D1 = R$102,75 (rastro até 01/06)', () => {
    const rastro = rastroCorrecao(
      { data: '2025-01-01', valor: D(100), situacao: 'paga' },
      '2025-06-01',
      true,
      TAXAS,
    )!
    expect(rastro.valorCorrigido.toNumber()).toBeCloseTo(102.75, 1)
  })

  it('resíduo em aberto de D3 ≈ R$54,16 hoje e soma = déficit do motor', () => {
    const d3 = c.quitacoes.get('D3')!
    const residuoReais = paraReais(d3.residuoUnidades, HOJE, true, TAXAS)
    expect(residuoReais.toNumber()).toBeCloseTo(54.16, 1)
    assertInvariante(c)
  })
})

describe('atribuirQuitacoes — sobrepagamento (crédito) cobre despesa futura', () => {
  const participantes: Participante[] = [
    { userId: 'A', cota: D(0) },
    { userId: 'B', cota: D(1) },
  ]
  const despesas: DespesaQuitacao[] = [
    desp('D1', '2025-01-01', 100, 'A'),
    desp('D2', '2025-05-01', 100, 'A'),
    desp('D3', '2025-10-01', 100, 'A'),
  ]
  const reembolsos: Reembolso[] = [
    { pagadorUserId: 'B', recebedorUserId: 'A', data: '2025-06-01', valor: D(350) },
  ]

  const c = rodar({ participantes, despesas, reembolsos })

  it('todas saldadas; D3 nasceu já coberta (saldadaEm = própria data)', () => {
    expect(c.quitacoes.get('D1')!.saldadaEm).toBe('2025-06-01')
    expect(c.quitacoes.get('D2')!.saldadaEm).toBe('2025-06-01')
    expect(c.quitacoes.get('D3')!.saldada).toBe(true)
    expect(c.quitacoes.get('D3')!.saldadaEm).toBe('2025-10-01')
    expect(c.residuoTotal.toNumber()).toBeLessThan(1e-9)
  })
})

describe('atribuirQuitacoes — rateio 50/50', () => {
  it('com reembolso da cota do outro, a despesa é saldada', () => {
    const participantes: Participante[] = [
      { userId: 'P1', cota: D(0.5) },
      { userId: 'P2', cota: D(0.5) },
    ]
    const despesas = [desp('d1', '2026-01-10', 100, 'P1')]
    const reembolsos: Reembolso[] = [
      { pagadorUserId: 'P2', recebedorUserId: 'P1', data: '2026-02-10', valor: D(50) },
    ]
    const c = rodar({ participantes, despesas, reembolsos, corrigir: false, taxas: [] })
    const d = c.quitacoes.get('d1')!
    expect(d.saldada).toBe(true)
    expect(d.saldadaEm).toBe('2026-02-10')
    assertInvariante(c)
  })

  it('sem reembolso, resíduo = cota pendente (R$50) e despesa em aberto', () => {
    const participantes: Participante[] = [
      { userId: 'P1', cota: D(0.5) },
      { userId: 'P2', cota: D(0.5) },
    ]
    const despesas = [desp('d1', '2026-01-10', 100, 'P1')]
    const c = rodar({ participantes, despesas, reembolsos: [], corrigir: false, taxas: [] })
    const d = c.quitacoes.get('d1')!
    expect(d.saldada).toBe(false)
    expect(d.residuoUnidades.toNumber()).toBeCloseTo(50, 6)
    expect(d.saldadaEm).toBeNull()
    assertInvariante(c)
  })
})

describe('atribuirQuitacoes — piloto LUCAS/LETICIA (cotas 0/1)', () => {
  const participantes: Participante[] = [
    { userId: 'LUCAS', cota: D(0) },
    { userId: 'LETICIA', cota: D(1) },
  ]
  const despesas: DespesaQuitacao[] = [
    desp('d1', '2025-12-26', 500.0, 'LETICIA'),
    desp('d2', '2026-01-20', 158.46, 'LETICIA'),
    desp('d3', '2026-02-06', 158.79, 'LETICIA'),
    desp('d4', '2026-03-03', 159.93, 'LETICIA'),
    desp('d5', '2026-03-31', 2500.0, 'LUCAS'),
    desp('d6', '2026-04-03', 160.38, 'LETICIA'),
    desp('d7', '2026-05-11', 161.25, 'LUCAS'),
    desp('d8', '2026-05-25', 200.75, 'LUCAS'),
    desp('d9', '2026-06-04', 162.86, 'LUCAS'),
    desp('d10', '2026-06-25', 455.73, 'LUCAS'),
    desp('d11', '2026-07-05', 164.29, 'LUCAS'),
    desp('d12', '2026-07-25', 542.15, 'LUCAS'),
    desp('d13', '2026-08-03', 165.57, 'LUCAS'),
    desp('d14', '2026-09-02', 166.58, 'LUCAS', 'prevista'),
    desp('d15', '2026-10-01', 167.68, 'LUCAS', 'prevista'),
  ]
  const reembolsos: Reembolso[] = [
    { pagadorUserId: 'LETICIA', recebedorUserId: 'LUCAS', data: '2026-03-31', valor: D(2500) },
    { pagadorUserId: 'LETICIA', recebedorUserId: 'LUCAS', data: '2026-05-11', valor: D(161.25) },
    { pagadorUserId: 'LETICIA', recebedorUserId: 'LUCAS', data: '2026-05-25', valor: D(200.75) },
    { pagadorUserId: 'LETICIA', recebedorUserId: 'LUCAS', data: '2026-06-04', valor: D(162.86) },
    { pagadorUserId: 'LETICIA', recebedorUserId: 'LUCAS', data: '2026-06-25', valor: D(455.73) },
    { pagadorUserId: 'LETICIA', recebedorUserId: 'LUCAS', data: '2026-07-05', valor: D(164.29) },
  ]
  const TAXAS26: TaxaIPCA[] = [
    { mes: '2025-12-01', taxa: 0.33 },
    { mes: '2026-01-01', taxa: 0.33 },
    { mes: '2026-02-01', taxa: 0.7 },
    { mes: '2026-03-01', taxa: 0.88 },
    { mes: '2026-04-01', taxa: 0.67 },
    { mes: '2026-05-01', taxa: 0.58 },
    { mes: '2026-06-01', taxa: 0.16 },
    { mes: '2026-07-01', taxa: 0.07 },
    { mes: '2026-08-01', taxa: -0.32 },
  ]
  const c = rodar({
    participantes,
    despesas,
    reembolsos,
    taxas: TAXAS26,
    hoje: '2026-08-15',
  })

  it('despesas reembolsadas no mesmo dia são saldadas na própria data', () => {
    expect(c.quitacoes.get('d5')!.saldada).toBe(true)
    expect(c.quitacoes.get('d5')!.saldadaEm).toBe('2026-03-31')
    expect(c.quitacoes.get('d8')!.saldadaEm).toBe('2026-05-25')
  })

  it('as duas despesas mais novas de LUCAS seguem em aberto', () => {
    expect(c.quitacoes.get('d12')!.saldada).toBe(false)
    expect(c.quitacoes.get('d13')!.saldada).toBe(false)
    expect(c.residuoTotal.greaterThan(0)).toBe(true)
  })

  it('despesa paga por quem detém cota 100% é isenta (sem credor externo)', () => {
    expect(c.quitacoes.get('d1')!.isenta).toBe(true) // LETICIA paga a própria (cota 1)
    expect(c.quitacoes.get('d5')!.isenta).toBe(false) // LUCAS paga; LETICIA deve a cota
  })

  it('Σ resíduo por despesa = Σ déficit do motor', () => {
    assertInvariante(c)
  })
})

describe('atribuirQuitacoes — invariante Σ resíduo = Σ déficit nos fixtures np', () => {
  const fixture = JSON.parse(
    readFileSync(join(import.meta.dirname, 'fixtures/test-cases-np.json'), 'utf8'),
  )

  for (const caso of fixture.casos) {
    it(`${caso.id}: ${caso.descricao}`, () => {
      const participantes: Participante[] = Object.entries(caso.participantes).map(
        ([userId, cota]) => ({ userId, cota: D(Number(cota)) }),
      )
      const despesas: DespesaQuitacao[] = caso.despesas.map(
        (d: { data: string; pagador: string; valor: number }, i: number) =>
          desp(`${caso.id}-d${i}`, d.data, d.valor, d.pagador),
      )
      const reembolsos: Reembolso[] = (caso.reembolsos ?? []).map(
        (r: { data: string; pagador: string; recebedor: string; valor: number }) => ({
          pagadorUserId: r.pagador,
          recebedorUserId: r.recebedor,
          data: r.data,
          valor: D(r.valor),
        }),
      )
      const c = rodar({ participantes, despesas, reembolsos, corrigir: false, taxas: [], hoje: fixture.metadata.referencia })
      assertInvariante(c)
      expect(c.quitacoes.size).toBe(despesas.length)
    })
  }
})