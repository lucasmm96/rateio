import { Link, useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/ui/BottomNav'
import { FAB } from '../components/ui/FAB'
import { Header } from '../components/ui/Header'
import { Card } from '../components/ui/Card'
import { useAsync } from '../hooks/useAsync'
import { listarRateios, type RateioListItem } from '../db/queries'
import { useUser, signOut } from '../db/auth'

function initiais(email: string): string {
  return email.split('@')[0].slice(0, 2).toUpperCase()
}

function RateioCard({ rateio }: { rateio: RateioListItem }) {
  const membros = rateio.membros ?? []
  return (
    <Link to={`/rateios/${rateio.id}`}>
      <Card className="hover:bg-surface-container transition-colors cursor-pointer">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-headline-sm text-on-surface truncate">{rateio.nome}</h2>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {membros.length} participante{membros.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {rateio.corrigir_ipca && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-label-sm font-semibold h-6 bg-primary-container text-on-primary-container">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                IPCA
              </span>
            )}
            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
              chevron_right
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {membros.slice(0, 4).map(m => (
              <div
                key={m.user_id}
                className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-sm ring-2 ring-surface"
                title={m.users?.email ?? m.user_id}
              >
                {initiais(m.users?.email ?? m.user_id)}
              </div>
            ))}
            {membros.length > 4 && (
              <div className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center text-label-sm ring-2 ring-surface">
                +{membros.length - 4}
              </div>
            )}
          </div>
          <p className="text-body-sm text-on-surface-variant truncate">
            {membros.map(m => m.users?.email?.split('@')[0] ?? '?').join(', ')}
          </p>
        </div>
      </Card>
    </Link>
  )
}

export function Component() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { data: rateios, loading, error } = useAsync(listarRateios)

  return (
    <div className="min-h-dvh bg-background">
      <Header
        title="Rateios"
        actions={
          <button
            onClick={() => signOut().then(() => navigate('/login', { replace: true }))}
            className="p-2 rounded-full text-on-surface-variant hover:bg-surface transition-colors"
            aria-label="Sair"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        }
      />

      <main className="px-margin py-4 pb-32 space-y-3">
        {user && (
          <p className="text-body-sm text-on-surface-variant">
            Olá,{' '}
            <span className="font-medium text-on-surface">{user.email?.split('@')[0]}</span>
          </p>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <span className="material-symbols-outlined text-primary text-[40px] animate-spin">
              progress_activity
            </span>
          </div>
        )}

        {error && (
          <Card className="border-error bg-error-container">
            <p className="text-body-sm text-on-error-container">Erro: {error}</p>
          </Card>
        )}

        {!loading && !error && rateios?.length === 0 && (
          <div className="flex flex-col items-center text-center py-16 space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px] text-on-primary-container">
                payments
              </span>
            </div>
            <p className="text-headline-sm text-on-surface">Nenhum rateio ainda</p>
            <p className="text-body-md text-on-surface-variant max-w-xs">
              Crie um rateio para começar a dividir despesas.
            </p>
          </div>
        )}

        {rateios?.map(r => <RateioCard key={r.id} rateio={r} />)}
      </main>

      <BottomNav />
      <FAB icon="add" label="Novo rateio" onClick={() => navigate('/novo-rateio')} />
    </div>
  )
}
