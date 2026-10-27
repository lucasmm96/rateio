import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { BottomNav } from '../ui/BottomNav'

function wrap(path = '/') {
  return (
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>
  )
}

describe('BottomNav', () => {
  it('renders itens de navegação', () => {
    render(wrap())
    expect(screen.getByText('Rateios')).toBeTruthy()
    expect(screen.getByText('Config.')).toBeTruthy()
  })

  it('exibe ícones corretos', () => {
    render(wrap())
    expect(screen.getByText('payments')).toBeTruthy()
    expect(screen.getByText('settings')).toBeTruthy()
  })

  it('links para / e /configuracoes', () => {
    render(wrap())
    const links = screen.getAllByRole('link')
    const hrefs = links.map(l => l.getAttribute('href'))
    expect(hrefs).toContain('/')
    expect(hrefs).toContain('/configuracoes')
  })

  it('link ativo em / recebe text-primary', () => {
    render(wrap('/'))
    const link = screen.getAllByRole('link')[0]
    expect(link.className).toContain('text-primary')
  })

  it('link inativo recebe text-on-surface-variant', () => {
    render(wrap('/'))
    const configLink = screen.getAllByRole('link')[1]
    expect(configLink.className).toContain('text-on-surface-variant')
  })
})
