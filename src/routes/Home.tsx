import { BottomNav } from '../components/ui/BottomNav'
import { FAB } from '../components/ui/FAB'
import { Header } from '../components/ui/Header'

export function Component() {
  return (
    <div className="min-h-dvh bg-background">
      <Header title="Rateios" />
      <main className="px-margin py-4 pb-24">
        <p className="text-body-md text-on-surface-variant text-center mt-16">
          Nenhum rateio encontrado. Crie o primeiro!
        </p>
      </main>
      <BottomNav />
      <FAB icon="add" label="Novo rateio" />
    </div>
  )
}
