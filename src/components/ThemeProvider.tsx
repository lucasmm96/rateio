import { createContext, useContext, useEffect, useRef, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'light' | 'dark'
  syncUser: (userId: string | null) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: 'light',
  syncUser: () => {},
})

function parseTheme(v: string | null): Theme | null {
  if (v === 'light' || v === 'dark' || v === 'system') return v
  return null
}

function getStoredTheme(userId?: string | null): Theme {
  try {
    if (userId) {
      const userTheme = parseTheme(localStorage.getItem(`theme_${userId}`))
      if (userTheme) return userTheme
    }
    const global = parseTheme(localStorage.getItem('theme'))
    if (global) return global
  } catch {}
  return 'system'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme())
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  const userIdRef = useRef<string | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const resolvedTheme: 'light' | 'dark' =
    theme === 'system' ? (systemDark ? 'dark' : 'light') : theme

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
  }, [resolvedTheme])

  function setTheme(next: Theme) {
    setThemeState(next)
    try {
      localStorage.setItem('theme', next)
      if (userIdRef.current) localStorage.setItem(`theme_${userIdRef.current}`, next)
    } catch {}
  }

  function syncUser(userId: string | null) {
    userIdRef.current = userId
    const preferred = getStoredTheme(userId)
    setThemeState(preferred)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, syncUser }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
