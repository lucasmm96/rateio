import { D, Decimal } from './decimal'
import { construirTabelaIndices, indiceComTabela, type TaxaIPCA } from './indice'
import type { Participante, Reembolso } from './saldo'

/**
 * Atribuição de quitação por despesa — política FIFO em unidades.
 *
 * O motor (`calcularSaldo`) é agregado: nada no banco liga um reembolso a uma
 * despesa específica. Esta função atribui — na camada de exibição — qual
 * despesa foi (ou não) saldada, seguindo a regra mais defensável:
 *
 *   1. Cada despesa paga gera uma obrigação por participante = `cota × unidades`.
 *      O pagador cobre a própria cota no momento em que paga a despesa.
 *   2. A cobertura líquida de cada participante é `pagoEf` do motor:
 *      despesas que pagou + reembolsos que fez − reembolsos que recebeu.
 *   3. Essa cobertura é alocada às obrigações **mais antigas primeiro** (FIFO).
 *      Assim que a cobertura acumulada alcança a obrigação acumulada, a despesa
 *      fica saldada e o rastro de correção dela CONGELA nessa data.
 *   4. Cobertura que sobra (sobrepagamento) vira crédito e é aplicada às
 *      despesas que ainda vão nascer — nascem já cobertas.
 *
 * Invariante (verificado nos testes): `Σ resíduo em aberto por despesa`
 * (em unidades) é igual a `Σ déficit` do motor — quando ninguém foi sobre-pago.
 * Se houver sobrepagamento, o excedente não é resíduo de despesa: aparece como
 * diferença de caixa no Saldos (quem recebeu devolve). A atribuição é só
 * apresentação; nunca altera os totais.
 */

export interface DespesaQuitacao {
  id: string
  pagadorUserId: string
  valor: Decimal
  data: string
  situacao: 'paga' | 'prevista'
}

export interface QuitacaoDespesa {
  despesaId: string
  unidades: Decimal
  /**
   * true se o pagador tem cota 100%: não existe credor externo, a despesa foi
   * paga inteira por quem a devia — não há o que "quitar" (a UI mostra o rastro
   * normal até hoje, sem rótulo de estado).
   */
  isenta: boolean
  /** true se o resíduo hoje é ≤ R$0,01 (mesma convenção da tela Saldos). */
  saldada: boolean
  /** Data ISO (YYYY-MM-DD) em que a última cota foi coberta; null se em aberto. */
  saldadaEm: string | null
  /** Unidades ainda em aberto (≈0 quando saldada). */
  residuoUnidades: Decimal
}

export interface EntradaQuitacao {
  participantes: Participante[]
  despesas: DespesaQuitacao[]
  reembolsos: Reembolso[]
  corrigir: boolean
  taxas: TaxaIPCA[]
  hoje: string
}

const TOLERANCIA_REAIS = D('0.01')

export function atribuirQuitacoes({
  participantes,
  despesas,
  reembolsos,
  corrigir,
  taxas,
  hoje,
}: EntradaQuitacao): Map<string, QuitacaoDespesa> {
  const saida = new Map<string, QuitacaoDespesa>()

  const pagas = despesas
    .filter((d) => d.situacao === 'paga')
    .sort((a, b) => a.data.localeCompare(b.data))
  if (pagas.length === 0) return saida

  const tab = corrigir ? construirTabelaIndices(taxas) : undefined
  const unidadesDe = (valor: Decimal, data: string): Decimal =>
    corrigir ? valor.dividedBy(indiceComTabela(data, tab!)) : valor

  const userIds = participantes.map((p) => p.userId)
  const cotaDe = new Map(participantes.map((p) => [p.userId, p.cota]))

  // ── Unidades por despesa ────────────────────────────────────────────────────
  const unidades = new Map<string, Decimal>()
  for (const d of pagas) unidades.set(d.id, unidadesDe(d.valor, d.data))

  // ── Eventos de cobertura por participante (pagoEf do motor) ─────────────────
  const eventosCobertura = new Map<string, { date: string; delta: Decimal }[]>(
    userIds.map((id) => [id, []]),
  )
  for (const d of pagas) {
    if (cotaDe.has(d.pagadorUserId)) {
      eventosCobertura.get(d.pagadorUserId)!.push({ date: d.data, delta: unidades.get(d.id)! })
    }
  }
  for (const r of reembolsos) {
    const u = unidadesDe(r.valor, r.data)
    if (eventosCobertura.has(r.pagadorUserId)) {
      eventosCobertura.get(r.pagadorUserId)!.push({ date: r.data, delta: u })
    }
    if (eventosCobertura.has(r.recebedorUserId)) {
      eventosCobertura.get(r.recebedorUserId)!.push({ date: r.data, delta: u.negated() })
    }
  }

  // ── Pass A — resíduo por (participante, despesa) via alocação FIFO ──────────
  // Cobertura líquida = pagoEf do motor. Só o que de fato cobre obrigação vira
  // resíduo por despesa; cobertura que sobra (sobrepagamento) é crédito, e
  // cobertura negativa (receber mais do que pagar) é uma diferença de caixa que
  // aparece no Saldos — não é resíduo de despesa.
  const residuoPorParticipante = new Map<string, Map<string, Decimal>>()
  for (const id of userIds) {
    const mapResiduo = new Map<string, Decimal>()
    let rem = eventosCobertura.get(id)!.reduce((acc, ev) => acc.plus(ev.delta), D(0))
    for (const d of pagas) {
      const share = cotaDe.get(id)!.times(unidades.get(d.id)!)
      const cover = rem.greaterThan(0) ? Decimal.min(share, rem) : D(0)
      mapResiduo.set(d.id, share.minus(cover))
      rem = rem.minus(cover)
    }
    residuoPorParticipante.set(id, mapResiduo)
  }

  // ── Pass B — data de quitação por participante (primeiro cruzamento da
  //    cobertura acumulada ≥ obrigação acumulada, cronologicamente) ────────────
  const dataCobertura = new Map<string, Map<string, string>>()
  for (const id of userIds) {
    if (cotaDe.get(id)!.lessThanOrEqualTo(D(0))) continue // sem obrigação
    const dataCob = new Map<string, string>()

    // Obrigação acumulada por despesa (ordem das pagas).
    const prefixO: Decimal[] = []
    let accO = D(0)
    for (const d of pagas) {
      accO = accO.plus(cotaDe.get(id)!.times(unidades.get(d.id)!))
      prefixO.push(accO)
    }

    // Linha do tempo unificada: nascimento de obrigação antes de cobertura no mesmo dia.
    const covs = [...eventosCobertura.get(id)!].sort((a, b) => a.date.localeCompare(b.date))
    const eventos: { date: string; kind: 'ob' | 'cov'; ref?: DespesaQuitacao; delta?: Decimal }[] =
      []
    for (const d of pagas) eventos.push({ date: d.data, kind: 'ob', ref: d })
    for (const ev of covs) eventos.push({ date: ev.date, kind: 'cov', delta: ev.delta })
    eventos.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === 'ob' ? -1 : 1))

    let cumO = D(0)
    let cumC = D(0)
    let k = 0
    for (const ev of eventos) {
      if (ev.kind === 'ob') {
        cumO = cumO.plus(cotaDe.get(id)!.times(unidades.get(ev.ref!.id)!))
      } else {
        cumC = cumC.plus(ev.delta!)
      }
      // Despesas já nascidas (data ≤ evento), ainda não marcadas e cobertas.
      while (k < pagas.length && prefixO[k].lte(cumC) && pagas[k].data <= ev.date) {
        if (!dataCob.has(pagas[k].id)) dataCob.set(pagas[k].id, ev.date)
        k++
      }
    }
    dataCobertura.set(id, dataCob)
  }

  // ── Monta o resultado por despesa ───────────────────────────────────────────
  const iHoje = corrigir ? indiceComTabela(hoje, tab!) : D(1)
  for (const d of pagas) {
    let residuo = D(0)
    for (const id of userIds) {
      residuo = residuo.plus(residuoPorParticipante.get(id)!.get(d.id)!)
    }
    const cotaPagador = cotaDe.get(d.pagadorUserId) ?? D(0)
    const isenta = D(1).minus(cotaPagador).lte(D('1e-9'))
    const residuoReaisHoje = residuo.times(iHoje)
    // Despesa integralmente do próprio pagador não tem credor externo: não
    // carrega estado de quitação (ela nunca foi "dívida de outro").
    const saldada = !isenta && residuoReaisHoje.abs().lte(TOLERANCIA_REAIS)

    let saldadaEm: string | null = null
    if (saldada) {
      for (const id of userIds) {
        const data = dataCobertura.get(id)?.get(d.id)
        if (data && (saldadaEm === null || data > saldadaEm)) saldadaEm = data
      }
      // Se ficou em aberto por centavos (resíduo ≤ 0,01) sem cruzar a cobertura,
      // congelamos em hoje — é uma quitação por tolerância, não por pagamento.
      if (saldadaEm === null) saldadaEm = hoje
    }

    saida.set(d.id, {
      despesaId: d.id,
      unidades: unidades.get(d.id)!,
      isenta,
      saldada,
      saldadaEm,
      residuoUnidades: residuo,
    })
  }

  return saida
}