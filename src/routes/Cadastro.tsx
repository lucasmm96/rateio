import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { signUp, signInWithGoogle } from '../db/auth'
import { GoogleButton } from '../components/ui/GoogleButton'

export function Component() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (password !== confirmar) {
      setErro('As senhas não coincidem.')
      return
    }
    if (password.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    setLoading(true)
    try {
      const name = email.split('@')[0]
      const result = await signUp(email, password, name)
      if (result?.error) {
        setErro(result.error.message || 'Erro ao criar conta.')
      } else {
        navigate('/', { replace: true })
      }
    } catch {
      setErro('Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh bg-surface flex flex-col px-margin pt-safe pb-safe">
      <div className="flex flex-col flex-1 justify-between py-space-xl">

        {/* Branding */}
        <div className="flex flex-col items-center text-center mt-space-lg mb-8">
          <div className="flex flex-row items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-sm">
              <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                payments
              </span>
            </div>
            <h1 className="text-display text-primary tracking-tight font-bold">Rateio</h1>
          </div>
          <p className="text-body-md text-tertiary mt-space-xs">Crie sua conta gratuita</p>
        </div>

        {/* Formulário */}
        <form className="flex flex-col w-full space-y-space-sm" onSubmit={handleSubmit}>
          <Input
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          {/* Campo senha */}
          <div className="flex flex-col gap-1.5 w-full">
            <label htmlFor="senha" className="text-label-lg text-on-surface">Senha</label>
            <div className="flex items-center h-11 rounded-lg border border-outline bg-background transition-colors duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary">
              <input
                id="senha"
                type={mostrarSenha ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="flex-1 h-full bg-transparent px-3 text-body-lg text-on-surface placeholder:text-on-surface-variant outline-none"
              />
              <button
                type="button"
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Revelar senha'}
                onClick={() => setMostrarSenha(v => !v)}
                className="pr-3 text-tertiary hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {mostrarSenha ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Confirmar senha */}
          <div className="flex flex-col gap-1.5 w-full">
            <label htmlFor="confirmar" className="text-label-lg text-on-surface">Confirmar senha</label>
            <div className="flex items-center h-11 rounded-lg border border-outline bg-background transition-colors duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary">
              <input
                id="confirmar"
                type={mostrarConfirmar ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                required
                className="flex-1 h-full bg-transparent px-3 text-body-lg text-on-surface placeholder:text-on-surface-variant outline-none"
              />
              <button
                type="button"
                aria-label={mostrarConfirmar ? 'Ocultar senha' : 'Revelar senha'}
                onClick={() => setMostrarConfirmar(v => !v)}
                className="pr-3 text-tertiary hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {mostrarConfirmar ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {erro && (
            <p className="text-body-sm text-error text-center">{erro}</p>
          )}

          <div className="pt-space-lg">
            <Button type="submit" loading={loading} className="w-full">
              Criar conta
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Button>
          </div>

          <p className="text-body-sm text-on-surface-variant text-center px-2 mt-space-sm">
            Ao criar uma conta você concorda com os{' '}
            <Link to="/termos" className="text-primary hover:underline">Termos de Uso</Link>
            {' '}e a{' '}
            <Link to="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>.
          </p>
        </form>

        {/* Rodapé */}
        <div className="flex flex-col items-center mt-space-xl">
          <div className="relative w-full flex items-center justify-center my-space-md">
            <div className="w-full h-px bg-surface-container-high" />
            <span className="absolute px-space-sm bg-surface text-label-sm text-tertiary uppercase tracking-wider">
              ou
            </span>
          </div>

          <GoogleButton onClick={signInWithGoogle} label="Continuar com Google" />

          <p className="text-body-md text-on-surface text-center mt-space-md">
            Já tem conta?{' '}
            <Link to="/login" className="text-headline-sm text-primary font-bold hover:underline ml-1">
              Entrar
            </Link>
          </p>
        </div>

      </div>
    </main>
  )
}
