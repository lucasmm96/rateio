import { D, type Decimal } from './decimal'
import { type TaxaIPCA } from './indice'
import { calcularSaldo, saldoEmReais, type Rateio } from './saldo'

export interface RateioParaMetricas {
  rateio: Rateio
  corrigirIpca: boolean
}

export interface MetricasDashboard {
  totalPago: Decimal
  totalPrevisto: Decimal
  totalAcertar: Decimal
}

export function calcularMetricas(
  rateios: RateioParaMetricas[],
  userId: string,
  hoje: string,
  taxas: TaxaIPCA[],
): MetricasDashboard {
  let totalPago = D(0)
  let totalPrevisto = D(0)
  let totalAcertar = D(0)

  for (const { rateio, corrigirIpca } of rateios) {
    for (const d of rateio.despesas) {
      if (d.data <= hoje) {
        if (d.pagadorUserId === userId) {
          totalPago = totalPago.plus(d.valor)
        }
      } else {
        totalPrevisto = totalPrevisto.plus(d.valor)
      }
    }

    const resultado = calcularSaldo(rateio, corrigirIpca, hoje, taxas)
    totalAcertar = totalAcertar.plus(saldoEmReais(resultado, userId, hoje, corrigirIpca, taxas))
  }

  return { totalPago, totalPrevisto, totalAcertar }
}
