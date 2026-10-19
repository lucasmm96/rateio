import { useNavigate } from 'react-router-dom'

interface HeaderProps {
  title: string
  back?: boolean
  actions?: React.ReactNode
}

function Header({ title, back = false, actions }: HeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-10 bg-background border-b border-outline">
      <div className="flex items-center h-14 px-margin gap-3">
        {back && (
          <button
            onClick={() => navigate(-1)}
            aria-label="Voltar"
            className="flex items-center justify-center h-10 w-10 -ml-2 rounded-full
                       text-on-surface hover:bg-surface transition-colors"
          >
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">
              arrow_back
            </span>
          </button>
        )}
        <h1 className="flex-1 text-headline-sm text-on-surface truncate">{title}</h1>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </div>
    </header>
  )
}

export { Header }
