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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[19rem] border-collapse text-body-sm tabular-nums">
          <thead>
            <tr className="text-label-sm text-on-surface-variant border-b border-outline">
              <th scope="col" className="pb-1 pr-3 text-left font-normal">Período</th>
              <th scope="col" className="pb-1 pl-3 text-right font-normal">Ajuste (%)</th>
              <th scope="col" className="pb-1 pl-3 text-right font-normal">Ajuste (R$)</th>
              <th scope="col" className="pb-1 pl-3 text-right font-normal">Valor acumulado (R$)</th>
            </tr>
          </thead>
          <tbody className="text-on-surface">
            {rastro.etapas.map((e, i) => (
              <tr key={i} className="border-b border-outline">
                <td className="py-1 pr-3 text-left">{e.rotulo}</td>
                <td className="py-1 pl-3 text-right">{fmtPct(e.ajustePct.toNumber())}</td>
                <td className="py-1 pl-3 text-right">{fmtReais(c(e.ajusteReais.toNumber()))}</td>
                <td className="py-1 pl-3 text-right">{fmtReais(c(e.valorAcumulado.toNumber()))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pt-2 border-t border-outline flex flex-wrap justify-between items-center gap-y-1 text-label-sm font-medium text-on-surface">
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