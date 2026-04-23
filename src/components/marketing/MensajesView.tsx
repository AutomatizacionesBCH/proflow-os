'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, CheckCircle, XCircle, Send, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CampaignMessage } from '@/types'
import {
  approveMessage,
  rejectMessage,
  markMessageSent,
  deleteMensaje,
} from '@/app/marketing/mensajes-actions'

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  approved: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  sent:     'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
}
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', approved: 'Aprobado', sent: 'Enviado', rejected: 'Rechazado',
}

const CHANNEL_STYLES: Record<string, string> = {
  whatsapp: 'bg-green-500/10 text-green-400 border-green-500/20',
  email:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  sms:      'bg-purple-500/10 text-purple-400 border-purple-500/20',
}
const CHANNEL_LABELS: Record<string, string> = { whatsapp: 'WhatsApp', email: 'Email', sms: 'SMS' }

type LeadInfo   = { full_name: string; phone: string | null }
type ClientInfo = { full_name: string; phone: string | null; email: string | null }

type Props = {
  initialMensajes: CampaignMessage[]
  campanas:        { id: string; name: string }[]
  leadsMap:        Record<string, LeadInfo>
  clientsMap:      Record<string, ClientInfo>
}

export function MensajesView({ initialMensajes, campanas, leadsMap, clientsMap }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [campaignFilter, setCampaignFilter] = useState<string>('all')
  const [statusFilter,   setStatusFilter]   = useState<string>('all')
  const [acting, setActing] = useState<string | null>(null)

  function refresh() { startTransition(() => router.refresh()) }

  async function act(id: string, fn: () => Promise<unknown>) {
    setActing(id)
    await fn()
    setActing(null)
    refresh()
  }

  function recipientName(m: CampaignMessage): string {
    if (m.lead_id   && leadsMap[m.lead_id])   return leadsMap[m.lead_id].full_name
    if (m.client_id && clientsMap[m.client_id]) return clientsMap[m.client_id].full_name
    return 'Destinatario desconocido'
  }

  function recipientDetail(m: CampaignMessage): string {
    if (m.lead_id && leadsMap[m.lead_id])         return leadsMap[m.lead_id].phone ?? 'Sin teléfono'
    if (m.client_id && clientsMap[m.client_id]) {
      const c = clientsMap[m.client_id]
      return c.phone ?? c.email ?? 'Sin contacto'
    }
    return '—'
  }

  const filtered = useMemo(() => {
    let msgs = initialMensajes
    if (campaignFilter !== 'all') msgs = msgs.filter(m => m.campaign_id === campaignFilter)
    if (statusFilter   !== 'all') msgs = msgs.filter(m => m.status === statusFilter)
    return msgs
  }, [initialMensajes, campaignFilter, statusFilter])

  const pendingCount  = initialMensajes.filter(m => m.status === 'pending').length
  const approvedCount = initialMensajes.filter(m => m.status === 'approved').length
  const sentCount     = initialMensajes.filter(m => m.status === 'sent').length

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pendientes de revisión', value: pendingCount,  color: 'text-amber-400' },
          { label: 'Aprobados',              value: approvedCount, color: 'text-blue-400' },
          { label: 'Enviados',               value: sentCount,     color: 'text-green-400' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
            <p className={cn('text-2xl font-semibold font-mono', kpi.color)}>{kpi.value.toLocaleString('es-CL')}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Campaña</label>
          <select
            className="bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            value={campaignFilter}
            onChange={e => setCampaignFilter(e.target.value)}
          >
            <option value="all">Todas las campañas</option>
            {campanas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Estado</label>
          <select
            className="bg-slate-800 border border-slate-700 rounded-md px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="approved">Aprobado</option>
            <option value="sent">Enviado</option>
            <option value="rejected">Rechazado</option>
          </select>
        </div>
        <div className="flex-1 text-right">
          <p className="text-xs text-slate-500">{filtered.length} mensaje{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Lista de mensajes */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center gap-3 py-16">
            <MessageSquare className="w-8 h-8 text-slate-700" />
            <p className="text-sm text-slate-500">Sin mensajes en esta vista.</p>
            <p className="text-xs text-slate-600">Genera mensajes desde la pestaña Campañas.</p>
          </div>
        ) : (
          filtered.map(m => {
            const campana = campanas.find(c => c.id === m.campaign_id)
            return (
              <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Destinatario */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-200">{recipientName(m)}</span>
                      <span className="text-xs text-slate-500">{recipientDetail(m)}</span>
                      {m.channel && (
                        <span className={cn(
                          'inline-flex items-center px-1.5 py-0.5 rounded text-xs border',
                          CHANNEL_STYLES[m.channel] ?? 'bg-slate-700/40 text-slate-400 border-slate-600/20'
                        )}>
                          {CHANNEL_LABELS[m.channel] ?? m.channel}
                        </span>
                      )}
                      <span className={cn(
                        'inline-flex items-center px-1.5 py-0.5 rounded text-xs border',
                        STATUS_STYLES[m.status] ?? STATUS_STYLES.pending
                      )}>
                        {STATUS_LABELS[m.status] ?? m.status}
                      </span>
                    </div>

                    {/* Campaña */}
                    {campana && (
                      <p className="text-xs text-slate-500 mb-2">Campaña: <span className="text-slate-400">{campana.name}</span></p>
                    )}

                    {/* Texto */}
                    {m.message_body && (
                      <p className="text-sm text-slate-400 bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-700/50 line-clamp-3">
                        {m.message_body}
                      </p>
                    )}

                    {/* Sent info */}
                    {m.sent_at && (
                      <p className="text-xs text-slate-600 mt-1.5">
                        Enviado: {new Date(m.sent_at).toLocaleString('es-CL')}
                        {m.approved_by && ` · Aprobado por: ${m.approved_by}`}
                      </p>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {m.status === 'pending' && (
                      <>
                        <button
                          onClick={() => act(m.id, () => approveMessage(m.id))}
                          disabled={acting === m.id}
                          className="flex items-center gap-1 text-xs text-green-400 border border-green-500/20 hover:border-green-500/40 bg-green-500/5 hover:bg-green-500/10 rounded-md px-2 py-1.5 transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {acting === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                          Aprobar
                        </button>
                        <button
                          onClick={() => act(m.id, () => rejectMessage(m.id))}
                          disabled={acting === m.id}
                          className="flex items-center gap-1 text-xs text-red-400/80 border border-red-500/20 hover:border-red-500/40 bg-red-500/5 hover:bg-red-500/10 rounded-md px-2 py-1.5 transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          <XCircle className="w-3 h-3" />
                          Rechazar
                        </button>
                      </>
                    )}
                    {m.status === 'approved' && (
                      <button
                        onClick={() => act(m.id, () => markMessageSent(m.id))}
                        disabled={acting === m.id}
                        className="flex items-center gap-1 text-xs text-blue-400 border border-blue-500/20 hover:border-blue-500/40 bg-blue-500/5 hover:bg-blue-500/10 rounded-md px-2 py-1.5 transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {acting === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Marcar enviado
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm('¿Eliminar este mensaje?')) act(m.id, () => deleteMensaje(m.id)) }}
                      disabled={acting === m.id}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 border border-slate-700 hover:border-red-500/30 rounded-md px-2 py-1.5 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
