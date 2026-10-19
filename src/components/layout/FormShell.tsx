import { type ReactNode, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface FormShellProps {
  children: ReactNode
}

export function FormShell({ children }: FormShellProps) {
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(-1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])

  return (
    <>
      {/* Backdrop — md+ only, click closes */}
      <div
        className="hidden md:block md:fixed md:inset-0 md:z-40 md:bg-black/40 md:backdrop-blur-sm"
        onClick={() => navigate(-1)}
        aria-hidden="true"
      />

      {/* Outer — full-page on mobile, centered overlay on md+ */}
      <div className="min-h-dvh md:min-h-0 md:fixed md:inset-0 md:z-50 md:flex md:items-center md:justify-center md:p-4">
        {/* Card — no chrome on mobile, rounded card on md+ */}
        <div className="relative w-full md:max-w-2xl md:max-h-[90vh] md:overflow-y-auto md:rounded-xl md:shadow-tier3 md:bg-background">
          {children}
        </div>
      </div>
    </>
  )
}
