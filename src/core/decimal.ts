import Decimal from 'decimal.js'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export { Decimal }

export function D(value: string | number | Decimal): Decimal {
  return new Decimal(value)
}
