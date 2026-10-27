import { useState, useEffect } from 'react'
import { listarAuditLog } from '../db/queries'
import type { AuditLogItem } from '../db/queries'

interface AuditLogPanelProps {
  entidade: 'despesa' | 'reembolso'
  entidadeId: string
}

const FIELD_LABELS: Record<string, string> = {
  data:             'Data',
  descricao:        'Descrição',
  pagador_user_id:  'Pagador',
  recebedor_user_id:'Recebedor',
  valor:            'Valor',
  observacao:       'Observação',
}

function fmtDataHora(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function AuditLogPanel({ entidade, entidadeId }: AuditLogPanelProps) {
  const [aberto, setAberto] = useState(false)
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    if (!aberto || carregado) return
    setLoading(true)
    listarAuditLog(entidade, entidadeId)
      .then(data => { setLogs(data); setCarregado(true); setErro(null) })
      .catch(e => setErro((e as Error).message))
      .finally(() => setLoading(false))
  }, [aberto, entidade, entidadeId, carregado])

  return (
    <div className="mt-2 pt-2 border-t border-outline">
      <button
        onClick={() => setAberto(prev => !prev)}
        className="flex items-center gap-1 text-label-sm text-on-surface-variant hover:text-primary transition-colors"
      >
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">history</span>
        Histórico
        <span
          className={`material-symbols-outlined text-[12px] transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {aberto && (
        <div className="mt-2 space-y-3">
          {loading && (
            <p className="text-body-sm text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] animate-spin" aria-hidden="true">progress_activity</span>
              Carregando…
            </p>
          )}
          {erro && <p className="text-label-sm text-error">{erro}</p>}
          {!loading && !erro && logs.length === 0 && (
            <p className="text-body-sm text-on-surface-variant">Nenhuma alteração registrada.</p>
          )}
          {logs.map(log => (
            <div key={log.id} className="rounded-lg bg-surface-variant/40 px-3 py-2 space-y-1">
              <p className="text-label-sm text-on-surface-variant">
                <span className="font-medium text-on-surface">{log.ator?.email ?? log.user_id}</span>
                {' · '}
                {fmtDataHora(log.criado_em)}
              </p>
              <div className="space-y-0.5">
                {Object.entries(log.diff_json).map(([campo, { de, para }]) => (
                  <p key={campo} className="text-body-sm text-on-surface">
                    <span className="text-on-surface-variant">{FIELD_LABELS[campo] ?? campo}:</span>
                    {' '}
                    <span className="line-through text-on-surface-variant">{String(de ?? '—')}</span>
                    {' → '}
                    <span className="font-medium">{String(para ?? '—')}</span>
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
