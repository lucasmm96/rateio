import { useState, useEffect } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { Header } from '../components/ui/Header'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useUser, atualizarNome } from '../db/auth'

function initiais(name: string | null | undefined, email: string | null | undefined): string {
  const base = name?.trim() || email?.split('@')[0] || '?'
  return base.slice(0, 2).toUpperCase()
}

export function Component() {
  const { user, isPending } = useUser()
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (user) setNome(user.name ?? '')
  }, [user?.id])

  const isGoogle = Boolean(user?.image)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = nome.trim()
    if (!trimmed) {
      setErro('O nome não pode ser vazio.')
      return
    }
    if (trimmed.length > 80) {
      setErro('O nome deve ter no máximo 80 caracteres.')
      return
    }
    setErro('')
    setLoading(true)
    try {
      await atualizarNome(trimmed)
      setSucesso(true)
      setTimeout(() => setSucesso(false), 3000)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao atualizar nome.')
    } finally {
      setLoading(false)
    }
  }

  if (isPending) {
    return (
      <AppShell>
        <Header title="Perfil" />
        <main className="px-4 py-8 flex justify-center">
          <span className="material-symbols-outlined text-primary text-[40px] animate-spin" aria-hidden="true">
            progress_activity
          </span>
        </main>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Header title="Perfil" />

      <main className="px-4 md:px-6 lg:px-8 py-6 pb-32 md:pb-8">
        <div className="max-w-md mx-auto space-y-6">

          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-headline-md font-semibold select-none">
              {initiais(nome, user?.email)}
            </div>
          </div>

          {/* Form */}
          <Card className="space-y-4">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                label="Nome"
                type="text"
                placeholder="Seu nome de exibição"
                value={nome}
                onChange={e => { setNome(e.target.value); setSucesso(false); setErro('') }}
                maxLength={80}
                autoComplete="name"
              />

              {/* E-mail (read-only) */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-label-lg text-on-surface">E-mail</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-11 rounded-lg border border-outline bg-background px-3 flex items-center text-body-lg text-on-surface-variant select-all">
                    {user?.email ?? ''}
                  </div>
                  {isGoogle && (
                    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-label-sm font-medium bg-primary-container text-on-primary-container shrink-0">
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">account_circle</span>
                      Google
                    </span>
                  )}
                </div>
                <p className="text-body-sm text-on-surface-variant">O e-mail não pode ser alterado.</p>
              </div>

              {sucesso && (
                <p className="text-body-sm text-primary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">check_circle</span>
                  Nome atualizado com sucesso.
                </p>
              )}
              {erro && <p className="text-body-sm text-error">{erro}</p>}

              <Button type="submit" loading={loading} className="w-full">
                Salvar
              </Button>
            </form>
          </Card>
        </div>
      </main>
    </AppShell>
  )
}
