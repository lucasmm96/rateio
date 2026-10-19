import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Header } from '../components/ui/Header'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { FAB } from '../components/ui/FAB'
import { BottomNav } from '../components/ui/BottomNav'
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

  const resultado = rateioCore
    ? calcularSaldo(rateioCore, rateio!.corrigir_ipca, hoje, taxasCore)
    : null

  const emailDe = (userId: string) => {
    const m = membros.find(m => m.user_id === userId)
    return m?.users?.email?.split('@')[0] ?? userId.slice(0, 6)
  }

  return (
    <div className="min-h-dvh bg-background">
      <Header
        title={rateio?.nome ?? 'Rateio'}
        back
        actions={
          <Link
            to={`/configuracoes?rateio=${id}`}
            className="p-2 rounded-full text-on-surface-variant hover:bg-surface transition-colors"
            aria-label="Configurações do rateio"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </Link>
        }
      />

      <main className="pb-32">
        {/* Tabs */}
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

        {loading && (
          <div className="flex justify-center py-16">
            <span className="material-symbols-outlined text-primary text-[40px] animate-spin">
              progress_activity
            </span>
          </div>
        )}

        {/* Tab Saldos */}
        {!loading && tab === 'saldos' && resultado && (
          <div className="px-margin py-4 space-y-3">
            {membros.map(m => {
              const saldo = saldoEmReais(resultado, m.user_id, hoje, rateio!.corrigir_ipca, taxasCore)
              const saldoN = Number(saldo.toFixed(2))
              // Convention in saldo.ts: negative = creditor (a receber), positive = debtor (deve)
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
                <span className="material-symbols-outlined text-[18px]">calculate</span>
                Ver memória de cálculo
              </Link>
            )}
          </div>
        )}

        {/* Tab Extrato */}
        {!loading && tab === 'extrato' && (
          <div className="px-margin py-4 space-y-2">
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
                          <span className="material-symbols-outlined text-[20px] text-on-surface-variant mt-0.5">
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
                          <span className="material-symbols-outlined text-[20px] text-primary mt-0.5">
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
        )}
      </main>

      <BottomNav />
      <FAB icon="add" label="Nova despesa" onClick={() => navigate(`/rateios/${id}/nova-despesa`)} />
    </div>
  )
}
