import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom'
import { useUser } from './db/auth'

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
])

export default function App() {
  return <RouterProvider router={router} />
}
