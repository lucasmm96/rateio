import type { RastroCorrecao } from '../core/correcao'
import { CorrecaoIpcaTable } from './CorrecaoIpcaTable'

export function CorrecaoIpcaModal({
  rastro,
  titulo,
  onClose,
}: { rastro: RastroCorrecao; titulo: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full sm:max-w-lg bg-surface rounded-t-2xl sm:rounded-2xl shadow-tier3 overflow-hidden max-h-[85dvh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-outline shrink-0"
          id="modal-title"
        >
          <h2 className="text-lg font-medium text-on-surface">Correção IPCA</h2>
          <button
            aria-label="Fechar"
            className="p-1 rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
          </button>
        </div>
        <div className="px-4 py-4 space-y-3 overflow-y-auto min-h-0 overscroll-contain">
          <p className="text-body-sm text-on-surface-variant">
            {titulo}
          </p>
          <CorrecaoIpcaTable rastro={rastro} />
        </div>
      </div>
    </div>
  )
}