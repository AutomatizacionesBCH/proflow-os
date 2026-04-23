'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, Users, CheckCircle2, Flame, Clock, Zap, Moon, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lead, LeadStage, LeadChannel } from '@/types'
import { LeadStatusBadge } from './LeadStatusBadge'
import { LeadChannelBadge } from './LeadChannelBadge'
import { LeadForm } from './LeadForm'
import { convertLead, recalculateAllLeads } from '@/app/leads/actions'
import { TableScroll } from '@/components/ui/TableScroll'

// ── Filtros de etapa ──────────────────────────────────────────
const STAGE_FILTERS: { value: LeadStage | 'todos'; label: string }[] = [
  { value: 'todos',             label: 'Todos' },
  { value: 'new',               label: 'Nuevo' },
  { value: 'contacted',         label: 'Contactado' },
  { value: 'qualified',         label: 'Calificado' },
  { value: 'docs_pending',      label: 'Docs pendientes' },
  { value: 'ready_to_schedule', label: 'Listo agendar' },
  { value: 'ready_to_operate',  label: 'Listo operar' },
  { value: 'operated',          label: 'Operado' },
  { value: 'dormant',           label: 'Dormido' },
  { value: 'lost',              label: 'Perdido' },
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

// ── Tabs rápidos ──────────────────────────────────────────────
type QuickTab = 'hot' | 'magda' | 'alberto' | null

const QUICK_TABS: { id: QuickTab; label: string; color: string; filter: (l: Lead) => boolean }[] = [
  {
    id: 'hot',
    label: '🔥 Hot Now',
    color: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    filter: l => l.priority_label === 'hot',
  },
  {
    id: 'magda',
    label: '👤 Pendientes Magda',
    color: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    filter: l =>
      l.assigned_to_recommendation === 'Magda' &&
      !['operated', 'lost'].includes(l.stage),
  },
  {
    id: 'alberto',
    label: '🧑 Listos para Alberto',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    filter: l =>
      l.assigned_to_recommendation === 'Alberto' &&
      ['ready_to_operate', 'ready_to_schedule'].includes(l.stage),
  },
]

// ── Heat score badge (0-100 scale) ───────────────────────────
function HeatBadge({ score }: { score: number }) {
  const cls =
    score >= 80 ? 'bg-red-500/15 text-red-400 border-red-500/30' :
    score >= 60 ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' :
    score >= 40 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
    score >  0  ? 'bg-slate-700/60 text-slate-400 border-slate-600/40' :
                  'bg-slate-800 text-slate-600 border-slate-700'
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-medium border', cls)}>
      {score >= 80 && <Flame className="w-2.5 h-2.5" />}
      {score}
    </span>
  )
}

type Props = { initialLeads: Lead[] }

export function LeadsView({ initialLeads }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [showForm, setShowForm]           = useState(false)
  const [editing, setEditing]             = useState<Lead | undefined>(undefined)
  const [search, setSearch]               = useState('')
  const [stageFilter, setStageFilter]     = useState<LeadStage | 'todos'>('todos')
  const [channelFilter, setChannelFilter] = useState<LeadChannel | 'todos'>('todos')
  const [quickTab, setQuickTab]           = useState<QuickTab>(null)
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null)
  const [converting, setConverting]       = useState<string | null>(null)
  const [recalculating, setRecalculating] = useState(false)

  // ── Stats para KPIs ────────────────────────────────────────
  const stats = useMemo(() => ({
    total:        initialLeads.length,
    hot:          initialLeads.filter(l => l.priority_label === 'hot').length,
    warm:         initialLeads.filter(l => l.priority_label === 'warm').length,
    follow_up:    initialLeads.filter(l => l.priority_label === 'follow_up').length,
    cold:         initialLeads.filter(l => l.priority_label === 'cold').length,
    pendMagda:    initialLeads.filter(l =>
      l.assigned_to_recommendation === 'Magda' && !['operated', 'lost'].includes(l.stage)
    ).length,
    listosOperar: initialLeads.filter(l => l.stage === 'ready_to_operate').length,
    dormidos:     initialLeads.filter(l => l.stage === 'dormant').length,
  }), [initialLeads])

  // ── Filtrado ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return initialLeads.filter(l => {
      // Tab rápido tiene prioridad
      if (quickTab) {
        const tab = QUICK_TABS.find(t => t.id === quickTab)
        if (tab && !tab.filter(l)) return false
      } else {
        if (stageFilter !== 'todos' && l.stage !== stageFilter) return false
        if (channelFilter !== 'todos' && l.source_channel !== channelFilter) return false
        if (priorityFilter && l.priority_label !== priorityFilter) return false
      }
      if (search) {
        const q = search.toLowerCase()
        if (
          !l.full_name.toLowerCase().includes(q) &&
          !(l.campaign_name?.toLowerCase().includes(q)) &&
          !(l.phone?.toLowerCase().includes(q)) &&
          !(l.email?.toLowerCase().includes(q)) &&
          !(l.assigned_to?.toLowerCase().includes(q))
        ) return false
      }
      return true
    })
  }, [initialLeads, stageFilter, channelFilter, quickTab, search])

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

  function activateQuickTab(id: QuickTab) {
    setQuickTab(prev => prev === id ? null : id)
    setStageFilter('todos')
    setChannelFilter('todos')
    setPriorityFilter(null)
  }

  async function handleRecalculate() {
    setRecalculating(true)
    await recalculateAllLeads()
    setRecalculating(false)
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

      {/* ── Header con botón recalcular ── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{initialLeads.length} leads en total</p>
        <button
          onClick={handleRecalculate}
          disabled={recalculating}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4 text-orange-400', recalculating && 'animate-spin')} />
          {recalculating ? 'Calculando scores…' : 'Recalcular scores'}
        </button>
      </div>

      {/* ── KPIs prioridad ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={<Flame className="w-4 h-4 text-red-400" />}
          label="🔥 Hot"
          value={stats.hot}
          color="orange"
          onClick={() => activateQuickTab('hot')}
          active={quickTab === 'hot'}
        />
        <KpiCard
          icon={<Zap className="w-4 h-4 text-amber-400" />}
          label="🟡 Warm"
          value={stats.warm}
          color="amber"
          onClick={() => { setQuickTab(null); setPriorityFilter('warm') }}
          active={priorityFilter === 'warm' && !quickTab}
        />
        <KpiCard
          icon={<Clock className="w-4 h-4 text-blue-400" />}
          label="🔁 Follow-up"
          value={stats.follow_up}
          color="blue"
          onClick={() => { setQuickTab(null); setPriorityFilter('follow_up') }}
          active={priorityFilter === 'follow_up' && !quickTab}
        />
        <KpiCard
          icon={<Moon className="w-4 h-4 text-slate-400" />}
          label="🧊 Cold"
          value={stats.cold}
          color="slate"
          onClick={() => { setQuickTab(null); setPriorityFilter('cold') }}
          active={priorityFilter === 'cold' && !quickTab}
        />
      </div>

      {/* ── KPIs gestión ── */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => activateQuickTab('magda')}
          className={cn(
            'text-left px-4 py-3 rounded-xl border transition-all',
            quickTab === 'magda' ? 'border-violet-500/40 bg-violet-500/5' : 'border-slate-800 bg-slate-900 hover:border-slate-700'
          )}
        >
          <p className="text-xl font-bold text-slate-100 tabular-nums">{stats.pendMagda}</p>
          <p className="text-xs text-slate-500 mt-0.5">Pendientes Magda</p>
        </button>
        <button
          onClick={() => { setQuickTab(null); setStageFilter('ready_to_operate') }}
          className={cn(
            'text-left px-4 py-3 rounded-xl border transition-all',
            stageFilter === 'ready_to_operate' && !quickTab ? 'border-green-500/40 bg-green-500/5' : 'border-slate-800 bg-slate-900 hover:border-slate-700'
          )}
        >
          <p className="text-xl font-bold text-slate-100 tabular-nums">{stats.listosOperar}</p>
          <p className="text-xs text-slate-500 mt-0.5">Listos para operar</p>
        </button>
        <button
          onClick={() => { setQuickTab(null); setStageFilter('dormant') }}
          className={cn(
            'text-left px-4 py-3 rounded-xl border transition-all',
            stageFilter === 'dormant' && !quickTab ? 'border-slate-600/40 bg-slate-800/40' : 'border-slate-800 bg-slate-900 hover:border-slate-700'
          )}
        >
          <p className="text-xl font-bold text-slate-100 tabular-nums">{stats.dormidos}</p>
          <p className="text-xs text-slate-500 mt-0.5">Dormidos reactivables</p>
        </button>
      </div>

      {/* ── Tabs rápidos ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-600 mr-1">Vista rápida:</span>
        {QUICK_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => activateQuickTab(t.id)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md border transition-colors',
              quickTab === t.id ? t.color : 'text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300'
            )}
          >
            {t.label}
            <span className="ml-1.5 text-slate-500">
              ({initialLeads.filter(t.filter).length})
            </span>
          </button>
        ))}
        {(quickTab || stageFilter !== 'todos' || channelFilter !== 'todos' || priorityFilter) && (
          <button
            onClick={() => { setQuickTab(null); setStageFilter('todos'); setChannelFilter('todos'); setPriorityFilter(null) }}
            className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 border border-slate-700 rounded-md transition-colors"
          >
            ✕ Limpiar filtros
          </button>
        )}
      </div>

      {/* ── Filtros ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1 bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2 focus-within:border-slate-600 transition-colors">
            <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono, email o responsable..."
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

        {/* Filtro etapa */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-3 h-3 text-slate-600 mr-1" />
          {STAGE_FILTERS.map(s => (
            <button
              key={s.value}
              onClick={() => { setQuickTab(null); setStageFilter(s.value) }}
              className={cn(
                'px-3 py-1 text-xs rounded-md border transition-colors',
                stageFilter === s.value && !quickTab
                  ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                  : 'text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300'
              )}
            >
              {s.label}
              {s.value !== 'todos' && (
                <span className="ml-1.5 text-slate-500">
                  ({initialLeads.filter(l => l.stage === s.value).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filtro canal */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-600 mr-1">canal</span>
          {CHANNEL_FILTERS.map(c => (
            <button
              key={c.value}
              onClick={() => { setQuickTab(null); setChannelFilter(c.value) }}
              className={cn(
                'px-3 py-1 text-xs rounded-md border transition-colors',
                channelFilter === c.value && !quickTab
                  ? 'bg-purple-600/20 text-purple-400 border-purple-500/30'
                  : 'text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabla ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <TableScroll>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Nombre', 'Teléfono', 'Responsable', '🔥', 'Canal', 'Próxima acción', 'Etapa', 'Registrado', 'Acciones'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                        <Users className="w-4 h-4 text-slate-600" />
                      </div>
                      <p className="text-sm text-slate-500">
                        {initialLeads.length === 0 ? 'No hay leads aún.' : 'Ningún lead coincide con los filtros.'}
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
                      lead.stage === 'operated' && 'bg-green-500/5',
                      (lead.heat_score >= 80 || lead.priority_label === 'hot') && lead.stage !== 'operated' && 'bg-orange-500/5'
                    )}
                  >
                    {/* Nombre */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 text-xs font-medium text-slate-300">
                          {lead.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-200 whitespace-nowrap">{lead.full_name}</span>
                      </div>
                    </td>
                    {/* Teléfono */}
                    <td className="py-3 px-4 text-slate-400 text-xs font-mono whitespace-nowrap">
                      {lead.phone || '—'}
                    </td>
                    {/* Responsable */}
                    <td className="py-3 px-4 text-xs whitespace-nowrap">
                      {lead.assigned_to
                        ? <span className="px-2 py-0.5 rounded-md bg-slate-700/60 text-slate-300 border border-slate-600/40">{lead.assigned_to}</span>
                        : <span className="text-slate-600">—</span>}
                    </td>
                    {/* Heat score */}
                    <td className="py-3 px-4">
                      <HeatBadge score={lead.heat_score} />
                    </td>
                    {/* Canal */}
                    <td className="py-3 px-4">
                      <LeadChannelBadge channel={lead.source_channel as LeadChannel | null} />
                    </td>
                    {/* Próxima acción */}
                    <td className="py-3 px-4 max-w-[180px]">
                      {lead.next_action ? (
                        <div>
                          <p className="text-xs text-slate-300 line-clamp-1">{lead.next_action}</p>
                          {lead.next_action_due_at && (
                            <p className="text-xs text-slate-600 mt-0.5">
                              {new Date(lead.next_action_due_at).toLocaleDateString('es-CL')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>
                    {/* Etapa */}
                    <td className="py-3 px-4">
                      <LeadStatusBadge status={lead.stage} />
                    </td>
                    {/* Registrado */}
                    <td className="py-3 px-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString('es-CL')}
                    </td>
                    {/* Acciones */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {lead.stage !== 'operated' && lead.stage !== 'lost' && (
                          <button
                            onClick={ev => handleConvert(lead.id, ev)}
                            disabled={converting === lead.id}
                            title="Marcar como operado"
                            className="text-xs text-green-500 hover:text-green-400 border border-green-500/30 hover:border-green-500/50 rounded-md px-2 py-1 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {converting === lead.id ? '…' : 'Operar'}
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

// ── KpiCard local ─────────────────────────────────────────────
function KpiCard({
  icon, label, value, color, onClick, active,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: 'orange' | 'amber' | 'blue' | 'violet' | 'green' | 'slate'
  onClick: () => void
  active: boolean
}) {
  const ring = {
    orange: 'border-orange-500/40 bg-orange-500/5',
    amber:  'border-amber-500/40  bg-amber-500/5',
    blue:   'border-blue-500/40   bg-blue-500/5',
    violet: 'border-violet-500/40 bg-violet-500/5',
    green:  'border-green-500/40  bg-green-500/5',
    slate:  'border-slate-600/40  bg-slate-800/40',
  }
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-left p-4 rounded-xl border transition-all',
        active ? ring[color] : 'border-slate-800 bg-slate-900 hover:border-slate-700'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center">{icon}</div>
      </div>
      <p className="text-2xl font-bold text-slate-100 tabular-nums">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </button>
  )
}
