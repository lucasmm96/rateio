import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { EditarReembolsoModal } from '../EditarReembolsoModal'
import * as queries from '../../db/queries'
import type { ReembolsoItem } from '../../db/queries'

vi.mock('../../db/queries', () => ({
  editarReembolso: vi.fn(),
}))

const mockEditar = vi.mocked(queries.editarReembolso)

const reembolso: ReembolsoItem = {
  id: 'reem-1',
  rateio_id: 'rat-1',
  data: '2026-02-10',
  pagador_user_id: 'user-a',
  recebedor_user_id: 'user-b',
  valor: 500,
  observacao: 'Conta luz',
  criado_em: '2026-02-01T00:00:00Z',
  pagador: { email: 'alice@test.com' },
  recebedor: { email: 'bob@test.com' },
}

const membros = [
  { user_id: 'user-a', cota: 0.5, users: { email: 'alice@test.com' } },
  { user_id: 'user-b', cota: 0.5, users: { email: 'bob@test.com' } },
]

const defaultProps = {
  reembolso,
  membros,
  onSave: vi.fn(),
  onClose: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EditarReembolsoModal — renderização', () => {
  it('exibe título "Editar reembolso"', () => {
    render(<EditarReembolsoModal {...defaultProps} />)
    expect(screen.getByText('Editar reembolso')).toBeTruthy()
  })

  it('pré-popula valor com valor atual', () => {
    render(<EditarReembolsoModal {...defaultProps} />)
    const input = screen.getByDisplayValue('500') as HTMLInputElement
    expect(input.value).toBe('500')
  })

  it('pré-popula observação', () => {
    render(<EditarReembolsoModal {...defaultProps} />)
    expect(screen.getByDisplayValue('Conta luz')).toBeTruthy()
  })

  it('exibe seções Pagador e Recebedor', () => {
    render(<EditarReembolsoModal {...defaultProps} />)
    expect(screen.getByText('Pagador')).toBeTruthy()
    expect(screen.getByText('Recebedor')).toBeTruthy()
  })
})

describe('EditarReembolsoModal — interação', () => {
  it('clicar no botão fechar chama onClose', () => {
    render(<EditarReembolsoModal {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('Fechar'))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('clicar em Cancelar chama onClose', () => {
    render(<EditarReembolsoModal {...defaultProps} />)
    fireEvent.click(screen.getByText('Cancelar'))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})

describe('EditarReembolsoModal — validação', () => {
  it('exibe erro se pagador = recebedor', async () => {
    render(<EditarReembolsoModal {...defaultProps} />)
    // Change recebedor to be the same as pagador (user-a)
    const recebedorSection = screen.getAllByText('alice')[1].closest('button')!
    fireEvent.click(recebedorSection)
    await act(async () => {
      fireEvent.submit(screen.getByDisplayValue('500').closest('form')!)
    })
    expect(screen.getByText('Pagador e recebedor não podem ser o mesmo.')).toBeTruthy()
    expect(mockEditar).not.toHaveBeenCalled()
  })

  it('exibe erro se valor = 0', async () => {
    const { container } = render(<EditarReembolsoModal {...defaultProps} />)
    const valorInput = screen.getByDisplayValue('500')
    fireEvent.change(valorInput, { target: { value: '0' } })
    const form = container.querySelector('form')!
    await act(async () => {
      fireEvent.submit(form)
    })
    expect(screen.getByText('Valor deve ser maior que zero.')).toBeTruthy()
    expect(mockEditar).not.toHaveBeenCalled()
  })
})

describe('EditarReembolsoModal — submit', () => {
  it('chama editarReembolso com args corretos e onSave ao salvar', async () => {
    mockEditar.mockResolvedValue(undefined)
    render(<EditarReembolsoModal {...defaultProps} />)
    await act(async () => {
      fireEvent.submit(screen.getByDisplayValue('500').closest('form')!)
    })
    expect(mockEditar).toHaveBeenCalledWith({
      id: 'reem-1',
      data: '2026-02-10',
      pagadorUserId: 'user-a',
      recebedorUserId: 'user-b',
      valor: 500,
      observacao: 'Conta luz',
    })
    expect(defaultProps.onSave).toHaveBeenCalled()
  })

  it('envia observacao null quando campo vazio', async () => {
    mockEditar.mockResolvedValue(undefined)
    const semObs = { ...reembolso, observacao: null }
    render(<EditarReembolsoModal {...defaultProps} reembolso={semObs} />)
    await act(async () => {
      fireEvent.submit(screen.getByDisplayValue('500').closest('form')!)
    })
    expect(mockEditar).toHaveBeenCalledWith(expect.objectContaining({ observacao: null }))
  })

  it('exibe erro do RPC sem chamar onSave', async () => {
    mockEditar.mockRejectedValue(new Error('Reembolso não encontrado'))
    render(<EditarReembolsoModal {...defaultProps} />)
    await act(async () => {
      fireEvent.submit(screen.getByDisplayValue('500').closest('form')!)
    })
    await waitFor(() => {
      expect(screen.getByText('Reembolso não encontrado')).toBeTruthy()
    })
    expect(defaultProps.onSave).not.toHaveBeenCalled()
  })
})
