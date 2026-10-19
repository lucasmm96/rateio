import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/ui/BottomNav'
import { Header } from '../components/ui/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Switch } from '../components/ui/Switch'
import { Input } from '../components/ui/Input'
import { useTheme } from '../components/ThemeProvider'
import { useAsync } from '../hooks/useAsync'
import { useUser } from '../db/auth'
import { buscarRateio, atualizarCota, editarRateio, arquivarRateio } from '../db/queries'

export function Component() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const rateioId = searchParams.get('rateio')
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { user } = useUser()

  const { data: rateio, loading } = useAsync(
    () => (rateioId ? buscarRateio(rateioId) : Promise.resolve(null)),
    [rateioId],
  )

  const isOwner = !!rateio && rateio.criado_por_user_id === user?.id

  // --- Cotas ---
  const [cotas, setCotas] = useState<Record<string, string>>({})
  const [salvandoCotas, setSalvandoCotas] = useState(false)
  const [erroCotas, setErroCotas] = useState('')
  const [sucessoCotas, setSucessoCotas] = useState(false)

  // --- Editar rateio ---
  const [nomeEdit, setNomeEdit] = useState('')
  const [corrigirEdit, setCorrigirEdit] = useState(false)
  const [salvandoRateio, setSalvandoRateio] = useState(false)
  const [erroRateio, setErroRateio] = useState('')
  const [sucessoRateio, setSucessoRateio] = useState(false)

  // --- Arquivar ---
  const [confirmandoArquivar, setConfirmandoArquivar] = useState(false)
  const [arquivando, setArquivando] = useState(false)
  const [erroArquivar, setErroArquivar] = useState('')

  useEffect(() => {
    if (rateio?.membros) {
      const inicial: Record<string, string> = {}
      for (const m of rateio.membros) {
        inicial[m.user_id] = String(Math.round(Number(m.cota) * 100))
      }
      setCotas(inicial)
    }
    if (rateio) {
      setNomeEdit(rateio.nome)
      setCorrigirEdit(rateio.corrigir_ipca)
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

  async function salvarRateio() {
    if (!rateioId || !rateio) return
    setSalvandoRateio(true)
    setErroRateio('')
    setSucessoRateio(false)
    try {
      const updates: { nome?: string; corrigir_ipca?: boolean } = {}
      if (nomeEdit.trim() && nomeEdit.trim() !== rateio.nome) updates.nome = nomeEdit.trim()
      if (corrigirEdit !== rateio.corrigir_ipca) updates.corrigir_ipca = corrigirEdit
      if (Object.keys(updates).length > 0) await editarRateio(rateioId, updates)
      setSucessoRateio(true)
      setTimeout(() => setSucessoRateio(false), 2000)
    } catch (e) {
      setErroRateio((e as Error).message)
    } finally {
      setSalvandoRateio(false)
    }
  }

  async function confirmarArquivar() {
    if (!rateioId) return
    setArquivando(true)
    setErroArquivar('')
    try {
      await arquivarRateio(rateioId)
      navigate('/')
    } catch (e) {
      setErroArquivar((e as Error).message)
      setArquivando(false)
      setConfirmandoArquivar(false)
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

        {/* Editar rateio — apenas para o criador */}
        {rateioId && isOwner && (
          <section className="space-y-3">
            <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">
              Editar rateio
            </h2>

            {loading && <p className="text-body-sm text-on-surface-variant">Carregando…</p>}

            {!loading && rateio && (
              <>
                <Card className="space-y-4">
                  <Input
                    label="Nome do rateio"
                    value={nomeEdit}
                    onChange={e => setNomeEdit(e.target.value)}
                  />

                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-body-md text-on-surface font-medium">Correção pelo IPCA</p>
                      <p className="text-body-sm text-on-surface-variant">
                        Recalcula todos os saldos com correção monetária
                      </p>
                    </div>
                    <Switch checked={corrigirEdit} onChange={setCorrigirEdit} />
                  </div>
                </Card>

                {erroRateio && <p className="text-body-sm text-error">{erroRateio}</p>}
                {sucessoRateio && (
                  <p className="text-body-sm text-primary">Rateio atualizado com sucesso.</p>
                )}

                <Button
                  onClick={salvarRateio}
                  loading={salvandoRateio}
                  disabled={salvandoRateio || !nomeEdit.trim()}
                  className="w-full"
                >
                  Salvar alterações
                </Button>
              </>
            )}
          </section>
        )}

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

        {/* Arquivar rateio — apenas para o criador */}
        {rateioId && isOwner && !loading && rateio && (
          <section className="space-y-3">
            <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">
              Zona de perigo
            </h2>

            <Card>
              <p className="text-body-md text-on-surface font-medium">Arquivar rateio</p>
              <p className="text-body-sm text-on-surface-variant mt-1">
                O rateio será removido da lista principal. As despesas e histórico são preservados.
              </p>

              {erroArquivar && <p className="text-body-sm text-error mt-2">{erroArquivar}</p>}

              {!confirmandoArquivar ? (
                <button
                  onClick={() => setConfirmandoArquivar(true)}
                  className="mt-3 w-full py-2 rounded-lg text-label-lg text-error border border-error hover:bg-error/10 transition-colors"
                >
                  Arquivar rateio
                </button>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-body-sm text-error font-medium">Tem certeza? Esta ação não pode ser desfeita facilmente.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmandoArquivar(false)}
                      className="flex-1 py-2 rounded-lg text-label-lg text-on-surface border border-outline hover:bg-surface transition-colors"
                    >
                      Cancelar
                    </button>
                    <Button
                      onClick={confirmarArquivar}
                      loading={arquivando}
                      disabled={arquivando}
                      className="flex-1 !bg-error !text-on-error"
                    >
                      Confirmar
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
