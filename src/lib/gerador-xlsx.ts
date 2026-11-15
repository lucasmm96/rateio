import ExcelJS, { Workbook } from 'exceljs'
import type { Cell, Worksheet } from 'exceljs'

import type {
  RateioDetalhe,
  DespesaItem,
  ReembolsoItem,
  TaxaIpca,
  LinkItem,
  AuditLogItem,
} from '../db/queries'
import type { Decimal } from '../core/decimal'
import type { ResultadoSaldo } from '../core/saldo'
import { paraReais, paraUnidades } from '../core/unidades'
import { construirTabelaIndices, indiceEmData } from '../core/indice'
import { rastroCorrecao } from '../core/correcao'
import { D } from '../core/decimal'

const FILL_HEADER = '1F2937'
const FILL_SUBHEADER = 'F3F4F6'
const TEXT_HEADER = 'FFFFFF'
const TEXT_SUBTITLE = '6B7280'
const BORDER_COLOR = 'E5E7EB'

const CURRENCY_FORMAT = '#,##0.00'
const UNIDADES_FORMAT = '#,##0.0000'
const PERCENT_FORMAT = '0.0%'
const IPCA_PERCENT_FORMAT = '0.00%'

export interface DadosExportacao {
  rateio: RateioDetalhe
  despesas: DespesaItem[]
  reembolsos: ReembolsoItem[]
  taxas: TaxaIpca[]
  links: LinkItem[]
  auditLog: AuditLogItem[]
  resultado: ResultadoSaldo
  hoje: string
  usuarioEmail: string | null
}

export function slugify(texto: string): string {
  if (!texto) return 'rateio'
  const base = texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base.slice(0, 80) || 'rateio'
}

export function gerarNomeArquivo(nome: string, hoje: string): string {
  return `rateio-${slugify(nome)}-${hoje}.xlsx`
}

function mesAnoLabel(mesIso: string): string {
  const meses = [
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
  const m = Number(mesIso.slice(5, 7)) - 1
  const a = mesIso.slice(0, 4)
  return `${meses[Math.max(0, Math.min(11, m))]} ${a}`
}

function formatoData(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

function formatoDataHora(iso: string): string {
  return iso.slice(0, 16).replace('T', ' ')
}

function styleCell(
  cell: Cell,
  opts?: {
    bold?: boolean
    fill?: string
    color?: string
    fontSize?: number
    italic?: boolean
    numFmt?: string
    border?: boolean
    wrap?: boolean
    align?: 'left' | 'center' | 'right' | 'justify'
  },
) {
  if (opts?.bold || opts?.fontSize || opts?.italic || opts?.color) {
    cell.font = {
      bold: !!opts.bold,
      italic: !!opts.italic,
      size: opts.fontSize,
      color: opts.color ? { argb: 'FF' + opts.color } : undefined,
    }
  }
  if (opts?.fill) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + opts.fill } }
  }
  if (opts?.numFmt) cell.numFmt = opts.numFmt
  if (opts?.border) {
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF' + BORDER_COLOR } },
      bottom: { style: 'thin', color: { argb: 'FF' + BORDER_COLOR } },
      left: { style: 'thin', color: { argb: 'FF' + BORDER_COLOR } },
      right: { style: 'thin', color: { argb: 'FF' + BORDER_COLOR } },
    }
  }
  if (opts?.wrap) {
    cell.alignment = { wrapText: true, vertical: 'top', horizontal: opts.align }
  } else if (opts?.align) {
    cell.alignment = { horizontal: opts.align, vertical: 'middle' }
  }
}

function letter(colIndex: number): string {
  return String.fromCharCode(64 + colIndex)
}

function tituloDaSheet(ws: Worksheet, lastCol: number, titulo: string, subtitulo: string) {
  ws.mergeCells(`A1:${letter(lastCol)}1`)
  ws.getCell('A1').value = titulo
  styleCell(ws.getCell('A1'), { bold: true, fill: FILL_HEADER, color: TEXT_HEADER, fontSize: 12, align: 'left' })
  ws.getRow(1).height = 24

  ws.mergeCells(`A2:${letter(lastCol)}2`)
  ws.getCell('A2').value = subtitulo
  styleCell(ws.getCell('A2'), { italic: true, color: TEXT_SUBTITLE, fontSize: 9 })
}

function cabeçalho(ws: Worksheet, colunas: string[]) {
  ws.getRow(3).height = 20
  colunas.forEach((nome, i) => {
    const cell = ws.getCell(3, i + 1)
    cell.value = nome
    styleCell(cell, { bold: true, fill: FILL_SUBHEADER, border: true })
  })
}

function larguras(ws: Worksheet, cols: number[]) {
  cols.forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })
}

function congelar(ws: Worksheet, ySplit: number) {
  ws.views = [{ state: 'frozen', ySplit }]
}

function autofiltro(ws: Worksheet, ultimaColuna: number, ultimaLinha: number) {
  ws.autoFilter = { from: 'A3', to: `${letter(ultimaColuna)}${ultimaLinha}` }
}

function subtitulo(nomeRateio: string): string {
  return `Rateio ${nomeRateio} · Gerado em ${formatoDataHora(new Date().toISOString())}`
}

interface Contexto {
  dados: DadosExportacao
  corrigir: boolean
  hoje: string
  taxasCore: { mes: string; taxa: number }[]
  nomeDe: (userId: string) => string
  reais: (valor: Decimal | number) => number | null
  unidades: (valor: Decimal | number, data: string) => number | null
  indice: (data: string) => number | null
  corrigido: (valor: number | Decimal, data: string) => number | null
  nominal: (valor: number | Decimal) => number
  reaisFromMap: (map: Map<string, Decimal>, userId: string) => number | null
}

function montaContexto(dados: DadosExportacao): Contexto {
  const corrigir = dados.rateio.corrigir_ipca === true
  const hoje = dados.hoje
  const taxasCore = dados.taxas.map((t) => ({ mes: t.mes.slice(0, 10), taxa: Number(t.taxa) }))

  const nomes = new Map<string, string>()
  dados.rateio.membros.forEach((m) => {
    const nome = m.users?.nome ?? m.users?.email?.split('@')[0] ?? m.user_id.slice(0, 6)
    nomes.set(m.user_id, nome)
  })
  const nomeDe = (userId: string) => nomes.get(userId) ?? userId.slice(0, 6)

  const converte = (fn: () => Decimal, casas: number): number | null => {
    try {
      return Number(fn().toFixed(casas))
    } catch {
      return null
    }
  }

  return {
    dados,
    corrigir,
    hoje,
    taxasCore,
    nomeDe,
    indice: (data: string) => converte(() => indiceEmData(data, taxasCore), 4),
    corrigido: (valor: number | Decimal, data: string) =>
      converte(() => paraReais(paraUnidades(D(valor), data, true, taxasCore), hoje, true, taxasCore), 2),
    nominal: (valor: number | Decimal) => Number(D(valor).toFixed(2)),
    reais: (valor) => converte(() => paraReais(D(valor), hoje, corrigir, taxasCore), 2),
    unidades: (valor, data) => converte(() => paraUnidades(D(valor), data, corrigir, taxasCore), 4),
    reaisFromMap: (map, userId) =>
      converte(() => paraReais(map.get(userId) ?? D(0), hoje, corrigir, taxasCore), 2),
  }
}

export function montarWorkbook(dados: DadosExportacao): Workbook {
  const wb = new ExcelJS.Workbook()
  const c = montaContexto(dados)
  const { resultado, despesas, reembolsos, taxas, links, auditLog, rateio, hoje, usuarioEmail } = dados
  const nomeRateio = rateio.nome

  // ── 1. Resumo ─────────────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Resumo')
    tituloDaSheet(ws, 2, `Rateio ${nomeRateio} — Resumo`, subtitulo(nomeRateio))

    const somaMap = (map: Map<string, Decimal>): Decimal => {
      let total = D(0)
      map.forEach((v) => (total = total.plus(v)))
      return total
    }

    const linhas: [string, string | number | null][] = [
      ['Nome', nomeRateio],
      ['Criado em', formatoData(rateio.criado_em)],
      ['Arquivado em', rateio.arquivado_em ? formatoData(rateio.arquivado_em) : '—'],
      ['Correção IPCA', c.corrigir ? 'Sim' : 'Não'],
      ['Nº de participantes', rateio.membros.length],
      [`U_total (${c.corrigir ? 'hoje, R$' : 'R$'})`, c.reais(resultado.uTotal)],
      ...(c.corrigir ? [['U_total (unidades)', Number(resultado.uTotal.toFixed(4))] as [string, number]] : []),
      ['Pago efetivo total (R$)', c.reais(somaMap(resultado.pagoEfetivo))],
      ['Excesso total (R$)', c.reais(somaMap(resultado.excesso))],
      ['Déficit total (R$)', c.reais(somaMap(resultado.deficit))],
      ['Despesas pagas (qtd)', despesas.filter((d) => d.situacao === 'paga').length],
      ['Despesas previstas (qtd)', despesas.filter((d) => d.situacao === 'prevista').length],
      ['Reembolsos (qtd)', reembolsos.length],
      ['Data de referência', formatoData(hoje)],
      ['Gerado em', formatoDataHora(new Date().toISOString())],
      ['Gerado por', usuarioEmail ?? '—'],
    ]

    let linha = 3
    linhas.forEach(([chave, valor]) => {
      const cellChave = ws.getCell(linha, 1)
      const cellValor = ws.getCell(linha, 2)
      cellChave.value = chave
      cellValor.value = valor
      styleCell(cellChave, { border: true, bold: true })
      styleCell(cellValor, { border: true })
      if (typeof valor === 'number' && chave.includes('R$')) cellValor.numFmt = CURRENCY_FORMAT
      if (typeof valor === 'number' && chave.includes('unidades')) cellValor.numFmt = UNIDADES_FORMAT
      linha++
    })

    ws.mergeCells(`A${linha}:B${linha}`)
    ws.getCell(`A${linha}`).value =
      'Unidades aparecem apenas quando a correção IPCA está ativa. Σ institucional: Σ excesso = Σ déficit e Σ saldos = 0.'
    styleCell(ws.getCell(`A${linha}`), { italic: true, color: TEXT_SUBTITLE, fontSize: 9 })

    larguras(ws, [32, 46])
    congelar(ws, 2)
  }

  // ── 2. Saldos por participante ────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Saldos por participante')
    const colunas = ['Participante', 'Cota', 'Pago efetivo (R$)', 'Compromisso (R$)', 'Excesso (R$)', 'Déficit (R$)', 'Saldo (R$)']
    if (c.corrigir) {
      colunas.splice(2, 0, 'Pago efetivo (un)', 'Compromisso (un)', 'Excesso (un)', 'Déficit (un)')
      colunas.push('Saldo (un)')
    }
    const ultimaColuna = colunas.length

    tituloDaSheet(ws, ultimaColuna, `Rateio ${nomeRateio} — Saldos`, subtitulo(nomeRateio))
    cabeçalho(ws, colunas)

    let linha = 4
    rateio.membros.forEach((m) => {
      const uid = m.user_id
      const saldoUnidades = resultado.saldoUnidades.get(uid) ?? D(0)
      const valores: (string | number | null)[] = [c.nomeDe(uid), Number(m.cota)]
      if (c.corrigir) {
        valores.push(
          c.unidades(resultado.pagoEfetivo.get(uid) ?? D(0), hoje),
          c.unidades(resultado.compromisso.get(uid) ?? D(0), hoje),
          c.unidades(resultado.excesso.get(uid) ?? D(0), hoje),
          c.unidades(resultado.deficit.get(uid) ?? D(0), hoje),
        )
      }
      valores.push(
        c.reaisFromMap(resultado.pagoEfetivo, uid),
        c.reaisFromMap(resultado.compromisso, uid),
        c.reaisFromMap(resultado.excesso, uid),
        c.reaisFromMap(resultado.deficit, uid),
        c.reaisFromMap(resultado.saldoUnidades, uid),
      )
      if (c.corrigir) valores.push(c.unidades(saldoUnidades, hoje))

      valores.forEach((valor, i) => {
        const cell = ws.getCell(linha, i + 1)
        cell.value = valor
        styleCell(cell, { border: true })
        if (i === 1) cell.numFmt = PERCENT_FORMAT
        else if (i > 1 && cell.value !== null) {
          cell.numFmt = c.corrigir && (i >= 2 && i <= 5) ? UNIDADES_FORMAT : i === ultimaColuna - 1 && c.corrigir ? UNIDADES_FORMAT : CURRENCY_FORMAT
        }
      })
      linha++
    })

    if (rateio.membros.length === 0) {
      ws.mergeCells(`A4:${letter(ultimaColuna)}4`)
      ws.getCell('A4').value = 'Nenhum participante cadastrado.'
      styleCell(ws.getCell('A4'), { italic: true, color: TEXT_SUBTITLE, fontSize: 9 })
      linha++
    }

    ws.mergeCells(`A${linha}:${letter(ultimaColuna)}${linha}`)
    ws.getCell(`A${linha}`).value =
      'Saldo negativo = participante tem a receber; saldo positivo = participante deve.'
    styleCell(ws.getCell(`A${linha}`), { italic: true, color: TEXT_SUBTITLE, fontSize: 9 })

    autofiltro(ws, ultimaColuna, linha - 2)
    larguras(ws, [22, 8, ...Array(c.corrigir ? 8 : 0).fill(16), 16, 16, 14, 14, 14, ...(c.corrigir ? [14] : [])])
    congelar(ws, 3)
  }

  // ── 3. Extrato ────────────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Extrato')
    const colunas = ['Data', 'Tipo', 'Descrição', 'Pagador', 'Recebedor', 'Valor (R$)']
    if (c.corrigir) colunas.push('Unidades', 'Índice', 'Valor corrigido (R$)')
    colunas.push('Situação')
    const ultimaColuna = colunas.length

    tituloDaSheet(ws, ultimaColuna, `Rateio ${nomeRateio} — Extrato`, subtitulo(nomeRateio))
    cabeçalho(ws, colunas)

    type Evento =
      | { tipo: 'Despesa'; data: string; criadoEm: string; payload: DespesaItem }
      | { tipo: 'Reembolso'; data: string; criadoEm: string; payload: ReembolsoItem }

    const eventos: Evento[] = [
      ...despesas.map((d): Evento => ({ tipo: 'Despesa', data: d.data, criadoEm: d.criado_em, payload: d })),
      ...reembolsos.map((r): Evento => ({ tipo: 'Reembolso', data: r.data, criadoEm: r.criado_em, payload: r })),
    ]
    eventos.sort((a, b) => (a.data !== b.data ? (a.data < b.data ? -1 : 1) : a.criadoEm < b.criadoEm ? -1 : 1))

    let linha = 4
    let mesAtual: string | null = null

    eventos.forEach((ev) => {
      const mes = ev.data.slice(0, 7)
      if (mes !== mesAtual) {
        mesAtual = mes
        ws.mergeCells(`A${linha}:${letter(ultimaColuna)}${linha}`)
        ws.getCell(`A${linha}`).value = mesAnoLabel(mes)
        styleCell(ws.getCell(`A${linha}`), { bold: true, fill: FILL_SUBHEADER })
        ws.getRow(linha).height = 18
        linha++
      }

      let valores: (string | number | null)[]
      if (ev.tipo === 'Despesa') {
        const p = ev.payload
        valores = [
          formatoData(p.data),
          'Despesa',
          p.descricao,
          c.nomeDe(p.pagador_user_id),
          '',
          c.nominal(p.valor),
          ...(c.corrigir ? [c.unidades(p.valor, p.data), c.indice(p.data), c.corrigido(p.valor, p.data)] : []),
          p.situacao === 'paga' ? 'Paga' : 'Prevista',
        ]
      } else {
        const p = ev.payload
        valores = [
          formatoData(p.data),
          'Reembolso',
          p.descricao,
          c.nomeDe(p.pagador_user_id),
          c.nomeDe(p.recebedor_user_id),
          c.nominal(p.valor),
          ...(c.corrigir ? [c.unidades(p.valor, p.data), '—', '—'] : []),
          p.data <= hoje ? 'Paga' : 'Prevista',
        ]
      }

      valores.forEach((valor, i) => {
        const cell = ws.getCell(linha, i + 1)
        cell.value = valor
        styleCell(cell, { border: true })
        if (typeof valor === 'number') {
          if (i === 5) cell.numFmt = CURRENCY_FORMAT
          else if (c.corrigir && i === 6) cell.numFmt = UNIDADES_FORMAT
          else if (c.corrigir && i === 7) cell.numFmt = UNIDADES_FORMAT
          else if (c.corrigir && i === 8) cell.numFmt = CURRENCY_FORMAT
        }
      })
      linha++
    })

    if (eventos.length === 0) {
      ws.mergeCells(`A4:${letter(ultimaColuna)}4`)
      ws.getCell('A4').value = 'Nenhuma movimentação ainda.'
      styleCell(ws.getCell('A4'), { italic: true, color: TEXT_SUBTITLE, fontSize: 9 })
    }

    larguras(ws, [12, 12, 42, 18, 18, 14, ...(c.corrigir ? [13, 10, 14] : []), 12])
    congelar(ws, 4)
  }

  // ── 4. Correção IPCA ───────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Correção IPCA')
    tituloDaSheet(ws, 4, `Rateio ${nomeRateio} — Correção IPCA`, subtitulo(nomeRateio))
    cabeçalho(ws, ['Período', 'Ajuste (%)', 'Ajuste (R$)', 'Valor acumulado (R$)'])

    let linha = 4
    let escreveuAlgum = false
    if (!c.corrigir) {
      ws.mergeCells(`A${linha}:D${linha}`)
      ws.getCell(`A${linha}`).value = 'Correção IPCA inativa para este rateio.'
      styleCell(ws.getCell(`A${linha}`), { italic: true, color: TEXT_SUBTITLE, fontSize: 9 })
      linha++
    } else {
      const despesasPagas = [...despesas]
        .filter(d => d.situacao === 'paga')
        .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
      // Tabela de índices montada uma única vez e reusada por despesa — ver core/correcao.ts.
      const tabelaIpca = construirTabelaIndices(c.taxasCore)
      for (const d of despesasPagas) {
        const rastro = rastroCorrecao({ data: d.data, valor: D(d.valor), situacao: d.situacao }, hoje, true, c.taxasCore, tabelaIpca)
        if (!rastro) continue
        escreveuAlgum = true

        ws.mergeCells(`A${linha}:D${linha}`)
        ws.getCell(`A${linha}`).value = `Despesa: ${d.descricao} — ${formatoData(d.data)} — ${c.nomeDe(d.pagador_user_id)}`
        styleCell(ws.getCell(`A${linha}`), { bold: true, fill: FILL_SUBHEADER, border: true })
        linha++

        for (const etapa of rastro.etapas) {
          const valores = [
            etapa.rotulo,
            Number(etapa.ajustePct.dividedBy(100).toFixed(4)),
            Number(etapa.ajusteReais.toFixed(2)),
            Number(etapa.valorAcumulado.toFixed(2)),
          ]
          valores.forEach((valor, i) => {
            const cell = ws.getCell(linha, i + 1)
            cell.value = valor
            styleCell(cell, { border: true })
            if (i === 1) cell.numFmt = IPCA_PERCENT_FORMAT
            else if (i >= 2 && typeof valor === 'number') cell.numFmt = CURRENCY_FORMAT
          })
          linha++
        }

        ws.mergeCells(`A${linha}:D${linha}`)
        ws.getCell(`A${linha}`).value =
          `Valor original R$ ${Number(rastro.valorOriginal.toFixed(2))} → corrigido R$ ${Number(rastro.valorCorrigido.toFixed(2))} (${rastro.totalAjustePct.toFixed(2)}%)`
        styleCell(ws.getCell(`A${linha}`), { italic: true, color: TEXT_SUBTITLE, fontSize: 9 })
        linha++
        linha++
      }
      if (!escreveuAlgum) {
        ws.mergeCells(`A${linha}:D${linha}`)
        ws.getCell(`A${linha}`).value = 'Nenhuma despesa paga com correção aplicável.'
        styleCell(ws.getCell(`A${linha}`), { italic: true, color: TEXT_SUBTITLE, fontSize: 9 })
        linha++
      }
    }

    larguras(ws, [30, 12, 14, 16])
    congelar(ws, 3)
  }

  // ── 5. Deve & Recebe ─────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Deve & Recebe')
    const colunas = ['De', 'Para', 'Valor (R$)']
    if (c.corrigir) colunas.push('Unidades')
    const ultimaColuna = colunas.length

    tituloDaSheet(ws, ultimaColuna, `Rateio ${nomeRateio} — Quem deve quem`, subtitulo(nomeRateio))
    cabeçalho(ws, colunas)

    const pares = resultado.deveDePara.filter((dp) => !dp.unidades.isZero())
    let linha = 4
    pares.forEach((dp) => {
      const valores: (string | number | null)[] = [c.nomeDe(dp.de), c.nomeDe(dp.para), c.reais(dp.unidades)]
      if (c.corrigir) valores.push(c.unidades(dp.unidades, hoje))
      valores.forEach((valor, i) => {
        const cell = ws.getCell(linha, i + 1)
        cell.value = valor
        styleCell(cell, { border: true })
        if (i === 2) cell.numFmt = CURRENCY_FORMAT
        else if (c.corrigir && i === 3) cell.numFmt = UNIDADES_FORMAT
      })
      linha++
    })

    if (pares.length === 0) {
      ws.mergeCells(`A4:${letter(ultimaColuna)}4`)
      ws.getCell('A4').value = 'Sem transferências: todos os saldos estão zerados.'
      styleCell(ws.getCell('A4'), { italic: true, color: TEXT_SUBTITLE, fontSize: 9 })
      linha++
    }

    autofiltro(ws, ultimaColuna, linha - 1)
    larguras(ws, [22, 22, 16, ...(c.corrigir ? [16] : [])])
    congelar(ws, 3)
  }

  // ── 5. Despesas ──────────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Despesas')
    const colunas = ['Data', 'Descrição', 'Pagador', 'Valor (R$)']
    if (c.corrigir) colunas.push('Unidades')
    colunas.push('Situação', 'Observação', 'Criado em')
    const ultimaColuna = colunas.length

    tituloDaSheet(ws, ultimaColuna, `Rateio ${nomeRateio} — Despesas`, subtitulo(nomeRateio))
    cabeçalho(ws, colunas)

    const todas = [...despesas].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
    let linha = 4
    todas.forEach((d) => {
      const valores: (string | number | null)[] = [
        formatoData(d.data),
        d.descricao,
        c.nomeDe(d.pagador_user_id),
        c.nominal(d.valor),
        ...(c.corrigir ? [c.unidades(d.valor, d.data)] : []),
        d.situacao === 'paga' ? 'Paga' : 'Prevista',
        d.observacao ?? '—',
        formatoDataHora(d.criado_em),
      ]
      valores.forEach((valor, i) => {
        const cell = ws.getCell(linha, i + 1)
        cell.value = valor
        styleCell(cell, { border: true })
        if (i === 3) cell.numFmt = CURRENCY_FORMAT
        else if (c.corrigir && i === 4) cell.numFmt = UNIDADES_FORMAT
      })
      linha++
    })

    if (todas.length === 0) {
      ws.mergeCells(`A4:${letter(ultimaColuna)}4`)
      ws.getCell('A4').value = 'Nenhuma despesa cadastrada.'
      styleCell(ws.getCell('A4'), { italic: true, color: TEXT_SUBTITLE, fontSize: 9 })
      linha++
    }

    autofiltro(ws, ultimaColuna, linha - 1)
    larguras(ws, [12, 42, 18, 14, ...(c.corrigir ? [13] : []), 12, 32, 18])
    congelar(ws, 3)
  }

  // ── 6. Reembolsos ────────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Reembolsos')
    const colunas = ['Data', 'Pagador', 'Recebedor', 'Valor (R$)']
    if (c.corrigir) colunas.push('Unidades')
    colunas.push('Descrição', 'Observação', 'Criado em')
    const ultimaColuna = colunas.length

    tituloDaSheet(ws, ultimaColuna, `Rateio ${nomeRateio} — Reembolsos`, subtitulo(nomeRateio))
    cabeçalho(ws, colunas)

    const todos = [...reembolsos].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))
    let linha = 4
    todos.forEach((r) => {
      const valores: (string | number | null)[] = [
        formatoData(r.data),
        c.nomeDe(r.pagador_user_id),
        c.nomeDe(r.recebedor_user_id),
        c.reais(r.valor),
        ...(c.corrigir ? [c.unidades(r.valor, r.data)] : []),
        r.descricao,
        r.observacao ?? '—',
        formatoDataHora(r.criado_em),
      ]
      valores.forEach((valor, i) => {
        const cell = ws.getCell(linha, i + 1)
        cell.value = valor
        styleCell(cell, { border: true })
        if (i === 3) cell.numFmt = CURRENCY_FORMAT
        else if (c.corrigir && i === 4) cell.numFmt = UNIDADES_FORMAT
      })
      linha++
    })

    if (todos.length === 0) {
      ws.mergeCells(`A4:${letter(ultimaColuna)}4`)
      ws.getCell('A4').value = 'Nenhum reembolso cadastrado.'
      styleCell(ws.getCell('A4'), { italic: true, color: TEXT_SUBTITLE, fontSize: 9 })
      linha++
    }

    autofiltro(ws, ultimaColuna, linha - 1)
    larguras(ws, [12, 18, 18, 14, ...(c.corrigir ? [13] : []), 32, 24, 18])
    congelar(ws, 3)
  }

  // ── 7. Participantes & cotas ─────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Participantes & cotas')
    tituloDaSheet(ws, 3, `Rateio ${nomeRateio} — Participantes`, subtitulo(nomeRateio))
    cabeçalho(ws, ['Participante', 'E-mail', 'Cota'])

    let linha = 4
    rateio.membros.forEach((m) => {
      const valores: (string | number)[] = [c.nomeDe(m.user_id), m.users?.email ?? '—', Number(m.cota)]
      valores.forEach((valor, i) => {
        const cell = ws.getCell(linha, i + 1)
        cell.value = valor
        styleCell(cell, { border: true })
        if (i === 2) cell.numFmt = PERCENT_FORMAT
      })
      linha++
    })

    if (rateio.membros.length === 0) {
      ws.mergeCells('A4:C4')
      ws.getCell('A4').value = 'Nenhum participante cadastrado.'
      styleCell(ws.getCell('A4'), { italic: true, color: TEXT_SUBTITLE, fontSize: 9 })
      linha++
    }

    autofiltro(ws, 3, linha - 1)
    larguras(ws, [22, 30, 10])
    congelar(ws, 3)
  }

  // ── 8. IPCA ──────────────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('IPCA')
    tituloDaSheet(ws, 2, `Rateio ${nomeRateio} — Série IPCA`, subtitulo(nomeRateio))
    cabeçalho(ws, ['Mês', 'Taxa (%)'])

    const taxasOrd = [...taxas].sort((a, b) => (a.mes < b.mes ? -1 : a.mes > b.mes ? 1 : 0))
    let linha = 4
    taxasOrd.forEach((t) => {
      const valores: (string | number)[] = [mesAnoLabel(t.mes), Number(t.taxa) / 100]
      valores.forEach((valor, i) => {
        const cell = ws.getCell(linha, i + 1)
        cell.value = valor
        styleCell(cell, { border: true })
        if (i === 1) cell.numFmt = IPCA_PERCENT_FORMAT
      })
      linha++
    })

    if (taxasOrd.length === 0) {
      ws.mergeCells('A4:B4')
      ws.getCell('A4').value = 'Nenhuma taxa cadastrada.'
      styleCell(ws.getCell('A4'), { italic: true, color: TEXT_SUBTITLE, fontSize: 9 })
      linha++
    }

    autofiltro(ws, 2, linha - 1)
    larguras(ws, [14, 12])
    congelar(ws, 3)
  }

  // ── 9. Links ─────────────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Links')
    tituloDaSheet(ws, 3, `Rateio ${nomeRateio} — Links`, subtitulo(nomeRateio))
    cabeçalho(ws, ['Rótulo', 'URL', 'Criado em'])

    const linksRateio = links.filter((l) => l.entidade_tipo === 'rateio')
    let linha = 4
    linksRateio.forEach((l) => {
      const valores: string[] = [l.rotulo ?? '—', l.url, formatoDataHora(l.criado_em)]
      valores.forEach((valor, i) => {
        const cell = ws.getCell(linha, i + 1)
        cell.value = valor
        styleCell(cell, { border: true })
      })
      linha++
    })

    if (linksRateio.length === 0) {
      ws.mergeCells('A4:C4')
      ws.getCell('A4').value = 'Nenhum link adicionado.'
      styleCell(ws.getCell('A4'), { italic: true, color: TEXT_SUBTITLE, fontSize: 9 })
      linha++
    }

    autofiltro(ws, 3, linha - 1)
    larguras(ws, [24, 60, 18])
    congelar(ws, 3)
  }

  // ── 10. Auditoria ────────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Auditoria')
    tituloDaSheet(ws, 6, `Rateio ${nomeRateio} — Auditoria`, subtitulo(nomeRateio))
    cabeçalho(ws, ['Quando', 'Quem', 'Ação', 'Entidade', 'Registro', 'Alterações'])

    const despesaPorId = new Map(despesas.map((d) => [d.id, d.descricao]))
    const reembolsoPorId = new Map(reembolsos.map((r) => [r.id, r.descricao]))
    let linha = 4
    auditLog.forEach((l) => {
      const label =
        l.entidade === 'despesa'
          ? despesaPorId.get(l.entidade_id) ?? l.entidade_id
          : reembolsoPorId.get(l.entidade_id) ?? l.entidade_id
      const alteracoes = JSON.stringify(l.diff_json ?? {})
      const valores: string[] = [
        formatoDataHora(l.criado_em),
        l.ator?.email ?? l.user_id,
        l.acao === 'delete' ? 'Exclusão' : 'Alteração',
        l.entidade === 'despesa' ? 'Despesa' : 'Reembolso',
        label,
        alteracoes.length > 1000 ? alteracoes.slice(0, 1000) + '…' : alteracoes,
      ]
      valores.forEach((valor, i) => {
        const cell = ws.getCell(linha, i + 1)
        cell.value = valor
        styleCell(cell, { border: true, wrap: i === 5 })
      })
      linha++
    })

    if (auditLog.length === 0) {
      ws.mergeCells('A4:F4')
      ws.getCell('A4').value = 'Nenhuma alteração registrada.'
      styleCell(ws.getCell('A4'), { italic: true, color: TEXT_SUBTITLE, fontSize: 9 })
      linha++
    }

    autofiltro(ws, 6, linha - 1)
    larguras(ws, [18, 26, 12, 12, 30, 60])
    congelar(ws, 3)
  }

  wb.created = new Date()
  wb.modified = new Date()
  wb.creator = 'Rateio'

  return wb
}
