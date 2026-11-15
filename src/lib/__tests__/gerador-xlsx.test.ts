import { describe, it, expect } from 'vitest'
import { montarWorkbook, gerarNomeArquivo, slugify } from '../gerador-xlsx'
import { calcularSaldo } from '../../core/saldo'
import { D } from '../../core/decimal'

const hoje = '2026-08-15'

const membros = [
  { user_id: 'P1', cota: 0.2, users: { email: 'p1@x.com', nome: 'P1' } },
  { user_id: 'P2', cota: 0.3, users: { email: 'p2@x.com', nome: 'P2' } },
  { user_id: 'P3', cota: 0.1, users: { email: 'p3@x.com', nome: 'P3' } },
  { user_id: 'P4', cota: 0.4, users: { email: 'p4@x.com', nome: 'P4' } },
]

const despesas = [
  {
    id: 'd1', rateio_id: 'r1', data: '2026-01-10', descricao: 'Mercado',
    pagador_user_id: 'P1', valor: 100, situacao: 'paga' as const, observacao: null,
    criado_em: '2026-01-10T10:00:00', pagador: { email: 'p1@x.com' },
  },
  {
    id: 'd2', rateio_id: 'r1', data: '2026-02-10', descricao: 'Luz',
    pagador_user_id: 'P2', valor: 200, situacao: 'paga' as const, observacao: null,
    criado_em: '2026-02-10T11:00:00', pagador: { email: 'p2@x.com' },
  },
  {
    id: 'd3', rateio_id: 'r1', data: '2026-03-10', descricao: 'Água',
    pagador_user_id: 'P4', valor: 300, situacao: 'paga' as const, observacao: 'Conta de março',
    criado_em: '2026-03-10T12:00:00', pagador: { email: 'p4@x.com' },
  },
]

const reembolso = {
  id: 'rb1', rateio_id: 'r1', data: '2026-03-20',
  pagador_user_id: 'P3', recebedor_user_id: 'P4', valor: 50,
  descricao: 'Reembolso água', observacao: 'pix',
  criado_em: '2026-03-20T09:00:00',
  pagador: { email: 'p3@x.com' }, recebedor: { email: 'p4@x.com' },
}

const rateio = {
  id: 'r1',
  nome: 'Apartamento',
  corrigir_ipca: false,
  criado_em: '2026-01-01',
  arquivado_em: null,
  criado_por_user_id: 'P1',
  membros,
}

const rateioCore = {
  participantes: membros.map((m) => ({ userId: m.user_id, cota: D(m.cota) })),
  despesas: despesas.map((d) => ({
    data: d.data,
    valor: D(d.valor),
    pagadorUserId: d.pagador_user_id,
    situacao: d.situacao,
  })),
  reembolsos: [],
}

const resultado = calcularSaldo(rateioCore, false, hoje, [])

function dados() {
  return {
    rateio,
    despesas,
    reembolsos: [],
    taxas: [],
    links: [],
    auditLog: [],
    resultado,
    hoje,
    usuarioEmail: 'admin@test.com',
  }
}

describe('gerador-xlsx', () => {
  it('slugify e nome de arquivo', () => {
    expect(slugify('Churrasco do João & Cia')).toBe('churrasco-do-joao-cia')
    expect(gerarNomeArquivo('Apartamento', '2026-11-13')).toBe('rateio-apartamento-2026-11-13.xlsx')
  })

  it('monta as 11 abas na ordem esperada', () => {
    const wb = montarWorkbook(dados())
    expect(wb.worksheets.map((ws) => ws.name)).toEqual([
      'Resumo',
      'Saldos por participante',
      'Extrato',
      'Correção IPCA',
      'Deve & Recebe',
      'Despesas',
      'Reembolsos',
      'Participantes & cotas',
      'IPCA',
      'Links',
      'Auditoria',
    ])
  })

  it('saldos sem colunas de unidades quando IPCA inativo', () => {
    const wb = montarWorkbook(dados())
    const ws = wb.getWorksheet('Saldos por participante')!
    expect(ws.rowCount).toBeGreaterThan(0)
    // Linha 4 = P1, 5 = P2, 6 = P3, 7 = P4; coluna G = Saldo (R$)
    expect(ws.getCell('G4').value).toBe(20)
    expect(ws.getCell('G5').value).toBe(-20)
    expect(ws.getCell('G6').value).toBe(60)
    expect(ws.getCell('G7').value).toBe(-60)
    expect(ws.getCell('H4').value).toBeNull() // coluna H não existe (7 cols)
  })

  it('resumo com totais e IPCA inativo', () => {
    const wb = montarWorkbook(dados())
    const ws = wb.getWorksheet('Resumo')!
    expect(ws.getCell('B8').value).toBe(600) // U_total (R$)
    expect(ws.getCell('B6').value).toBe('Não') // Correção IPCA
  })

  it('deve & recebe com 4 pares e valores exatos', () => {
    const wb = montarWorkbook(dados())
    const ws = wb.getWorksheet('Deve & Recebe')!
    const pares = new Map<string, number>()
    // Itera todas as linhas de dados (a partir da 4) até encontrar vazio
    for (let r = 4; ; r++) {
      const de = ws.getCell(r, 1).value
      const para = ws.getCell(r, 2).value
      const valor = ws.getCell(r, 3).value
      if (!de || !para || valor == null) break
      pares.set(`${de}→${para}`, valor as number)
    }
    expect(pares.size).toBe(4)
    expect(pares.get('P1→P2')).toBe(5)
    expect(pares.get('P1→P4')).toBe(15)
    expect(pares.get('P3→P2')).toBe(15)
    expect(pares.get('P3→P4')).toBe(45)
  })

  it('extrato agrupado por mês com 3 lançamentos', () => {
    const wb = montarWorkbook(dados())
    const ws = wb.getWorksheet('Extrato')!
    // Linha 4 = grupo Janeiro, 5 = d1, 6 = grupo Fevereiro, 7 = d2, 8 = grupo Março, 9 = d3
    expect(ws.getCell('A4').value).toBe('Janeiro 2026')
    expect(ws.getCell('A5').value).toBe('10/01/2026')
    expect(ws.getCell('C5').value).toBe('Mercado')
    expect(ws.getCell('F5').value).toBe(100)
    expect(ws.getCell('G5').value).toBe('Paga')
    expect(ws.getCell('A6').value).toBe('Fevereiro 2026')
    expect(ws.getCell('F7').value).toBe(200)
    expect(ws.getCell('A8').value).toBe('Março 2026')
    expect(ws.getCell('F9').value).toBe(300)
  })

  it('IPCA vazia mostra nota de vazio', () => {
    const wb = montarWorkbook(dados())
    const ws = wb.getWorksheet('IPCA')!
    expect(ws.getCell('A4').value).toBe('Nenhuma taxa cadastrada.')
  })

  it('com IPCA ativo inclui colunas de unidades e converte', () => {
    const dadosIpca = {
      ...dados(),
      rateio: { ...rateio, corrigir_ipca: true },
      taxas: [{ mes: '2026-01-01', taxa: 0 }],
      resultado: calcularSaldo(rateioCore, true, hoje, [{ mes: '2026-01-01', taxa: 0 }]),
    }
    const wb = montarWorkbook(dadosIpca)
    const wsSaldos = wb.getWorksheet('Saldos por participante')!
    expect(wsSaldos.getCell('H4').value).not.toBeUndefined() // Pago efetivo (un)
    const wsExtrato = wb.getWorksheet('Extrato')!
    expect(wsExtrato.getCell('G5').value).toBe(0.1) // G5 = unidades do d1
    expect(wsExtrato.getCell('H5').value).toBe(1000) // H5 = índice (flat, série única)
    expect(wsExtrato.getCell('I5').value).toBe(100) // I5 = valor corrigido (100 × índice 1000 / índice 1000)
  })

  it('aba Correção IPCA em rateio inativo mostra nota', () => {
    const wb = montarWorkbook(dados()) // corrigir_ipca: false
    const ws = wb.getWorksheet('Correção IPCA')!
    expect(ws.getCell('A4').value).toBe('Correção IPCA inativa para este rateio.')
  })

  it('aba Correção IPCA com IPCA ativo mostra etapas', () => {
    const dadosIpca = {
      ...dados(),
      rateio: { ...rateio, corrigir_ipca: true },
      taxas: [{ mes: '2026-01-01', taxa: 0 }],
      resultado: calcularSaldo(rateioCore, true, hoje, [{ mes: '2026-01-01', taxa: 0 }]),
    }
    const wb = montarWorkbook(dadosIpca)
    const ws = wb.getWorksheet('Correção IPCA')!
    // Linha 4 = bloco da despesa (merged A:D), linha 5 = primeira etapa
    const bloco = ws.getCell('A4').value as string
    expect(bloco).toContain('Mercado')
    const etapa = ws.getCell('A5').value as string
    expect(etapa).toContain('2026') // contém mês/ano na etiqueta
    // B5 = pct (0,0000 flat), C5 = ajuste (0), D5 = valor acumulado (100)
    expect(ws.getCell('B5').value).toBe(0)
    expect(ws.getCell('D5').value).toBe(100)
  })

  it('aba Despesas traz coluna Observação', () => {
    const wb = montarWorkbook(dados())
    const ws = wb.getWorksheet('Despesas')!
    expect(ws.getCell('B3').value).toBe('Descrição')
    expect(ws.getCell('F3').value).toBe('Observação')
    expect(ws.getCell('F4').value).toBe('—') // d1 sem observação
    expect(ws.getCell('F6').value).toBe('Conta de março') // d3
  })

  it('aba Reembolsos traz colunas Descrição e Observação', () => {
    const wb = montarWorkbook({ ...dados(), reembolsos: [reembolso] })
    const ws = wb.getWorksheet('Reembolsos')!
    expect(ws.getCell('E3').value).toBe('Descrição')
    expect(ws.getCell('F3').value).toBe('Observação')
    expect(ws.getCell('E4').value).toBe('Reembolso água')
    expect(ws.getCell('F4').value).toBe('pix')
  })

  it('extrato e auditoria usam a descrição do reembolso', () => {
    const wb = montarWorkbook({
      ...dados(),
      reembolsos: [reembolso],
      auditLog: [{
        id: 'a1', entidade: 'reembolso' as const, entidade_id: 'rb1', rateio_id: 'r1',
        user_id: 'P1', acao: 'update' as const,
        diff_json: { valor: { de: '40', para: '50' } },
        criado_em: '2026-03-21T10:00:00', ator: { email: 'p1@x.com' },
      }],
    })
    const extrato = wb.getWorksheet('Extrato')!
    // Linha 9 = d3, linha 10 = reembolso (mesmo mês, data posterior)
    expect(extrato.getCell('B10').value).toBe('Reembolso')
    expect(extrato.getCell('C10').value).toBe('Reembolso água')
    const auditoria = wb.getWorksheet('Auditoria')!
    expect(auditoria.getCell('E4').value).toBe('Reembolso água')
  })

  it('slugify com string vazia vira rateio', () => {
    expect(slugify('')).toBe('rateio')
    expect(slugify('   ')).toBe('rateio')
  })
})