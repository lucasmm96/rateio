import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ThemeProvider, useTheme } from '../ThemeProvider'

function setupMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = []
  const mq = {
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb)
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    trigger: (m: boolean) => listeners.forEach(cb => cb({ matches: m } as MediaQueryListEvent)),
  }
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockReturnValue(mq),
  })
  return mq
}

function ThemeConsumer() {
  const { theme, resolvedTheme, setTheme, syncUser } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme('dark')}>set-dark</button>
      <button onClick={() => setTheme('light')}>set-light</button>
      <button onClick={() => setTheme('system')}>set-system</button>
      <button onClick={() => syncUser('user1')}>sync-user1</button>
      <button onClick={() => syncUser(null)}>sync-null</button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

describe('ThemeProvider', () => {
  it('renders children', () => {
    setupMatchMedia(false)
    render(<ThemeProvider><span>filho</span></ThemeProvider>)
    expect(screen.getByText('filho')).toBeTruthy()
  })

  it('tema padrão é system', () => {
    setupMatchMedia(false)
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    expect(screen.getByTestId('theme').textContent).toBe('system')
  })

  it('resolvedTheme=light quando system e media=light', () => {
    setupMatchMedia(false)
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    expect(screen.getByTestId('resolved').textContent).toBe('light')
  })

  it('resolvedTheme=dark quando system e media=dark', () => {
    setupMatchMedia(true)
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    expect(screen.getByTestId('resolved').textContent).toBe('dark')
  })

  it('lê tema do localStorage', () => {
    localStorage.setItem('theme', 'dark')
    setupMatchMedia(false)
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    expect(screen.getByTestId('theme').textContent).toBe('dark')
  })

  it('setTheme dark aplica classe dark', async () => {
    setupMatchMedia(false)
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    await act(async () => { screen.getByText('set-dark').click() })
    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('setTheme light remove classe dark', async () => {
    setupMatchMedia(true)
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    await act(async () => { screen.getByText('set-light').click() })
    expect(screen.getByTestId('resolved').textContent).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('setTheme grava no localStorage', async () => {
    setupMatchMedia(false)
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    await act(async () => { screen.getByText('set-dark').click() })
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('syncUser lê preferência por userId', async () => {
    localStorage.setItem('theme_user1', 'dark')
    setupMatchMedia(false)
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    await act(async () => { screen.getByText('sync-user1').click() })
    expect(screen.getByTestId('resolved').textContent).toBe('dark')
  })

  it('syncUser(null) usa preferência global', async () => {
    localStorage.setItem('theme', 'light')
    setupMatchMedia(true)
    render(<ThemeProvider><ThemeConsumer /></ThemeProvider>)
    await act(async () => { screen.getByText('sync-null').click() })
    expect(screen.getByTestId('resolved').textContent).toBe('light')
  })

  it('useTheme retorna context padrão fora do provider', () => {
    function Outside() {
      const { theme } = useTheme()
      return <span>{theme}</span>
    }
    setupMatchMedia(false)
    render(<Outside />)
    expect(screen.getByText('system')).toBeTruthy()
  })
})
