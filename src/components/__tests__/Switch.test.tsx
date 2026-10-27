import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Switch } from '../ui/Switch'

describe('Switch', () => {
  it('renders com aria-checked=false', () => {
    render(<Switch checked={false} onChange={() => {}} />)
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false')
  })

  it('renders com aria-checked=true', () => {
    render(<Switch checked={true} onChange={() => {}} />)
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
  })

  it('checked=true aplica bg-primary', () => {
    const { container } = render(<Switch checked={true} onChange={() => {}} />)
    expect(container.querySelector('.bg-primary')).toBeTruthy()
  })

  it('checked=false aplica bg-outline', () => {
    const { container } = render(<Switch checked={false} onChange={() => {}} />)
    expect(container.querySelector('.bg-outline')).toBeTruthy()
  })

  it('click chama onChange com !checked (false→true)', () => {
    const onChange = vi.fn()
    render(<Switch checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('click chama onChange com !checked (true→false)', () => {
    const onChange = vi.fn()
    render(<Switch checked={true} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('disabled desabilita o botão', () => {
    render(<Switch checked={false} onChange={() => {}} disabled />)
    expect((screen.getByRole('switch') as HTMLButtonElement).disabled).toBe(true)
  })

  it('label aparece quando fornecido', () => {
    render(<Switch checked={false} onChange={() => {}} label="Corrigir IPCA" />)
    expect(screen.getByText('Corrigir IPCA')).toBeTruthy()
  })

  it('sem label não renderiza texto de label', () => {
    const { container } = render(<Switch checked={false} onChange={() => {}} />)
    expect(container.querySelector('label')).toBeNull()
  })
})
