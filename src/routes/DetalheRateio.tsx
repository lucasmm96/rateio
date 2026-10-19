import { useParams } from 'react-router-dom'
import { Header } from '../components/ui/Header'

export function Component() {
  const { id } = useParams()
  return (
    <div className="min-h-dvh bg-background">
      <Header title="Detalhe do Rateio" back />
      <main className="px-margin py-4">
        <p className="text-body-sm text-on-surface-variant">Rateio: {id}</p>
      </main>
    </div>
  )
}
