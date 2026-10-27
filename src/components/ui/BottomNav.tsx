import { NavLink } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Rateios', icon: 'payments' },
  { to: '/configuracoes', label: 'Config.', icon: 'settings' },
  { to: '/perfil', label: 'Perfil', icon: 'account_circle' },
]

function BottomNav() {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-20 apple-material border-t border-outline"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-16">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              [
                'flex flex-1 flex-col items-center justify-center gap-0.5',
                'transition duration-150 active:scale-[0.90]',
                isActive ? 'text-primary' : 'text-on-surface-variant',
              ].join(' ')
            }
          >
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">
              {item.icon}
            </span>
            <span className="text-label-sm">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export { BottomNav }
