import { Decimal } from './decimal'
import { type TabelaIndices, type TaxaIPCA, construirTabelaIndices, indiceComTabela } from './indice'

export interface EtapaCorrecao {
  rotulo: string
  ajustePct: Decimal
  ajusteReais: Decimal
  valorAcumulado: Decimal
}

export interface RastroCorrecao {
  unidades: Decimal
  valorOriginal: Decimal
  valorCorrigido: Decimal
  totalAjustePct: Decimal
  etapas: EtapaCorrecao[]
}

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

function fmtData(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

function proximoMes(ym: string): string {
  const ano = Number(ym.slice(0, 4))
  const mes = Number(ym.slice(5, 7))
  const nAno = mes === 12 ? ano + 1 : ano
  const nMes = mes === 12 ? 1 : mes + 1
  return `${String(nAno)}-${String(nMes).padStart(2, '0')}-01`
}

function ultimoDiaMes(ym: string): string {
  const ano = Number(ym.slice(0, 4))
  const mes = Number(ym.slice(5, 7))
  const diaUltimo = new Date(ano, mes, 0).getDate()
  return `${String(ano)}-${String(mes).padStart(2, '0')}-${String(diaUltimo).padStart(2, '0')}`
}

function mesAnoLabel(ym: string): string {
  const m = Number(ym.slice(5, 7)) - 1
  return `${MESES[Math.max(0, Math.min(11, m))]} ${ym.slice(0, 4)}`
}

/**
 * Rastro mês-a-mês da correção IPCA de uma despesa paga, da data de pagamento até `hoje`.
 * Retorna null quando não há correção aplicável.
 */
export function rastroCorrecao(
  despesa: { data: string; valor: Decimal; situacao: string },
  hoje: string,
  corrigir: boolean,
  taxas: TaxaIPCA[],
  tabela?: TabelaIndices,
): RastroCorrecao | null {
  if (!corrigir) return null
  if (despesa.situacao !== 'paga') return null
  if (taxas.length === 0) return null

  const data = despesa.data.slice(0, 10)
  hoje = hoje.slice(0, 10)
  if (data > hoje) return null

  // Monta a tabela (ordenação + índices acumulados) uma única vez por despesa,
  // em vez de refazê-la a cada data resolvida abaixo — ver indice.ts.
  const tab = tabela ?? construirTabelaIndices(taxas)

  let iData: Decimal
  let iHoje: Decimal
  try {
    iData = indiceComTabela(data, tab)
    iHoje = indiceComTabela(hoje, tab)
  } catch {
    return null
  }

  const unidades = despesa.valor.dividedBy(iData)
  const valorCorrigido = unidades.times(iHoje)
  const totalAjustePct = iHoje.dividedBy(iData).minus(1).times(100)

  // Fronteiras de etapa: data de pagamento, primeiro de cada mês intermediário e hoje.
  const limites = [data]
  let m = proximoMes(data.slice(0, 7))
  while (m.slice(0, 7) <= hoje.slice(0, 7)) {
    limites.push(m)
    m = proximoMes(m)
  }
  if (!limites.includes(hoje)) limites.push(hoje)

  const etapas: EtapaCorrecao[] = []
  for (let k = 0; k < limites.length - 1; k++) {
    const inicio = limites[k]
    const fim = limites[k + 1]
    let iIni: Decimal
    let iFim: Decimal
    try {
      iIni = indiceComTabela(inicio, tab)
      iFim = indiceComTabela(fim, tab)
    } catch {
      continue
    }
    const ajustePct = iFim.dividedBy(iIni).minus(1).times(100)
    const ajusteReais = unidades.times(iFim.minus(iIni))
    const valorAcumulado = unidades.times(iFim)

    let rotulo: string
    if (inicio.slice(8, 10) === '01' && fim.slice(8, 10) === '01') {
      rotulo = mesAnoLabel(inicio.slice(0, 7))
    } else if (fim === hoje) {
      rotulo = `${fmtData(inicio)} → ${fmtData(fim)}`
    } else {
      rotulo = `${fmtData(inicio)} → ${fmtData(ultimoDiaMes(inicio.slice(0, 7)))}`
    }

    etapas.push({ rotulo, ajustePct, ajusteReais, valorAcumulado })
  }

  return { unidades, valorOriginal: despesa.valor, valorCorrigido, totalAjustePct, etapas }
}
