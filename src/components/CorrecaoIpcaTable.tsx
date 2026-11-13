import type { RastroCorrecao } from '../core/correcao'

function fmtReais(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtPct(p: number) {
  return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`
}

export function CorrecaoIpcaTable({ rastro }: { rastro: RastroCorrecao }) {
  const c = (n: number) => Number(n.toFixed(2))

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-3 gap-y-1 text-label-sm text-on-surface-variant border-b border-outline pb-1">
        <span>Período</span>
        <span className="text-right">Ajuste (%)</span>
        <span className="text-right">Ajuste (R$)</span>
        <span className="text-right">Valor acumulado (R$)</span>
      </div>
      {rastro.etapas.map((e, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-x-3 gap-y-1 text-body-sm tabular-nums text-on-surface border-b border-outline pb-1">
          <span className="text-left">{e.rotulo}</span>
          <span className="text-right">{fmtPct(e.ajustePct.toNumber())}</span>
          <span className="text-right">{fmtReais(c(e.ajusteReais.toNumber()))}</span>
          <span className="text-right">{fmtReais(c(e.valorAcumulado.toNumber()))}</span>
        </div>
      ))}
      <div className="pt-2 border-t border-outline flex justify-between items-center text-label-sm font-medium text-on-surface">
        <span>
          Valor original <span className="font-bold">{fmtReais(c(rastro.valorOriginal.toNumber()))}</span>
          →
          corrigido <span className="font-bold">{fmtReais(c(rastro.valorCorrigido.toNumber()))}</span>
          <span className={`text-${rastro.totalAjustePct.toNumber() >= 0 ? 'success' : 'error'}`}>
            ({fmtPct(rastro.totalAjustePct.toNumber())})
          </span>
        </span>
      </div>
      {rastro.etapas.length > 0 &&
        rastro.etapas[rastro.etapas.length - 1].ajustePct.toNumber() === 0 && (
          <p className="text-body-sm text-on-surface-variant italic mt-1">
            Índice estável no último mês publicado até a divulgação da próxima taxa.
          </p>
        )}
    </div>
  )
}