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

export function TopNav() {
  const navigate = useNavigate()
  const { user } = useUser()

  return (
    <header className="hidden md:flex lg:hidden items-center h-14 px-4 gap-4 apple-material border-b border-outline shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center">
          <img src="/favicon.svg" alt="" aria-hidden="true" className="w-[18px] h-[18px]" />
        </div>
        <span className="text-headline-sm text-primary font-bold">Rateio</span>
      </div>

      {/* Nav items */}
      <nav className="flex items-center gap-1 flex-1">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-2 px-3 py-2 rounded-lg text-label-lg transition-colors',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-on-surface-variant hover:bg-surface',
                'transition duration-150 active:scale-[0.95]',
              ].join(' ')
            }
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Avatar (link para perfil) + logout */}
      <div className="flex items-center gap-1 shrink-0">
        <NavLink
          to="/perfil"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-container text-on-primary-container text-label-sm font-semibold hover:opacity-80 transition duration-150 active:scale-[0.90]"
          title="Editar perfil"
          aria-label="Perfil"
        >
          {initiais(user?.name, user?.email)}
        </NavLink>
        <button
          onClick={async () => { try { await signOut() } catch (_) {}; navigate('/login', { replace: true }) }}
          className="p-2 rounded-lg text-on-surface-variant hover:bg-surface transition duration-150 active:scale-[0.90]"
          title="Sair"
          aria-label="Sair"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>
        </button>
      </div>
    </header>
  )
}
