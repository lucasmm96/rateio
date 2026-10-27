import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FAB } from '../ui/FAB'

describe('FAB', () => {
  it('label padrão "Adicionar"', () => {
    render(<FAB />)
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeTruthy()
  })

  it('label customizado', () => {
    render(<FAB label="Novo item" />)
    expect(screen.getByRole('button', { name: 'Novo item' })).toBeTruthy()
  })

  it('ícone padrão "add"', () => {
    render(<FAB />)
    expect(screen.getByText('add')).toBeTruthy()
  })

  it('ícone customizado', () => {
    render(<FAB icon="edit" />)
    expect(screen.getByText('edit')).toBeTruthy()
  })

  it('aceita className extra', () => {
    const { container } = render(<FAB className="extra" />)
    expect((container.firstChild as HTMLElement).className).toContain('extra')
  })

  it('propaga onClick', () => {
    const onClick = vi.fn()
    render(<FAB onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
