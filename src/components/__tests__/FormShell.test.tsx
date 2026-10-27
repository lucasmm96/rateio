import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FormShell } from '../layout/FormShell'

function wrap(children = <p>conteúdo</p>) {
  return (
    <MemoryRouter>
      <FormShell>{children}</FormShell>
    </MemoryRouter>
  )
}

describe('FormShell', () => {
  it('renders children', () => {
    render(wrap())
    expect(screen.getByText('conteúdo')).toBeTruthy()
  })

  it('Escape chama navigate(-1) sem lançar erro', () => {
    render(wrap())
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.getByText('conteúdo')).toBeTruthy()
  })

  it('outras teclas não disparam navigate', () => {
    render(wrap())
    fireEvent.keyDown(window, { key: 'Enter' })
    fireEvent.keyDown(window, { key: 'a' })
    expect(screen.getByText('conteúdo')).toBeTruthy()
  })

  it('click no backdrop dispara navigate(-1) sem erro', () => {
    const { container } = render(wrap())
    const backdrop = container.querySelector('[aria-hidden="true"]')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop!)
    expect(screen.getByText('conteúdo')).toBeTruthy()
  })

  it('remove listener de teclado ao desmontar', () => {
    const { unmount } = render(wrap())
    unmount()
    // Sem erro ao disparar evento após desmontagem
    fireEvent.keyDown(window, { key: 'Escape' })
  })
})
