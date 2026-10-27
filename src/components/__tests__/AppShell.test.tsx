import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from '../layout/AppShell'

vi.mock('../../db/auth', () => ({
  useUser: vi.fn(() => ({ user: { email: 'test@example.com' }, isPending: false })),
  signOut: vi.fn().mockResolvedValue(undefined),
}))

function wrap(children = <p>conteúdo</p>) {
  return (
    <MemoryRouter>
      <AppShell>{children}</AppShell>
    </MemoryRouter>
  )
}

describe('AppShell', () => {
  it('renders children', () => {
    render(wrap(<p>conteúdo do filho</p>))
    expect(screen.getByText('conteúdo do filho')).toBeTruthy()
  })

  it('inclui BottomNav com itens de navegação', () => {
    render(wrap())
    // BottomNav tem "Rateios" e "Config."
    expect(screen.getByText('Config.')).toBeTruthy()
  })

  it('inclui Sidebar com logo', () => {
    render(wrap())
    // Sidebar (lg) e TopNav (md) ambos têm "Rateio"
    expect(screen.getAllByText('Rateio').length).toBeGreaterThan(0)
  })
})
