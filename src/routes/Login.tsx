import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function Component() {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-margin">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-headline-lg-mobile text-on-surface">Controle de Rateios</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Faça login para continuar
          </p>
        </div>
        <div className="space-y-4">
          <Input label="E-mail" type="email" placeholder="seu@email.com" />
          <Input label="Senha" type="password" placeholder="••••••••" />
          <Button className="w-full">Entrar</Button>
        </div>
      </div>
    </div>
  )
}
