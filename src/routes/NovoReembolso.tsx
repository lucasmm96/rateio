import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { FormShell } from '../components/layout/FormShell'
import { Header } from '../components/ui/Header'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { useAsync } from '../hooks/useAsync'
import { buscarRateio, criarReembolso } from '../db/queries'
import { useUser } from '../db/auth'

export function Component() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useUser()

  const { data: rateio } = useAsync(() => buscarRateio(id!), [id])
  const membros = rateio?.membros ?? []
  const outrosMembros = membros.filter(m => m.user_id !== user?.id)

  const hoje = new Date().toISOString().slice(0, 10)
  const [valor, setValor] = useState('')
  const [data, setData] = useState(hoje)
  const [pagadorUserId, setPagadorUserId] = useState(user?.id ?? '')
  const [recebedorUserId, setRecebedorUserId] = useState('')

  useEffect(() => {
    if (outrosMembros.length > 0 && !recebedorUserId) {
      setRecebedorUserId(outrosMembros[0].user_id)
    }
  }, [outrosMembros.length])
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function salvar() {
    const valorN = parseFloat(valor.replace(',', '.'))
    if (!valor || isNaN(valorN) || valorN <= 0) { setErro('Informe um valor válido.'); return }
    if (!data) { setErro('Informe a data.'); return }
    if (!pagadorUserId) { setErro('Informe quem pagou.'); return }
    if (!recebedorUserId) { setErro('Informe quem recebeu.'); return }
    if (pagadorUserId === recebedorUserId) { setErro('Pagador e recebedor não podem ser a mesma pessoa.'); return }

    setSalvando(true)
    setErro('')
    try {
      await criarReembolso({
        rateioId: id!,
        data,
        pagadorUserId,
        recebedorUserId,
        valor: valorN,
        observacao: observacao.trim() || undefined,
      })
      navigate(-1)
    } catch (e) {
      setErro((e as Error).message)
      setSalvando(false)
    }
  }

  function MemberSelector({
    label,
    selected,
    onSelect,
    exclude,
  }: {
    label: string
    selected: string
    onSelect: (id: string) => void
    exclude?: string
  }) {
    const opcoes = membros.filter(m => m.user_id !== exclude)
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-label-lg text-on-surface">{label}</p>
        <div className="space-y-2">
          {opcoes.map(m => (
            <button
              key={m.user_id}
              type="button"
              onClick={() => onSelect(m.user_id)}
              className={[
                'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors',
                selected === m.user_id
                  ? 'border-primary bg-primary-container/20'
                  : 'border-outline hover:bg-surface',
              ].join(' ')}
            >
              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-sm font-semibold">
                {(m.users?.email ?? m.user_id).slice(0, 2).toUpperCase()}
              </div>
              <span className="text-body-md text-on-surface">
                {m.users?.email?.split('@')[0] ?? m.user_id.slice(0, 8)}
                {m.user_id === user?.id && ' (você)'}
              </span>
              {selected === m.user_id && (
                <span className="material-symbols-outlined text-primary ml-auto text-[20px]" aria-hidden="true">
                  check_circle
                </span>
              )}
            </button>
          ))}
          {membros.length === 0 && (
            <Card>
              <p className="text-body-sm text-on-surface-variant text-center py-2">
                Carregando participantes…
              </p>
            </Card>
          )}
        </div>
      </div>
    )
  }

  return (
    <FormShell>
      <div className="bg-background">
        <Header title="Novo Reembolso" back />

        <main className="px-margin py-4 pb-32 md:pb-6 space-y-4">
          <Input
            label="Valor pago"
            type="number"
            inputMode="decimal"
            placeholder="0,00"
            prefix="R$"
            min="0.01"
            step="0.01"
            value={valor}
            onChange={e => setValor(e.target.value)}
            autoFocus
          />

          <Input
            label="Data do pagamento"
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
          />

          <MemberSelector
            label="Quem pagou (fez o reembolso)?"
            selected={pagadorUserId}
            onSelect={id => { setPagadorUserId(id); if (id === recebedorUserId) setRecebedorUserId('') }}
            exclude={recebedorUserId}
          />

          <MemberSelector
            label="Quem recebeu?"
            selected={recebedorUserId}
            onSelect={id => { setRecebedorUserId(id); if (id === pagadorUserId) setPagadorUserId('') }}
            exclude={pagadorUserId}
          />

          <Input
            label="Observação (opcional)"
            placeholder="ex: pix referente ao aluguel"
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
          />

          {erro && <p className="text-body-sm text-error">{erro}</p>}
        </main>

        {/* Footer — fixed on mobile, static inside modal on md+ */}
        <div className="fixed md:static bottom-0 inset-x-0 md:inset-auto px-margin md:px-4 pb-6 md:pb-4 pt-3 bg-background/90 md:bg-background backdrop-blur-sm md:backdrop-blur-none border-t border-outline">
          <Button
            onClick={salvar}
            loading={salvando}
            disabled={salvando || !valor || !pagadorUserId || !recebedorUserId}
            className="w-full"
          >
            Registrar reembolso
          </Button>
        </div>
      </div>
    </FormShell>
  )
}
