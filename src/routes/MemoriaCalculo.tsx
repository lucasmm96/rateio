import { useParams } from 'react-router-dom'
import { Header } from '../components/ui/Header'
import { Card } from '../components/ui/Card'
import { useAsync } from '../hooks/useAsync'
import { buscarRateio, listarDespesas, listarReembolsos, listarTaxasIpca } from '../db/queries'
import { D } from '../core/decimal'
import { calcularSaldo } from '../core/saldo'
import { paraReais } from '../core/unidades'
import type { TaxaIPCA } from '../core/indice'

function fmtReais(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function Linha({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 gap-2">
      <span className="text-body-sm text-on-surface-variant">{label}</span>
      <span className={['text-body-sm font-medium tabular-nums', destaque ? 'text-on-surface' : 'text-on-surface'].join(' ')}>
        {valor}
      </span>
    </div>
  )
}

export function Component() {
  const { id } = useParams<{ id: string }>()
  const hoje = new Date().toISOString().slice(0, 10)

  const { data: rateio, loading: lRateio } = useAsync(() => buscarRateio(id!), [id])
  const { data: despesas, loading: lDesp } = useAsync(() => listarDespesas(id!), [id])
  const { data: reembolsos, loading: lReem } = useAsync(() => listarReembolsos(id!), [id])
  const { data: taxas, loading: lTaxas } = useAsync(listarTaxasIpca)

  const loading = lRateio || lDesp || lReem || lTaxas
  const membros = rateio?.membros ?? []

  const taxasCore: TaxaIPCA[] = (taxas ?? []).map(t => ({
    mes: t.mes.slice(0, 10),
    taxa: Number(t.taxa),
  }))

  const rateioCore = rateio
    ? {
        participantes: membros.map(m => ({ userId: m.user_id, cota: D(m.cota) })),
        despesas: (despesas ?? []).map(d => ({
          data: d.data,
          valor: D(d.valor),
          pagadorUserId: d.pagador_user_id,
        })),
        reembolsos: (reembolsos ?? []).map(r => ({
          data: r.data,
          valor: D(r.valor),
          pagadorUserId: r.pagador_user_id,
          recebedorUserId: r.recebedor_user_id,
        })),
      }
    : null

  const corrigir = rateio?.corrigir_ipca ?? false
  const resultado = rateioCore && !loading ? calcularSaldo(rateioCore, corrigir, hoje, taxasCore) : null

  const emailDe = (userId: string) => {
    const m = membros.find(m => m.user_id === userId)
    return m?.users?.email?.split('@')[0] ?? userId.slice(0, 6)
  }

  return (
    <div className="min-h-dvh bg-background">
      <Header title="Memória de Cálculo" back />

      <main className="px-margin py-4 pb-8 space-y-4">
        {loading && (
          <div className="flex justify-center py-16">
            <span className="material-symbols-outlined text-primary text-[40px] animate-spin">
              progress_activity
            </span>
          </div>
        )}

        {!loading && resultado && (
          <>
            {/* Cabeçalho */}
            <Card variant="elevated">
              <p className="text-label-lg text-on-surface-variant mb-2">Rateio: {rateio?.nome}</p>
              <p className="text-body-sm text-on-surface-variant">
                Data de referência: {hoje.split('-').reverse().join('/')}
                {corrigir && (
                  <span className="ml-2 inline-flex items-center gap-1 text-primary">
                    <span className="material-symbols-outlined text-[14px]">trending_up</span>
                    IPCA ativo
                  </span>
                )}
              </p>
              <div className="mt-3 pt-3 border-t border-outline">
                <Linha
                  label="U_total (total em unidades corrigidas)"
                  valor={fmtReais(Number(paraReais(resultado.uTotal, hoje, corrigir, taxasCore).toFixed(2)))}
                  destaque
                />
              </div>
            </Card>

            {/* Por participante */}
            {membros.map(m => {
              const comp = resultado.compromisso.get(m.user_id) ?? D(0)
              const pago = resultado.pagoEfetivo.get(m.user_id) ?? D(0)
              const exc = resultado.excesso.get(m.user_id) ?? D(0)
              const def = resultado.deficit.get(m.user_id) ?? D(0)

              const compR = Number(paraReais(comp, hoje, corrigir, taxasCore).toFixed(2))
              const pagoR = Number(paraReais(pago, hoje, corrigir, taxasCore).toFixed(2))
              const excR = Number(paraReais(exc, hoje, corrigir, taxasCore).toFixed(2))
              const defR = Number(paraReais(def, hoje, corrigir, taxasCore).toFixed(2))
              const saldoR = pagoR - compR

              return (
                <Card key={m.user_id}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-sm font-semibold">
                      {emailDe(m.user_id).slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-body-md text-on-surface font-semibold capitalize">
                      {emailDe(m.user_id)}
                    </p>
                    <span className="ml-auto text-body-sm text-on-surface-variant">
                      {(Number(m.cota) * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="divide-y divide-outline">
                    <Linha label="Pago efetivo" valor={fmtReais(pagoR)} />
                    <Linha label="Compromisso (cota × U_total)" valor={fmtReais(compR)} />
                    {excR > 0.005 && (
                      <Linha label="Excesso (pagou a mais)" valor={fmtReais(excR)} />
                    )}
                    {defR > 0.005 && (
                      <Linha label="Déficit (pagou a menos)" valor={fmtReais(defR)} />
                    )}
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-body-sm font-semibold text-on-surface">Saldo líquido</span>
                      <span className={['text-body-sm font-bold tabular-nums', saldoR > 0.01 ? 'text-primary' : saldoR < -0.01 ? 'text-error' : 'text-on-surface-variant'].join(' ')}>
                        {saldoR > 0.01 ? '+' : ''}{fmtReais(saldoR)}
                      </span>
                    </div>
                  </div>
                </Card>
              )
            })}

            {/* Quem deve pra quem */}
            {resultado.deveDePara.length > 0 && (
              <Card>
                <p className="text-label-lg text-on-surface font-semibold mb-3">Transferências sugeridas</p>
                <div className="space-y-2">
                  {resultado.deveDePara.map((dp, i) => {
                    const valorR = Number(paraReais(dp.unidades, hoje, corrigir, taxasCore).toFixed(2))
                    return (
                      <div key={i} className="flex items-center gap-2 text-body-sm">
                        <span className="font-medium text-on-surface capitalize">{emailDe(dp.de)}</span>
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                          arrow_forward
                        </span>
                        <span className="font-medium text-on-surface capitalize">{emailDe(dp.para)}</span>
                        <span className="ml-auto font-bold text-error tabular-nums">{fmtReais(valorR)}</span>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* Nota metodológica */}
            {corrigir && (
              <Card className="bg-surface">
                <p className="text-body-sm text-on-surface-variant leading-relaxed">
                  <span className="font-semibold text-on-surface">Como funciona a correção IPCA:</span>{' '}
                  Cada despesa é convertida para "unidades" dividindo o valor pelo índice IPCA na data de pagamento.
                  O saldo final é convertido de volta a reais pelo índice de hoje, preservando o poder de compra.
                </p>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  )
}
