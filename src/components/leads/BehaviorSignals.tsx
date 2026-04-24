'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity, Plus, X,
  MessageSquare, Send, Zap, BellOff, DollarSign, Shield,
  AlertTriangle, Star, Calendar, CalendarX, FileText, FileCheck,
  PenLine, CheckCircle2, Mail, MailOpen, MessageCircle,
  Smartphone, RefreshCw, UserMinus, CheckSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { registerSignal } from '@/app/leads/behavior-actions'
import type { BehaviorSignal, SignalType, SignalSentiment, SignalIntentLevel } from '@/types/behavior.types'
import {
  SIGNAL_TYPE_LABELS, SENTIMENT_LABELS, INTENT_LABELS, ALL_SIGNAL_TYPES,
} from '@/types/behavior.types'

// ── Íconos por tipo de señal ──────────────────────────────────

const SIGNAL_ICONS: Record<SignalType, React.ElementType> = {
  message_received:    MessageSquare,
  message_sent:        Send,
  fast_reply:          Zap,
  no_response:         BellOff,
  asked_price:         DollarSign,
  asked_security:      Shield,
  showed_fear:         AlertTriangle,
  showed_interest:     Star,
  requested_meeting:   Calendar,
  meeting_booked:      CheckSquare,
  meeting_missed:      CalendarX,
  docs_requested:      FileText,
  docs_received:       FileCheck,
  contract_sent:       Send,
  contract_signed:     PenLine,
  operation_completed: CheckCircle2,
  email_opened:        Mail,
  email_clicked:       MailOpen,
  whatsapp_replied:    MessageCircle,
  sms_replied:         Smartphone,
  reactivated:         RefreshCw,
  unsubscribed:        UserMinus,
}

// ── Colores por sentiment ─────────────────────────────────────

const SENTIMENT_ICON_COLOR: Record<SignalSentiment, string> = {
  positive: 'text-green-400 bg-green-500/10 border-green-500/20',
  neutral:  'text-blue-400  bg-blue-500/10  border-blue-500/20',
  doubtful: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  negative: 'text-red-400   bg-red-500/10   border-red-500/20',
}

const SENTIMENT_BADGE: Record<SignalSentiment, string> = {
  positive: 'bg-green-900/40 text-green-400',
  neutral:  'bg-blue-900/40  text-blue-400',
  doubtful: 'bg-amber-900/40 text-amber-400',
  negative: 'bg-red-900/40   text-red-400',
}

const INTENT_BADGE: Record<SignalIntentLevel, string> = {
  low:       'bg-slate-800 text-slate-400',
  medium:    'bg-blue-900/40  text-blue-400',
  high:      'bg-amber-900/40 text-amber-400',
  very_high: 'bg-orange-900/40 text-orange-400',
}

// ── Props ─────────────────────────────────────────────────────

type Props = {
  leadId?:        string
  clientId?:      string
  initialSignals: BehaviorSignal[]
}

// ── Componente principal ──────────────────────────────────────

export function BehaviorSignals({ leadId, clientId, initialSignals }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [signals, setSignals]       = useState<BehaviorSignal[]>(initialSignals)
  const [showModal, setShowModal]   = useState(false)
  const [error, setError]           = useState<string | null>(null)

  // Form state
  const [fType,      setFType]      = useState<SignalType>('message_received')
  const [fChannel,   setFChannel]   = useState('')
  const [fDesc,      setFDesc]      = useState('')
  const [fSentiment, setFSentiment] = useState<SignalSentiment>('neutral')
  const [fIntent,    setFIntent]    = useState<SignalIntentLevel>('medium')
  const [fIntensity, setFIntensity] = useState(50)

  function resetForm() {
    setFType('message_received')
    setFChannel('')
    setFDesc('')
    setFSentiment('neutral')
    setFIntent('medium')
    setFIntensity(50)
    setError(null)
  }

  function handleSubmit() {
    startTransition(async () => {
      setError(null)
      const res = await registerSignal({
        lead_id:        leadId   ?? null,
        client_id:      clientId ?? null,
        signal_type:    fType,
        signal_source:  'manual',
        signal_channel: fChannel || null,
        signal_time:    new Date().toISOString(),
        intensity_score: fIntensity,
        sentiment:      fSentiment,
        intent_level:   fIntent,
        description:    fDesc || null,
        metadata_json:  null,
        created_by:     null,
      })

      if (!res.success) { setError(res.error); return }

      setSignals(prev => [res.data, ...prev])
      setShowModal(false)
      resetForm()
      router.refresh()
    })
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

      {/* Encabezado */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-slate-200">Señales de comportamiento</h2>
          {signals.length > 0 && (
            <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-md">
              {signals.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 border border-slate-700 hover:border-slate-600 hover:text-slate-100 rounded-md transition-colors"
        >
          <Plus className="w-3 h-3" />
          Registrar señal
        </button>
      </div>

      {/* Timeline */}
      {signals.length === 0 ? (
        <div className="py-10 text-center text-slate-500 text-sm">
          Sin señales registradas aún.
        </div>
      ) : (
        <div className="divide-y divide-slate-800/50 max-h-[520px] overflow-y-auto">
          {signals.map(s => {
            const Icon = SIGNAL_ICONS[s.signal_type] ?? Activity
            const iconCls = s.sentiment ? SENTIMENT_ICON_COLOR[s.sentiment] : 'text-slate-400 bg-slate-800 border-slate-700'

            return (
              <div key={s.id} className="px-5 py-3.5 hover:bg-slate-800/20 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Ícono */}
                  <div className={cn('w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5', iconCls)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-200">
                        {SIGNAL_TYPE_LABELS[s.signal_type]}
                      </span>
                      {s.sentiment && (
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', SENTIMENT_BADGE[s.sentiment])}>
                          {SENTIMENT_LABELS[s.sentiment]}
                        </span>
                      )}
                      {s.intent_level && (
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', INTENT_BADGE[s.intent_level])}>
                          {INTENT_LABELS[s.intent_level]}
                        </span>
                      )}
                    </div>

                    {/* Descripción */}
                    {s.description && (
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{s.description}</p>
                    )}

                    {/* Fila inferior: canal + intensidad + fecha */}
                    <div className="flex items-center gap-4 mt-2">
                      {s.signal_channel && (
                        <span className="text-xs text-slate-500">via {s.signal_channel}</span>
                      )}
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              s.intensity_score >= 75 ? 'bg-orange-500' :
                              s.intensity_score >= 50 ? 'bg-blue-500'   :
                              s.intensity_score >= 25 ? 'bg-slate-500'  : 'bg-red-500/60'
                            )}
                            style={{ width: `${s.intensity_score}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-600 font-mono">{s.intensity_score}</span>
                      </div>
                      <span className="text-[10px] text-slate-600 font-mono ml-auto">
                        {new Date(s.signal_time).toLocaleString('es-CL', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de registro */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowModal(false); resetForm() }} />
          <div className="relative w-full max-w-lg bg-slate-900 rounded-xl border border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">

            {/* Header modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200">Registrar señal</h3>
              <button onClick={() => { setShowModal(false); resetForm() }} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body modal */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">{error}</p>
              )}

              {/* Tipo de señal */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Tipo de señal</label>
                <select
                  value={fType}
                  onChange={e => setFType(e.target.value as SignalType)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-3 py-2 outline-none focus:border-slate-500"
                >
                  {ALL_SIGNAL_TYPES.map(t => (
                    <option key={t} value={t}>{SIGNAL_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              {/* Canal */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Canal de comunicación</label>
                <input
                  type="text"
                  placeholder="Ej: WhatsApp, Email, Llamada..."
                  value={fChannel}
                  onChange={e => setFChannel(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-3 py-2 outline-none focus:border-slate-500 placeholder:text-slate-600"
                />
              </div>

              {/* Sentimiento */}
              <div>
                <label className="block text-xs text-slate-400 mb-2">Sentimiento detectado</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['positive', 'neutral', 'doubtful', 'negative'] as SignalSentiment[]).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFSentiment(s)}
                      className={cn(
                        'py-1.5 text-xs rounded-md border transition-colors',
                        fSentiment === s
                          ? SENTIMENT_BADGE[s] + ' border-transparent'
                          : 'border-slate-700 text-slate-500 hover:border-slate-600'
                      )}
                    >
                      {SENTIMENT_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nivel de intención */}
              <div>
                <label className="block text-xs text-slate-400 mb-2">Nivel de intención</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['low', 'medium', 'high', 'very_high'] as SignalIntentLevel[]).map(i => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFIntent(i)}
                      className={cn(
                        'py-1.5 text-xs rounded-md border transition-colors',
                        fIntent === i
                          ? INTENT_BADGE[i] + ' border-transparent'
                          : 'border-slate-700 text-slate-500 hover:border-slate-600'
                      )}
                    >
                      {INTENT_LABELS[i]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Intensidad */}
              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  Intensidad: <span className="font-mono text-slate-300">{fIntensity}</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={fIntensity}
                  onChange={e => setFIntensity(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                  <span>0 — sin señal</span>
                  <span>100 — máxima</span>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Descripción (opcional)</label>
                <textarea
                  rows={3}
                  placeholder="Detalles adicionales sobre esta señal..."
                  value={fDesc}
                  onChange={e => setFDesc(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-md px-3 py-2 outline-none focus:border-slate-500 placeholder:text-slate-600 resize-none"
                />
              </div>
            </div>

            {/* Footer modal */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-800">
              <button
                onClick={() => { setShowModal(false); resetForm() }}
                className="px-4 py-2 text-sm text-slate-400 border border-slate-700 rounded-md hover:border-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-md transition-colors disabled:opacity-50"
              >
                {isPending ? 'Guardando…' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
