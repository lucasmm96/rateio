import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { AuditLogPanel } from '../AuditLogPanel'
import * as queries from '../../db/queries'
import type { AuditLogItem } from '../../db/queries'

vi.mock('../../db/queries', () => ({
  listarAuditLog: vi.fn(),
}))

const mockListar = vi.mocked(queries.listarAuditLog)

const logEntry: AuditLogItem = {
  id: 'log-1',
  entidade: 'despesa',
  entidade_id: 'desp-1',
  rateio_id: 'rat-1',
  user_id: 'user-a',
  acao: 'update',
  diff_json: {
    valor: { de: '100.00', para: '200.00' },
    descricao: { de: 'Aluguel', para: 'Aluguel Março' },
  },
  criado_em: '2026-03-15T14:30:00Z',
  ator: { email: 'alice@test.com' },
}

const defaultProps = {
  entidade: 'despesa' as const,
  entidadeId: 'desp-1',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AuditLogPanel — estado inicial', () => {
  it('renderiza colapsado com botão Histórico', () => {
    render(<AuditLogPanel {...defaultProps} />)
    expect(screen.getByText('Histórico')).toBeTruthy()
    expect(screen.queryByText('Nenhuma alteração registrada.')).toBeNull()
  })

  it('não chama listarAuditLog antes de expandir', () => {
    render(<AuditLogPanel {...defaultProps} />)
    expect(mockListar).not.toHaveBeenCalled()
  })
})

describe('AuditLogPanel — expandir', () => {
  it('chama listarAuditLog com args corretos ao expandir', async () => {
    mockListar.mockResolvedValue([])
    await act(async () => {
      render(<AuditLogPanel {...defaultProps} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Histórico'))
    })
    expect(mockListar).toHaveBeenCalledWith('despesa', 'desp-1')
  })

  it('exibe "Nenhuma alteração registrada" se lista vazia', async () => {
    mockListar.mockResolvedValue([])
    render(<AuditLogPanel {...defaultProps} />)
    await act(async () => {
      fireEvent.click(screen.getByText('Histórico'))
    })
    await waitFor(() => {
      expect(screen.getByText('Nenhuma alteração registrada.')).toBeTruthy()
    })
  })

  it('exibe email do ator', async () => {
    mockListar.mockResolvedValue([logEntry])
    render(<AuditLogPanel {...defaultProps} />)
    await act(async () => {
      fireEvent.click(screen.getByText('Histórico'))
    })
    await waitFor(() => {
      expect(screen.getByText('alice@test.com')).toBeTruthy()
    })
  })

  it('exibe diff: campo Valor com de/para', async () => {
    mockListar.mockResolvedValue([logEntry])
    render(<AuditLogPanel {...defaultProps} />)
    await act(async () => {
      fireEvent.click(screen.getByText('Histórico'))
    })
    await waitFor(() => {
      expect(screen.getByText('Valor:')).toBeTruthy()
      expect(screen.getByText('100.00')).toBeTruthy()
      expect(screen.getByText('200.00')).toBeTruthy()
    })
  })

  it('exibe diff: campo Descrição', async () => {
    mockListar.mockResolvedValue([logEntry])
    render(<AuditLogPanel {...defaultProps} />)
    await act(async () => {
      fireEvent.click(screen.getByText('Histórico'))
    })
    await waitFor(() => {
      expect(screen.getByText('Descrição:')).toBeTruthy()
    })
  })

  it('exibe erro se listarAuditLog lançar', async () => {
    mockListar.mockRejectedValue(new Error('falha RLS'))
    render(<AuditLogPanel {...defaultProps} />)
    await act(async () => {
      fireEvent.click(screen.getByText('Histórico'))
    })
    await waitFor(() => {
      expect(screen.getByText('falha RLS')).toBeTruthy()
    })
  })

  it('carrega dados uma única vez mesmo com múltiplos toggles', async () => {
    mockListar.mockResolvedValue([])
    render(<AuditLogPanel {...defaultProps} />)
    await act(async () => {
      fireEvent.click(screen.getByText('Histórico'))
    })
    await waitFor(() => {
      expect(screen.getByText('Nenhuma alteração registrada.')).toBeTruthy()
    })
    // Fechar e reabrir — não deve chamar listarAuditLog novamente
    await act(async () => {
      fireEvent.click(screen.getByText('Histórico'))
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Histórico'))
    })
    expect(mockListar).toHaveBeenCalledTimes(1)
  })
})

describe('AuditLogPanel — reembolso', () => {
  it('passa entidade=reembolso correto a listarAuditLog', async () => {
    mockListar.mockResolvedValue([])
    render(<AuditLogPanel entidade="reembolso" entidadeId="reem-1" />)
    await act(async () => {
      fireEvent.click(screen.getByText('Histórico'))
    })
    expect(mockListar).toHaveBeenCalledWith('reembolso', 'reem-1')
  })
})
