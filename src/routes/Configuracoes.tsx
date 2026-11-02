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
  buscarUsuariosPorPrefixo,
  listarTaxasIpca,
} from '../db/queries'
import { indiceEmData } from '../core/indice'
import type { TaxaIPCA } from '../core/indice'

function IpcaSection() {
  const hoje = new Date().toISOString().slice(0, 10)
  const defaultInicio = (() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 24)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })()

  const [dataInicio, setDataInicio] = useState(defaultInicio)
  const [dataFim, setDataFim] = useState(hoje)
  const [inputInicio, setInputInicio] = useState(defaultInicio.slice(0, 7))
  const [inputFim, setInputFim] = useState(hoje.slice(0, 7))
  const [erroData, setErroData] = useState('')
  const [sortBy, setSortBy] = useState<'mes' | 'taxa' | 'indice' | 'variacao'>('mes')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [tooltipIdx, setTooltipIdx] = useState<number | null>(null)

  const { data: taxasRaw, loading, error, reload } = useAsync(
    () => listarTaxasIpca(),
    [],
  )

  const taxasCore: TaxaIPCA[] = (taxasRaw ?? [])
    .map(t => ({ mes: t.mes.slice(0, 10), taxa: Number(t.taxa) }))
    .sort((a, b) => a.mes.localeCompare(b.mes))

  const taxasFiltradas = taxasCore.filter(t => t.mes >= dataInicio && t.mes <= dataFim)

  interface Dado {
    mes: string
    taxa: number
    indice: number
    variacao: number | null
  }

  const dadosCalc: Dado[] = taxasCore.length === 0 ? [] : taxasFiltradas.map((t, i) => {
    let indice = 0
    try { indice = Number(indiceEmData(t.mes, taxasCore).toFixed(4)) } catch { /* série vazia */ }
    const prev = taxasFiltradas[i - 1]
    const variacao = prev && prev.taxa !== 0 ? (t.taxa / prev.taxa - 1) * 100 : null
    return { mes: t.mes, taxa: t.taxa, indice, variacao }
  })

  const dadosOrdenados = [...dadosCalc].sort((a, b) => {
    let cmp = 0
    if (sortBy === 'mes') cmp = a.mes.localeCompare(b.mes)
    else if (sortBy === 'taxa') cmp = a.taxa - b.taxa
    else if (sortBy === 'indice') cmp = a.indice - b.indice
    else if (sortBy === 'variacao') cmp = (a.variacao ?? -Infinity) - (b.variacao ?? -Infinity)
    return sortDir === 'asc' ? cmp : -cmp
  })

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  function aplicar() {
    const inicio = inputInicio + '-01'
    const fim = inputFim + '-01'
    if (inicio > fim) { setErroData('Data inicial não pode ser maior que a data final.'); return }
    setErroData('')
    setDataInicio(inicio)
    setDataFim(fim)
  }

  function formatMes(mes: string) {
    const [ano, m] = mes.split('-')
    return new Date(Number(ano), Number(m) - 1, 1)
      .toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
  }

  // SVG chart geometry
  const W = 500, H = 160, PL = 50, PR = 16, PT = 12, PB = 28
  const n = dadosCalc.length
  const idxs = dadosCalc.map(d => d.indice)
  const minY = idxs.length ? Math.min(...idxs) : 0
  const maxY = idxs.length ? Math.max(...idxs) : 1
  const rangeY = maxY - minY || 1

  function svgX(i: number) { return PL + (n > 1 ? i / (n - 1) : 0.5) * (W - PL - PR) }
  function svgY(v: number) { return PT + ((maxY - v) / rangeY) * (H - PT - PB) }

  const pathD = dadosCalc
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${svgX(i).toFixed(1)},${svgY(d.indice).toFixed(1)}`)
    .join(' ')

  const hovered = tooltipIdx !== null ? dadosCalc[tooltipIdx] : null

  const cols: { key: typeof sortBy; label: string }[] = [
    { key: 'mes', label: 'Mês' },
    { key: 'taxa', label: 'Taxa (%)' },
    { key: 'indice', label: 'Índice' },
    { key: 'variacao', label: 'Variação (%)' },
  ]

  return (
    <section className="space-y-4">
      <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Índice IPCA</h2>

      {loading && (
        <Card className="bg-surface-container border-outline-variant">
          <div className="h-40 rounded bg-surface-variant animate-pulse" />
        </Card>
      )}

      {!loading && error && (
        <Card className="border-error bg-error-container">
          <div className="flex items-center justify-between gap-3">
            <p className="text-body-sm text-on-error-container">{error}</p>
            <button onClick={reload} className="shrink-0 text-label-sm text-on-error-container underline">
              Tentar novamente
            </button>
          </div>
        </Card>
      )}

      {!loading && !error && taxasCore.length === 0 && (
        <Card className="bg-surface-container border-outline-variant">
          <p className="text-body-md text-on-surface font-medium mb-1">Nenhuma taxa disponível</p>
          <p className="text-body-sm text-on-surface-variant mb-3">
            Verifique o workflow{' '}
            <code className="text-label-sm bg-surface-variant px-1 rounded">ipca.yml</code>{' '}
            no GitHub Actions.
          </p>
          <a
            href="https://www3.bcb.gov.br/sgspub/localizarseries/localizar.jsp?measure=612&serie=433"
            target="_blank"
            rel="noopener noreferrer"
            className="text-body-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            BCB — Série 433
            <span className="material-symbols-outlined text-[13px]" aria-hidden="true">open_in_new</span>
          </a>
        </Card>
      )}

      {!loading && !error && taxasCore.length > 0 && (
        <>
          {/* Filtros De/Até */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-label-sm text-on-surface-variant">De</label>
              <input
                type="month"
                value={inputInicio}
                onChange={e => setInputInicio(e.target.value)}
                className="h-9 px-2 rounded border border-outline bg-surface text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-sm text-on-surface-variant">Até</label>
              <input
                type="month"
                value={inputFim}
                onChange={e => setInputFim(e.target.value)}
                className="h-9 px-2 rounded border border-outline bg-surface text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              onClick={aplicar}
              className="h-9 px-4 rounded bg-primary text-on-primary text-label-md font-medium transition-colors"
            >
              Aplicar
            </button>
            {erroData && <p className="w-full text-body-sm text-error">{erroData}</p>}
          </div>

          {/* Gráfico */}
          <Card className="bg-surface-container border-outline-variant">
            <p className="text-label-sm text-on-surface-variant mb-2">Índice acumulado</p>
            {dadosCalc.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant py-6 text-center">
                Nenhum dado no intervalo selecionado.
              </p>
            ) : (
              <div className="relative">
                <div className="text-primary">
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '160px' }}>
                    <line x1={PL} y1={PT} x2={PL} y2={H - PB} stroke="currentColor" strokeWidth="1" opacity="0.15" />
                    <line x1={PL} y1={H - PB} x2={W - PR} y2={H - PB} stroke="currentColor" strokeWidth="1" opacity="0.15" />
                    <text x={PL - 4} y={PT + 4} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.5">{maxY.toFixed(1)}</text>
                    <text x={PL - 4} y={H - PB} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.5">{minY.toFixed(1)}</text>
                    {n > 1 && (
                      <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinejoin="round" strokeLinecap="round" />
                    )}
                    {dadosCalc.map((d, i) => (
                      <circle
                        key={d.mes}
                        cx={svgX(i)} cy={svgY(d.indice)}
                        r={tooltipIdx === i ? 5 : 3.5}
                        fill="currentColor"
                        className="cursor-pointer"
                        onMouseEnter={() => setTooltipIdx(i)}
                        onMouseLeave={() => setTooltipIdx(null)}
                      />
                    ))}
                    {n >= 1 && <text x={svgX(0)} y={H - 4} textAnchor="start" fontSize="9" fill="currentColor" opacity="0.5">{formatMes(dadosCalc[0].mes)}</text>}
                    {n >= 3 && <text x={svgX(Math.floor(n / 2))} y={H - 4} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.5">{formatMes(dadosCalc[Math.floor(n / 2)].mes)}</text>}
                    {n >= 2 && <text x={svgX(n - 1)} y={H - 4} textAnchor="end" fontSize="9" fill="currentColor" opacity="0.5">{formatMes(dadosCalc[n - 1].mes)}</text>}
                  </svg>
                </div>
                {hovered && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-surface border border-outline rounded-lg px-3 py-2 shadow-md pointer-events-none z-10 whitespace-nowrap">
                    <p className="text-label-sm text-on-surface font-medium">{formatMes(hovered.mes)}</p>
                    <p className="text-body-sm text-on-surface-variant">Taxa: {hovered.taxa.toFixed(2).replace('.', ',')}%</p>
                    <p className="text-body-sm text-on-surface-variant">Índice: {hovered.indice.toFixed(4).replace('.', ',')}</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Tabela */}
          <Card className="bg-surface-container border-outline-variant !p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead className="border-b border-outline-variant">
                  <tr>
                    {cols.map(({ key, label }) => (
                      <th
                        key={key}
                        onClick={() => toggleSort(key)}
                        className="px-3 py-2 text-left text-label-sm text-on-surface-variant cursor-pointer select-none hover:text-on-surface whitespace-nowrap"
                      >
                        {label}
                        {sortBy === key && (
                          <span className="ml-1 material-symbols-outlined text-[11px] align-middle" aria-hidden="true">
                            {sortDir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dadosOrdenados.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-on-surface-variant">
                        Nenhum dado no intervalo selecionado.
                      </td>
                    </tr>
                  )}
                  {dadosOrdenados.map(d => (
                    <tr key={d.mes} className="border-b border-outline-variant/40 hover:bg-surface-variant">
                      <td className="px-3 py-2 text-on-surface whitespace-nowrap">{formatMes(d.mes)}</td>
                      <td className="px-3 py-2 text-on-surface tabular-nums">{d.taxa.toFixed(2).replace('.', ',')}%</td>
                      <td className="px-3 py-2 text-on-surface tabular-nums">{d.indice.toFixed(4).replace('.', ',')}</td>
                      <td className="px-3 py-2 text-on-surface-variant tabular-nums">
                        {d.variacao === null
                          ? '—'
                          : `${d.variacao > 0 ? '+' : ''}${d.variacao.toFixed(2).replace('.', ',')}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Fonte */}
          <p className="text-body-sm text-on-surface-variant flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">info</span>
            Fonte: Banco Central do Brasil —{' '}
            <a
              href="https://www3.bcb.gov.br/sgspub/localizarseries/localizar.jsp?measure=612&serie=433"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5"
            >
              Série 433
              <span className="material-symbols-outlined text-[12px]" aria-hidden="true">open_in_new</span>
            </a>
          </p>
        </>
      )}
    </section>
  )
}

export function Component() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const rateioId = searchParams.get('rateio')
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { user, isPending: authPending } = useUser()

  const { data: rateio, loading, error: rateioError, reload: reloadRateio } = useAsync(
    () => {
      if (authPending || !rateioId) return Promise.resolve(null)
      return buscarRateio(rateioId)
    },
    [rateioId, authPending],
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
  const [candidatos, setCandidatos] = useState<{ id: string; email: string; nome: string | null }[]>([])
  const [buscando, setBuscando] = useState(false)
  const [novoMembro, setNovoMembro] = useState<{ id: string; email: string; nome: string | null } | null>(null)
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

  useEffect(() => {
    if (emailBusca.length < 2) {
      setCandidatos([])
      setBuscando(false)
      return
    }
    setBuscando(true)
    const timer = setTimeout(async () => {
      try {
        const res = await buscarUsuariosPorPrefixo(emailBusca.trim())
        setCandidatos(res)
      } catch {
        setCandidatos([])
      } finally {
        setBuscando(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [emailBusca])

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

        {(authPending || loading) && (
          <p className="text-body-sm text-on-surface-variant">Carregando…</p>
        )}

        {!authPending && !loading && rateioError && (
          <div className="space-y-3">
            <p className="text-body-sm text-error">{rateioError}</p>
            <Button onClick={reloadRateio} variant="outline">Tentar novamente</Button>
          </div>
        )}

        {!authPending && !loading && !rateioError && !rateio && (
          <div className="space-y-3">
            <p className="text-body-sm text-on-surface-variant">Rateio não encontrado ou sem acesso.</p>
            <Button onClick={() => navigate(-1)} variant="outline">Voltar</Button>
          </div>
        )}

        {!authPending && !loading && !rateioError && rateio && !isOwner && (
          <div className="space-y-3">
            <p className="text-body-sm text-on-surface-variant">Apenas o criador do rateio pode alterar as configurações.</p>
            <Button onClick={() => navigate(-1)} variant="outline">Voltar</Button>
          </div>
        )}

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
                    <p className="text-body-sm text-error">Remover {m.users?.nome ?? m.users?.email?.split('@')[0] ?? 'este membro'}?</p>
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
              <Input
                label="E-mail do participante"
                type="email"
                placeholder="participante@email.com"
                value={emailBusca}
                onChange={e => {
                  setEmailBusca(e.target.value)
                  setNovoMembro(null)
                }}
              />
              {candidatos.length > 0 && (
                <ul className="border border-outline-variant rounded-lg bg-surface-container overflow-hidden">
                  {candidatos.map((c) => {
                    const jaMembro = rateio.membros.some((m) => m.user_id === c.id)
                    return (
                      <li
                        key={c.id}
                        className={`px-4 py-2 ${jaMembro ? 'text-on-surface/40 cursor-not-allowed' : 'hover:bg-surface-variant cursor-pointer'}`}
                        onClick={() => {
                          if (jaMembro) return
                          setNovoMembro(c)
                          setCandidatos([])
                          setEmailBusca('')
                        }}
                      >
                        {c.nome
                          ? <><p className="text-sm text-on-surface">{c.nome}</p><p className="text-xs text-on-surface-variant">{c.email}</p></>
                          : <p className="text-sm text-on-surface">{c.email}</p>
                        }
                        {jaMembro && <span className="text-xs">(já membro)</span>}
                      </li>
                    )
                  })}
                </ul>
              )}
              {emailBusca.length >= 2 && !buscando && candidatos.length === 0 && !novoMembro && (
                <p className="text-sm text-on-surface/60">
                  Nenhum usuário encontrado. Ele precisa ter uma conta no Rateio.
                </p>
              )}
              {novoMembro && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded bg-primary/5 border border-primary/20">
                    <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-sm font-semibold shrink-0">
                      {(novoMembro.nome ?? novoMembro.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md text-on-surface font-medium truncate">{novoMembro.nome ?? novoMembro.email}</p>
                      {novoMembro.nome && <p className="text-body-sm text-on-surface-variant truncate">{novoMembro.email}</p>}
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
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
            {/* Column 1: Conta + Aparência */}
            <div className="space-y-6">
              <section className="space-y-3">
                <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Conta</h2>
                <Card>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-lg font-semibold">
                      {(user?.name?.trim() || user?.email?.split('@')[0] || '??').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-body-md text-on-surface font-medium">
                        {user?.name?.trim() || user?.email?.split('@')[0]}
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

            {/* Column 2: Sobre */}
            <div className="space-y-6">
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

          <IpcaSection />
        </div>
      </main>
    </AppShell>
  )
}
