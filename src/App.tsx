import { createHashRouter, RouterProvider } from 'react-router-dom'

const router = createHashRouter([
  {
    path: '/',
    lazy: () => import('./routes/Home.tsx'),
  },
  {
    path: '/rateios/:id',
    lazy: () => import('./routes/DetalheRateio.tsx'),
  },
  {
    path: '/rateios/:id/nova-despesa',
    lazy: () => import('./routes/NovaDespesa.tsx'),
  },
  {
    path: '/rateios/:id/novo-reembolso',
    lazy: () => import('./routes/NovoReembolso.tsx'),
  },
  {
    path: '/novo-rateio',
    lazy: () => import('./routes/NovoRateio.tsx'),
  },
  {
    path: '/configuracoes',
    lazy: () => import('./routes/Configuracoes.tsx'),
  },
  {
    path: '/login',
    lazy: () => import('./routes/Login.tsx'),
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
