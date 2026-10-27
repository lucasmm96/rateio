import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar } from '../ui/Avatar'

describe('Avatar', () => {
  it('exibe inicial de nome simples', () => {
    render(<Avatar name="Lucas" />)
    expect(screen.getByText('L')).toBeTruthy()
  })

  it('exibe duas iniciais para nome composto', () => {
    render(<Avatar name="Lucas Menezes" />)
    expect(screen.getByText('LM')).toBeTruthy()
  })

  it('trim de espaços extras', () => {
    render(<Avatar name="  Ana " />)
    expect(screen.getByText('A')).toBeTruthy()
  })

  it('no máximo 2 iniciais para nomes longos', () => {
    render(<Avatar name="Ana Beatriz Costa" />)
    expect(screen.getByText('AB')).toBeTruthy()
  })

  it('aria-label com o nome completo', () => {
    render(<Avatar name="Lucas Menezes" />)
    expect(screen.getByLabelText('Lucas Menezes')).toBeTruthy()
  })

  it('tamanho sm aplica h-8', () => {
    const { container } = render(<Avatar name="L" size="sm" />)
    expect((container.firstChild as HTMLElement).className).toContain('h-8')
  })

  it('tamanho md (padrão) aplica h-10', () => {
    const { container } = render(<Avatar name="L" />)
    expect((container.firstChild as HTMLElement).className).toContain('h-10')
  })

  it('tamanho lg aplica h-12', () => {
    const { container } = render(<Avatar name="L" size="lg" />)
    expect((container.firstChild as HTMLElement).className).toContain('h-12')
  })

  it('aceita className extra', () => {
    const { container } = render(<Avatar name="L" className="foo" />)
    expect((container.firstChild as HTMLElement).className).toContain('foo')
  })
})
