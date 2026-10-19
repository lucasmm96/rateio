import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BottomNav } from '../components/ui/BottomNav'
import { Header } from '../components/ui/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Switch } from '../components/ui/Switch'
import { Input } from '../components/ui/Input'
import { useTheme } from '../components/ThemeProvider'
import { useAsync } from '../hooks/useAsync'
import { buscarRateio, atualizarCota } from '../db/queries'

export function Component() {
  const [searchParams] = useSearchParams()
  const rateioId = searchParams.get('rateio')
  const { theme, setTheme, resolvedTheme } = useTheme()

  const { data: rateio, loading } = useAsync(
    () => (rateioId ? buscarRateio(rateioId) : Promise.resolve(null)),
    [rateioId],
  )

  const [cotas, setCotas] = useState<Record<string, string>>({})
  const [salvandoCotas, setSalvandoCotas] = useState(false)
  const [erroCotas, setErroCotas] = useState('')
  const [sucessoCotas, setSucessoCotas] = useState(false)

  useEffect(() => {
    if (rateio?.membros) {
      const inicial: Record<string, string> = {}
      for (const m of rateio.membros) {
        inicial[m.user_id] = String(Math.round(Number(m.cota) * 100))
      }
      setCotas(inicial)
    }
  }, [rateio])

  const somaCotas = Object.values(cotas).reduce((acc, v) => acc + Number(v || '0'), 0)
  const cotasValidas = Math.abs(somaCotas - 100) < 0.01

  async function salvarCotas() {
    if (!rateioId || !rateio) return
    setSalvandoCotas(true)
    setErroCotas('')
    setSucessoCotas(false)
    try {
      for (const [userId, cotaStr] of Object.entries(cotas)) {
        const cota = Number(cotaStr) / 100
        const original = rateio.membros.find(m => m.user_id === userId)?.cota
        if (original !== undefined && Math.abs(Number(original) - cota) > 0.0001) {
          await atualizarCota(rateioId, userId, cota)
        }
      }
      setSucessoCotas(true)
      setTimeout(() => setSucessoCotas(false), 2000)
    } catch (e) {
      setErroCotas((e as Error).message)
    } finally {
      setSalvandoCotas(false)
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <Header title="Configurações" back={!!rateioId} />

      <main className="px-margin py-4 pb-24 space-y-6">
        {/* Aparência */}
        <section className="space-y-3">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Aparência</h2>

          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-body-md text-on-surface font-medium">Modo escuro</p>
                <p className="text-body-sm text-on-surface-variant">
                  {theme === 'system' ? 'Seguindo o sistema' : resolvedTheme === 'dark' ? 'Ativado' : 'Desativado'}
                </p>
              </div>
              <Switch
                checked={resolvedTheme === 'dark'}
                onChange={checked => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </Card>

          {theme !== 'system' && (
            <button
              onClick={() => setTheme('system')}
              className="text-body-sm text-primary hover:underline"
            >
              Usar preferência do sistema
            </button>
          )}
        </section>

        {/* Cotas do rateio */}
        {rateioId && (
          <section className="space-y-3">
            <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">
              Cotas — {rateio?.nome ?? '…'}
            </h2>

            {loading && (
              <p className="text-body-sm text-on-surface-variant">Carregando…</p>
            )}

            {!loading && rateio?.membros.map(m => (
              <Card key={m.user_id} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-md font-semibold shrink-0">
                  {(m.users?.email ?? m.user_id).slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body-md text-on-surface truncate">
                    {m.users?.email?.split('@')[0] ?? m.user_id.slice(0, 8)}
                  </p>
                </div>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={cotas[m.user_id] ?? ''}
                  onChange={e =>
                    setCotas(prev => ({ ...prev, [m.user_id]: e.target.value }))
                  }
                  suffix="%"
                  className="w-16 text-right"
                />
              </Card>
            ))}

            {!loading && rateio && (
              <>
                <div
                  className={[
                    'flex justify-end text-body-sm font-medium',
                    cotasValidas ? 'text-primary' : 'text-error',
                  ].join(' ')}
                >
                  Total: {somaCotas.toFixed(1)}%
                  {!cotasValidas && ' (deve ser 100%)'}
                </div>

                {erroCotas && <p className="text-body-sm text-error">{erroCotas}</p>}
                {sucessoCotas && (
                  <p className="text-body-sm text-primary">Cotas atualizadas com sucesso.</p>
                )}

                <Button
                  onClick={salvarCotas}
                  loading={salvandoCotas}
                  disabled={salvandoCotas || !cotasValidas}
                  className="w-full"
                >
                  Salvar cotas
                </Button>
              </>
            )}
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
