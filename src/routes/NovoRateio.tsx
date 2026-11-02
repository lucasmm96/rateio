import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormShell } from '../components/layout/FormShell'
import { Header } from '../components/ui/Header'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Switch } from '../components/ui/Switch'
import { Card } from '../components/ui/Card'
import { buscarUsuariosPorPrefixo, criarRateio } from '../db/queries'
import { useUser } from '../db/auth'

interface Participante {
  user_id: string
  email: string
  nome: string | null
  cota: string
}

function distribuirCotas(qtd: number): string[] {
  if (qtd === 0) return []
  const base = Math.floor(100 / qtd)
  const resto = 100 - base * qtd
  return Array.from({ length: qtd }, (_, i) => String(i === 0 ? base + resto : base))
}

export function Component() {
  const navigate = useNavigate()
  const { user } = useUser()

  const [nome, setNome] = useState('')
  const [corrigirIpca, setCorrigirIpca] = useState(false)
  const [emailBusca, setEmailBusca] = useState('')
  const [candidatos, setCandidatos] = useState<{ id: string; email: string; nome: string | null }[]>([])
  const [buscando, setBuscando] = useState(false)
  const [participantes, setParticipantes] = useState<Participante[]>(() => {
    if (!user?.email || !user?.id) return []
    return [{ user_id: user.id, email: user.email, nome: user.name ?? null, cota: '100' }]
  })
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')

  const somaCotas = participantes.reduce((acc, p) => acc + Number(p.cota || '0'), 0)
  const cotasValidas = Math.abs(somaCotas - 100) < 0.01

  useEffect(() => {
    if (emailBusca.length < 2) {
      setCandidatos([])
      setBuscando(false)
      return
    }
    setBuscando(true)
    const timer = setTimeout(async () => {
      try {
        const res = await buscarUsuariosPorPrefixo(emailBusca.trim())
        setCandidatos(res)
      } catch {
        setCandidatos([])
      } finally {
        setBuscando(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [emailBusca])

  function selecionarCandidato(candidato: { id: string; email: string; nome: string | null }) {
    if (participantes.some(p => p.user_id === candidato.id)) return
    const novaLista = [...participantes, { user_id: candidato.id, email: candidato.email, nome: candidato.nome, cota: '0' }]
    const cotas = distribuirCotas(novaLista.length)
    setParticipantes(novaLista.map((p, i) => ({ ...p, cota: cotas[i] })))
    setEmailBusca('')
    setCandidatos([])
  }

  function removerParticipante(userId: string) {
    const nova = participantes.filter(p => p.user_id !== userId)
    const cotas = distribuirCotas(nova.length)
    setParticipantes(nova.map((p, i) => ({ ...p, cota: cotas[i] })))
  }

  function atualizarCota(userId: string, valor: string) {
    setParticipantes(prev => prev.map(p => p.user_id === userId ? { ...p, cota: valor } : p))
  }

  async function salvar() {
    if (!nome.trim()) { setErroForm('Informe o nome do rateio.'); return }
    if (participantes.length === 0) { setErroForm('Adicione ao menos um participante.'); return }
    if (!cotasValidas) { setErroForm(`As cotas devem somar 100% (atual: ${somaCotas.toFixed(1)}%).`); return }

    setSalvando(true)
    setErroForm('')
    try {
      const id = await criarRateio(
        nome.trim(),
        corrigirIpca,
        participantes.map(p => ({ user_id: p.user_id, cota: Number(p.cota) / 100 })),
      )
      navigate(`/rateios/${id}`, { replace: true })
    } catch (e) {
      setErroForm((e as Error).message)
      setSalvando(false)
    }
  }

  return (
    <FormShell>
      <div className="bg-background">
        <Header title="Novo Rateio" back />

        <main className="px-margin py-4 pb-32 md:pb-6 space-y-6">
          {/* Nome */}
          <Input
            label="Nome do rateio"
            placeholder="ex: Apartamento 2024"
            value={nome}
            onChange={e => setNome(e.target.value)}
            autoFocus
          />

          {/* Correção IPCA */}
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-body-md text-on-surface font-medium">Correção pelo IPCA</p>
                <p className="text-body-sm text-on-surface-variant">
                  Despesas passadas são corrigidas pela inflação
                </p>
              </div>
              <Switch checked={corrigirIpca} onChange={setCorrigirIpca} />
            </div>
          </Card>

          {/* Buscar participante */}
          <div className="space-y-2">
            <p className="text-label-lg text-on-surface">Participantes</p>
            <Input
              placeholder="Nome ou e-mail do participante"
              type="text"
              value={emailBusca}
              onChange={e => setEmailBusca(e.target.value)}
              className="w-full"
            />
            {candidatos.length > 0 && (
              <ul className="border border-outline-variant rounded-lg bg-surface-container overflow-hidden">
                {candidatos.map((c) => {
                  const jaAdicionado = participantes.some(p => p.user_id === c.id)
                  return (
                    <li
                      key={c.id}
                      className={`px-4 py-2 ${jaAdicionado ? 'text-on-surface/40 cursor-not-allowed' : 'hover:bg-surface-variant cursor-pointer'}`}
                      onClick={() => selecionarCandidato(c)}
                    >
                      {c.nome
                        ? <><p className="text-sm text-on-surface">{c.nome}</p><p className="text-xs text-on-surface-variant">{c.email}</p></>
                        : <p className="text-sm text-on-surface">{c.email}</p>
                      }
                      {jaAdicionado && <span className="text-xs">(já adicionado)</span>}
                    </li>
                  )
                })}
              </ul>
            )}
            {emailBusca.length >= 2 && !buscando && candidatos.length === 0 && (
              <p className="text-sm text-on-surface/60">
                Nenhum usuário encontrado. Ele precisa ter uma conta no Rateio.
              </p>
            )}
          </div>

          {/* Lista de participantes */}
          {participantes.length > 0 && (
            <div className="space-y-2">
              {participantes.map(p => (
                <Card key={p.user_id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-label-md font-semibold shrink-0">
                    {(p.nome ?? p.email.split('@')[0]).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    {p.nome
                      ? <><p className="text-body-md text-on-surface truncate">{p.nome}</p><p className="text-body-sm text-on-surface-variant truncate">{p.email}</p></>
                      : <p className="text-body-md text-on-surface truncate">{p.email}</p>
                    }
                    {p.user_id === user?.id && !p.nome && (
                      <p className="text-body-sm text-on-surface-variant">você</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={p.cota}
                      onChange={e => atualizarCota(p.user_id, e.target.value)}
                      suffix="%"
                      className="w-16 text-right"
                    />
                    {p.user_id !== user?.id && (
                      <button
                        onClick={() => removerParticipante(p.user_id)}
                        className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface hover:text-error transition duration-150 active:scale-[0.90]"
                        aria-label="Remover participante"
                      >
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
                      </button>
                    )}
                  </div>
                </Card>
              ))}

              <div className={['flex justify-end text-body-sm font-medium', cotasValidas ? 'text-primary' : 'text-error'].join(' ')}>
                Total: {somaCotas.toFixed(1)}%
                {!cotasValidas && ' (deve ser 100%)'}
              </div>
            </div>
          )}

          {erroForm && (
            <p className="text-body-sm text-error">{erroForm}</p>
          )}
        </main>

        {/* Footer — fixed on mobile, static inside modal on md+ */}
        <div className="fixed md:static bottom-0 inset-x-0 md:inset-auto px-margin md:px-4 pb-6 md:pb-4 pt-3 bg-background/90 md:bg-background backdrop-blur-sm md:backdrop-blur-none border-t border-outline">
          <Button
            onClick={salvar}
            loading={salvando}
            disabled={salvando || !nome.trim() || participantes.length === 0 || !cotasValidas}
            className="w-full"
          >
            Criar rateio
          </Button>
        </div>
      </div>
    </FormShell>
  )
}
