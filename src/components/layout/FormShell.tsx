import { type ReactNode, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDismiss } from '../../hooks/useDismiss'

interface FormShellProps {
  children: ReactNode
}

export function FormShell({ children }: FormShellProps) {
  const navigate = useNavigate()
  // Exit animado só é visível em md+ (sheet/dialog real); no mobile isto é
  // navegação de rota normal, sem overlay — o atraso não afeta o botão "voltar".
  const { closing, requestClose } = useDismiss(() => navigate(-1))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [requestClose])

  return (
    <>
      {/* Backdrop — md+ only, click closes */}
      <div
        className={[
          'hidden md:block md:fixed md:inset-0 md:z-40 md:modal-scrim md:backdrop-blur-sm md:transition-opacity md:duration-200',
          closing ? 'md:opacity-0' : 'md:opacity-100',
        ].join(' ')}
        onClick={requestClose}
        aria-hidden="true"
      />

      {/* Outer — full-page on mobile, centered overlay on md+ */}
      <div className="min-h-dvh md:min-h-0 md:fixed md:inset-0 md:z-50 md:flex md:items-center md:justify-center md:p-4">
        {/* Card — no chrome on mobile, rounded card on md+ */}
        <div
          className={[
            'relative w-full md:max-w-2xl md:max-h-[90vh] md:overflow-y-auto md:rounded-xl md:shadow-tier3 md:bg-background',
            closing ? 'md:animate-fade-out-down' : 'md:animate-fade-in-up',
          ].join(' ')}
        >
          {children}
        </div>
      </div>
    </>
  )
}
