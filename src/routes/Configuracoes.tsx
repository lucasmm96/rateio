import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { FormShell } from '../components/layout/FormShell'
import { Header } from '../components/ui/Header'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Switch } from '../components/ui/Switch'
import { Input } from '../components/ui/Input'
import { useTheme } from '../components/ThemeProvider'
import { useAsync } from '../hooks/useAsync'
import { useUser } from '../db/auth'
import {
  buscarRateio,
  atualizarCotas,
  editarRateio,
  arquivarRateio,
  adicionarMembro,
  removerMembro,
  buscarUsuarioPorEmail,
} from '../db/queries'

export function Component() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const rateioId = searchParams.get('rateio')
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { user } = useUser()

  const { data: rateio, loading, reload: reloadRateio } = useAsync(
    () => (rateioId ? buscarRateio(rateioId) : Promise.resolve(null)),
    [rateioId],
  )

  const isOwner = !!rateio && rateio.criado_por_user_id === user?.id

  // ── Cotas ──
  const [cotas, setCotas] = useState<Record<string, string>>({})
  const [salvandoCotas, setSalvandoCotas] = useState(false)
  const [erroCotas, setErroCotas] = useState('')
  const [sucessoCotas, setSucessoCotas] = useState(false)

  // ── Editar rateio ──
  const [nomeEdit, setNomeEdit] = useState('')
  const [corrigirEdit, setCorrigirEdit] = useState(false)
  const [salvandoRateio, setSalvandoRateio] = useState(false)
  const [erroRateio, setErroRateio] = useState('')
  const [sucessoRateio, setSucessoRateio] = useState(false)

  // ── Arquivar ──
  const [confirmandoArquivar, setConfirmandoArquivar] = useState(false)
  const [arquivando, setArquivando] = useState(false)
  const [erroArquivar, setErroArquivar] = useState('')

  // ── Remover membro ──
  const [removendoId, setRemovendoId] = useState<string | null>(null)
  const [erroRemover, setErroRemover] = useState('')

  // ── Adicionar participante ──
  const [emailBusca, setEmailBusca] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [novoMembro, setNovoMembro] = useState<{ id: string; email: string } | null>(null)
  const [erroBusca, setErroBusca] = useState('')
  const [adicionando, setAdicionando] = useState(false)
  const [erroAdicionar, setErroAdicionar] = useState('')

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
      const payload = Object.entries(cotas).map(([userId, cotaStr]) => ({
        userId,
        cota: Number(cotaStr) / 100,
      }))
      await atualizarCotas(rateioId, payload)
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
      if (Object.keys(updates).length > 0) {
        await editarRateio(rateioId, updates)
        setSucessoRateio(true)
        setTimeout(() => setSucessoRateio(false), 2000)
      }
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

  async function confirmarRemover(userId: string) {
    if (!rateioId) return
    setErroRemover('')
    try {
      await removerMembro(rateioId, userId)
      setRemovendoId(null)
      reloadRateio()
    } catch (e) {
      setErroRemover((e as Error).message)
      setRemovendoId(null)
    }
  }

  async function buscarNovoMembro() {
    setErroBusca('')
    setNovoMembro(null)
    if (!emailBusca.trim()) return
    setBuscando(true)
    try {
      const encontrado = await buscarUsuarioPorEmail(emailBusca.trim())
      if (!encontrado) {
        setErroBusca('Usuário não encontrado. Ele precisa ter uma conta no Rateio.')
      } else if (rateio?.membros.some(m => m.user_id === encontrado.id)) {
        setErroBusca('Este usuário já é membro deste rateio.')
      } else {
        setNovoMembro(encontrado)
      }
    } catch (e) {
      setErroBusca((e as Error).message)
    } finally {
      setBuscando(false)
    }
  }

  async function confirmarAdicionar() {
    if (!rateioId || !rateio || !novoMembro) return
    setAdicionando(true)
    setErroAdicionar('')
    try {
      const membrosAtuais = rateio.membros
      const total = membrosAtuais.length + 1
      const cotaIgual = Math.floor(100 / total)
      const resto = 100 - cotaIgual * total

      const novasCotas = [
        ...membrosAtuais.map((m, i) => ({
          userId: m.user_id,
          cota: (cotaIgual + (i === 0 ? resto : 0)) / 100,
        })),
        { userId: novoMembro.id, cota: cotaIgual / 100 },
      ]

      await adicionarMembro(rateioId, novoMembro.id, novasCotas)
      setNovoMembro(null)
      setEmailBusca('')
      reloadRateio()
    } catch (e) {
      setErroAdicionar((e as Error).message)
    } finally {
      setAdicionando(false)
    }
  }

  // ── Config rateio content (FormShell when ?rateio= is set) ──────────────
  const ConfigRateioContent = () => (
    <div className="bg-background">
      <Header title="Config. Rateio" back />
      <main className="px-margin py-4 pb-8 space-y-6">

        {/* Editar rateio */}
        {isOwner && (
          <section className="space-y-3">
            <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Editar rateio</h2>
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
                {sucessoRateio && <p className="text-body-sm text-primary">Rateio atualizado com sucesso.</p>}
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

        {/* Cotas */}
        {isOwner && (
          <section className="space-y-3">
            <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">
              Cotas — {rateio?.nome ?? '…'}
            </h2>
            {loading && <p className="text-body-sm text-on-surface-variant">Carregando…</p>}
            {erroRemover && <p className="text-body-sm text-error">{erroRemover}</p>}
            {!loading && rateio?.membros.map(m => (
              <div key={m.user_id}>
                <Card className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-md font-semibold shrink-0">
                    {(m.users?.email ?? m.user_id).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body-md text-on-surface truncate">
                      {m.users?.email ?? m.user_id.slice(0, 8)}
                    </p>
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={cotas[m.user_id] ?? ''}
                    onChange={e => setCotas(prev => ({ ...prev, [m.user_id]: e.target.value }))}
                    suffix="%"
                    className="w-16 text-right"
                  />
                  {rateio.membros.length > 1 && (
                    <button
                      onClick={() => setRemovendoId(m.user_id === removendoId ? null : m.user_id)}
                      className="p-1.5 rounded text-on-surface-variant hover:text-error transition-colors shrink-0"
                      aria-label={`Remover ${m.users?.email ?? 'membro'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">person_remove</span>
                    </button>
                  )}
                </Card>
                {removendoId === m.user_id && (
                  <div className="mt-1 px-3 py-2 rounded bg-error/10 border border-error/20 flex items-center justify-between gap-3">
                    <p className="text-body-sm text-error">Remover {m.users?.email?.split('@')[0] ?? 'este membro'}?</p>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setRemovendoId(null)}
                        className="px-3 py-1 rounded text-label-md text-on-surface border border-outline hover:bg-surface"
                      >
                        Não
                      </button>
                      <button
                        onClick={() => confirmarRemover(m.user_id)}
                        className="px-3 py-1 rounded text-label-md text-on-primary bg-error hover:opacity-90"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!loading && rateio && (
              <>
                <div className={['flex justify-end text-body-sm font-medium', cotasValidas ? 'text-primary' : 'text-error'].join(' ')}>
                  Total: {somaCotas.toFixed(1)}%
                  {!cotasValidas && ' (deve ser 100%)'}
                </div>
                {erroCotas && <p className="text-body-sm text-error">{erroCotas}</p>}
                {sucessoCotas && <p className="text-body-sm text-primary">Cotas atualizadas com sucesso.</p>}
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

        {/* Adicionar participante */}
        {isOwner && !loading && rateio && (
          <section className="space-y-3">
            <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Adicionar participante</h2>
            <Card className="space-y-3">
              <div className="flex gap-2">
                <Input
                  label="E-mail do participante"
                  type="email"
                  placeholder="participante@email.com"
                  value={emailBusca}
                  onChange={e => { setEmailBusca(e.target.value); setNovoMembro(null); setErroBusca('') }}
                  className="flex-1"
                />
                <div className="flex items-end">
                  <Button
                    onClick={buscarNovoMembro}
                    loading={buscando}
                    variant="outline"
                    size="sm"
                    disabled={buscando || !emailBusca.trim()}
                  >
                    Buscar
                  </Button>
                </div>
              </div>
              {erroBusca && <p className="text-body-sm text-error">{erroBusca}</p>}
              {novoMembro && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded bg-primary/5 border border-primary/20">
                    <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-sm font-semibold shrink-0">
                      {novoMembro.email.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md text-on-surface font-medium truncate">{novoMembro.email}</p>
                      <p className="text-body-sm text-on-surface-variant">
                        As cotas serão redistribuídas igualmente entre todos os membros.
                      </p>
                    </div>
                  </div>
                  {erroAdicionar && <p className="text-body-sm text-error">{erroAdicionar}</p>}
                  <Button
                    onClick={confirmarAdicionar}
                    loading={adicionando}
                    disabled={adicionando}
                    className="w-full"
                  >
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                    Adicionar ao rateio
                  </Button>
                </div>
              )}
            </Card>
          </section>
        )}

        {/* Arquivar */}
        {isOwner && !loading && rateio && (
          <section className="space-y-3">
            <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Zona de perigo</h2>
            <Card>
              <p className="text-body-md text-on-surface font-medium">Arquivar rateio</p>
              <p className="text-body-sm text-on-surface-variant mt-1">
                O rateio será removido da lista principal. As despesas e histórico são preservados.
              </p>
              {erroArquivar && <p className="text-body-sm text-error mt-2">{erroArquivar}</p>}
              {!confirmandoArquivar ? (
                <button
                  onClick={() => setConfirmandoArquivar(true)}
                  className="mt-3 w-full py-2 rounded text-label-lg text-error border border-error hover:bg-error/10 transition duration-150 active:scale-[0.98]"
                >
                  Arquivar rateio
                </button>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-body-sm text-error font-medium">Tem certeza? Esta ação não pode ser desfeita facilmente.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmandoArquivar(false)}
                      className="flex-1 py-2 rounded text-label-lg text-on-surface border border-outline hover:bg-surface transition-colors"
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
    </div>
  )

  // Config rateio: FormShell (modal on md+)
  if (rateioId) {
    return (
      <FormShell>
        <ConfigRateioContent />
      </FormShell>
    )
  }

  // Config globais: AppShell full page
  return (
    <AppShell>
      <Header title="Configurações" />

      <main className="px-4 md:px-6 lg:px-8 py-4 pb-8">
        <div className="max-w-3xl mx-auto">
          <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
            {/* Column 1: Conta + Aparência */}
            <div className="space-y-6">
              <section className="space-y-3">
                <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Conta</h2>
                <Card>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-lg font-semibold">
                      {user?.email?.split('@')[0].slice(0, 2).toUpperCase() ?? '??'}
                    </div>
                    <div>
                      <p className="text-body-md text-on-surface font-medium">
                        {user?.email?.split('@')[0]}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">{user?.email}</p>
                    </div>
                  </div>
                </Card>
              </section>

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
            </div>

            {/* Column 2: Índice + Sobre */}
            <div className="space-y-6">
              <section className="space-y-3">
                <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Índice IPCA</h2>
                <Card>
                  <p className="text-body-md text-on-surface font-medium">Correção monetária</p>
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    Os índices IPCA são atualizados automaticamente pelo sistema a partir dos dados do Banco Central.
                  </p>
                </Card>
              </section>

              <section className="space-y-3">
                <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Sobre</h2>
                <Card>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                      <span
                        className="material-symbols-outlined text-[22px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                        aria-hidden="true"
                      >
                        payments
                      </span>
                    </div>
                    <div>
                      <p className="text-body-md text-on-surface font-medium">Rateio</p>
                      <p className="text-body-sm text-on-surface-variant">Controle de despesas compartilhadas</p>
                    </div>
                  </div>
                </Card>
              </section>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  )
}
