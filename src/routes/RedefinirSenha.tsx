import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Header } from '../components/ui/Header'
import { redefinirSenha } from '../db/auth'

export function Component() {
  const navigate = useNavigate()
  const token = sessionStorage.getItem('reset_token') ?? ''

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false)
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!token) {
      setErro('Link inválido ou expirado. Solicite um novo link de recuperação.')
      return
    }
    if (novaSenha.length < 8) {
      setErro('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (novaSenha !== confirmar) {
      setErro('As senhas não coincidem.')
      return
    }

    setLoading(true)
    try {
      const result = await redefinirSenha(token, novaSenha)
      if (result?.error) {
        setErro(result.error.message || 'Não foi possível redefinir a senha.')
      } else {
        sessionStorage.removeItem('reset_token')
        setSucesso(true)
        setTimeout(() => navigate('/login', { replace: true }), 3000)
      }
    } catch (err) {
      console.error('[RedefinirSenha] threw:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErro(msg || 'Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <main className="min-h-dvh bg-surface flex flex-col px-margin pt-safe pb-safe">
        <Header title="Redefinir senha" back />
        <div className="flex flex-col flex-1 items-center justify-center text-center gap-space-md">
          <span className="material-symbols-outlined text-[48px] text-error">link_off</span>
          <h2 className="text-headline-sm text-on-surface font-semibold">Link inválido</h2>
          <p className="text-body-md text-on-surface-variant">
            Este link de recuperação é inválido ou expirou.
          </p>
          <Link to="/esqueci-senha" className="text-label-md text-primary hover:underline">
            Solicitar novo link
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-surface flex flex-col px-margin pt-safe pb-safe">
      <Header title="Redefinir senha" back />

      <div className="flex flex-col flex-1 justify-center py-space-xl max-w-sm w-full mx-auto">
        {sucesso ? (
          <div className="flex flex-col items-center text-center gap-space-md">
            <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px] text-on-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <h2 className="text-headline-sm text-on-surface font-semibold">Senha redefinida!</h2>
            <p className="text-body-md text-on-surface-variant">
              Redirecionando para o login…
            </p>
          </div>
        ) : (
          <>
            <div className="mb-space-lg">
              <h2 className="text-headline-sm text-on-surface font-semibold mb-space-xs">
                Nova senha
              </h2>
              <p className="text-body-md text-on-surface-variant">
                Escolha uma nova senha para sua conta.
              </p>
            </div>

            <form className="flex flex-col space-y-space-md" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-1.5 w-full">
                <label htmlFor="nova-senha" className="text-label-lg text-on-surface">Nova senha</label>
                <div className="flex items-center h-11 rounded-lg border border-outline bg-background transition-colors duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary">
                  <input
                    id="nova-senha"
                    type={mostrarNovaSenha ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={novaSenha}
                    onChange={e => setNovaSenha(e.target.value)}
                    required
                    autoFocus
                    className="flex-1 h-full bg-transparent px-3 text-body-lg text-on-surface placeholder:text-on-surface-variant outline-none"
                  />
                  <button
                    type="button"
                    aria-label={mostrarNovaSenha ? 'Ocultar nova senha' : 'Revelar nova senha'}
                    onClick={() => setMostrarNovaSenha(v => !v)}
                    className="pr-3 text-tertiary hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {mostrarNovaSenha ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 w-full">
                <label htmlFor="confirmar" className="text-label-lg text-on-surface">Confirmar senha</label>
                <div className="flex items-center h-11 rounded-lg border border-outline bg-background transition-colors duration-150 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary">
                  <input
                    id="confirmar"
                    type={mostrarConfirmarSenha ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={confirmar}
                    onChange={e => setConfirmar(e.target.value)}
                    required
                    className="flex-1 h-full bg-transparent px-3 text-body-lg text-on-surface placeholder:text-on-surface-variant outline-none"
                  />
                  <button
                    type="button"
                    aria-label={mostrarConfirmarSenha ? 'Ocultar confirmação' : 'Revelar confirmação'}
                    onClick={() => setMostrarConfirmarSenha(v => !v)}
                    className="pr-3 text-tertiary hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {mostrarConfirmarSenha ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {erro && (
                <p className="text-body-sm text-error text-center">{erro}</p>
              )}

              <Button type="submit" loading={loading} className="w-full">
                Redefinir senha
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
