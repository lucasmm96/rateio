import type { RastroCorrecao } from '../core/correcao'
import { CorrecaoIpcaTable } from './CorrecaoIpcaTable'

export function CorrecaoIpcaModal({
  rastro,
  titulo,
  onClose,
}: { rastro: RastroCorrecao; titulo: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      aria-label="Fechar"
    >
      <div
        className="relative w-full sm:max-w-md bg-surface rounded-t-2xl sm:rounded-2xl shadow-tier3 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="px-4 py-3 border-b border-outline" id="modal-title">
          <h2 className="text-lg font-medium text-on-surface">Correção IPCA</h2>
          <button
            aria-label="Fechar"
            className="absolute right-2 top-2 text-on-surface-variant hover:text-primary"
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="px-4 py-4 space-y-3">
          <p className="text-body-sm text-on-surface-variant">
            {titulo}
          </p>
          <CorrecaoIpcaTable rastro={rastro} />
        </div>
      </div>
    </div>
  )
}