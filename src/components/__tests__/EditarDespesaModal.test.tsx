import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { EditarDespesaModal } from '../EditarDespesaModal'
import * as queries from '../../db/queries'
import type { DespesaItem } from '../../db/queries'

vi.mock('../../db/queries', () => ({
  editarDespesa: vi.fn(),
}))

const mockEditar = vi.mocked(queries.editarDespesa)

const despesa: DespesaItem = {
  id: 'desp-1',
  rateio_id: 'rat-1',
  data: '2026-01-15',
  descricao: 'Aluguel',
  pagador_user_id: 'user-a',
  valor: 1200,
  criado_em: '2026-01-01T00:00:00Z',
  pagador: { email: 'alice@test.com' },
}

const membros = [
  { user_id: 'user-a', cota: 0.5, users: { email: 'alice@test.com' } },
  { user_id: 'user-b', cota: 0.5, users: { email: 'bob@test.com' } },
]

const defaultProps = {
  despesa,
  membros,
  onSave: vi.fn(),
  onClose: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EditarDespesaModal — renderização', () => {
  it('exibe título "Editar despesa"', () => {
    render(<EditarDespesaModal {...defaultProps} />)
    expect(screen.getByText('Editar despesa')).toBeTruthy()
  })

  it('pré-popula descrição com valor atual', () => {
    render(<EditarDespesaModal {...defaultProps} />)
    const input = screen.getByDisplayValue('Aluguel') as HTMLInputElement
    expect(input.value).toBe('Aluguel')
  })

  it('pré-popula valor com valor atual', () => {
    render(<EditarDespesaModal {...defaultProps} />)
    const input = screen.getByDisplayValue('1200') as HTMLInputElement
    expect(input.value).toBe('1200')
  })

  it('exibe membros do rateio', () => {
    render(<EditarDespesaModal {...defaultProps} />)
    expect(screen.getByText('alice')).toBeTruthy()
    expect(screen.getByText('bob')).toBeTruthy()
  })
})

describe('EditarDespesaModal — interação', () => {
  it('clicar no backdrop chama onClose', () => {
    render(<EditarDespesaModal {...defaultProps} />)
    const backdrop = document.querySelector('.fixed.inset-0.z-50 > .absolute')!
    fireEvent.click(backdrop)
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('clicar no botão fechar chama onClose', () => {
    render(<EditarDespesaModal {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Fechar'))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('clicar em Cancelar chama onClose', () => {
    render(<EditarDespesaModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Cancelar'))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})

describe('EditarDespesaModal — validação', () => {
  it('exibe erro se valor = 0', async () => {
    render(<EditarDespesaModal {...defaultProps} />)
    fireEvent.change(screen.getByDisplayValue('1200'), { target: { value: '0' } })
    await act(async () => {
      fireEvent.submit(screen.getByDisplayValue('Aluguel').closest('form')!)
    })
    expect(screen.getByText('Valor deve ser maior que zero.')).toBeTruthy()
    expect(mockEditar).not.toHaveBeenCalled()
  })

  it('exibe erro se valor negativo', async () => {
    render(<EditarDespesaModal {...defaultProps} />)
    fireEvent.change(screen.getByDisplayValue('1200'), { target: { value: '-50' } })
    await act(async () => {
      fireEvent.submit(screen.getByDisplayValue('Aluguel').closest('form')!)
    })
    expect(screen.getByText('Valor deve ser maior que zero.')).toBeTruthy()
    expect(mockEditar).not.toHaveBeenCalled()
  })
})

describe('EditarDespesaModal — submit', () => {
  it('chama editarDespesa com args corretos e onSave ao salvar', async () => {
    mockEditar.mockResolvedValue(undefined)
    render(<EditarDespesaModal {...defaultProps} />)
    await act(async () => {
      fireEvent.submit(screen.getByDisplayValue('Aluguel').closest('form')!)
    })
    expect(mockEditar).toHaveBeenCalledWith({
      id: 'desp-1',
      data: '2026-01-15',
      descricao: 'Aluguel',
      pagadorUserId: 'user-a',
      valor: 1200,
    })
    expect(defaultProps.onSave).toHaveBeenCalled()
  })

  it('exibe erro do RPC sem chamar onSave', async () => {
    mockEditar.mockRejectedValue(new Error('Valor deve ser maior que zero'))
    render(<EditarDespesaModal {...defaultProps} />)
    await act(async () => {
      fireEvent.submit(screen.getByDisplayValue('Aluguel').closest('form')!)
    })
    await waitFor(() => {
      expect(screen.getByText('Valor deve ser maior que zero')).toBeTruthy()
    })
    expect(defaultProps.onSave).not.toHaveBeenCalled()
  })

  it('troca pagador e chama editarDespesa com novo pagador', async () => {
    mockEditar.mockResolvedValue(undefined)
    render(<EditarDespesaModal {...defaultProps} />)
    fireEvent.click(screen.getByText('bob'))
    await act(async () => {
      fireEvent.submit(screen.getByDisplayValue('Aluguel').closest('form')!)
    })
    expect(mockEditar).toHaveBeenCalledWith(expect.objectContaining({ pagadorUserId: 'user-b' }))
  })
})
