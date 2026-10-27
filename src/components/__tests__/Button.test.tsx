import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createRef } from 'react'
import { Button } from '../ui/Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Clique</Button>)
    expect(screen.getByRole('button', { name: 'Clique' })).toBeTruthy()
  })

  it('chama onClick ao clicar', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>OK</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('disabled desabilita o botão', () => {
    render(<Button disabled>Salvar</Button>)
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true)
  })

  it('loading mostra spinner e desabilita', () => {
    render(<Button loading>Aguarde</Button>)
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('progress_activity')).toBeTruthy()
  })

  it('loading=false não mostra spinner', () => {
    render(<Button>OK</Button>)
    expect(screen.queryByText('progress_activity')).toBeNull()
  })

  it('variant secondary', () => {
    const { container } = render(<Button variant="secondary">x</Button>)
    expect((container.firstChild as HTMLElement).className).toContain('bg-primary-container')
  })

  it('variant outline', () => {
    const { container } = render(<Button variant="outline">x</Button>)
    expect((container.firstChild as HTMLElement).className).toContain('border-outline')
  })

  it('variant ghost', () => {
    const { container } = render(<Button variant="ghost">x</Button>)
    expect((container.firstChild as HTMLElement).className).toContain('bg-transparent')
  })

  it('variant primary (padrão)', () => {
    const { container } = render(<Button>x</Button>)
    expect((container.firstChild as HTMLElement).className).toContain('bg-primary')
  })

  it('size sm', () => {
    const { container } = render(<Button size="sm">x</Button>)
    expect((container.firstChild as HTMLElement).className).toContain('h-9')
  })

  it('size md (padrão)', () => {
    const { container } = render(<Button>x</Button>)
    expect((container.firstChild as HTMLElement).className).toContain('h-12')
  })

  it('size lg', () => {
    const { container } = render(<Button size="lg">x</Button>)
    expect((container.firstChild as HTMLElement).className).toContain('h-14')
  })

  it('forwarded ref', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Button ref={ref}>ref</Button>)
    expect(ref.current).not.toBeNull()
    expect(ref.current?.tagName).toBe('BUTTON')
  })

  it('aceita className extra', () => {
    const { container } = render(<Button className="foo">x</Button>)
    expect((container.firstChild as HTMLElement).className).toContain('foo')
  })
})
