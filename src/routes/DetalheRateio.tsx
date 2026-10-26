import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { Header } from '../components/ui/Header'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useAsync } from '../hooks/useAsync'
import {
  buscarRateio,
  listarDespesas,
  listarReembolsos,
  listarTaxasIpca,
  deletarDespesa,
  deletarReembolso,
} from '../db/queries'
import type { DespesaItem, ReembolsoItem } from '../db/queries'
import { D } from '../core/decimal'
import { calcularSaldo, saldoEmReais } from '../core/saldo'
import type { ResultadoSaldo } from '../core/saldo'
import { paraReais } from '../core/unidades'
import { indiceEmData } from '../core/indice'
import type { TaxaIPCA } from '../core/indice'
import { useUser } from '../db/auth'
import type { RateioDetalhe } from '../db/queries'

function fmtData(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function fmtReais(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtMesAno(iso: string): string {
  const [y, m] = iso.slice(0, 7).split('-')
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]
  return `${meses[parseInt(m, 10) - 1]} ${y}`
}

function ipcaCorrecaoPct(dataDespesa: string, hoje: string, taxas: TaxaIPCA[]): number | null {
  if (taxas.length === 0) return null
  try {
    const iHoje = indiceEmData(hoje, taxas)
    const iDespesa = indiceEmData(dataDespesa, taxas)
    return iHoje.dividedBy(iDespesa).minus(1).times(100).toNumber()
  } catch {
    return null
  }
}

type Tab = 'saldos' | 'extrato'

// ── SaldosContent ──────────────────────────────────────────────────────────

interface SaldosContentProps {
  resultado: ResultadoSaldo
  membros: RateioDetalhe['membros']
  hoje: string
  corrigirIpca: boolean
  taxasCore: TaxaIPCA[]
  rateioId: string
  currentUserId: string | undefined
}

function SaldosContent({ resultado, membros, hoje, corrigirIpca, taxasCore, rateioId, currentUserId }: SaldosContentProps) {
  const navigate = useNavigate()

  const emailDe = (userId: string) => {
    const m = membros.find(mb => mb.user_id === userId)
    return m?.users?.email?.split('@')[0] ?? userId.slice(0, 6)
  }

  const currentMembro = membros.find(m => m.user_id === currentUserId)
  const currentSaldoReais = currentMembro && currentUserId
    ? Number(saldoEmReais(resultado, currentUserId, hoje, corrigirIpca, taxasCore).toFixed(2))
    : null

  return (
    <div className="space-y-3">
      {/* Hero Balance Card — current user */}
      {currentMembro && currentSaldoReais !== null && (
        <Card variant="elevated" className="border-l-4 border-l-primary">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-label-md text-on-surface-variant uppercase tracking-wider mb-1">Seu saldo</p>
              <p className={[
                'text-currency-md font-bold',
                currentSaldoReais < -0.01 ? 'text-primary' : currentSaldoReais > 0.01 ? 'text-error' : 'text-on-surface-variant',
              ].join(' ')}>
                {fmtReais(Math.abs(currentSaldoReais))}
              </p>
              <Badge
                variant={currentSaldoReais < -0.01 ? 'a-receber' : currentSaldoReais > 0.01 ? 'deve' : 'default'}
                className="mt-1"
              >
                {currentSaldoReais < -0.01 ? 'Líquido favorável' : currentSaldoReais > 0.01 ? 'Você deve' : 'Quitado'}
              </Badge>
            </div>
            <div className="text-right text-body-sm text-on-surface-variant space-y-0.5">
              <p>Sua cota: <span className="font-medium text-on-surface">{(Number(currentMembro.cota) * 100).toFixed(0)}%</span></p>
            </div>
          </div>
          {currentSaldoReais > 0.01 && (
            <button
              onClick={() => navigate(`/rateios/${rateioId}/novo-reembolso`)}
              className="mt-3 w-full py-2 rounded text-label-lg text-on-primary-container bg-primary-container hover:opacity-90 transition-opacity"
            >
              Registrar reembolso
            </button>
          )}
        </Card>
      )}

      {/* All member cards */}
      {membros.map(m => {
        const saldo = saldoEmReais(resultado, m.user_id, hoje, corrigirIpca, taxasCore)
        const saldoN = Number(saldo.toFixed(2))
        const isAReceber = saldoN < -0.01
        const isDeve = saldoN > 0.01
        const deveParaOutros = resultado.deveDePara.filter(
          dp => dp.de === m.user_id && !dp.unidades.isZero(),
        )

        return (
          <Card key={m.user_id} variant="elevated">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-lg font-semibold">
                  {emailDe(m.user_id).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-body-md text-on-surface font-medium capitalize">
                    {emailDe(m.user_id)}
                    {m.user_id === currentUserId && <span className="text-on-surface-variant font-normal"> (você)</span>}
                  </p>
                  <p className="text-body-sm text-on-surface-variant">
                    {(Number(m.cota) * 100).toFixed(0)}% das despesas
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={[
                  'text-body-lg font-bold',
                  isAReceber ? 'text-primary' : isDeve ? 'text-error' : 'text-on-surface-variant',
                ].join(' ')}>
                  {fmtReais(Math.abs(saldoN))}
                </p>
                <Badge variant={isAReceber ? 'a-receber' : isDeve ? 'deve' : 'default'}>
                  {isAReceber ? 'a receber' : isDeve ? 'deve' : 'quitado'}
                </Badge>
              </div>
            </div>

            {deveParaOutros.length > 0 && (
              <div className="mt-3 pt-3 border-t border-outline space-y-1.5">
                {deveParaOutros.map(dp => {
                  const valorReais = paraReais(dp.unidades, hoje, corrigirIpca, taxasCore)
                  return (
                    <div key={dp.para} className="flex justify-between text-body-sm text-on-surface-variant">
                      <span>→ {emailDe(dp.para)}</span>
                      <span className="text-error font-medium">
                        {fmtReais(Number(valorReais.toFixed(2)))}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )
      })}

      {membros.length > 0 && (
        <Link
          to={`/rateios/${rateioId}/memoria`}
          className="flex items-center justify-center gap-2 py-3 text-label-lg text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">calculate</span>
          Ver memória de cálculo
        </Link>
      )}
    </div>
  )
}

// ── ExtratoContent ─────────────────────────────────────────────────────────

interface ExtratoContentProps {
  despesas: DespesaItem[]
  reembolsos: ReembolsoItem[]
  hoje: string
  corrigirIpca: boolean
  taxasCore: TaxaIPCA[]
  membros: RateioDetalhe['membros']
  onDeleteDespesa: (id: string) => Promise<void>
  onDeleteReembolso: (id: string) => Promise<void>
}

function ExtratoContent({
  despesas, reembolsos, hoje, corrigirIpca, taxasCore, membros, onDeleteDespesa, onDeleteReembolso,
}: ExtratoContentProps) {
  const [confirmandoExcluir, setConfirmandoExcluir] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  const emailDe = (userId: string) => {
    const m = membros.find(mb => mb.user_id === userId)
    return m?.users?.email?.split('@')[0] ?? userId.slice(0, 6)
  }

  type EntradaExtrato =
    | { tipo: 'despesa'; data: string; item: DespesaItem }
    | { tipo: 'reembolso'; data: string; item: ReembolsoItem }

  const entries: EntradaExtrato[] = [
    ...despesas.map(d => ({ tipo: 'despesa' as const, data: d.data, item: d })),
    ...reembolsos.map(r => ({ tipo: 'reembolso' as const, data: r.data, item: r })),
  ].sort((a, b) => b.data.localeCompare(a.data))

  // Group by YYYY-MM
  const byMonth: { key: string; label: string; items: EntradaExtrato[] }[] = []
  for (const entry of entries) {
    const key = entry.data.slice(0, 7)
    const last = byMonth[byMonth.length - 1]
    if (last?.key === key) {
      last.items.push(entry)
    } else {
      byMonth.push({ key, label: fmtMesAno(entry.data), items: [entry] })
    }
  }

  async function confirmarExcluir(id: string, tipo: 'despesa' | 'reembolso') {
    setExcluindo(true)
    try {
      if (tipo === 'despesa') await onDeleteDespesa(id)
      else await onDeleteReembolso(id)
    } finally {
      setExcluindo(false)
      setConfirmandoExcluir(null)
    }
  }

  if (entries.length === 0) {
    return (
      <p className="text-body-md text-on-surface-variant text-center py-8">
        Nenhuma movimentação ainda.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {byMonth.map(grupo => (
        <div key={grupo.key}>
          <div className="sticky top-14 z-[5] bg-background/90 backdrop-blur-sm py-1.5 mb-2 border-b border-outline">
            <p className="text-label-lg text-on-surface-variant font-semibold">{grupo.label}</p>
          </div>
          <div className="space-y-2">
            {grupo.items.map(entry => {
              if (entry.tipo === 'despesa') {
                const d = entry.item
                const isPrevista = d.data > hoje
                const isPaga = !isPrevista
                const correcao = (corrigirIpca && isPaga)
                  ? ipcaCorrecaoPct(d.data.slice(0, 10), hoje, taxasCore)
                  : null
                const isConfirmando = confirmandoExcluir === `d-${d.id}`
                return (
                  <Card key={`d-${d.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="material-symbols-outlined text-[20px] text-on-surface-variant mt-0.5 shrink-0" aria-hidden="true">
                          receipt_long
                        </span>
                        <div className="min-w-0">
                          <p className="text-body-md text-on-surface font-medium">{d.descricao}</p>
                          <p className="text-body-sm text-on-surface-variant">
                            {fmtData(d.data)} · pago por {emailDe(d.pagador_user_id)}
                          </p>
                          {correcao !== null && correcao > 0.01 && (
                            <p className="text-label-sm text-on-surface-variant mt-0.5">
                              IPCA +{correcao.toFixed(2)}%
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <p className="text-body-md font-semibold text-on-surface">
                          {fmtReais(Number(d.valor))}
                        </p>
                        {isPaga && <Badge variant="default" className="!bg-success/10 !text-success">Paga</Badge>}
                        {isPrevista && <Badge variant="prevista">prevista</Badge>}
                        <button
                          onClick={() => setConfirmandoExcluir(isConfirmando ? null : `d-${d.id}`)}
                          className="text-on-surface-variant hover:text-error transition-colors"
                          aria-label="Excluir despesa"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                    {isConfirmando && (
                      <div className="mt-3 pt-3 border-t border-outline flex items-center justify-between gap-2">
                        <p className="text-body-sm text-error font-medium">Excluir esta despesa?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmandoExcluir(null)}
                            className="px-3 py-1 rounded text-label-md text-on-surface border border-outline hover:bg-surface"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => confirmarExcluir(d.id, 'despesa')}
                            disabled={excluindo}
                            className="px-3 py-1 rounded text-label-md text-on-primary bg-error hover:opacity-90 disabled:opacity-50"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                )
              } else {
                const r = entry.item
                const isConfirmando = confirmandoExcluir === `r-${r.id}`
                return (
                  <Card key={`r-${r.id}`} className="bg-primary-container/10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="material-symbols-outlined text-[20px] text-primary mt-0.5 shrink-0" aria-hidden="true">
                          payments
                        </span>
                        <div className="min-w-0">
                          <p className="text-body-md text-on-surface font-medium">Reembolso</p>
                          <p className="text-body-sm text-on-surface-variant">
                            {fmtData(r.data)} · {emailDe(r.pagador_user_id)} → {emailDe(r.recebedor_user_id)}
                          </p>
                          {r.observacao && (
                            <p className="text-body-sm text-on-surface-variant italic">{r.observacao}</p>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <p className="text-body-md font-semibold text-primary">
                          {fmtReais(Number(r.valor))}
                        </p>
                        <button
                          onClick={() => setConfirmandoExcluir(isConfirmando ? null : `r-${r.id}`)}
                          className="text-on-surface-variant hover:text-error transition-colors"
                          aria-label="Excluir reembolso"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                    {isConfirmando && (
                      <div className="mt-3 pt-3 border-t border-outline flex items-center justify-between gap-2">
                        <p className="text-body-sm text-error font-medium">Excluir este reembolso?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmandoExcluir(null)}
                            className="px-3 py-1 rounded text-label-md text-on-surface border border-outline hover:bg-surface"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => confirmarExcluir(r.id, 'reembolso')}
                            disabled={excluindo}
                            className="px-3 py-1 rounded text-label-md text-on-primary bg-error hover:opacity-90 disabled:opacity-50"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                )
              }
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────

export function Component() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isPending: authPending } = useUser()
  const [tab, setTab] = useState<Tab>('saldos')
  const [fabOpen, setFabOpen] = useState(false)

  const { data: rateio, loading: lRateio, error: eRateio, reload: reloadRateio } = useAsync(() => authPending ? Promise.resolve(null) : buscarRateio(id!), [id, authPending])
  const { data: despesas, loading: lDesp, error: eDesp, reload: reloadDesp } = useAsync(() => authPending ? Promise.resolve(null) : listarDespesas(id!), [id, authPending])
  const { data: reembolsos, loading: lReem, error: eReem, reload: reloadReem } = useAsync(() => authPending ? Promise.resolve(null) : listarReembolsos(id!), [id, authPending])
  const { data: taxas, loading: lTaxas, error: eTaxas, reload: reloadTaxas } = useAsync(() => authPending ? Promise.resolve(null) : listarTaxasIpca(), [authPending])

  const loading = lRateio || lDesp || lReem || lTaxas
  const fetchError = eRateio ?? eDesp ?? eReem ?? eTaxas

  function reloadAll() {
    reloadRateio()
    reloadDesp()
    reloadReem()
    reloadTaxas()
  }

  const membros = rateio?.membros ?? []
  const hoje = new Date().toISOString().slice(0, 10)

  const taxasCore: TaxaIPCA[] = (taxas ?? []).map(t => ({
    mes: t.mes.slice(0, 10),
    taxa: Number(t.taxa),
  }))

  const rateioCore = rateio
    ? {
        participantes: membros.map(m => ({ userId: m.user_id, cota: D(m.cota) })),
        despesas: (despesas ?? []).map(d => ({
          data: d.data,
          valor: D(d.valor),
          pagadorUserId: d.pagador_user_id,
        })),
        reembolsos: (reembolsos ?? []).map(r => ({
          data: r.data,
          valor: D(r.valor),
          pagadorUserId: r.pagador_user_id,
          recebedorUserId: r.recebedor_user_id,
        })),
      }
    : null

  const resultado = rateioCore && !loading
    ? calcularSaldo(rateioCore, rateio!.corrigir_ipca, hoje, taxasCore)
    : null

  async function handleDeleteDespesa(despesaId: string) {
    await deletarDespesa(despesaId)
    reloadDesp()
  }

  async function handleDeleteReembolso(reembolsoId: string) {
    await deletarReembolso(reembolsoId)
    reloadReem()
  }

  return (
    <AppShell>
      <Header
        title={rateio?.nome ?? 'Rateio'}
        back
        actions={
          <>
            <button
              onClick={() => navigate(`/rateios/${id}/nova-despesa`)}
              className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded bg-primary text-on-primary text-label-lg font-medium hover:bg-primary-hover transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
              Nova despesa
            </button>
            <button
              onClick={() => navigate(`/rateios/${id}/novo-reembolso`)}
              className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded border border-outline text-on-surface text-label-lg font-medium hover:bg-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">payments</span>
              Reembolso
            </button>
            <Link
              to={`/configuracoes?rateio=${id}`}
              className="p-2 rounded-full text-on-surface-variant hover:bg-surface transition-colors"
              aria-label="Configurações do rateio"
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">settings</span>
            </Link>
          </>
        }
      />

      {loading && (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined text-primary text-[40px] animate-spin" aria-hidden="true">
            progress_activity
          </span>
        </div>
      )}

      {!loading && fetchError && (
        <div className="flex flex-col items-center gap-4 py-16 px-4 text-center">
          <span className="material-symbols-outlined text-[48px] text-error" aria-hidden="true">cloud_off</span>
          <p className="text-body-md text-on-surface font-medium">Erro ao carregar dados</p>
          <p className="text-body-sm text-on-surface-variant">{fetchError}</p>
          <button
            onClick={reloadAll}
            className="flex items-center gap-2 h-10 px-4 rounded bg-primary text-on-primary text-label-lg"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">refresh</span>
            Tentar novamente
          </button>
        </div>
      )}

      {/* Mobile/tablet: tab layout */}
      {!loading && !fetchError && (
        <div className="lg:hidden">
          <div className="relative flex border-b border-outline sticky top-14 apple-material z-10">
            {(['saldos', 'extrato'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  'flex-1 py-3 text-label-lg font-medium transition-colors duration-200',
                  tab === t ? 'text-primary' : 'text-on-surface-variant',
                ].join(' ')}
              >
                {t === 'saldos' ? 'Saldos' : 'Extrato'}
              </button>
            ))}
            <div
              className="absolute bottom-0 h-0.5 w-1/2 bg-primary transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ transform: `translateX(${tab === 'saldos' ? '0%' : '100%'})` }}
            />
          </div>

          {tab === 'saldos' && resultado && (
            <div className="px-4 py-4 pb-32 space-y-3">
              <SaldosContent
                resultado={resultado}
                membros={membros}
                hoje={hoje}
                corrigirIpca={rateio!.corrigir_ipca}
                taxasCore={taxasCore}
                rateioId={id!}
                currentUserId={user?.id}
              />
            </div>
          )}
          {tab === 'saldos' && !resultado && (
            <div className="flex flex-col items-center gap-3 py-16 px-4 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant" aria-hidden="true">
                balance
              </span>
              <p className="text-body-md text-on-surface-variant">
                {membros.length === 0 ? 'Nenhum participante neste rateio.' : 'Adicione despesas para ver os saldos.'}
              </p>
            </div>
          )}
          {tab === 'extrato' && (
            <div className="px-4 py-4 pb-32">
              <ExtratoContent
                despesas={despesas ?? []}
                reembolsos={reembolsos ?? []}
                hoje={hoje}
                corrigirIpca={rateio?.corrigir_ipca ?? false}
                taxasCore={taxasCore}
                membros={membros}
                onDeleteDespesa={handleDeleteDespesa}
                onDeleteReembolso={handleDeleteReembolso}
              />
            </div>
          )}
        </div>
      )}

      {/* Desktop: 2-column layout */}
      {!loading && !fetchError && (
        <div className="hidden lg:grid lg:grid-cols-[384px_1fr] lg:gap-6 lg:px-8 lg:py-6 lg:pb-8 lg:items-start">
          {/* Left column: saldos */}
          <div className="space-y-3">
            {resultado ? (
              <SaldosContent
                resultado={resultado}
                membros={membros}
                hoje={hoje}
                corrigirIpca={rateio!.corrigir_ipca}
                taxasCore={taxasCore}
                rateioId={id!}
                currentUserId={user?.id}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="material-symbols-outlined text-[48px] text-on-surface-variant" aria-hidden="true">
                  balance
                </span>
                <p className="text-body-md text-on-surface-variant">
                  {membros.length === 0 ? 'Nenhum participante.' : 'Adicione despesas para ver os saldos.'}
                </p>
              </div>
            )}
          </div>
          {/* Right column: extrato */}
          <div>
            <h2 className="text-headline-sm text-on-surface font-semibold mb-4">Extrato</h2>
            <ExtratoContent
              despesas={despesas ?? []}
              reembolsos={reembolsos ?? []}
              hoje={hoje}
              corrigirIpca={rateio?.corrigir_ipca ?? false}
              taxasCore={taxasCore}
              membros={membros}
              onDeleteDespesa={handleDeleteDespesa}
              onDeleteReembolso={handleDeleteReembolso}
            />
          </div>
        </div>
      )}

      {/* Speed dial — mobile only */}
      <div className="md:hidden">
        {fabOpen && (
          <div className="fixed inset-0 z-10" onClick={() => setFabOpen(false)} aria-hidden="true" />
        )}
        <div
          className="fixed bottom-20 right-4 z-20 flex flex-col-reverse items-end gap-3"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          <button
            onClick={() => setFabOpen(prev => !prev)}
            aria-label={fabOpen ? 'Fechar opções' : 'Adicionar'}
            className="flex items-center justify-center w-14 h-14 rounded-fab bg-primary text-on-primary shadow-tier3 hover:bg-primary-hover active:bg-primary-hover transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span className={`material-symbols-outlined text-2xl transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`}>
              add
            </span>
          </button>

          {fabOpen && (
            <>
              <div className="flex items-center gap-2 animate-fab-appear" style={{ animationDelay: '60ms' }}>
                <span className="bg-surface text-on-surface text-label-lg px-3 py-1.5 rounded shadow-tier1 whitespace-nowrap">
                  Nova despesa
                </span>
                <button
                  onClick={() => { navigate(`/rateios/${id}/nova-despesa`); setFabOpen(false) }}
                  aria-label="Nova despesa"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-container text-on-primary-container shadow-tier2 hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                </button>
              </div>
              <div className="flex items-center gap-2 animate-fab-appear">
                <span className="bg-surface text-on-surface text-label-lg px-3 py-1.5 rounded shadow-tier1 whitespace-nowrap">
                  Reembolso
                </span>
                <button
                  onClick={() => { navigate(`/rateios/${id}/novo-reembolso`); setFabOpen(false) }}
                  aria-label="Reembolso"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-container text-on-primary-container shadow-tier2 hover:opacity-90 transition-opacity"
                >
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  )
}
