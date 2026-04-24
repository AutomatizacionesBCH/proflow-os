'use client'

import { useState, useTransition } from 'react'
import { useRouter }                from 'next/navigation'
import {
  Brain, Target, Megaphone, TrendingUp,
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Copy, CheckCheck, Loader2, AlertTriangle, X,
  Zap, Clock, SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  approveRecommendationAction,
  dismissRecommendationAction,
  approveAllUrgentAction,
  runAllAgentsAction,
} from '@/app/recomendaciones/actions'

// ── Tipos exportados ──────────────────────────────────────────────────────────

export type AgentSource =
  | 'lead_intelligence'
  | 'sales_agent'
  | 'marketing_agent'
  | 'revenue_agent'

export type RecStatus   = 'pendiente' | 'aprobada' | 'descartada'
export type RecPriority = 'alta' | 'media' | 'baja'

export type UnifiedRecommendation = {
  id:               string
  source:           AgentSource
  title:            string
  description:      string
  suggested_action: string
  expected_impact:  string
  priority:         RecPriority
  status:           RecStatus
  created_at:       string
  lead_id?:         string | null
  lead_name?:       string | null
  suggested_message?: string | null
  reasoning?:       string | null
  metadata?:        Record<string, unknown>
}

// ── Configuración por agente ──────────────────────────────────────────────────

const AGENT_CFG: Record<AgentSource, {
  label: string
  icon:  React.ElementType
  iconBg: string
  iconText: string
  badge: string
  dot:  string
}> = {
  lead_intelligence: {
    label:    'Lead Intelligence',
    icon:     Brain,
    iconBg:   'bg-blue-900/40',
    iconText: 'text-blue-400',
    badge:    'bg-blue-500/15 text-blue-400 border-blue-500/25',
    dot:      'bg-blue-400',
  },
  sales_agent: {
    label:    'Sales Agent',
    icon:     Target,
    iconBg:   'bg-orange-900/40',
    iconText: 'text-orange-400',
    badge:    'bg-orange-500/15 text-orange-400 border-orange-500/25',
    dot:      'bg-orange-400',
  },
  marketing_agent: {
    label:    'Marketing Agent',
    icon:     Megaphone,
    iconBg:   'bg-violet-900/40',
    iconText: 'text-violet-400',
    badge:    'bg-violet-500/15 text-violet-400 border-violet-500/25',
    dot:      'bg-violet-400',
  },
  revenue_agent: {
    label:    'Revenue Agent',
    icon:     TrendingUp,
    iconBg:   'bg-emerald-900/40',
    iconText: 'text-emerald-400',
    badge:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    dot:      'bg-emerald-400',
  },
}

const PRIORITY_STYLES: Record<RecPriority, string> = {
  alta:  'bg-red-500/15 text-red-400 border-red-500/30',
  media: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  baja:  'bg-slate-700/50 text-slate-400 border-slate-600/30',
}

const STATUS_STYLES: Record<RecStatus, string> = {
  pendiente:  'bg-amber-500/10 text-amber-400',
  aprobada:   'bg-green-500/10 text-green-400',
  descartada: 'bg-slate-700/40 text-slate-500',
}

const TABS = [
  { id: 'todas',             label: 'Todas' },
  { id: 'urgentes',          label: 'Urgentes' },
  { id: 'lead_intelligence', label: 'Lead Intelligence' },
  { id: 'sales_agent',       label: 'Sales Agent' },
  { id: 'marketing_agent',   label: 'Marketing Agent' },
  { id: 'revenue_agent',     label: 'Revenue Agent' },
  { id: 'aprobadas',         label: 'Aprobadas' },
  { id: 'descartadas',       label: 'Descartadas' },
] as const

type TabId = typeof TABS[number]['id']

// ── Props ─────────────────────────────────────────────────────────────────────

type Stats = {
  totalPending:   number
  totalUrgent:    number
  approvedToday:  number
  dismissedToday: number
}

type Props = {
  initialRecs:  UnifiedRecommendation[]
  stats:        Stats
  agentLastRun: Record<string, string | null>
}

// ── Componente principal ──────────────────────────────────────────────────────

export function RecomendacionesView({ initialRecs, stats, agentLastRun }: Props) {
  const router              = useRouter()
  const [, startTransition] = useTransition()

  const [recs, setRecs]           = useState<UnifiedRecommendation[]>(initialRecs)
  const [tab, setTab]             = useState<TabId>('todas')
  const [pFilter, setPFilter]     = useState<'all' | RecPriority>('all')
  const [expandedId, setExpanded] = useState<string | null>(null)
  const [dismissingId, setDismId] = useState<string | null>(null)
  const [dismissReason, setDimR]  = useState('')
  const [approving,  setApproving]  = useState<string | null>(null)
  const [dismissing, setDismissing] = useState<string | null>(null)
  const [copied, setCopied]         = useState<string | null>(null)
  const [loading, setLoading]       = useState<'urgent' | 'all' | null>(null)
  const [runResults, setRunResults] = useState<{ agent: string; status: string; count?: number; error?: string }[] | null>(null)
  const [error, setError]           = useState<string | null>(null)

  function refresh() { startTransition(() => router.refresh()) }

  // ── Filtrado ──────────────────────────────────────────────────────────────

  const displayed = recs.filter(r => {
    if (tab === 'urgentes')    return r.status === 'pendiente' && r.priority === 'alta'
    if (tab === 'aprobadas')   return r.status === 'aprobada'
    if (tab === 'descartadas') return r.status === 'descartada'
    if (tab !== 'todas')       return r.source === (tab as AgentSource)
    return true
  }).filter(r => pFilter === 'all' || r.priority === pFilter)

  // Contadores para badges de tab
  const pendingBySource: Partial<Record<AgentSource | 'total', number>> = {}
  for (const r of recs) {
    if (r.status !== 'pendiente') continue
    pendingBySource[r.source] = (pendingBySource[r.source] ?? 0) + 1
    pendingBySource['total']  = (pendingBySource['total']  ?? 0) + 1
  }
  const urgentCount = recs.filter(r => r.status === 'pendiente' && r.priority === 'alta').length

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleApprove(id: string, source: AgentSource) {
    setApproving(id)
    const res = await approveRecommendationAction(source, id)
    if (res.success) {
      setRecs(prev => prev.map(r => r.id === id ? { ...r, status: 'aprobada' as RecStatus } : r))
    } else {
      setError(res.error ?? 'Error al aprobar')
    }
    setApproving(null)
  }

  async function handleDismiss(id: string, source: AgentSource) {
    if (source === 'revenue_agent') {
      // Recomendaciones del Revenue Agent no tienen estado persistente individual
      setRecs(prev => prev.map(r => r.id === id ? { ...r, status: 'descartada' as RecStatus } : r))
      setDismId(null); setDimR('')
      return
    }
    setDismissing(id)
    const res = await dismissRecommendationAction(source, id, dismissReason || undefined)
    if (res.success) {
      setRecs(prev => prev.map(r => r.id === id ? { ...r, status: 'descartada' as RecStatus } : r))
    } else {
      setError(res.error ?? 'Error al descartar')
    }
    setDismissing(null)
    setDismId(null); setDimR('')
  }

  async function handleApproveAllUrgent() {
    setLoading('urgent')
    setError(null)
    const res = await approveAllUrgentAction()
    if (res.success) {
      setRecs(prev => prev.map(r =>
        r.status === 'pendiente' && r.priority === 'alta'
          ? { ...r, status: 'aprobada' as RecStatus }
          : r
      ))
    } else {
      setError(res.error ?? 'Error')
    }
    setLoading(null)
  }

  async function handleRunAll() {
    setLoading('all')
    setError(null)
    setRunResults(null)
    const res = await runAllAgentsAction()
    setLoading(null)
    if (res.success) {
      setRunResults(res.results ?? [])
      refresh()
    } else {
      setError(res.error ?? 'Error al ejecutar agentes')
    }
  }

  async function handleCopy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(p => p === key ? null : p), 2000)
    } catch {}
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Pendientes de revisión" value={pendingBySource['total'] ?? 0} color="text-amber-400" bg="bg-amber-500/10" />
        <KpiCard label="Urgentes (prioridad alta)" value={urgentCount} color="text-red-400" bg="bg-red-500/10" />
        <KpiCard label="Aprobadas hoy" value={stats.approvedToday} color="text-green-400" bg="bg-green-500/10" />
        <KpiCard label="Descartadas hoy" value={stats.dismissedToday} color="text-slate-400" bg="bg-slate-700/40" />
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-slate-500 hover:text-slate-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Resultado de ejecución de agentes ── */}
      {runResults && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-200">Agentes ejecutados</p>
            <button onClick={() => setRunResults(null)} className="text-slate-500 hover:text-slate-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {runResults.map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', r.status === 'ok' ? 'bg-green-400' : 'bg-red-400')} />
                <span className="text-sm text-slate-300 font-medium">{r.agent}</span>
                {r.status === 'ok'
                  ? <span className="text-xs text-slate-500">{r.count} recomendación{r.count !== 1 ? 'es' : ''} generadas</span>
                  : <span className="text-xs text-red-400">{r.error}</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Último análisis por agente ── */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(AGENT_CFG) as [AgentSource, typeof AGENT_CFG[AgentSource]][]).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg">
            <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
            <span className="text-xs text-slate-500">{cfg.label}:</span>
            <span className="text-xs text-slate-400 font-mono">
              {agentLastRun[key]
                ? new Date(agentLastRun[key]!).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : 'Sin datos'
              }
            </span>
          </div>
        ))}
      </div>

      {/* ── Barra de acciones ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Filtro de prioridad */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-xs text-slate-500">Prioridad:</span>
          {(['all', 'alta', 'media', 'baja'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPFilter(p)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                pFilter === p ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              {p === 'all' ? 'Todas' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Acciones globales */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleApproveAllUrgent}
            disabled={loading !== null || urgentCount === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-300 bg-green-900/30 hover:bg-green-900/50 border border-green-700/40 hover:border-green-600/60 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading === 'urgent' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Aprobar urgentes ({urgentCount})
          </button>
          <button
            onClick={handleRunAll}
            disabled={loading !== null}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-300 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-700/40 hover:border-blue-600/60 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading === 'all' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            {loading === 'all' ? 'Ejecutando agentes…' : 'Ejecutar todos los agentes'}
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 flex-wrap">
        {TABS.map(t => {
          const badge =
            t.id === 'todas'             ? ((pendingBySource['total'] ?? 0) > 0 ? pendingBySource['total'] : null) :
            t.id === 'urgentes'          ? (urgentCount > 0 ? urgentCount : null) :
            ['lead_intelligence', 'sales_agent', 'marketing_agent', 'revenue_agent'].includes(t.id)
              ? ((pendingBySource[t.id as AgentSource] ?? 0) > 0 ? pendingBySource[t.id as AgentSource] : null)
              : null

          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'relative px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                tab === t.id
                  ? 'bg-slate-800 text-slate-100 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
              )}
            >
              {t.label}
              {badge != null && (badge as number) > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {(badge as number) > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Conteo */}
      <p className="text-xs text-slate-600">
        {displayed.length} recomendación{displayed.length !== 1 ? 'es' : ''}
      </p>

      {/* ── Lista ── */}
      {displayed.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl py-16 flex flex-col items-center gap-3">
          <Brain className="w-8 h-8 text-slate-700" />
          <p className="text-sm text-slate-500">Sin recomendaciones en esta vista</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(rec => {
            const cfg        = AGENT_CFG[rec.source]
            const AgentIcon  = cfg.icon
            const isExpanded = expandedId === rec.id
            const isDimming  = dismissingId === rec.id

            return (
              <div
                key={rec.id}
                className={cn(
                  'bg-slate-900 border rounded-xl overflow-hidden transition-all',
                  rec.status === 'descartada' ? 'border-slate-800/50 opacity-50' : 'border-slate-800'
                )}
              >
                {/* ── Cabecera de la tarjeta ── */}
                <div className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    {/* Ícono del agente */}
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', cfg.iconBg)}>
                      <AgentIcon className={cn('w-4 h-4', cfg.iconText)} />
                    </div>

                    {/* Contenido */}
                    <div className="min-w-0 flex-1">
                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={cn('inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium border', cfg.badge)}>
                          {cfg.label}
                        </span>
                        <span className={cn(
                          'inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium border uppercase tracking-wide',
                          PRIORITY_STYLES[rec.priority]
                        )}>
                          {rec.priority}
                        </span>
                        <span className={cn('inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium', STATUS_STYLES[rec.status])}>
                          {rec.status}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-600 font-mono">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(rec.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {rec.lead_name && (
                          <span className="text-[10px] text-slate-500 italic truncate max-w-[160px]">
                            {rec.lead_name}
                          </span>
                        )}
                      </div>

                      {/* Título */}
                      <h3 className="text-sm font-semibold text-slate-100 leading-snug">{rec.title}</h3>

                      {/* Descripción */}
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">{rec.description}</p>

                      {/* Impacto y Acción */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                        {rec.expected_impact && (
                          <p className="text-xs text-green-400 flex items-start gap-1">
                            <span className="text-[10px] text-slate-600 uppercase tracking-wide flex-shrink-0 mt-0.5">Impacto</span>
                            {rec.expected_impact}
                          </p>
                        )}
                        {rec.suggested_action && (
                          <p className="text-xs text-blue-400 flex items-start gap-1">
                            <span className="text-[10px] text-slate-600 uppercase tracking-wide flex-shrink-0 mt-0.5">Acción</span>
                            {rec.suggested_action}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Toggle expandir */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : rec.id)}
                      className="flex-shrink-0 text-slate-500 hover:text-slate-300 mt-1 transition-colors"
                      title={isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* ── Botones de acción ── */}
                  {rec.status === 'pendiente' && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800/60 flex-wrap">
                      <button
                        onClick={() => handleApprove(rec.id, rec.source)}
                        disabled={approving === rec.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-300 bg-green-900/30 hover:bg-green-900/50 border border-green-700/40 rounded-md transition-colors disabled:opacity-50"
                      >
                        {approving === rec.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                        Aprobar
                      </button>
                      <button
                        onClick={() => {
                          if (dismissingId === rec.id) { setDismId(null); setDimR('') }
                          else setDismId(rec.id)
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/40 hover:bg-red-500/5 rounded-md transition-colors"
                      >
                        <XCircle className="w-3 h-3" />
                        Descartar
                      </button>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : rec.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300 border border-slate-800 rounded-md transition-colors"
                      >
                        {isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                      </button>
                    </div>
                  )}

                  {/* ── Formulario de descarte inline ── */}
                  {isDimming && (
                    <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-2">
                      <p className="text-xs text-slate-500">Motivo del descarte (opcional):</p>
                      <input
                        type="text"
                        value={dismissReason}
                        onChange={e => setDimR(e.target.value)}
                        placeholder="Ej: No aplica por ahora, baja prioridad…"
                        className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-md text-slate-300 placeholder-slate-600 focus:outline-none focus:border-slate-600"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDismiss(rec.id, rec.source)}
                          disabled={dismissing === rec.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-300 bg-red-900/30 border border-red-700/40 rounded-md hover:bg-red-900/50 transition-colors disabled:opacity-50"
                        >
                          {dismissing === rec.id && <Loader2 className="w-3 h-3 animate-spin" />}
                          Confirmar descarte
                        </button>
                        <button
                          onClick={() => { setDismId(null); setDimR('') }}
                          className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Vista expandida ── */}
                {isExpanded && (
                  <div className="border-t border-slate-800 bg-slate-950/40 px-5 py-4 space-y-4">

                    {/* Razonamiento completo */}
                    {rec.reasoning && rec.reasoning !== rec.description && (
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Razonamiento del agente</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{rec.reasoning}</p>
                      </div>
                    )}

                    {/* Mensaje sugerido */}
                    {rec.suggested_message && (
                      <div className="bg-slate-800/60 rounded-lg px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Mensaje sugerido</p>
                          <button
                            onClick={() => handleCopy(`${rec.id}_msg`, rec.suggested_message!)}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                          >
                            {copied === `${rec.id}_msg`
                              ? <CheckCheck className="w-3 h-3 text-green-400" />
                              : <Copy className="w-3 h-3" />
                            }
                            {copied === `${rec.id}_msg` ? 'Copiado' : 'Copiar'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-300 italic leading-relaxed whitespace-pre-wrap">
                          "{rec.suggested_message}"
                        </p>
                      </div>
                    )}

                    {/* Lead asociado */}
                    {rec.lead_name && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Lead:</span>
                        {rec.lead_id ? (
                          <a href={`/leads`} className="text-xs text-blue-400 hover:text-blue-300 underline">
                            {rec.lead_name}
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">{rec.lead_name}</span>
                        )}
                      </div>
                    )}

                    {/* Metadata adicional */}
                    {rec.metadata && Object.keys(rec.metadata).length > 0 && (
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Detalles adicionales</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {Object.entries(rec.metadata).map(([k, v]) =>
                            v != null ? (
                              <div key={k} className="bg-slate-800/50 rounded-md px-3 py-2">
                                <p className="text-[10px] text-slate-600 capitalize">{k.replace(/_/g, ' ')}</p>
                                <p className="text-xs text-slate-300 truncate">{String(v)}</p>
                              </div>
                            ) : null
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, color, bg,
}: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <p className="text-xs text-slate-500 mb-2 leading-tight">{label}</p>
      <p className={cn('text-2xl font-bold font-mono', color)}>{value}</p>
    </div>
  )
}
