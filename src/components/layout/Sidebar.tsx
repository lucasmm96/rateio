import { NavLink, useNavigate } from 'react-router-dom'
import { useUser, signOut } from '../../db/auth'

const NAV_ITEMS = [
  { to: '/', label: 'Rateios', icon: 'payments' },
  { to: '/configuracoes', label: 'Configurações', icon: 'settings' },
]

function initiais(name: string | null | undefined, email: string | null | undefined): string {
  const base = name?.trim() || email?.split('@')[0] || '?'
  return base.slice(0, 2).toUpperCase()
}

export function Sidebar() {
  const navigate = useNavigate()
  const { user } = useUser()
  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || ''

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:min-h-screen lg:bg-background lg:border-r lg:border-outline">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-outline shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
            <img src="/favicon.svg" alt="" aria-hidden="true" className="w-5 h-5" />
          </div>
          <span className="text-headline-sm text-primary font-bold">Rateio</span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-label-lg',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface',
                'transition duration-150 active:scale-[0.97]',
              ].join(' ')
            }
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-outline shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <NavLink
            to="/perfil"
            className="flex items-center gap-3 flex-1 min-w-0 rounded-lg hover:bg-surface transition duration-150 active:scale-[0.97]"
            title="Editar perfil"
          >
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-sm font-semibold shrink-0">
              {initiais(user?.name, user?.email)}
            </div>
            <span className="flex-1 text-body-sm text-on-surface truncate">{displayName}</span>
          </NavLink>
          <button
            onClick={async () => { try { await signOut() } catch (_) {}; navigate('/login', { replace: true }) }}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface transition duration-150 active:scale-[0.90]"
            title="Sair"
            aria-label="Sair"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
