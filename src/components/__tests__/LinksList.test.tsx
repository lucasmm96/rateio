import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { LinksList } from '../LinksList'
import * as queries from '../../db/queries'
import type { LinkItem } from '../../db/queries'

vi.mock('../../db/queries', () => ({
  listarLinks: vi.fn(),
  adicionarLink: vi.fn(),
  removerLink: vi.fn(),
}))

const mockListarLinks  = vi.mocked(queries.listarLinks)
const mockAdicionarLink = vi.mocked(queries.adicionarLink)
const mockRemoverLink   = vi.mocked(queries.removerLink)

const defaultProps = {
  entidadeTipo: 'despesa' as const,
  entidadeId: 'ent-123',
  rateioId: 'rat-456',
}

const linkSemRotulo: LinkItem = {
  id: 'link-1',
  entidade_tipo: 'despesa',
  entidade_id: 'ent-123',
  rateio_id: 'rat-456',
  url: 'https://example.com/boleto.pdf',
  rotulo: null,
  criado_em: '2026-01-01T00:00:00Z',
}

const linkComRotulo: LinkItem = {
  id: 'link-2',
  entidade_tipo: 'despesa',
  entidade_id: 'ent-123',
  rateio_id: 'rat-456',
  url: 'https://example.com/comprovante.pdf',
  rotulo: 'Comprovante',
  criado_em: '2026-01-02T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('LinksList — carregamento', () => {
  it('exibe estado de carregamento inicial', () => {
    mockListarLinks.mockReturnValue(new Promise(() => {})) // never resolves
    render(<LinksList {...defaultProps} />)
    expect(screen.getByText(/Carregando links/)).toBeTruthy()
  })

  it('exibe estado vazio após carregar sem links', async () => {
    mockListarLinks.mockResolvedValue([])
    await act(async () => {
      render(<LinksList {...defaultProps} />)
    })
    expect(screen.getByText('Nenhum link adicionado')).toBeTruthy()
  })

  it('exibe mensagem de erro se listarLinks lançar', async () => {
    mockListarLinks.mockRejectedValue(new Error('falha na rede'))
    await act(async () => {
      render(<LinksList {...defaultProps} />)
    })
    expect(screen.getByText('falha na rede')).toBeTruthy()
  })
})

describe('LinksList — lista de links', () => {
  it('link sem rótulo exibe URL como texto do link', async () => {
    mockListarLinks.mockResolvedValue([linkSemRotulo])
    await act(async () => {
      render(<LinksList {...defaultProps} />)
    })
    const anchor = screen.getByRole('link')
    expect(anchor.textContent).toBe(linkSemRotulo.url)
    expect(anchor.getAttribute('href')).toBe(linkSemRotulo.url)
    expect(anchor.getAttribute('target')).toBe('_blank')
    expect(anchor.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('link com rótulo exibe rótulo como texto e URL como legenda', async () => {
    mockListarLinks.mockResolvedValue([linkComRotulo])
    await act(async () => {
      render(<LinksList {...defaultProps} />)
    })
    const anchor = screen.getByRole('link')
    expect(anchor.textContent).toBe(linkComRotulo.rotulo)
    expect(anchor.getAttribute('href')).toBe(linkComRotulo.url)
    expect(screen.getByText(linkComRotulo.url)).toBeTruthy()
  })

  it('não exibe "Nenhum link adicionado" quando há links', async () => {
    mockListarLinks.mockResolvedValue([linkSemRotulo])
    await act(async () => {
      render(<LinksList {...defaultProps} />)
    })
    expect(screen.queryByText('Nenhum link adicionado')).toBeNull()
  })
})

describe('LinksList — formulário de adição', () => {
  it('exibe botão "Adicionar link" após carregar', async () => {
    mockListarLinks.mockResolvedValue([])
    await act(async () => {
      render(<LinksList {...defaultProps} />)
    })
    expect(screen.getByText(/Adicionar link/)).toBeTruthy()
  })

  it('clicar em "Adicionar link" abre formulário', async () => {
    mockListarLinks.mockResolvedValue([])
    await act(async () => {
      render(<LinksList {...defaultProps} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Adicionar link/))
    })
    expect(screen.getByPlaceholderText('https://...')).toBeTruthy()
    expect(screen.getByPlaceholderText('Rótulo (opcional)')).toBeTruthy()
  })

  it('valida URL inválida (sem http/https)', async () => {
    mockListarLinks.mockResolvedValue([])
    await act(async () => {
      render(<LinksList {...defaultProps} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Adicionar link/))
    })
    fireEvent.change(screen.getByPlaceholderText('https://...'), { target: { value: 'boleto.pdf' } })
    await act(async () => {
      fireEvent.submit(screen.getByPlaceholderText('https://...').closest('form')!)
    })
    expect(screen.getByText('URL inválida. Use http:// ou https://')).toBeTruthy()
    expect(mockAdicionarLink).not.toHaveBeenCalled()
  })

  it('aceita URL com http://', async () => {
    mockListarLinks.mockResolvedValue([])
    mockAdicionarLink.mockResolvedValue(undefined)
    const linkAdded: LinkItem = { ...linkSemRotulo, url: 'http://example.com/file.pdf' }
    mockListarLinks
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([linkAdded])
    await act(async () => {
      render(<LinksList {...defaultProps} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Adicionar link/))
    })
    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'http://example.com/file.pdf' },
    })
    await act(async () => {
      fireEvent.submit(screen.getByPlaceholderText('https://...').closest('form')!)
    })
    expect(mockAdicionarLink).toHaveBeenCalledWith(expect.objectContaining({
      url: 'http://example.com/file.pdf',
    }))
  })

  it('envia URL e rótulo corretos ao adicionarLink', async () => {
    mockListarLinks.mockResolvedValue([])
    mockAdicionarLink.mockResolvedValue(undefined)
    mockListarLinks
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([linkComRotulo])
    await act(async () => {
      render(<LinksList {...defaultProps} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Adicionar link/))
    })
    fireEvent.change(screen.getByPlaceholderText('https://...'), {
      target: { value: 'https://example.com/comprovante.pdf' },
    })
    fireEvent.change(screen.getByPlaceholderText('Rótulo (opcional)'), {
      target: { value: 'Comprovante' },
    })
    await act(async () => {
      fireEvent.submit(screen.getByPlaceholderText('https://...').closest('form')!)
    })
    expect(mockAdicionarLink).toHaveBeenCalledWith({
      entidadeTipo: 'despesa',
      entidadeId: 'ent-123',
      rateioId: 'rat-456',
      url: 'https://example.com/comprovante.pdf',
      rotulo: 'Comprovante',
    })
  })

  it('cancelar formulário fecha sem chamar adicionarLink', async () => {
    mockListarLinks.mockResolvedValue([])
    await act(async () => {
      render(<LinksList {...defaultProps} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByText(/Adicionar link/))
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Cancelar'))
    })
    expect(screen.getByText(/Adicionar link/)).toBeTruthy()
    expect(mockAdicionarLink).not.toHaveBeenCalled()
  })
})

describe('LinksList — remoção', () => {
  it('clicar no botão remover exibe confirmação', async () => {
    mockListarLinks.mockResolvedValue([linkSemRotulo])
    await act(async () => {
      render(<LinksList {...defaultProps} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Remover link'))
    })
    expect(screen.getByText('Remover este link?')).toBeTruthy()
  })

  it('cancelar remoção esconde confirmação', async () => {
    mockListarLinks.mockResolvedValue([linkSemRotulo])
    await act(async () => {
      render(<LinksList {...defaultProps} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Remover link'))
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Cancelar'))
    })
    expect(screen.queryByText('Remover este link?')).toBeNull()
  })

  it('confirmar remoção chama removerLink e remove da lista', async () => {
    mockListarLinks.mockResolvedValue([linkSemRotulo])
    mockRemoverLink.mockResolvedValue(undefined)
    await act(async () => {
      render(<LinksList {...defaultProps} />)
    })
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Remover link'))
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Remover'))
    })
    expect(mockRemoverLink).toHaveBeenCalledWith(linkSemRotulo.id)
    await waitFor(() => {
      expect(screen.getByText('Nenhum link adicionado')).toBeTruthy()
    })
  })
})
