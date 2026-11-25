import { useEffect, type ReactNode } from 'react'

interface ModalSheetProps {
  closing: boolean
  onRequestClose: () => void
  labelledBy?: string
  maxWidthClassName?: string
  children: ReactNode
}

/**
 * Backdrop + sheet (bottom sheet no mobile, modal centralizado em sm+) com
 * entrada/saída animadas nos dois sentidos (apple-design §7: mesmo caminho na
 * entrada e na saída). `closing` vem de `useDismiss` no componente pai.
 */
function ModalSheet({
  closing,
  onRequestClose,
  labelledBy,
  maxWidthClassName = 'sm:max-w-lg',
  children,
}: ModalSheetProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onRequestClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onRequestClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className={[
          'absolute inset-0 modal-scrim backdrop-blur-sm transition-opacity duration-200',
          closing ? 'opacity-0' : 'opacity-100',
        ].join(' ')}
        onClick={onRequestClose}
        aria-hidden="true"
      />
      <div
        className={[
          'relative w-full bg-surface rounded-t-2xl sm:rounded-2xl shadow-tier3 overflow-hidden max-h-[85dvh] flex flex-col',
          maxWidthClassName,
          closing ? 'animate-fade-out-down' : 'animate-fade-in-up',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
    </div>
  )
}

export { ModalSheet }
