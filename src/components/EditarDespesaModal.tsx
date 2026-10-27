import { useState } from 'react'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { editarDespesa } from '../db/queries'
import type { DespesaItem } from '../db/queries'
import type { RateioDetalhe } from '../db/queries'
import { D } from '../core/decimal'

interface EditarDespesaModalProps {
  despesa: DespesaItem
  membros: RateioDetalhe['membros']
  onSave: () => void
  onClose: () => void
}

export function EditarDespesaModal({ despesa, membros, onSave, onClose }: EditarDespesaModalProps) {
  const [data, setData] = useState(despesa.data.slice(0, 10))
  const [descricao, setDescricao] = useState(despesa.descricao)
  const [pagadorUserId, setPagadorUserId] = useState(despesa.pagador_user_id)
  const [valor, setValor] = useState(String(despesa.valor))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valorDecimal = D(valor.replace(',', '.'))
    if (valorDecimal.lte(0)) {
      setErro('Valor deve ser maior que zero.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await editarDespesa({
        id: despesa.id,
        data,
        descricao: descricao.trim(),
        pagadorUserId,
        valor: valorDecimal.toNumber(),
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
          <h2 className="text-title-sm text-on-surface font-semibold">Editar despesa</h2>
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
            label="Descrição"
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            required
          />

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

          <div className="flex flex-col gap-1.5">
            <p className="text-label-lg text-on-surface">Quem pagou?</p>
            <div className="space-y-2">
              {membros.map(m => (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => setPagadorUserId(m.user_id)}
                  className={[
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition duration-150',
                    pagadorUserId === m.user_id
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
                  {pagadorUserId === m.user_id && (
                    <span className="material-symbols-outlined text-primary ml-auto text-[20px]" aria-hidden="true">
                      check_circle
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

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
              disabled={salvando || !descricao.trim() || !valor || !pagadorUserId}
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
