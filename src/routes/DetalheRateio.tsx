import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { Header } from '../components/ui/Header'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useAsync } from '../hooks/useAsync'
import { buscarRateio, listarDespesas, listarReembolsos, listarTaxasIpca } from '../db/queries'
import { D } from '../core/decimal'
import { calcularSaldo, saldoEmReais } from '../core/saldo'
import { paraReais } from '../core/unidades'
import type { TaxaIPCA } from '../core/indice'
import { useUser } from '../db/auth'

function fmtData(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function fmtReais(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type Tab = 'saldos' | 'extrato'

export function Component() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useUser()
  const [tab, setTab] = useState<Tab>('saldos')
  const [fabOpen, setFabOpen] = useState(false)

  const { data: rateio, loading: lRateio } = useAsync(() => buscarRateio(id!), [id])
  const { data: despesas, loading: lDesp } = useAsync(() => listarDespesas(id!), [id])
  const { data: reembolsos, loading: lReem } = useAsync(() => listarReembolsos(id!), [id])
  const { data: taxas, loading: lTaxas } = useAsync(listarTaxasIpca)

  const loading = lRateio || lDesp || lReem || lTaxas
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

  const emailDe = (userId: string) => {
    const m = membros.find(m => m.user_id === userId)
    return m?.users?.email?.split('@')[0] ?? userId.slice(0, 6)
  }

  // Saldos content — shared between tab view and desktop column
  const SaldosContent = () => (
    <div className="space-y-3">
      {membros.map(m => {
        const saldo = saldoEmReais(resultado!, m.user_id, hoje, rateio!.corrigir_ipca, taxasCore)
        const saldoN = Number(saldo.toFixed(2))
        const isAReceber = saldoN < -0.01
        const isDeve = saldoN > 0.01
        const deveParaOutros = resultado!.deveDePara.filter(
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
                  </p>
                  <p className="text-body-sm text-on-surface-variant">
                    {(Number(m.cota) * 100).toFixed(0)}% das despesas
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className={[
                    'text-body-lg font-bold',
                    isAReceber
                      ? 'text-primary'
                      : isDeve
                        ? 'text-error'
                        : 'text-on-surface-variant',
                  ].join(' ')}
                >
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
                  const valorReais = paraReais(
                    dp.unidades,
                    hoje,
                    rateio!.corrigir_ipca,
                    taxasCore,
                  )
                  return (
                    <div
                      key={dp.para}
                      className="flex justify-between text-body-sm text-on-surface-variant"
                    >
                      <span>→ {emailDe(dp.para)}</span>
                      <span className="text-error font-medium">
                        {fmtReais(Number(valorReais.toFixed(2)))}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {m.user_id === user?.id && isDeve && (
              <button
                onClick={() => navigate(`/rateios/${id}/novo-reembolso`)}
                className="mt-3 w-full py-2 rounded-lg text-label-lg text-on-primary-container bg-primary-container hover:opacity-90 transition-opacity"
              >
                Registrar reembolso
              </button>
            )}
          </Card>
        )
      })}

      {membros.length > 0 && (
        <Link
          to={`/rateios/${id}/memoria`}
          className="flex items-center justify-center gap-2 py-3 text-label-lg text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">calculate</span>
          Ver memória de cálculo
        </Link>
      )}
    </div>
  )

  // Extrato content — shared between tab view and desktop column
  const ExtratoContent = () => (
    <div className="space-y-2">
      {(despesas ?? []).length === 0 && (reembolsos ?? []).length === 0 && (
        <p className="text-body-md text-on-surface-variant text-center py-8">
          Nenhuma movimentação ainda.
        </p>
      )}

      {[
        ...(despesas ?? []).map(d => ({ tipo: 'despesa' as const, data: d.data, item: d })),
        ...(reembolsos ?? []).map(r => ({ tipo: 'reembolso' as const, data: r.data, item: r })),
      ]
        .sort((a, b) => b.data.localeCompare(a.data))
        .map(entry => {
          if (entry.tipo === 'despesa') {
            const d = entry.item
            const isPrevista = d.data > hoje
            return (
              <Card key={`d-${d.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[20px] text-on-surface-variant mt-0.5" aria-hidden="true">
                      receipt_long
                    </span>
                    <div>
                      <p className="text-body-md text-on-surface font-medium">{d.descricao}</p>
                      <p className="text-body-sm text-on-surface-variant">
                        {fmtData(d.data)} · pago por {emailDe(d.pagador_user_id)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-body-md font-semibold text-on-surface">
                      {fmtReais(Number(d.valor))}
                    </p>
                    {isPrevista && <Badge variant="prevista">prevista</Badge>}
                  </div>
                </div>
              </Card>
            )
          } else {
            const r = entry.item
            return (
              <Card key={`r-${r.id}`} className="bg-primary-container/10">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[20px] text-primary mt-0.5" aria-hidden="true">
                      payments
                    </span>
                    <div>
                      <p className="text-body-md text-on-surface font-medium">Reembolso</p>
                      <p className="text-body-sm text-on-surface-variant">
                        {fmtData(r.data)} · {emailDe(r.pagador_user_id)} → {emailDe(r.recebedor_user_id)}
                      </p>
                      {r.observacao && (
                        <p className="text-body-sm text-on-surface-variant italic">
                          {r.observacao}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-body-md font-semibold text-primary shrink-0">
                    {fmtReais(Number(r.valor))}
                  </p>
                </div>
              </Card>
            )
          }
        })}
    </div>
  )

  return (
    <AppShell>
      <Header
        title={rateio?.nome ?? 'Rateio'}
        back
        actions={
          <>
            {/* Action buttons — tablet/desktop only */}
            <button
              onClick={() => navigate(`/rateios/${id}/nova-despesa`)}
              className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-on-primary text-label-lg font-medium hover:bg-primary-hover transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
              Nova despesa
            </button>
            <button
              onClick={() => navigate(`/rateios/${id}/novo-reembolso`)}
              className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-lg border border-outline text-on-surface text-label-lg font-medium hover:bg-surface transition-colors"
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

      {/* Mobile/tablet: tab layout */}
      {!loading && (
        <div className="lg:hidden">
          <div className="flex border-b border-outline sticky top-14 bg-background z-10">
            {(['saldos', 'extrato'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  'flex-1 py-3 text-label-lg font-medium transition-colors',
                  tab === t
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-on-surface-variant',
                ].join(' ')}
              >
                {t === 'saldos' ? 'Saldos' : 'Extrato'}
              </button>
            ))}
          </div>

          {tab === 'saldos' && resultado && (
            <div className="px-4 py-4 pb-32 space-y-3">
              <SaldosContent />
            </div>
          )}
          {tab === 'extrato' && (
            <div className="px-4 py-4 pb-32 space-y-2">
              <ExtratoContent />
            </div>
          )}
        </div>
      )}

      {/* Desktop: 2-column layout */}
      {!loading && resultado && (
        <div className="hidden lg:grid lg:grid-cols-[384px_1fr] lg:gap-6 lg:px-8 lg:py-6 lg:pb-8 lg:items-start">
          {/* Left column: saldos + actions */}
          <div className="space-y-3">
            <SaldosContent />
          </div>
          {/* Right column: extrato */}
          <div>
            <h2 className="text-headline-sm text-on-surface font-semibold mb-4">Extrato</h2>
            <ExtratoContent />
          </div>
        </div>
      )}

      {/* Desktop: extrato even when no resultado yet */}
      {!loading && !resultado && (
        <div className="hidden lg:block lg:px-8 lg:py-6">
          <ExtratoContent />
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
          {/* Main FAB */}
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
              <div className="flex items-center gap-2">
                <span className="bg-surface text-on-surface text-label-lg px-3 py-1.5 rounded-lg shadow-tier1 whitespace-nowrap">
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
              <div className="flex items-center gap-2">
                <span className="bg-surface text-on-surface text-label-lg px-3 py-1.5 rounded-lg shadow-tier1 whitespace-nowrap">
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
