/**
 * Gera .ai/casos-de-teste.json com os 27 casos do piloto calculados.
 * Executar com: pnpm exec tsx scripts/gerar-casos-teste.ts
 */

import { writeFileSync } from 'fs'
import { join } from 'path'
import { Decimal } from '../src/core/decimal'
import { indiceEmData, type TaxaIPCA } from '../src/core/indice'
import { calcularSaldo, type Rateio } from '../src/core/saldo'

const REFERENCIA = '2026-08-15'
const CORRIGIR = true

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

// Despesas da planilha (27 linhas)
const DESPESAS_PLANILHA = [
  { data: '2025-12-26', descricao: 'Sinal compra',                pagador: 'LETICIA', valor: 500.00,   dataReembolso: '2025-12-26' },
  { data: '2026-01-20', descricao: 'Parcela Entrada 01/32',       pagador: 'LETICIA', valor: 158.46,   dataReembolso: '2026-01-20' },
  { data: '2026-02-06', descricao: 'Parcela Entrada 02/32',       pagador: 'LETICIA', valor: 158.79,   dataReembolso: '2026-02-06' },
  { data: '2026-03-03', descricao: 'Parcela Entrada 03/32',       pagador: 'LETICIA', valor: 159.93,   dataReembolso: '2026-03-03' },
  { data: '2026-03-31', descricao: 'Taxa de Fidelizacao Caixa',   pagador: 'LUCAS',   valor: 2500.00,  dataReembolso: '2026-03-31' },
  { data: '2026-04-03', descricao: 'Parcela Entrada 04/32',       pagador: 'LETICIA', valor: 160.38,   dataReembolso: '2026-04-03' },
  { data: '2026-05-11', descricao: 'Parcela Entrada 05/32',       pagador: 'LUCAS',   valor: 161.25,   dataReembolso: '2026-05-11' },
  { data: '2026-05-25', descricao: 'Juros Obra Caixa 01',         pagador: 'LUCAS',   valor: 200.75,   dataReembolso: '2026-05-25' },
  { data: '2026-06-04', descricao: 'Parcela Entrada 06/32',       pagador: 'LUCAS',   valor: 162.86,   dataReembolso: '2026-06-04' },
  { data: '2026-06-25', descricao: 'Juros Obra Caixa 02',         pagador: 'LUCAS',   valor: 455.73,   dataReembolso: '2026-06-25' },
  { data: '2026-07-05', descricao: 'Parcela Entrada 07/32',       pagador: 'LUCAS',   valor: 164.29,   dataReembolso: '2026-07-05' },
  { data: '2026-07-25', descricao: 'Juros Obra Caixa 03',         pagador: 'LUCAS',   valor: 542.15,   dataReembolso: null         },
  { data: '2026-08-03', descricao: 'Parcela Entrada 08/32',       pagador: 'LUCAS',   valor: 165.57,   dataReembolso: null         },
  { data: '2026-09-02', descricao: 'Parcela Entrada 09/32',       pagador: 'LUCAS',   valor: 166.58,   dataReembolso: null         },
  { data: '2026-10-01', descricao: 'Parcela Entrada 10/32',       pagador: 'LUCAS',   valor: 167.68,   dataReembolso: null         },
  { data: '2026-12-10', descricao: 'ITBI 01/12',                  pagador: 'LUCAS',   valor: 367.80,   dataReembolso: null         },
  { data: '2027-01-10', descricao: 'ITBI 02/12',                  pagador: 'LUCAS',   valor: 367.80,   dataReembolso: null         },
  { data: '2027-02-10', descricao: 'ITBI 03/12',                  pagador: 'LUCAS',   valor: 367.80,   dataReembolso: null         },
  { data: '2027-03-10', descricao: 'ITBI 04/12',                  pagador: 'LUCAS',   valor: 367.80,   dataReembolso: null         },
  { data: '2027-04-10', descricao: 'ITBI 05/12',                  pagador: 'LUCAS',   valor: 367.80,   dataReembolso: null         },
  { data: '2027-05-10', descricao: 'ITBI 06/12',                  pagador: 'LUCAS',   valor: 367.80,   dataReembolso: null         },
  { data: '2027-06-10', descricao: 'ITBI 07/12',                  pagador: 'LUCAS',   valor: 367.80,   dataReembolso: null         },
  { data: '2027-07-10', descricao: 'ITBI 08/12',                  pagador: 'LUCAS',   valor: 367.80,   dataReembolso: null         },
  { data: '2027-08-10', descricao: 'ITBI 09/12',                  pagador: 'LUCAS',   valor: 367.80,   dataReembolso: null         },
  { data: '2027-09-10', descricao: 'ITBI 10/12',                  pagador: 'LUCAS',   valor: 367.80,   dataReembolso: null         },
  { data: '2027-10-10', descricao: 'ITBI 11/12',                  pagador: 'LUCAS',   valor: 367.80,   dataReembolso: null         },
  { data: '2027-11-10', descricao: 'ITBI 12/12',                  pagador: 'LUCAS',   valor: 367.80,   dataReembolso: null         },
]

function fmt(d: Decimal): number {
  return parseFloat(d.toFixed(10))
}

function fmt2(d: Decimal): number {
  return parseFloat(d.toFixed(2))
}

// Índice de referência (sem pro-rata para agosto — último mês)
const indiceRef = indiceEmData(REFERENCIA, TAXAS)

// Calcular valor do reembolso: valor_original × (indice_reembolso / indice_pagamento)
// Para mesmo dia: = valor_original exato
function calcularValorReembolso(
  valorOriginal: number,
  dataPagamento: string,
  dataReembolso: string,
): number {
  const ip = indiceEmData(dataPagamento, TAXAS)
  const ir = indiceEmData(dataReembolso, TAXAS)
  const valorDecimal = new Decimal(valorOriginal)
  return parseFloat(valorDecimal.dividedBy(ip).times(ir).toFixed(2))
}

const casos = DESPESAS_PLANILHA.map((d, i) => {
  const id = i + 2 // linhas da planilha começam em 2
  const situacaoDervada = d.data <= REFERENCIA ? 'paga' : 'prevista'
  const indicePagamento = fmt(indiceEmData(d.data, TAXAS))

  let indiceReembolso: number | null = null
  let valorReembolso: number | null = null
  let valorCorrigidoNaDataReembolso: number | null = null
  let valorCorrigidoNaReferencia: number | null = null
  let impactoRateioReais: number = 0
  let observacao = ''

  if (situacaoDervada === 'prevista') {
    observacao = 'Prevista — não entra no cálculo do saldo'
    return {
      id,
      data_pagamento: d.data,
      descricao: d.descricao,
      pagador: d.pagador,
      valor_original: d.valor,
      situacao_derivada: situacaoDervada,
      data_reembolso: null,
      valor_reembolso: null,
      indice_pagamento: indicePagamento,
      indice_reembolso: null,
      indice_referencia: fmt(indiceRef),
      valor_corrigido_na_data_reembolso: null,
      valor_corrigido_na_referencia: null,
      impacto_rateio_reais: 0,
      observacao,
    }
  }

  if (d.dataReembolso !== null) {
    indiceReembolso = fmt(indiceEmData(d.dataReembolso, TAXAS))
    valorReembolso = calcularValorReembolso(d.valor, d.data, d.dataReembolso)
    valorCorrigidoNaDataReembolso = valorReembolso

    if (d.pagador === 'LETICIA') {
      // Leticia tem cota 1 — paga a própria parte, sem impacto no saldo
      impactoRateioReais = 0
      observacao = 'Pagador LETICIA (cota=1): reembolso na mesma data cancela o pagamento no saldo'
    } else {
      // LUCAS (cota=0): reembolso mesmo dia cancela, sem impacto líquido
      impactoRateioReais = 0
      observacao = 'Pagador LUCAS: reembolso na mesma data cancela, impacto líquido zero'
    }
  } else {
    // Em aberto — dívida corrida até a referência
    const ip = indiceEmData(d.data, TAXAS)
    const unidades = new Decimal(d.valor).dividedBy(ip)
    valorCorrigidoNaReferencia = fmt2(unidades.times(indiceRef))

    if (d.pagador === 'LUCAS') {
      impactoRateioReais = valorCorrigidoNaReferencia
      observacao = d.data.startsWith('2026-08')
        ? 'Agosto 2026 sem taxa seguinte — índice sem pro-rata (= índice de 01/08)'
        : 'Em aberto — pro-rata aplicada'
    } else {
      impactoRateioReais = 0
      observacao = 'Pagador LETICIA (cota=1): sem impacto líquido'
    }
  }

  return {
    id,
    data_pagamento: d.data,
    descricao: d.descricao,
    pagador: d.pagador,
    valor_original: d.valor,
    situacao_derivada: situacaoDervada,
    data_reembolso: d.dataReembolso,
    valor_reembolso: valorReembolso,
    indice_pagamento: indicePagamento,
    indice_reembolso: indiceReembolso,
    indice_referencia: fmt(indiceRef),
    valor_corrigido_na_data_reembolso: valorCorrigidoNaDataReembolso,
    valor_corrigido_na_referencia: valorCorrigidoNaReferencia,
    impacto_rateio_reais: impactoRateioReais,
    observacao,
  }
})

// Calcular saldo total usando calcularSaldo
const rateio: Rateio = {
  participantes: [
    { userId: 'LUCAS',   cota: new Decimal(0) },
    { userId: 'LETICIA', cota: new Decimal(1) },
  ],
  despesas: DESPESAS_PLANILHA
    .filter(d => d.data <= REFERENCIA)
    .map(d => ({
      pagadorUserId: d.pagador,
      valor: new Decimal(d.valor),
      data: d.data,
    })),
  reembolsos: DESPESAS_PLANILHA
    .filter(d => d.dataReembolso !== null && d.pagador === 'LUCAS' && d.data <= REFERENCIA)
    .map(d => {
      const valorReemb = calcularValorReembolso(d.valor, d.data, d.dataReembolso!)
      return {
        pagadorUserId: 'LETICIA',
        recebedorUserId: 'LUCAS',
        valor: new Decimal(valorReemb),
        data: d.dataReembolso!,
      }
    }),
}

const resultado = calcularSaldo(rateio, CORRIGIR, REFERENCIA, TAXAS)

const saldoLucasReais = resultado.saldoUnidades.get('LUCAS')!.times(indiceRef)
const saldoLeticiaReais = resultado.saldoUnidades.get('LETICIA')!.times(indiceRef)

console.log('=== RESULTADO PILOTO ===')
console.log('U_total:', resultado.uTotal.toFixed(10))
console.log('Pago efetivo LUCAS:', resultado.pagoEfetivo.get('LUCAS')!.toFixed(10))
console.log('Pago efetivo LETICIA:', resultado.pagoEfetivo.get('LETICIA')!.toFixed(10))
console.log('Compromisso LUCAS:', resultado.compromisso.get('LUCAS')!.toFixed(10))
console.log('Compromisso LETICIA:', resultado.compromisso.get('LETICIA')!.toFixed(10))
console.log('Excesso LUCAS:', resultado.excesso.get('LUCAS')!.toFixed(10))
console.log('Excesso LETICIA:', resultado.excesso.get('LETICIA')!.toFixed(10))
console.log('Deficit LUCAS:', resultado.deficit.get('LUCAS')!.toFixed(10))
console.log('Deficit LETICIA:', resultado.deficit.get('LETICIA')!.toFixed(10))
console.log('Saldo LUCAS (reais):', saldoLucasReais.toFixed(2))
console.log('Saldo LETICIA (reais):', saldoLeticiaReais.toFixed(2))
console.log('Índice referência:', indiceRef.toFixed(10))

const ESPERADO_MIN = 707
const ESPERADO_MAX = 708
const saldoLeticia = parseFloat(saldoLeticiaReais.toFixed(2))
if (saldoLeticia >= ESPERADO_MIN && saldoLeticia <= ESPERADO_MAX) {
  console.log(`\n✅ Saldo Leticia R$ ${saldoLeticia} está entre R$ ${ESPERADO_MIN} e R$ ${ESPERADO_MAX}`)
} else {
  console.error(`\n❌ Saldo Leticia R$ ${saldoLeticia} FORA do intervalo R$ ${ESPERADO_MIN}–${ESPERADO_MAX}`)
  process.exit(1)
}

// Escrever JSON
const output = {
  metadata: {
    referencia: REFERENCIA,
    serie_bcb: 433,
    data_base: '2025-12-01',
    indice_base: 1000,
    metodo_correcao: 'pro-rata diaria composta, defasagem 1 mes',
    cotas: { LUCAS: 0, LETICIA: 1 },
    saldo_esperado: {
      LUCAS: fmt2(saldoLucasReais),
      LETICIA: fmt2(saldoLeticiaReais),
    },
  },
  taxas_ipca: TAXAS,
  casos,
}

const outPath = join(import.meta.dirname, '../.ai/casos-de-teste.json')
writeFileSync(outPath, JSON.stringify(output, null, 2))
console.log(`\n✅ ${outPath} atualizado com ${casos.length} casos`)
