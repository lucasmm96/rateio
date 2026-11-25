import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ModalSheet } from '../ui/ModalSheet'

let desktop = false
let reducedMotion = false

beforeEach(() => {
  desktop = false
  reducedMotion = false
  // jsdom não implementa PointerEvent com clientY; MouseEvent serve para os testes.
  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    writable: true,
    value: MouseEvent,
  })
  // jsdom sem pretendToBeVisual não avança frames; timers reais fazem o spring.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16),
  )
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('min-width: 640px') ? desktop : reducedMotion,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function renderSheet(onRequestClose = vi.fn()) {
  render(
    <ModalSheet closing={false} onRequestClose={onRequestClose} labelledBy="title">
      <h2 id="title">Título</h2>
      <button>Salvar</button>
    </ModalSheet>,
  )
  return onRequestClose
}

function handle() {
  return screen.getByRole('dialog').firstElementChild as HTMLElement
}

describe('ModalSheet — acessibilidade', () => {
  it('renderiza diálogo com foco no primeiro elemento focável', () => {
    renderSheet()
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByText('Salvar').closest('button'))
  })

  it('Escape pede fechamento', () => {
    const onRequestClose = renderSheet()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onRequestClose).toHaveBeenCalled()
  })

  it('Tab no último elemento volta ao primeiro', () => {
    renderSheet()
    const buttons = screen.getAllByRole('button')
    const first = buttons[0]
    const last = buttons[buttons.length - 1]
    first.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(first)
  })

  it('restaura o foco ao desmontar', () => {
    const outside = document.createElement('button')
    outside.textContent = 'fora'
    document.body.appendChild(outside)
    outside.focus()

    const { unmount } = render(
      <ModalSheet closing={false} onRequestClose={vi.fn()}>
        <button>Salvar</button>
      </ModalSheet>,
    )
    unmount()
    expect(document.activeElement).toBe(outside)
    outside.remove()
  })
})

describe('ModalSheet — arrasto no bottom sheet', () => {
  it('arrastar além do limite pede fechamento', async () => {
    const onRequestClose = renderSheet()
    const alca = handle()

    fireEvent.pointerDown(alca, { pointerId: 1, clientY: 100 })
    fireEvent.pointerMove(alca, { pointerId: 1, clientY: 700 })
    expect(screen.getByRole('dialog').style.transform).toBe('translateY(600px)')
    await pause(150)
    fireEvent.pointerUp(alca, { pointerId: 1, clientY: 700 })

    await waitFor(() => expect(onRequestClose).toHaveBeenCalled(), { timeout: 3000 })
  })

  it('arrasto curto volta ao repouso sem fechar', async () => {
    const onRequestClose = renderSheet()
    const alca = handle()

    fireEvent.pointerDown(alca, { pointerId: 1, clientY: 100 })
    fireEvent.pointerMove(alca, { pointerId: 1, clientY: 160 })
    await pause(150)
    fireEvent.pointerUp(alca, { pointerId: 1, clientY: 160 })

    await waitFor(
      () => {
        const sheet = screen.getByRole('dialog')
        expect(sheet.style.transform === '' || sheet.style.transform === 'translateY(0px)').toBe(true)
      },
      { timeout: 3000 },
    )
    expect(onRequestClose).not.toHaveBeenCalled()
  })

  it('pointercancel volta ao repouso sem fechar', async () => {
    const onRequestClose = renderSheet()
    const alca = handle()

    fireEvent.pointerDown(alca, { pointerId: 1, clientY: 100 })
    fireEvent.pointerMove(alca, { pointerId: 1, clientY: 700 })
    fireEvent.pointerCancel(alca, { pointerId: 1 })

    expect(onRequestClose).not.toHaveBeenCalled()
  })

  it('ignora arrasto em viewport desktop', () => {
    desktop = true
    renderSheet()
    const alca = handle()

    fireEvent.pointerDown(alca, { pointerId: 1, clientY: 100 })
    fireEvent.pointerMove(alca, { pointerId: 1, clientY: 700 })
    fireEvent.pointerUp(alca, { pointerId: 1, clientY: 700 })

    expect(screen.getByRole('dialog').style.transform).toBe('')
  })

  it('ignora arrasto com reduced motion', () => {
    reducedMotion = true
    renderSheet()
    const alca = handle()

    fireEvent.pointerDown(alca, { pointerId: 1, clientY: 100 })
    fireEvent.pointerMove(alca, { pointerId: 1, clientY: 700 })
    fireEvent.pointerUp(alca, { pointerId: 1, clientY: 700 })

    expect(screen.getByRole('dialog').style.transform).toBe('')
  })
})
