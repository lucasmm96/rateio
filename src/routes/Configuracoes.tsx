import { BottomNav } from '../components/ui/BottomNav'
import { Header } from '../components/ui/Header'

export function Component() {
  return (
    <div className="min-h-dvh bg-background">
      <Header title="Configurações" />
      <main className="px-margin py-4 pb-24" />
      <BottomNav />
    </div>
  )
}
