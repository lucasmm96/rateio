import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createRef } from 'react'
import { Input } from '../ui/Input'

describe('Input', () => {
  it('renders um input', () => {
    const { container } = render(<Input />)
    expect(container.querySelector('input')).toBeTruthy()
  })

  it('label vinculada ao input via htmlFor', () => {
    render(<Input label="Nome" />)
    expect(screen.getByLabelText('Nome')).toBeTruthy()
  })

  it('sem label não renderiza <label>', () => {
    render(<Input />)
    expect(screen.queryByRole('label')).toBeNull()
  })

  it('error exibe mensagem', () => {
    render(<Input error="Campo obrigatório" />)
    expect(screen.getByText('Campo obrigatório')).toBeTruthy()
  })

  it('error aplica border-error', () => {
    const { container } = render(<Input error="Erro" />)
    expect(container.querySelector('.border-error')).toBeTruthy()
  })

  it('sem error usa border-outline', () => {
    const { container } = render(<Input />)
    expect(container.querySelector('.border-outline')).toBeTruthy()
  })

  it('hint aparece quando não há error', () => {
    render(<Input hint="Use letras" />)
    expect(screen.getByText('Use letras')).toBeTruthy()
  })

  it('error tem prioridade sobre hint', () => {
    render(<Input error="Erro" hint="Dica" />)
    expect(screen.getByText('Erro')).toBeTruthy()
    expect(screen.queryByText('Dica')).toBeNull()
  })

  it('sem error e sem hint não renderiza parágrafo', () => {
    const { container } = render(<Input />)
    expect(container.querySelector('p')).toBeNull()
  })

  it('prefix aparece', () => {
    render(<Input prefix="R$" />)
    expect(screen.getByText('R$')).toBeTruthy()
  })

  it('suffix aparece', () => {
    render(<Input suffix="kg" />)
    expect(screen.getByText('kg')).toBeTruthy()
  })

  it('id customizado', () => {
    render(<Input id="meu-input" />)
    expect(document.getElementById('meu-input')).toBeTruthy()
  })

  it('forwarded ref', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Input ref={ref} />)
    expect(ref.current?.tagName).toBe('INPUT')
  })

  it('onChange funciona', () => {
    const onChange = vi.fn()
    render(<Input onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'abc' } })
    expect(onChange).toHaveBeenCalled()
  })

  it('label gera id derivado do texto', () => {
    render(<Input label="Nome completo" />)
    const input = screen.getByLabelText('Nome completo')
    expect(input.id).toBe('nome-completo')
  })
})
