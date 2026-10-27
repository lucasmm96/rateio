import { useState } from 'react'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { editarReembolso } from '../db/queries'
import type { ReembolsoItem } from '../db/queries'
import type { RateioDetalhe } from '../db/queries'
import { D } from '../core/decimal'

interface EditarReembolsoModalProps {
  reembolso: ReembolsoItem
  membros: RateioDetalhe['membros']
  onSave: () => void
  onClose: () => void
}

export function EditarReembolsoModal({ reembolso, membros, onSave, onClose }: EditarReembolsoModalProps) {
  const [data, setData] = useState(reembolso.data.slice(0, 10))
  const [pagadorUserId, setPagadorUserId] = useState(reembolso.pagador_user_id)
  const [recebedorUserId, setRecebedorUserId] = useState(reembolso.recebedor_user_id)
  const [valor, setValor] = useState(String(reembolso.valor))
  const [observacao, setObservacao] = useState(reembolso.observacao ?? '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pagadorUserId === recebedorUserId) {
      setErro('Pagador e recebedor não podem ser o mesmo.')
      return
    }
    const valorDecimal = D(valor.replace(',', '.'))
    if (valorDecimal.lte(0)) {
      setErro('Valor deve ser maior que zero.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await editarReembolso({
        id: reembolso.id,
        data,
        pagadorUserId,
        recebedorUserId,
        valor: valorDecimal.toNumber(),
        observacao: observacao.trim() || null,
      })
      onSave()
    } catch (e: unknown) {
      setErro((e as Error).message)
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-md bg-surface rounded-t-2xl sm:rounded-2xl shadow-tier3 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline">
          <h2 className="text-title-sm text-on-surface font-semibold">Editar reembolso</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-on-surface-variant hover:bg-surface-variant transition-colors"
            aria-label="Fechar"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
          <Input
            label="Valor"
            type="number"
            inputMode="decimal"
            placeholder="0,00"
            prefix="R$"
            min="0.01"
            step="0.01"
            value={valor}
            onChange={e => setValor(e.target.value)}
            required
          />

          <Input
            label="Data"
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            required
          />

          <MemberSelect
            label="Pagador"
            membros={membros}
            value={pagadorUserId}
            onChange={setPagadorUserId}
          />

          <MemberSelect
            label="Recebedor"
            membros={membros}
            value={recebedorUserId}
            onChange={setRecebedorUserId}
          />

          <Input
            label="Observação (opcional)"
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            placeholder="Opcional"
          />

          {erro && <p className="text-body-sm text-error">{erro}</p>}

          <div className="flex gap-3 pb-2">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 !bg-transparent !text-on-surface border border-outline hover:!bg-surface-variant"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={salvando}
              disabled={salvando || !valor || !pagadorUserId || !recebedorUserId}
              className="flex-1"
            >
              Salvar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface MemberSelectProps {
  label: string
  membros: RateioDetalhe['membros']
  value: string
  onChange: (id: string) => void
}

function MemberSelect({ label, membros, value, onChange }: MemberSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-label-lg text-on-surface">{label}</p>
      <div className="space-y-2">
        {membros.map(m => (
          <button
            key={m.user_id}
            type="button"
            onClick={() => onChange(m.user_id)}
            className={[
              'w-full flex items-center gap-3 p-3 rounded-lg border transition duration-150',
              value === m.user_id
                ? 'border-primary bg-primary-container/20'
                : 'border-outline hover:bg-surface-variant',
            ].join(' ')}
          >
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-sm font-semibold">
              {(m.users?.email ?? m.user_id).slice(0, 2).toUpperCase()}
            </div>
            <span className="text-body-md text-on-surface">
              {m.users?.email?.split('@')[0] ?? m.user_id.slice(0, 8)}
            </span>
            {value === m.user_id && (
              <span className="material-symbols-outlined text-primary ml-auto text-[20px]" aria-hidden="true">
                check_circle
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
