import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { GoogleButton } from '../ui/GoogleButton'

describe('GoogleButton', () => {
  it('renders label', () => {
    render(<GoogleButton onClick={async () => {}} label="Entrar com Google" />)
    expect(screen.getByText('Entrar com Google')).toBeTruthy()
  })

  it('botão não está disabled inicialmente', () => {
    render(<GoogleButton onClick={async () => {}} label="Entrar" />)
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false)
  })

  it('chama onClick ao clicar', async () => {
    const onClick = vi.fn().mockResolvedValue(undefined)
    render(<GoogleButton onClick={onClick} label="Entrar" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    expect(onClick).toHaveBeenCalled()
  })

  it('mostra spinner e texto "Aguarde…" enquanto carrega', async () => {
    let resolve!: () => void
    const onClick = vi.fn().mockReturnValue(new Promise<void>(r => { resolve = r }))
    render(<GoogleButton onClick={onClick} label="Entrar" />)

    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByText('Aguarde…')).toBeTruthy()
    expect(screen.getByText('progress_activity')).toBeTruthy()

    await act(async () => { resolve() })
  })

  it('botão fica disabled enquanto carrega', async () => {
    let resolve!: () => void
    const onClick = vi.fn().mockReturnValue(new Promise<void>(r => { resolve = r }))
    render(<GoogleButton onClick={onClick} label="Entrar" />)

    fireEvent.click(screen.getByRole('button'))
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true)

    await act(async () => { resolve() })
  })

  it('volta ao estado normal após erro', async () => {
    const onClick = vi.fn().mockRejectedValue(new Error('falha'))
    render(<GoogleButton onClick={onClick} label="Entrar" />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })

    expect(screen.getByText('Entrar')).toBeTruthy()
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false)
  })
})
