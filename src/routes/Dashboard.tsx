import { Link } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { Header } from '../components/ui/Header'
import { Card } from '../components/ui/Card'
import { useAsync } from '../hooks/useAsync'
import { useUser } from '../db/auth'
import {
  listarRateios,
  listarDespesas,
  listarReembolsos,
  listarTaxasIpca,
} from '../db/queries'
import { D } from '../core/decimal'
import { type TaxaIPCA } from '../core/indice'
import { calcularMetricas, type RateioParaMetricas } from '../core/dashboard'
import type { Decimal } from '../core/decimal'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function formatBRL(value: Decimal): string {
  return brl.format(value.toNumber())
}

function MetricaCard({
  label,
  value,
  icon,
  colorClass,
}: {
  label: string
  value: Decimal | null
  icon: string
  colorClass: string
}) {
  return (
    <Card className="bg-surface-container border-outline-variant">
      <div className="flex items-center gap-3 mb-3">
        <span className={`material-symbols-outlined text-[24px] ${colorClass}`} aria-hidden="true">
          {icon}
        </span>
        <span className="text-body-sm text-on-surface-variant">{label}</span>
      </div>
      {value === null ? (
        <div className="h-8 w-28 rounded bg-surface-variant animate-pulse" />
      ) : (
        <p className={`text-headline-md font-semibold ${colorClass}`}>
          {formatBRL(value)}
        </p>
      )}
    </Card>
  )
}

function AcertarCard({ value }: { value: Decimal | null }) {
  const colorClass =
    value === null
      ? 'text-on-surface'
      : value.greaterThan(D('0.01'))
        ? 'text-error'
        : value.lessThan(D('-0.01'))
          ? 'text-primary'
          : 'text-on-surface'

  const label =
    value === null
      ? 'Total a acertar'
      : value.greaterThan(D('0.01'))
        ? 'Total a acertar (você deve)'
        : value.lessThan(D('-0.01'))
          ? 'Total a acertar (a receber)'
          : 'Total a acertar'

  return (
    <Card className="bg-surface-container border-outline-variant">
      <div className="flex items-center gap-3 mb-3">
        <span className={`material-symbols-outlined text-[24px] ${colorClass}`} aria-hidden="true">
          account_balance_wallet
        </span>
        <span className="text-body-sm text-on-surface-variant">{label}</span>
      </div>
      {value === null ? (
        <div className="h-8 w-28 rounded bg-surface-variant animate-pulse" />
      ) : (
        <p className={`text-headline-md font-semibold ${colorClass}`}>
          {formatBRL(value.abs())}
        </p>
      )}
    </Card>
  )
}

export function Component() {
  const { user, isPending: authPending } = useUser()
  const hoje = new Date().toISOString().slice(0, 10)

  const { data, loading, error, reload } = useAsync(async () => {
    if (authPending) return null

    const [rateios, taxasRaw] = await Promise.all([
      listarRateios(),
      listarTaxasIpca(),
    ])

    const taxas: TaxaIPCA[] = taxasRaw.map(t => ({
      mes: t.mes.slice(0, 10),
      taxa: Number(t.taxa),
    }))

    const rateiosComDados = await Promise.all(
      rateios.map(async (r) => {
        const [despesas, reembolsos] = await Promise.all([
          listarDespesas(r.id),
          listarReembolsos(r.id),
        ])
        const item: RateioParaMetricas = {
          corrigirIpca: r.corrigir_ipca,
          rateio: {
            participantes: r.membros.map(m => ({ userId: m.user_id, cota: D(m.cota) })),
            despesas: despesas.map(d => ({
              data: d.data,
              valor: D(d.valor),
              pagadorUserId: d.pagador_user_id,
            })),
            reembolsos: reembolsos.map(rem => ({
              data: rem.data,
              valor: D(rem.valor),
              pagadorUserId: rem.pagador_user_id,
              recebedorUserId: rem.recebedor_user_id,
            })),
          },
        }
        return item
      }),
    )

    return { rateiosComDados, taxas, semRateios: rateios.length === 0 }
  }, [authPending])

  const metricas =
    data && user
      ? calcularMetricas(data.rateiosComDados, user.id, hoje, data.taxas)
      : null

  return (
    <AppShell>
      <Header title="Dashboard" />

      <main className="px-4 md:px-6 lg:px-8 py-4 pb-32 md:pb-8">
        {error && (
          <Card className="border-error bg-error-container mb-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-body-sm text-on-error-container">{error}</p>
              <button
                onClick={reload}
                className="shrink-0 text-label-sm text-on-error-container underline"
              >
                Tentar novamente
              </button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricaCard
            label="Total pago"
            value={loading || error ? null : (metricas?.totalPago ?? D(0))}
            icon="payments"
            colorClass="text-on-surface"
          />
          <MetricaCard
            label="Total previsto"
            value={loading || error ? null : (metricas?.totalPrevisto ?? D(0))}
            icon="schedule"
            colorClass="text-on-surface-variant"
          />
          <AcertarCard
            value={loading || error ? null : (metricas?.totalAcertar ?? D(0))}
          />
        </div>

        {!loading && !error && data?.semRateios && (
          <div className="flex flex-col items-center text-center py-12 space-y-3 mt-8">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant" aria-hidden="true">
              bar_chart
            </span>
            <p className="text-headline-sm text-on-surface">Nenhum rateio ainda</p>
            <p className="text-body-md text-on-surface-variant max-w-xs">
              Crie seu primeiro rateio para ver métricas.
            </p>
            <Link
              to="/novo-rateio"
              className="mt-2 h-10 px-6 rounded bg-primary text-on-primary text-label-lg font-medium flex items-center"
            >
              Criar rateio
            </Link>
          </div>
        )}
      </main>
    </AppShell>
  )
}
