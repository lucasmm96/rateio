import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Header } from '../ui/Header'

function wrap(props: Parameters<typeof Header>[0]) {
  return (
    <MemoryRouter initialEntries={['/detalhe', '/']}>
      <Header {...props} />
    </MemoryRouter>
  )
}

describe('Header', () => {
  it('exibe o título', () => {
    render(wrap({ title: 'Meu Rateio' }))
    expect(screen.getByRole('heading', { name: 'Meu Rateio' })).toBeTruthy()
  })

  it('back=false (padrão) não exibe botão voltar', () => {
    render(wrap({ title: 'Rateios' }))
    expect(screen.queryByLabelText('Voltar')).toBeNull()
  })

  it('back=true exibe botão voltar', () => {
    render(wrap({ title: 'Detalhes', back: true }))
    expect(screen.getByLabelText('Voltar')).toBeTruthy()
  })

  it('botão voltar é clicável sem erro', () => {
    render(wrap({ title: 'Detalhes', back: true }))
    fireEvent.click(screen.getByLabelText('Voltar'))
  })

  it('actions são renderizadas', () => {
    render(wrap({ title: 'x', actions: <button>Ação extra</button> }))
    expect(screen.getByText('Ação extra')).toBeTruthy()
  })

  it('sem actions não renderiza div de actions', () => {
    const { container } = render(wrap({ title: 'x' }))
    expect(container.querySelector('.flex.items-center.gap-1')).toBeNull()
  })
})
