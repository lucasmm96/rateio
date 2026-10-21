import { Link } from 'react-router-dom'
import { Header } from '../components/ui/Header'

export function Component() {
  return (
    <main className="min-h-dvh bg-surface flex flex-col px-margin">
      <Header title="Política de Privacidade" back />
      <div className="flex flex-col flex-1 py-6 max-w-2xl mx-auto w-full space-y-4">
        <p className="text-body-md text-on-surface-variant">
          Coletamos apenas os dados necessários para o funcionamento do aplicativo: e-mail e
          informações de despesas e reembolsos que você insere.
        </p>
        <p className="text-body-md text-on-surface-variant">
          Seus dados não são compartilhados com terceiros para fins comerciais. O acesso é
          protegido por autenticação e Row Level Security no banco de dados.
        </p>
        <p className="text-body-md text-on-surface-variant">
          Para solicitar a exclusão dos seus dados, entre em contato conosco.
        </p>
        <Link to="/cadastro" className="text-label-md text-primary hover:underline mt-4">
          Voltar ao cadastro
        </Link>
      </div>
    </main>
  )
}
