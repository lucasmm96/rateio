import { D, Decimal } from './decimal'

export interface TaxaIPCA {
  mes: string  // YYYY-MM-DD (sempre o dia 1 do mês)
  taxa: number // variação percentual mensal
}

function diasNoMes(ano: number, mes: number): number {
  // new Date(ano, mes, 0) = último dia do mês `mes` (1-indexed)
  return new Date(ano, mes, 0).getDate()
}

function construirIndicesAcumulados(taxas: TaxaIPCA[]): Map<string, Decimal> {
  const ordenadas = [...taxas].sort((a, b) => a.mes.localeCompare(b.mes))
  const mapa = new Map<string, Decimal>()
  if (ordenadas.length === 0) return mapa

  let indiceAtual = D(1000)
  mapa.set(ordenadas[0].mes, indiceAtual)

  for (let i = 1; i < ordenadas.length; i++) {
    // indice(M) = indice(M-1) × (1 + taxa(M-1)/100)
    const fator = D(1).plus(D(ordenadas[i - 1].taxa).dividedBy(100))
    indiceAtual = indiceAtual.times(fator)
    mapa.set(ordenadas[i].mes, indiceAtual)
  }

  return mapa
}

export function indiceEmData(data: string, taxas: TaxaIPCA[]): Decimal {
  const ordenadas = [...taxas].sort((a, b) => a.mes.localeCompare(b.mes))

  if (ordenadas.length === 0) throw new Error('Série de taxas vazia')

  const dataBase = ordenadas[0].mes
  if (data < dataBase) {
    throw new Error(
      `Data ${data} anterior à série do IPCA (mínimo: ${dataBase})`,
    )
  }

  const [ano, mes, dia] = data.split('-').map(Number)
  const mesInicio = `${ano}-${String(mes).padStart(2, '0')}-01`

  const indices = construirIndicesAcumulados(ordenadas)

  const idxMes = ordenadas.findIndex((t) => t.mes === mesInicio)

  if (idxMes === -1) {
    // Data após o último mês da série — retorna o último índice sem extrapolar
    return indices.get(ordenadas[ordenadas.length - 1].mes)!
  }

  const indiceMesInicio = indices.get(mesInicio)!

  // Último mês sem taxa seguinte publicada: sem pro-rata
  const temMesSeguinte = idxMes < ordenadas.length - 1
  if (!temMesSeguinte || dia === 1) {
    return indiceMesInicio
  }

  // Pro-rata diária composta: indice(d) = indice(01/M) × (1 + taxa(M)/100) ^ ((d-1)/diasNoMes)
  const taxa = D(ordenadas[idxMes].taxa).dividedBy(100)
  const dias = diasNoMes(ano, mes)
  const expoente = D(dia - 1).dividedBy(dias)

  return indiceMesInicio.times(D(1).plus(taxa).pow(expoente))
}
