import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Header } from '../components/ui/Header'
import { solicitarResetSenha } from '../db/auth'

export function Component() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      const result = await solicitarResetSenha(email.trim().toLowerCase())
      if (result?.error) {
        setErro(result.error.message || 'Não foi possível enviar o e-mail.')
      } else {
        setEnviado(true)
      }
    } catch (err) {
      console.error('[EsqueciSenha] threw:', err)
      const msg = err instanceof Error ? err.message : String(err)
      setErro(msg || 'Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-dvh bg-surface flex flex-col px-margin pt-safe pb-safe">
      <Header title="Recuperar senha" back />

      <div className="flex flex-col flex-1 justify-center py-space-xl max-w-sm w-full mx-auto">
        {enviado ? (
          <div className="flex flex-col items-center text-center gap-space-md">
            <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px] text-on-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                mark_email_read
              </span>
            </div>
            <h2 className="text-headline-sm text-on-surface font-semibold">E-mail enviado!</h2>
            <p className="text-body-md text-on-surface-variant">
              Se houver uma conta com <strong>{email}</strong>, você receberá um link para redefinir sua senha.
            </p>
            <p className="text-body-sm text-on-surface-variant">
              Verifique também a pasta de spam.
            </p>
            <Link to="/login" className="mt-space-md text-label-md text-primary hover:underline">
              Voltar ao login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-space-lg">
              <h2 className="text-headline-sm text-on-surface font-semibold mb-space-xs">
                Esqueceu sua senha?
              </h2>
              <p className="text-body-md text-on-surface-variant">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
            </div>

            <form className="flex flex-col space-y-space-md" onSubmit={handleSubmit}>
              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />

              {erro && (
                <p className="text-body-sm text-error text-center">{erro}</p>
              )}

              <Button type="submit" loading={loading} className="w-full">
                Enviar link de recuperação
              </Button>
            </form>

            <p className="text-body-md text-on-surface-variant text-center mt-space-lg">
              Lembrou a senha?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
