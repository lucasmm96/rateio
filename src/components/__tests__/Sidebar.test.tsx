import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from '../layout/Sidebar'

vi.mock('../../db/auth', () => ({
  useUser: vi.fn(() => ({ user: { email: 'lucas@example.com' }, isPending: false })),
  signOut: vi.fn().mockResolvedValue(undefined),
}))

function wrap(path = '/') {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>
  )
}

describe('Sidebar', () => {
  it('renders logo Rateio', () => {
    render(wrap())
    expect(screen.getByText('Rateio')).toBeTruthy()
  })

  it('exibe item Rateios', () => {
    render(wrap())
    expect(screen.getByText('Rateios')).toBeTruthy()
  })

  it('exibe item Configurações', () => {
    render(wrap())
    expect(screen.getByText('Configurações')).toBeTruthy()
  })

  it('exibe prefixo do email', () => {
    render(wrap())
    expect(screen.getByText('lucas')).toBeTruthy()
  })

  it('exibe botão Sair', () => {
    render(wrap())
    expect(screen.getByLabelText('Sair')).toBeTruthy()
  })

  it('logout chama signOut', async () => {
    const { signOut } = await import('../../db/auth')
    render(wrap())
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Sair'))
    })
    expect(signOut).toHaveBeenCalled()
  })

  it('link / ativo em / tem text-primary', () => {
    render(wrap('/'))
    const links = screen.getAllByRole('link')
    const homeLink = links.find(l => l.getAttribute('href') === '/')
    expect(homeLink?.className).toContain('text-primary')
  })
})
