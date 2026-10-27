import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>conteúdo</Card>)
    expect(screen.getByText('conteúdo')).toBeTruthy()
  })

  it('variante elevated adiciona shadow-tier2', () => {
    const { container } = render(<Card variant="elevated">x</Card>)
    expect((container.firstChild as HTMLElement).className).toContain('shadow-tier2')
  })

  it('variante default não tem shadow-tier2', () => {
    const { container } = render(<Card>x</Card>)
    expect((container.firstChild as HTMLElement).className).not.toContain('shadow-tier2')
  })

  it('aceita className extra', () => {
    const { container } = render(<Card className="minha-classe">x</Card>)
    expect((container.firstChild as HTMLElement).className).toContain('minha-classe')
  })

  it('propaga props HTML', () => {
    render(<Card data-testid="card-root">x</Card>)
    expect(screen.getByTestId('card-root')).toBeTruthy()
  })
})

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader>Header</CardHeader>)
    expect(screen.getByText('Header')).toBeTruthy()
  })

  it('aceita className extra', () => {
    const { container } = render(<CardHeader className="h-cls">x</CardHeader>)
    expect((container.firstChild as HTMLElement).className).toContain('h-cls')
  })
})

describe('CardTitle', () => {
  it('renders como h3', () => {
    render(<CardTitle>Título</CardTitle>)
    expect(screen.getByRole('heading', { level: 3, name: 'Título' })).toBeTruthy()
  })
})

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent>body</CardContent>)
    expect(screen.getByText('body')).toBeTruthy()
  })
})
