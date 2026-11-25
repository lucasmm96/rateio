import { useState } from 'react'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { ModalSheet } from './ui/ModalSheet'
import { useDismiss } from '../hooks/useDismiss'
import { editarDespesa, marcarSituacaoDespesa } from '../db/queries'
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
  const hoje = new Date().toISOString().slice(0, 10)
  const [data, setData] = useState(despesa.data.slice(0, 10))
  const [titulo, setTitulo] = useState(despesa.titulo ?? '')
  const [pagadorUserId, setPagadorUserId] = useState(despesa.pagador_user_id)
  const [descricao, setDescricao] = useState(despesa.descricao ?? '')
  const [valor, setValor] = useState(String(despesa.valor))
  const [situacao, setSituacao] = useState<'paga' | 'prevista'>(despesa.situacao)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const { closing, requestClose } = useDismiss(onClose)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const valorDecimal = D(valor.replace(',', '.'))
    if (valorDecimal.lte(0)) {
      setErro('Valor deve ser maior que zero.')
      return
    }
    if (situacao === 'paga' && data > hoje) {
      setErro('Data deve ser hoje ou anterior para marcar como paga.')
      return
    }
    if (situacao === 'prevista' && data <= hoje) {
      setErro('Data deve ser futura para marcar como prevista.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await editarDespesa({
        id: despesa.id,
        data,
        titulo: titulo.trim(),
        pagadorUserId,
        valor: valorDecimal.toNumber(),
        descricao: descricao.trim() || null,
      })
      if (situacao !== despesa.situacao) {
        await marcarSituacaoDespesa(despesa.id, situacao)
      }
      onSave()
    } catch (e: unknown) {
      setErro((e as Error).message)
      setSalvando(false)
    }
  }

  return (
    <ModalSheet closing={closing} onRequestClose={requestClose} labelledBy="editar-despesa-title" maxWidthClassName="sm:max-w-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline shrink-0" id="editar-despesa-title">
        <h2 className="text-title-sm text-on-surface font-semibold">Editar despesa</h2>
        <button
          onClick={requestClose}
          className="flex items-center justify-center h-11 w-11 -mr-2 rounded-full text-on-surface-variant hover:bg-surface-variant transition duration-150 active:scale-[0.90]"
          aria-label="Fechar"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4 overflow-y-auto">
        <Input
          label="Título"
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          required
        />

        <Input
          label="Descrição"
          value={descricao}
          onChange={e => setDescricao(e.target.value)}
          placeholder="Opcional"
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
          <p className="text-label-lg text-on-surface">Status</p>
          <div className="flex gap-2">
            {(['paga', 'prevista'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSituacao(s)}
                className={[
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border transition duration-150 active:scale-[0.97] text-body-md',
                  situacao === s
                    ? 'border-primary bg-primary-container/20 text-primary font-medium'
                    : 'border-outline text-on-surface-variant hover:bg-surface-variant',
                ].join(' ')}
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  {s === 'paga' ? 'check_circle' : 'schedule'}
                </span>
                {s === 'paga' ? 'Paga' : 'Prevista'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-label-lg text-on-surface">Quem pagou?</p>
          <div className="space-y-2">
            {membros.map(m => (
              <button
                key={m.user_id}
                type="button"
                onClick={() => setPagadorUserId(m.user_id)}
                className={[
                  'w-full flex items-center gap-3 p-3 rounded-lg border transition duration-150 active:scale-[0.98]',
                  pagadorUserId === m.user_id
                    ? 'border-primary bg-primary-container/20'
                    : 'border-outline hover:bg-surface-variant',
                ].join(' ')}
              >
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-sm font-semibold">
                  {(m.users?.nome ?? m.users?.email ?? m.user_id).slice(0, 2).toUpperCase()}
                </div>
                <span className="text-body-md text-on-surface">
                  {m.users?.nome ?? m.users?.email?.split('@')[0] ?? m.user_id.slice(0, 8)}
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

        {/* Observação movida antes do Valor; campo mantido opcional */}

        {erro && <p className="text-body-sm text-error">{erro}</p>}

        <div className="flex gap-3 pb-2">
          <Button
            type="button"
            onClick={requestClose}
            className="flex-1 !bg-transparent !text-on-surface border border-outline hover:!bg-surface-variant"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={salvando}
            disabled={salvando || !titulo.trim() || !valor || !pagadorUserId}
            className="flex-1"
          >
            Salvar
          </Button>
        </div>
      </form>
    </ModalSheet>
  )
}
