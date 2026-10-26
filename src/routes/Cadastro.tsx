import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { signUp, signInWithGoogle } from '../db/auth'
import { GoogleButton } from '../components/ui/GoogleButton'
import { garantirUsuario } from '../db/queries'

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
      } else if (!(result?.data as { token?: string | null } | undefined)?.token) {
        setErro('Conta criada! Verifique seu e-mail para ativar a conta antes de entrar.')
      } else {
        try { await garantirUsuario(email) } catch { /* non-critical */ }
        navigate('/', { replace: true })
      }
    } catch (e) {
      console.error('[Cadastro] signUp threw:', e)
      const msg = e instanceof Error ? e.message : String(e)
      setErro(msg || 'Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh bg-surface lg:grid lg:grid-cols-2">

      {/* Painel esquerdo — brand (desktop only) */}
      <div className="hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:bg-primary lg:px-12 lg:gap-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(circle at 30% 40%, white 0%, transparent 60%), radial-gradient(circle at 70% 70%, white 0%, transparent 50%)',
          }}
        />
        <div className="relative flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
            <img src="/favicon.svg" alt="" aria-hidden="true" className="w-12 h-12 brightness-0 invert" />
          </div>
          <h1 className="text-display text-white font-bold tracking-tight">Rateio</h1>
          <p className="text-body-lg text-white/80 max-w-xs">
            Controle de despesas compartilhadas de forma simples e justa.
          </p>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex flex-col flex-1 justify-between px-margin py-space-xl lg:items-center lg:justify-center lg:px-12 lg:overflow-y-auto">
        <div className="w-full lg:max-w-md">

          {/* Branding mobile */}
          <div className="flex flex-col items-center text-center mt-space-lg mb-8 lg:hidden">
            <div className="flex flex-row items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center shadow-sm">
                <img src="/favicon.svg" alt="" aria-hidden="true" className="w-7 h-7" />
              </div>
              <h1 className="text-display text-primary tracking-tight font-bold">Rateio</h1>
            </div>
            <p className="text-body-md text-tertiary mt-space-xs">Crie sua conta gratuita</p>
          </div>

          {/* Título desktop */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-headline-lg text-on-surface font-semibold">Criar conta</h2>
            <p className="text-body-md text-on-surface-variant mt-1">Comece a dividir despesas hoje.</p>
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
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    {mostrarSenha ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

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
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
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
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
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
      </div>
    </main>
  )
}
