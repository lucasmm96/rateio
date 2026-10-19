import { D, Decimal } from './decimal'
import { type TaxaIPCA } from './indice'
import { paraUnidades, paraReais } from './unidades'

export interface Participante {
  userId: string
  cota: Decimal
}

export interface Despesa {
  pagadorUserId: string
  valor: Decimal
  data: string // YYYY-MM-DD; paga se data <= hoje
}

export interface Reembolso {
  pagadorUserId: string
  recebedorUserId: string
  valor: Decimal
  data: string
}

export interface Rateio {
  participantes: Participante[]
  despesas: Despesa[]
  reembolsos: Reembolso[]
}

export interface DevePar {
  de: string
  para: string
  unidades: Decimal
}

export interface ResultadoSaldo {
  uTotal: Decimal
  pagoEfetivo: Map<string, Decimal>
  compromisso: Map<string, Decimal>
  excesso: Map<string, Decimal>
  deficit: Map<string, Decimal>
  saldoUnidades: Map<string, Decimal>
  deveDePara: DevePar[]
}

export function calcularSaldo(
  rateio: Rateio,
  corrigir: boolean,
  hoje: string,
  taxas: TaxaIPCA[],
): ResultadoSaldo {
  const userIds = rateio.participantes.map((p) => p.userId)
  const ehPaga = (d: Despesa) => d.data <= hoje

  // 1) U_total — soma das despesas pagas em unidades
  let uTotal = D(0)
  for (const d of rateio.despesas) {
    if (!ehPaga(d)) continue
    uTotal = uTotal.plus(paraUnidades(d.valor, d.data, corrigir, taxas))
  }

  // 2) Compromisso por participante
  const compromisso = new Map<string, Decimal>()
  for (const p of rateio.participantes) {
    compromisso.set(p.userId, uTotal.times(p.cota))
  }

  // 3) pago_efetivo por participante
  const pagoEfetivo = new Map<string, Decimal>(
    userIds.map((id) => [id, D(0)]),
  )
  for (const d of rateio.despesas) {
    if (!ehPaga(d)) continue
    const u = paraUnidades(d.valor, d.data, corrigir, taxas)
    pagoEfetivo.set(d.pagadorUserId, pagoEfetivo.get(d.pagadorUserId)!.plus(u))
  }
  for (const r of rateio.reembolsos) {
    const u = paraUnidades(r.valor, r.data, corrigir, taxas)
    pagoEfetivo.set(r.pagadorUserId, pagoEfetivo.get(r.pagadorUserId)!.plus(u))
    pagoEfetivo.set(
      r.recebedorUserId,
      pagoEfetivo.get(r.recebedorUserId)!.minus(u),
    )
  }

  // 4) Excesso e déficit
  const excesso = new Map<string, Decimal>()
  const deficit = new Map<string, Decimal>()
  for (const id of userIds) {
    const diff = pagoEfetivo.get(id)!.minus(compromisso.get(id)!)
    excesso.set(id, diff.greaterThan(0) ? diff : D(0))
    deficit.set(id, diff.lessThan(0) ? diff.negated() : D(0))
  }

  // 5) Distribuição do excesso proporcional ao déficit
  const somaExcesso = userIds.reduce(
    (acc, id) => acc.plus(excesso.get(id)!),
    D(0),
  )

  const deveDePara: DevePar[] = []
  if (!somaExcesso.isZero()) {
    for (const devedor of userIds) {
      const dDef = deficit.get(devedor)!
      if (dDef.isZero()) continue
      for (const credor of userIds) {
        const eCred = excesso.get(credor)!
        if (eCred.isZero()) continue
        const valor = dDef.times(eCred).dividedBy(somaExcesso)
        if (valor.isZero()) continue
        deveDePara.push({ de: devedor, para: credor, unidades: valor })
      }
    }
  }

  // 6) Saldo líquido por participante em unidades
  const saldoUnidades = new Map<string, Decimal>(
    userIds.map((id) => [id, D(0)]),
  )
  for (const { de, para, unidades: u } of deveDePara) {
    saldoUnidades.set(de, saldoUnidades.get(de)!.plus(u))
    saldoUnidades.set(para, saldoUnidades.get(para)!.minus(u))
  }

  return {
    uTotal,
    pagoEfetivo,
    compromisso,
    excesso,
    deficit,
    saldoUnidades,
    deveDePara,
  }
}

export function saldoEmReais(
  resultado: ResultadoSaldo,
  userId: string,
  hoje: string,
  corrigir: boolean,
  taxas: TaxaIPCA[],
): Decimal {
  return paraReais(resultado.saldoUnidades.get(userId) ?? D(0), hoje, corrigir, taxas)
}
