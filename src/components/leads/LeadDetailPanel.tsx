'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  X, Brain, Loader2, Zap, ChevronDown, ChevronUp,
  UserCheck, CheckCircle2, AlertCircle, Target, Copy, CheckCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lead, LeadStage } from '@/types'
import type { SavedRecommendation, BehaviorSignal, SavedSalesAnalysis } from '@/types/agent.types'
import type { LeadEvent } from '@/types/leads-marketing.types'
import { LeadStatusBadge } from './LeadStatusBadge'
import {
  analyzeLeadAction,
  getLeadDetailsAction,
  updateLeadFieldAction,
  registerSignalAction,
  markRecommendationViewedAction,
} from '@/app/leads/agent-actions'
import { analyzeSalesAction } from '@/app/leads/sales-agent-actions'
import { convertLead } from '@/app/leads/actions'
import { STAGE_LABELS, STAGE_ORDER } from '@/types/leads-marketing.types'

// ── Badge de urgencia ─────────────────────────────────────────
function UrgencyBadge({ urgency }: { urgency: 'alta' | 'media' | 'baja' }) {
  const cls =
    urgency === 'alta'  ? 'bg-red-500/15 text-red-400 border-red-500/30' :
    urgency === 'media' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                          'bg-slate-700/60 text-slate-400 border-slate-600/40'
  return (
    <span className={cn('inline-block px-2 py-0.5 rounded-md text-xs font-medium border uppercase tracking-wide', cls)}>
      {urgency}
    </span>
  )
}

// ── Sección colapsable ────────────────────────────────────────
function Section({
  title, count, defaultOpen = false, children,
}: {
  title: React.ReactNode
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="px-5 py-3 border-b border-slate-800 space-y-2">
      <button onClick={() => setOpen(v => !v)} className="flex items-center justify-between w-full">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          {title}
          {count !== undefined && (
            <span className="normal-case font-normal text-slate-600">({count})</span>
          )}
        </span>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
          : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
        }
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────
type Props = {
  lead:      Lead
  onClose:   () => void
  onRefresh: () => void
}

export function LeadDetailPanel({ lead, onClose, onRefresh }: Props) {
  const router                   = useRouter()
  const [, startTransition]      = useTransition()

  // Datos remotos
  const [events,  setEvents]  = useState<LeadEvent[]>([])
  const [signals, setSignals] = useState<BehaviorSignal[]>([])
  const [lastRec, setLastRec] = useState<SavedRecommendation | null>(null)
  const [loading, setLoading] = useState(true)

  // Lead local (para reflejar cambios de stage/asignación sin esperar refresh)
  const [localLead, setLocalLead] = useState<Lead>(lead)

  // Análisis
  const [analyzing,     setAnalyzing]     = useState(false)
  const [analyzeError,  setAnalyzeError]  = useState<string | null>(null)

  // Acciones
  const [applyingStage, setApplyingStage] = useState(false)
  const [showStageMenu, setShowStageMenu] = useState(false)
  const [converting,    setConverting]    = useState(false)

  // Formulario de señal
  const [showSignalForm,    setShowSignalForm]    = useState(false)
  const [signalType,        setSignalType]        = useState('whatsapp_message')
  const [signalSentiment,   setSignalSentiment]   = useState('neutral')
  const [signalIntent,      setSignalIntent]      = useState('medio')
  const [signalDesc,        setSignalDesc]        = useState('')
  const [registeringSignal, setRegisteringSignal] = useState(false)
  const [signalSuccess,     setSignalSuccess]     = useState(false)

  // Contexto adicional para análisis
  const [analysisNotes, setAnalysisNotes] = useState('')

  // Sales Agent
  const [salesAnalysis,    setSalesAnalysis]    = useState<SavedSalesAnalysis | null>(null)
  const [analyzingSales,   setAnalyzingSales]   = useState(false)
  const [salesError,       setSalesError]       = useState<string | null>(null)
  const [copiedMessage,    setCopiedMessage]    = useState(false)

  // Carga inicial
  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await getLeadDetailsAction(lead.id)
      if (res.success) {
        setEvents(res.events ?? [])
        setSignals(res.signals ?? [])
        setLastRec(res.lastRecommendation ?? null)
      }
      setLoading(false)
    }
    load()
  }, [lead.id])

  // Sincronizar lead cuando cambia desde afuera
  useEffect(() => { setLocalLead(lead) }, [lead])

  // ── Handlers ─────────────────────────────────────────────────

  async function handleAnalyze() {
    setAnalyzing(true)
    setAnalyzeError(null)
    const result = await analyzeLeadAction(lead.id)
    setAnalyzing(false)
    if (result.success && result.data) {
      setLastRec(result.data)
    } else {
      setAnalyzeError(result.error ?? 'Error al analizar')
    }
  }

  async function handleChangeStage(stage: LeadStage) {
    setApplyingStage(true)
    setShowStageMenu(false)
    const res = await updateLeadFieldAction(lead.id, { stage })
    setApplyingStage(false)
    if (res.success) {
      setLocalLead(prev => ({ ...prev, stage }))
      onRefresh()
    }
  }

  async function handleAssign(assignedTo: string) {
    const next = localLead.assigned_to === assignedTo ? null : assignedTo
    await updateLeadFieldAction(lead.id, { assigned_to: next })
    setLocalLead(prev => ({ ...prev, assigned_to: next }))
    onRefresh()
  }

  async function handleApplyRec() {
    if (!lastRec) return
    await Promise.all([
      updateLeadFieldAction(lead.id, { assigned_to: lastRec.assigned_to_recommendation }),
      markRecommendationViewedAction(lastRec.id),
    ])
    setLocalLead(prev => ({ ...prev, assigned_to: lastRec.assigned_to_recommendation }))
    setLastRec(prev => prev ? { ...prev, viewed_at: new Date().toISOString() } : null)
    onRefresh()
  }

  async function handleConvert() {
    setConverting(true)
    await convertLead(lead.id)
    setConverting(false)
    onRefresh()
    onClose()
  }

  async function handleRegisterSignal() {
    if (!signalDesc.trim()) return
    setRegisteringSignal(true)
    const intensityMap: Record<string, Record<string, number>> = {
      positivo: { alto: 85, medio: 65, bajo: 45 },
      neutral:  { alto: 60, medio: 45, bajo: 30 },
      negativo: { alto: 20, medio: 30, bajo: 40 },
    }
    await registerSignalAction(lead.id, {
      signal_type:     signalType,
      sentiment:       signalSentiment,
      intent_level:    signalIntent,
      intensity_score: intensityMap[signalSentiment]?.[signalIntent] ?? 50,
      description:     signalDesc,
    })
    // Refrescar señales
    const res = await getLeadDetailsAction(lead.id)
    if (res.success) setSignals(res.signals ?? [])
    setRegisteringSignal(false)
    setSignalDesc('')
    setShowSignalForm(false)
    setSignalSuccess(true)
    setTimeout(() => setSignalSuccess(false), 3000)
  }

  async function handleSalesAnalysis() {
    setAnalyzingSales(true)
    setSalesError(null)
    const result = await analyzeSalesAction(lead.id)
    setAnalyzingSales(false)
    if (result.success && result.data) {
      setSalesAnalysis(result.data)
    } else {
      setSalesError(result.error ?? 'Error al generar estrategia de cierre')
    }
  }

  async function handleCopyMessage(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessage(true)
      setTimeout(() => setCopiedMessage(false), 2000)
    } catch {
      // Clipboard no disponible
    }
  }

  const priorityDot =
    localLead.priority_label === 'hot'       ? 'bg-red-500' :
    localLead.priority_label === 'warm'      ? 'bg-amber-400' :
    localLead.priority_label === 'follow_up' ? 'bg-blue-400' :
                                               'bg-slate-600'

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel lateral */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', priorityDot)} />
              <h2 className="text-base font-semibold text-slate-100">{localLead.full_name}</h2>
              <LeadStatusBadge status={localLead.stage} />
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
              {localLead.phone         && <span>{localLead.phone}</span>}
              {localLead.source_channel && <span>· {localLead.source_channel}</span>}
              {localLead.assigned_to    && <span>· Asignado: <span className="text-slate-400">{localLead.assigned_to}</span></span>}
              <span>· Heat: <span className="font-mono text-slate-400">{localLead.heat_score}</span></span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 flex-shrink-0 p-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Barra de acciones rápidas ── */}
        <div className="px-5 py-3 border-b border-slate-800 flex flex-wrap gap-2 flex-shrink-0">
          {/* Cambiar stage */}
          <div className="relative">
            <button
              onClick={() => setShowStageMenu(v => !v)}
              disabled={applyingStage}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors disabled:opacity-50"
            >
              {applyingStage
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <ChevronDown className="w-3 h-3 text-slate-500" />
              }
              Cambiar etapa
            </button>
            {showStageMenu && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-slate-800 border border-slate-700 rounded-lg shadow-xl min-w-[180px] py-1">
                {STAGE_ORDER.map(s => (
                  <button
                    key={s}
                    onClick={() => handleChangeStage(s)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs transition-colors',
                      localLead.stage === s
                        ? 'text-blue-400 bg-blue-500/10'
                        : 'text-slate-300 hover:bg-slate-700'
                    )}
                  >
                    {STAGE_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Asignar Magda */}
          <button
            onClick={() => handleAssign('Magda')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors',
              localLead.assigned_to === 'Magda'
                ? 'text-violet-300 bg-violet-500/10 border-violet-500/30'
                : 'text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-700'
            )}
          >
            <UserCheck className="w-3 h-3" />
            Magda
          </button>

          {/* Asignar Alberto */}
          <button
            onClick={() => handleAssign('Alberto')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors',
              localLead.assigned_to === 'Alberto'
                ? 'text-blue-300 bg-blue-500/10 border-blue-500/30'
                : 'text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-700'
            )}
          >
            <UserCheck className="w-3 h-3" />
            Alberto
          </button>

          {/* Registrar señal */}
          <button
            onClick={() => setShowSignalForm(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors',
              showSignalForm
                ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                : 'text-slate-300 bg-slate-800 hover:bg-slate-700 border-slate-700'
            )}
          >
            <Zap className="w-3 h-3 text-amber-400" />
            Registrar señal
          </button>

          {/* Convertir */}
          {localLead.stage !== 'operated' && localLead.stage !== 'lost' && (
            <button
              onClick={handleConvert}
              disabled={converting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-md transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3 h-3" />
              {converting ? '…' : 'Convertir a cliente'}
            </button>
          )}
        </div>

        {/* ── Formulario de señal ── */}
        {showSignalForm && (
          <div className="px-5 py-3 border-b border-slate-800 space-y-2 bg-slate-800/30 flex-shrink-0">
            <p className="text-xs font-medium text-amber-400">Nueva señal de comportamiento</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: 'Tipo',
                  value: signalType,
                  onChange: setSignalType,
                  options: [
                    ['whatsapp_message', 'WhatsApp'],
                    ['call', 'Llamada'],
                    ['email_open', 'Email abierto'],
                    ['page_visit', 'Visita web'],
                    ['form_submit', 'Formulario'],
                    ['ad_click', 'Clic anuncio'],
                  ],
                },
                {
                  label: 'Sentimiento',
                  value: signalSentiment,
                  onChange: setSignalSentiment,
                  options: [
                    ['positivo', 'Positivo'],
                    ['neutral', 'Neutral'],
                    ['negativo', 'Negativo'],
                  ],
                },
                {
                  label: 'Intención',
                  value: signalIntent,
                  onChange: setSignalIntent,
                  options: [
                    ['alto', 'Alta'],
                    ['medio', 'Media'],
                    ['bajo', 'Baja'],
                  ],
                },
              ].map(({ label, value, onChange, options }) => (
                <div key={label}>
                  <label className="text-xs text-slate-500 block mb-1">{label}</label>
                  <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded-md px-2 py-1.5 outline-none"
                  >
                    {options.map(([val, lbl]) => (
                      <option key={val} value={val}>{lbl}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <textarea
              value={signalDesc}
              onChange={e => setSignalDesc(e.target.value)}
              placeholder="Descripción de la señal (ej: respondió positivamente al precio)…"
              rows={2}
              className="w-full bg-slate-800 border border-slate-700 text-xs text-slate-300 placeholder:text-slate-600 rounded-md px-3 py-2 outline-none resize-none focus:border-amber-600/60 transition-colors"
            />
            <div className="flex gap-2 items-center">
              <button
                onClick={handleRegisterSignal}
                disabled={!signalDesc.trim() || registeringSignal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-amber-600 hover:bg-amber-500 rounded-md disabled:opacity-50 transition-colors"
              >
                {registeringSignal ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                Registrar
              </button>
              <button onClick={() => setShowSignalForm(false)} className="text-xs text-slate-500 hover:text-slate-300">
                Cancelar
              </button>
              {signalSuccess && <span className="text-xs text-green-400">✓ Señal registrada</span>}
            </div>
          </div>
        )}

        {/* ── Error de análisis ── */}
        {analyzeError && (
          <div className="mx-5 mt-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 flex-shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400">{analyzeError}</p>
          </div>
        )}

        {/* ── Cuerpo scrollable ── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
            </div>
          ) : (
            <div className="divide-y divide-slate-800">

              {/* ── Datos del lead ── */}
              <Section title="Datos del lead" defaultOpen>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mt-1">
                  {[
                    ['Teléfono',    localLead.phone],
                    ['Email',       localLead.email],
                    ['Canal',       localLead.source_channel],
                    ['Campaña',     localLead.campaign_name],
                    ['Heat score',  String(localLead.heat_score)],
                    ['Registrado',  new Date(localLead.created_at).toLocaleDateString('es-CL')],
                    ['Prioridad',   localLead.priority_label ?? '—'],
                    ['Tipo',        localLead.lead_type ?? '—'],
                  ].map(([k, v]) => v ? (
                    <div key={k}>
                      <span className="text-slate-500">{k}</span>
                      <p className="text-slate-300 mt-0.5">{v}</p>
                    </div>
                  ) : null)}
                  {localLead.next_action && (
                    <div className="col-span-2">
                      <span className="text-slate-500">Próxima acción</span>
                      <p className="text-slate-300 mt-0.5">{localLead.next_action}</p>
                    </div>
                  )}
                  {localLead.notes && (
                    <div className="col-span-2">
                      <span className="text-slate-500">Notas</span>
                      <p className="text-slate-300 mt-0.5 whitespace-pre-wrap">{localLead.notes}</p>
                    </div>
                  )}
                </div>
              </Section>

              {/* ── Última recomendación IA ── */}
              <Section
                title={
                  <span className="flex items-center gap-1.5 text-purple-400">
                    <Brain className="w-3.5 h-3.5" />
                    Última recomendación IA
                  </span>
                }
                defaultOpen
              >
                {!lastRec ? (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-600">Sin analizar aún.</p>
                    <button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-300 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700/40 rounded-md transition-colors disabled:opacity-50"
                    >
                      {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                      {analyzing ? 'Analizando…' : 'Analizar con IA'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 mt-1">
                    <div className="flex items-center gap-2">
                      <UrgencyBadge urgency={lastRec.urgency} />
                      <span className="text-xs text-slate-600">
                        {new Date(lastRec.created_at).toLocaleString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {lastRec.viewed_at && <span className="text-xs text-slate-600">· Visto</span>}
                    </div>
                    <div className="bg-purple-900/20 border border-purple-800/30 rounded-lg px-3 py-2">
                      <p className="text-xs text-purple-400 mb-1">Próxima acción</p>
                      <p className="text-sm text-slate-200">{lastRec.next_best_action}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg px-3 py-2">
                      <p className="text-xs text-slate-500 mb-1">Mensaje sugerido</p>
                      <p className="text-xs text-slate-300 italic leading-relaxed">"{lastRec.suggested_message}"</p>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{lastRec.reasoning}</p>
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <button
                        onClick={handleApplyRec}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-300 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700/40 rounded-md transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Aplicar acción (asignar a {lastRec.assigned_to_recommendation})
                      </button>
                      <button
                        onClick={handleAnalyze}
                        disabled={analyzing}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-300 border border-slate-700 hover:border-slate-600 rounded-md transition-colors disabled:opacity-50"
                      >
                        {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                        {analyzing ? 'Analizando…' : 'Re-analizar'}
                      </button>
                    </div>
                  </div>
                )}
              </Section>

              {/* ── Estrategia de cierre (Sales Agent) ── */}
              <Section
                title={
                  <span className="flex items-center gap-1.5 text-green-400">
                    <Target className="w-3.5 h-3.5" />
                    Estrategia de cierre
                  </span>
                }
                defaultOpen
              >
                {salesError && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg mb-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    <p className="text-xs text-red-400">{salesError}</p>
                  </div>
                )}
                {!salesAnalysis ? (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-slate-600">Genera una estrategia de cierre personalizada con IA.</p>
                    <button
                      onClick={handleSalesAnalysis}
                      disabled={analyzingSales}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-300 bg-green-900/30 hover:bg-green-900/50 border border-green-700/40 rounded-md transition-colors disabled:opacity-50 flex-shrink-0 ml-3"
                    >
                      {analyzingSales ? <Loader2 className="w-3 h-3 animate-spin" /> : <Target className="w-3 h-3" />}
                      {analyzingSales ? 'Analizando…' : 'Estrategia de cierre'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 mt-1">
                    {/* Probabilidad de cierre */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500">Probabilidad de cierre</span>
                        <span className={cn(
                          'text-sm font-bold tabular-nums',
                          salesAnalysis.confidence_score >= 70 ? 'text-green-400' :
                          salesAnalysis.confidence_score >= 50 ? 'text-amber-400' :
                                                                  'text-slate-400'
                        )}>
                          {salesAnalysis.confidence_score}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            salesAnalysis.confidence_score >= 70 ? 'bg-green-500' :
                            salesAnalysis.confidence_score >= 50 ? 'bg-amber-500' :
                                                                    'bg-slate-500'
                          )}
                          style={{ width: `${salesAnalysis.confidence_score}%` }}
                        />
                      </div>
                    </div>

                    {/* Estrategia */}
                    <div className="bg-green-900/20 border border-green-800/30 rounded-lg px-3 py-2">
                      <p className="text-xs text-green-400 mb-1">Estrategia recomendada</p>
                      <p className="text-sm text-slate-200">{salesAnalysis.closing_strategy}</p>
                    </div>

                    {/* Objeción principal */}
                    <div className="bg-red-900/10 border border-red-800/20 rounded-lg px-3 py-2">
                      <p className="text-xs text-red-400 mb-1">Objeción principal detectada</p>
                      <p className="text-xs text-slate-300">{salesAnalysis.main_objection}</p>
                      <p className="text-xs text-slate-500 mt-1.5 font-medium">Cómo responderla:</p>
                      <p className="text-xs text-slate-300 mt-0.5">{salesAnalysis.objection_response}</p>
                    </div>

                    {/* Mensaje sugerido con botón copiar */}
                    <div className="bg-slate-800/50 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs text-slate-500">Mensaje sugerido</p>
                        <button
                          onClick={() => handleCopyMessage(salesAnalysis.suggested_message)}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {copiedMessage
                            ? <CheckCheck className="w-3 h-3 text-green-400" />
                            : <Copy className="w-3 h-3" />
                          }
                          {copiedMessage ? 'Copiado' : 'Copiar'}
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 italic leading-relaxed">"{salesAnalysis.suggested_message}"</p>
                    </div>

                    {/* Canal + Horario */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-800/40 rounded-lg px-3 py-2">
                        <p className="text-xs text-slate-500 mb-0.5">Mejor canal</p>
                        <p className="text-xs text-slate-300 font-medium capitalize">{salesAnalysis.best_channel}</p>
                      </div>
                      <div className="bg-slate-800/40 rounded-lg px-3 py-2">
                        <p className="text-xs text-slate-500 mb-0.5">Mejor horario</p>
                        <p className="text-xs text-slate-300 font-medium capitalize">{salesAnalysis.best_time}</p>
                      </div>
                    </div>

                    {/* Por qué actuar ahora */}
                    <div className="bg-amber-900/10 border border-amber-800/20 rounded-lg px-3 py-2">
                      <p className="text-xs text-amber-400 mb-0.5">Por qué actuar ahora</p>
                      <p className="text-xs text-slate-300">{salesAnalysis.urgency_reason}</p>
                    </div>

                    {/* Asignación + Regenerar */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className="text-xs text-slate-600">Asignar a:</span>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-md font-medium border',
                        salesAnalysis.assigned_to === 'Magda'
                          ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                          : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                      )}>
                        {salesAnalysis.assigned_to}
                      </span>
                      <button
                        onClick={handleSalesAnalysis}
                        disabled={analyzingSales}
                        className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-600 rounded-md px-2 py-1 transition-colors disabled:opacity-50"
                      >
                        {analyzingSales ? <Loader2 className="w-3 h-3 animate-spin" /> : <Target className="w-3 h-3" />}
                        {analyzingSales ? 'Analizando…' : 'Regenerar'}
                      </button>
                    </div>
                  </div>
                )}
              </Section>

              {/* ── Contexto adicional para análisis ── */}
              <Section title="Analizar con contexto adicional">
                <div className="space-y-2 mt-1">
                  <textarea
                    value={analysisNotes}
                    onChange={e => setAnalysisNotes(e.target.value)}
                    placeholder="Agrega notas o contexto antes de analizar (opcional)…"
                    rows={2}
                    className="w-full bg-slate-800 border border-slate-700 text-xs text-slate-300 placeholder:text-slate-600 rounded-md px-3 py-2 outline-none resize-none focus:border-purple-600/60 transition-colors"
                  />
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-purple-300 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700/40 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                    {analyzing ? 'Analizando…' : 'Analizar con IA'}
                  </button>
                </div>
              </Section>

              {/* ── Historial de eventos ── */}
              <Section title="Historial de eventos" count={events.length}>
                {events.length === 0 ? (
                  <p className="text-xs text-slate-600 mt-1">Sin eventos registrados.</p>
                ) : (
                  <div className="space-y-1.5 mt-1 max-h-52 overflow-y-auto pr-1">
                    {events.map(ev => (
                      <div key={ev.id} className="flex items-start gap-2 text-xs">
                        <span className="text-slate-600 font-mono whitespace-nowrap flex-shrink-0">
                          {new Date(ev.created_at).toLocaleDateString('es-CL')}
                        </span>
                        <div>
                          <span className="text-slate-300">{ev.event_type}</span>
                          {ev.description && (
                            <span className="text-slate-500"> — {ev.description}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* ── Señales de comportamiento ── */}
              <Section title="Señales de comportamiento" count={signals.length}>
                {signals.length === 0 ? (
                  <p className="text-xs text-slate-600 mt-1">Sin señales registradas.</p>
                ) : (
                  <div className="space-y-2 mt-1 max-h-52 overflow-y-auto pr-1">
                    {signals.map(sig => (
                      <div key={sig.id} className="bg-slate-800/50 rounded-lg px-3 py-2 text-xs space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-amber-400 font-medium">{sig.signal_type}</span>
                          <span className={cn(
                            'px-1.5 py-0.5 rounded text-[10px] font-medium',
                            sig.sentiment === 'positivo' ? 'bg-green-500/15 text-green-400' :
                            sig.sentiment === 'negativo' ? 'bg-red-500/15 text-red-400' :
                                                           'bg-slate-700 text-slate-400'
                          )}>
                            {sig.sentiment}
                          </span>
                          <span className="text-slate-500">intensidad: <span className="font-mono">{sig.intensity_score}/100</span></span>
                        </div>
                        {sig.description && <p className="text-slate-400">{sig.description}</p>}
                        <p className="text-slate-600">
                          {new Date(sig.signal_time).toLocaleDateString('es-CL')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

            </div>
          )}
        </div>
      </div>
    </>
  )
}
