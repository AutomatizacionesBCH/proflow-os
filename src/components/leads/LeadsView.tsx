'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, Users, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lead, LeadStatus, LeadChannel } from '@/types'
import { LeadStatusBadge } from './LeadStatusBadge'
import { LeadChannelBadge } from './LeadChannelBadge'
import { LeadForm } from './LeadForm'
import { convertLead } from '@/app/leads/actions'
import { KpiBox } from '@/components/ui/KpiBox'
import { TableScroll } from '@/components/ui/TableScroll'

const STATUS_FILTERS: { value: LeadStatus | 'todos'; label: string }[] = [
  { value: 'todos',          label: 'Todos' },
  { value: 'nuevo',          label: 'Nuevo' },
  { value: 'contactado',     label: 'Contactado' },
  { value: 'en_seguimiento', label: 'En seguimiento' },
  { value: 'convertido',     label: 'Convertido' },
  { value: 'perdido',        label: 'Perdido' },
]

const CHANNEL_FILTERS: { value: LeadChannel | 'todos'; label: string }[] = [
  { value: 'todos',      label: 'Todos los canales' },
  { value: 'Meta',       label: 'Meta' },
  { value: 'TikTok',     label: 'TikTok' },
  { value: 'LinkedIn',   label: 'LinkedIn' },
  { value: 'Twitter/X',  label: 'Twitter/X' },
  { value: 'referido',   label: 'Referido' },
  { value: 'otro',       label: 'Otro' },
]

type Props = { initialLeads: Lead[] }

export function LeadsView({ initialLeads }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [showForm, setShowForm]         = useState(false)
  const [editing, setEditing]           = useState<Lead | undefined>(undefined)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'todos'>('todos')
  const [channelFilter, setChannelFilter] = useState<LeadChannel | 'todos'>('todos')
  const [converting, setConverting]     = useState<string | null>(null)

  const filtered = useMemo(() => {
    return initialLeads.filter(l => {
      if (statusFilter !== 'todos' && l.status !== statusFilter) return false
      if (channelFilter !== 'todos' && l.source_channel !== channelFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !l.full_name.toLowerCase().includes(q) &&
          !(l.campaign_name?.toLowerCase().includes(q)) &&
          !(l.phone?.toLowerCase().includes(q)) &&
          !(l.email?.toLowerCase().includes(q))
        ) return false
      }
      return true
    })
  }, [initialLeads, statusFilter, channelFilter, search])

  const stats = useMemo(() => ({
    total:      initialLeads.length,
    nuevos:     initialLeads.filter(l => l.status === 'nuevo').length,
    convertidos: initialLeads.filter(l => l.status === 'convertido').length,
    perdidos:   initialLeads.filter(l => l.status === 'perdido').length,
  }), [initialLeads])

  function handleSuccess() {
    setShowForm(false)
    setEditing(undefined)
    startTransition(() => router.refresh())
  }

  function openEdit(l: Lead, ev: React.MouseEvent) {
    ev.stopPropagation()
    setEditing(l)
    setShowForm(true)
  }

  async function handleConvert(id: string, ev: React.MouseEvent) {
    ev.stopPropagation()
    setConverting(id)
    await convertLead(id)
    setConverting(null)
    startTransition(() => router.refresh())
  }

  return (
    <>
      {showForm && (
        <LeadForm
          onClose={() => { setShowForm(false); setEditing(undefined) }}
          onSuccess={handleSuccess}
          editing={editing}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiBox label="Total leads"  value={String(stats.total)} />
        <KpiBox label="Nuevos"       value={String(stats.nuevos)}       warn={stats.nuevos > 0} />
        <KpiBox label="Convertidos"  value={String(stats.convertidos)}  positive={stats.convertidos > 0} />
        <KpiBox label="Perdidos"     value={String(stats.perdidos)}     danger={stats.perdidos > 0} />
      </div>

      {/* Filtros */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1 bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 focus-within:border-slate-600 transition-colors">
            <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o campaña..."
              className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setEditing(undefined); setShowForm(true) }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            Nuevo lead
          </button>
        </div>

        {/* Filtro estado */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3 h-3 text-slate-600 mr-1" />
          {STATUS_FILTERS.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={cn(
                'px-3 py-1 text-xs rounded-md border transition-colors',
                statusFilter === s.value
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                  : 'text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300'
              )}
            >
              {s.label}
              {s.value !== 'todos' && (
                <span className="ml-1.5 text-slate-500">
                  ({initialLeads.filter(l => l.status === s.value).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filtro canal */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="w-3 h-3 mr-1 text-slate-600 text-xs">canal</span>
          {CHANNEL_FILTERS.map(c => (
            <button
              key={c.value}
              onClick={() => setChannelFilter(c.value)}
              className={cn(
                'px-3 py-1 text-xs rounded-md border transition-colors',
                channelFilter === c.value
                  ? 'bg-purple-600/20 text-purple-400 border-purple-500/30'
                  : 'text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <TableScroll>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Nombre', 'Teléfono', 'Email', 'Canal', 'Campaña', 'Estado', 'Registrado', 'Acciones'].map(h => (
                  <th
                    key={h}
                    className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                        <Users className="w-4 h-4 text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {initialLeads.length === 0
                          ? 'No hay leads aún. Crea el primero.'
                          : 'Ningún lead coincide con los filtros.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(lead => (
                  <tr
                    key={lead.id}
                    className={cn(
                      'border-b border-slate-800/60 transition-colors hover:bg-slate-800/20',
                      lead.converted_to_client && 'bg-green-500/5'
                    )}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 text-xs font-medium text-slate-300">
                          {lead.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-200">{lead.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs font-mono">
                      {lead.phone || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs max-w-[180px]">
                      <span className="line-clamp-1">{lead.email || '—'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <LeadChannelBadge channel={lead.source_channel} />
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs max-w-[140px]">
                      <span className="line-clamp-1">{lead.campaign_name || '—'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <LeadStatusBadge status={lead.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString('es-CL')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {!lead.converted_to_client && lead.status !== 'perdido' && (
                          <button
                            onClick={ev => handleConvert(lead.id, ev)}
                            disabled={converting === lead.id}
                            title="Marcar como convertido"
                            className="text-xs text-green-500 hover:text-green-400 border border-green-500/30 hover:border-green-500/50 rounded-md px-2 py-1 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {converting === lead.id ? '…' : 'Convertir'}
                          </button>
                        )}
                        <button
                          onClick={ev => openEdit(lead, ev)}
                          className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 rounded-md px-2 py-1 transition-colors"
                        >
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </TableScroll>

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-800">
            <p className="text-xs text-slate-500">
              {filtered.length} lead{filtered.length !== 1 ? 's' : ''} mostrados
              {filtered.length !== initialLeads.length && ` de ${initialLeads.length}`}
            </p>
          </div>
        )}
      </div>
    </>
  )
}

