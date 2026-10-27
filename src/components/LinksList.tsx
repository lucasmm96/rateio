import { useState, useEffect } from 'react'
import { listarLinks, adicionarLink, removerLink } from '../db/queries'
import type { LinkItem } from '../db/queries'

interface LinksListProps {
  entidadeTipo: 'despesa' | 'reembolso'
  entidadeId: string
  rateioId: string
}

function validarUrl(url: string): string | null {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'URL inválida. Use http:// ou https://'
  }
  return null
}

export function LinksList({ entidadeTipo, entidadeId, rateioId }: LinksListProps) {
  const [links, setLinks] = useState<LinkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newRotulo, setNewRotulo] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    setLoading(true)
    listarLinks(entidadeTipo, entidadeId)
      .then(data => { setLinks(data); setError(null) })
      .catch(e => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [entidadeTipo, entidadeId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const trimmedUrl = newUrl.trim()
    const err = validarUrl(trimmedUrl)
    if (err) { setUrlError(err); return }
    setUrlError(null)
    setAdding(true)
    try {
      await adicionarLink({
        entidadeTipo,
        entidadeId,
        rateioId,
        url: trimmedUrl,
        rotulo: newRotulo.trim() || undefined,
      })
      const updated = await listarLinks(entidadeTipo, entidadeId)
      setLinks(updated)
      setNewUrl('')
      setNewRotulo('')
      setShowForm(false)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setAdding(false)
    }
  }

  async function handleRemoveConfirm(id: string) {
    setRemoving(true)
    try {
      await removerLink(id)
      setLinks(prev => prev.filter(l => l.id !== id))
      setConfirmRemoveId(null)
    } catch (e: unknown) {
      setError((e as Error).message)
    } finally {
      setRemoving(false)
    }
  }

  if (loading) {
    return (
      <p className="text-body-sm text-on-surface-variant py-1 flex items-center gap-1">
        <span className="material-symbols-outlined text-[14px] animate-spin" aria-hidden="true">progress_activity</span>
        Carregando links...
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-label-sm text-error">{error}</p>}

      {links.length === 0 && (
        <p className="text-body-sm text-on-surface-variant">Nenhum link adicionado</p>
      )}

      {links.map(link => (
        <div key={link.id}>
          {confirmRemoveId === link.id ? (
            <div className="flex items-center gap-2 py-0.5">
              <p className="text-body-sm text-on-surface-variant flex-1">Remover este link?</p>
              <button
                onClick={() => setConfirmRemoveId(null)}
                className="px-2 py-0.5 rounded text-label-sm text-on-surface border border-outline hover:bg-surface"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRemoveConfirm(link.id)}
                disabled={removing}
                className="px-2 py-0.5 rounded text-label-sm text-on-primary bg-error hover:opacity-90 disabled:opacity-50"
              >
                {removing ? '...' : 'Remover'}
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body-sm text-primary hover:underline block truncate"
                >
                  {link.rotulo ?? link.url}
                </a>
                {link.rotulo && (
                  <span className="text-label-sm text-on-surface-variant block truncate">{link.url}</span>
                )}
              </div>
              <button
                onClick={() => setConfirmRemoveId(link.id)}
                className="text-on-surface-variant hover:text-error transition-colors shrink-0"
                aria-label="Remover link"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
              </button>
            </div>
          )}
        </div>
      ))}

      {showForm ? (
        <form onSubmit={handleAdd} className="space-y-2 pt-1">
          <div>
            <input
              type="text"
              value={newUrl}
              onChange={e => { setNewUrl(e.target.value); setUrlError(null) }}
              placeholder="https://..."
              className="w-full text-body-sm px-2 py-1 rounded border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
            />
            {urlError && <p className="text-label-sm text-error mt-0.5">{urlError}</p>}
          </div>
          <input
            type="text"
            value={newRotulo}
            onChange={e => setNewRotulo(e.target.value)}
            placeholder="Rótulo (opcional)"
            className="w-full text-body-sm px-2 py-1 rounded border border-outline bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={adding}
              className="px-3 py-1 rounded text-label-md text-on-primary bg-primary hover:opacity-90 disabled:opacity-50"
            >
              {adding ? 'Adicionando...' : 'Adicionar link'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setNewUrl(''); setNewRotulo(''); setUrlError(null) }}
              className="px-3 py-1 rounded text-label-md text-on-surface border border-outline hover:bg-surface"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-label-sm text-primary hover:underline"
        >
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">add</span>
          Adicionar link
        </button>
      )}
    </div>
  )
}
