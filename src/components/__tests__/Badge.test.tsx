import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '../ui/Badge'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>A receber</Badge>)
    expect(screen.getByText('A receber')).toBeTruthy()
  })

  it('variant a-receber', () => {
    const { container } = render(<Badge variant="a-receber">texto</Badge>)
    expect((container.firstChild as HTMLElement).className).toContain('bg-primary-container')
  })

  it('variant deve', () => {
    const { container } = render(<Badge variant="deve">texto</Badge>)
    expect((container.firstChild as HTMLElement).className).toContain('bg-error-container')
  })

  it('variant prevista', () => {
    const { container } = render(<Badge variant="prevista">texto</Badge>)
    expect((container.firstChild as HTMLElement).className).toContain('bg-warning-container')
  })

  it('variant default quando omitido', () => {
    const { container } = render(<Badge>texto</Badge>)
    expect((container.firstChild as HTMLElement).className).toContain('bg-surface')
  })

  it('aceita className extra', () => {
    const { container } = render(<Badge className="extra">texto</Badge>)
    expect((container.firstChild as HTMLElement).className).toContain('extra')
  })
})
