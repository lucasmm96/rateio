import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { signIn, signInWithGoogle } from '../db/auth'
import { GoogleButton } from '../components/ui/GoogleButton'
import { garantirUsuario } from '../db/queries'

export function Component() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const result = await signIn(email, password)
      if (result?.error) {
        setErro(result.error.message || 'E-mail ou senha incorretos.')
      } else {
        try { await garantirUsuario(email) } catch { /* non-critical */ }
        navigate('/', { replace: true })
      }
    } catch (e) {
      console.error('[Login] signIn threw:', e)
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
            <span
              className="material-symbols-outlined text-[48px] text-white"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              payments
            </span>
          </div>
          <h1 className="text-display text-white font-bold tracking-tight">Rateio</h1>
          <p className="text-body-lg text-white/80 max-w-xs">
            Controle de despesas compartilhadas de forma simples e justa.
          </p>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex flex-col flex-1 justify-between px-margin py-space-xl lg:items-center lg:justify-center lg:px-12">
        <div className="w-full lg:max-w-md animate-fade-in-up">

          {/* Branding mobile */}
          <div className="flex flex-col items-center text-center mt-space-lg mb-12 lg:hidden">
            <div className="flex flex-row items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-sm">
                <span
                  className="material-symbols-outlined text-[28px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  payments
                </span>
              </div>
              <h1 className="text-display text-primary tracking-tight font-bold">Rateio</h1>
            </div>
            <p className="text-body-md text-tertiary mt-space-xs">Controle de despesas compartilhadas</p>
          </div>

          {/* Título desktop */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-headline-lg text-on-surface font-semibold">Entrar</h2>
            <p className="text-body-md text-on-surface-variant mt-1">Acesse sua conta para continuar.</p>
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
              <div className="flex items-center h-11 rounded-lg border border-outline bg-background transition duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary">
                <input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
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

            <div className="flex justify-end pt-space-xs">
              <Link to="/esqueci-senha" className="text-label-md text-primary hover:underline">
                Esqueci minha senha
              </Link>
            </div>

            {erro && (
              <p className="text-body-sm text-error text-center">{erro}</p>
            )}

            <div className="pt-space-lg">
              <Button type="submit" loading={loading} className="w-full">
                Entrar
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
              </Button>
            </div>
          </form>

          {/* Rodapé */}
          <div className="flex flex-col items-center mt-space-xl">
            <div className="relative w-full flex items-center justify-center my-space-md">
              <div className="w-full h-px bg-surface-container-high" />
              <span className="absolute px-space-sm bg-surface text-label-sm text-tertiary uppercase tracking-wider">
                ou
              </span>
            </div>

            <GoogleButton onClick={signInWithGoogle} label="Entrar com Google" />

            <p className="text-body-md text-on-surface text-center mt-space-md">
              Não tem conta?{' '}
              <Link to="/cadastro" className="text-headline-sm text-primary font-bold hover:underline ml-1">
                Criar conta
              </Link>
            </p>
            <div className="flex items-center gap-1.5 mt-space-lg text-tertiary opacity-75">
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">verified_user</span>
              <span className="text-label-sm">Conexão segura &amp; criptografada</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
