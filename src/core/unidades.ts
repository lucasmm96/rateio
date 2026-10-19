import { D, Decimal } from './decimal'
import { type TaxaIPCA, indiceEmData } from './indice'

export function paraUnidades(
  valor: Decimal,
  data: string,
  corrigir: boolean,
  taxas: TaxaIPCA[],
): Decimal {
  if (!corrigir) return valor
  return valor.dividedBy(indiceEmData(data, taxas))
}

export function paraReais(
  unidades: Decimal,
  data: string,
  corrigir: boolean,
  taxas: TaxaIPCA[],
): Decimal {
  if (!corrigir) return unidades
  return unidades.times(indiceEmData(data, taxas))
}

export function D2(value: string | number | Decimal): Decimal {
  return D(value)
}
