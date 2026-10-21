import { Link } from 'react-router-dom'
import { Header } from '../components/ui/Header'

export function Component() {
  return (
    <main className="min-h-dvh bg-surface flex flex-col px-margin">
      <Header title="Termos de Uso" back />
      <div className="flex flex-col flex-1 py-6 max-w-2xl mx-auto w-full space-y-4">
        <p className="text-body-md text-on-surface-variant">
          Ao utilizar o Rateio, você concorda em usar o aplicativo de forma responsável para
          controle de despesas compartilhadas entre pessoas conhecidas.
        </p>
        <p className="text-body-md text-on-surface-variant">
          Os dados inseridos são de responsabilidade dos usuários. Não nos responsabilizamos
          por divergências financeiras entre os participantes.
        </p>
        <p className="text-body-md text-on-surface-variant">
          Este documento será atualizado conforme o produto evolui.
        </p>
        <Link to="/cadastro" className="text-label-md text-primary hover:underline mt-4">
          Voltar ao cadastro
        </Link>
      </div>
    </main>
  )
}
