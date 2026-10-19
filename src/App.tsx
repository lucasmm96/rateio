import { useEffect } from 'react'
import { createHashRouter, RouterProvider, Navigate, Link } from 'react-router-dom'
import { useUser } from './db/auth'
import { useTheme } from './components/ThemeProvider'

function UserThemeSync() {
  const { user } = useUser()
  const { syncUser } = useTheme()
  useEffect(() => {
    syncUser(user?.id ?? null)
  }, [user?.id])
  return null
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isPending } = useUser()
  if (isPending) {
    return (
      <div className="min-h-dvh bg-surface flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-[48px] animate-spin">
          progress_activity
        </span>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function NotFound() {
  return (
    <main className="min-h-dvh bg-surface flex flex-col items-center justify-center px-margin text-center gap-4">
      <span className="material-symbols-outlined text-[56px] text-on-surface-variant">search_off</span>
      <h1 className="text-headline-md text-on-surface font-semibold">Página não encontrada</h1>
      <p className="text-body-md text-on-surface-variant">O endereço acessado não existe.</p>
      <Link to="/" className="text-label-md text-primary hover:underline">Voltar ao início</Link>
    </main>
  )
}

const router = createHashRouter([
  {
    path: '/login',
    lazy: () => import('./routes/Login.tsx'),
  },
  {
    path: '/cadastro',
    lazy: () => import('./routes/Cadastro.tsx'),
  },
  {
    path: '/esqueci-senha',
    lazy: () => import('./routes/EsqueciSenha.tsx'),
  },
  {
    path: '/redefinir-senha',
    lazy: () => import('./routes/RedefinirSenha.tsx'),
  },
  {
    path: '/',
    lazy: async () => {
      const mod = await import('./routes/Home.tsx')
      return {
        Component: () => (
          <RequireAuth>
            <mod.Component />
          </RequireAuth>
        ),
      }
    },
  },
  {
    path: '/rateios/:id',
    lazy: async () => {
      const mod = await import('./routes/DetalheRateio.tsx')
      return {
        Component: () => (
          <RequireAuth>
            <mod.Component />
          </RequireAuth>
        ),
      }
    },
  },
  {
    path: '/rateios/:id/nova-despesa',
    lazy: async () => {
      const mod = await import('./routes/NovaDespesa.tsx')
      return {
        Component: () => (
          <RequireAuth>
            <mod.Component />
          </RequireAuth>
        ),
      }
    },
  },
  {
    path: '/rateios/:id/novo-reembolso',
    lazy: async () => {
      const mod = await import('./routes/NovoReembolso.tsx')
      return {
        Component: () => (
          <RequireAuth>
            <mod.Component />
          </RequireAuth>
        ),
      }
    },
  },
  {
    path: '/novo-rateio',
    lazy: async () => {
      const mod = await import('./routes/NovoRateio.tsx')
      return {
        Component: () => (
          <RequireAuth>
            <mod.Component />
          </RequireAuth>
        ),
      }
    },
  },
  {
    path: '/rateios/:id/memoria',
    lazy: async () => {
      const mod = await import('./routes/MemoriaCalculo.tsx')
      return {
        Component: () => (
          <RequireAuth>
            <mod.Component />
          </RequireAuth>
        ),
      }
    },
  },
  {
    path: '/configuracoes',
    lazy: async () => {
      const mod = await import('./routes/Configuracoes.tsx')
      return {
        Component: () => (
          <RequireAuth>
            <mod.Component />
          </RequireAuth>
        ),
      }
    },
  },
  {
    path: '*',
    Component: NotFound,
  },
])

export default function App() {
  return (
    <>
      <UserThemeSync />
      <RouterProvider router={router} />
    </>
  )
}
