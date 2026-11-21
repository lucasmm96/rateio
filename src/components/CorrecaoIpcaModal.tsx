import type { RastroCorrecao } from '../core/correcao'
import { CorrecaoIpcaTable } from './CorrecaoIpcaTable'

/**
 * Estado da despesa no modal (ver core/quitacao.ts):
 *  - saldada: o rastro congelou na data de quitação — os reajustes encerram.
 *  - em-aberto: mostra o resíduo de fato pendente (não a despesa corrigida).
 */
export type EstadoQuitacaoDespesa =
  | { tipo: 'saldada'; saldadaEm: string }
  | { tipo: 'em-aberto'; residuoReaisHoje: number; valorCorrigidoReaisHoje: number }

function fmtReais(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function CorrecaoIpcaModal({
  rastro,
  titulo,
  onClose,
  estado,
}: {
  rastro: RastroCorrecao
  titulo: string
  onClose: () => void
  estado?: EstadoQuitacaoDespesa
}) {
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
          <h2 className="text-lg font-medium text-on-surface">
            {estado?.tipo === 'em-aberto' ? 'Despesa em aberto' : 'Correção IPCA'}
          </h2>
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

          {estado?.tipo === 'saldada' && (
            <>
              <CorrecaoIpcaTable rastro={rastro} />
              <p className="flex items-center gap-1.5 text-label-md font-medium text-success">
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">check_circle</span>
                Quitada em {fmtData(estado.saldadaEm)} — os reajustes encerram aqui.
              </p>
            </>
          )}

          {estado?.tipo === 'em-aberto' && (
            <div className="space-y-1">
              <p className="text-label-md text-on-surface-variant">Em aberto hoje</p>
              <p className="text-currency-md font-bold text-error">
                {fmtReais(estado.residuoReaisHoje)}
              </p>
              <p className="text-body-sm text-on-surface-variant">
                de {fmtReais(estado.valorCorrigidoReaisHoje)} corrigidos da despesa
              </p>
              <p className="text-body-sm text-on-surface-variant flex items-center gap-1 pt-2">
                <span aria-hidden="true">▲</span> O resíduo segue corrigindo até a despesa ser quitada.
              </p>
            </div>
          )}

          {!estado && <CorrecaoIpcaTable rastro={rastro} />}
        </div>
      </div>
    </div>
  )
}