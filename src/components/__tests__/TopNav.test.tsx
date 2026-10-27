import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TopNav } from '../layout/TopNav'

vi.mock('../../db/auth', () => ({
  useUser: vi.fn(() => ({ user: { email: 'lucas@example.com' }, isPending: false })),
  signOut: vi.fn().mockResolvedValue(undefined),
}))

function wrap(path = '/') {
  return (
    <MemoryRouter initialEntries={[path]}>
      <TopNav />
    </MemoryRouter>
  )
}

describe('TopNav', () => {
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

  it('exibe avatar com iniciais do email', () => {
    render(wrap())
    expect(screen.getByTitle('Sair')).toBeTruthy()
  })

  it('logout chama signOut', async () => {
    const { signOut } = await import('../../db/auth')
    render(wrap())
    await act(async () => {
      fireEvent.click(screen.getByTitle('Sair'))
    })
    expect(signOut).toHaveBeenCalled()
  })

  it('link / ativo em / tem text-primary', () => {
    render(wrap('/'))
    const links = screen.getAllByRole('link')
    const homeLink = links.find(l => l.getAttribute('href') === '/')
    expect(homeLink?.className).toContain('text-primary')
  })

  it('link inativo tem text-on-surface-variant', () => {
    render(wrap('/'))
    const links = screen.getAllByRole('link')
    const configLink = links.find(l => l.getAttribute('href') === '/configuracoes')
    expect(configLink?.className).toContain('text-on-surface-variant')
  })
})
