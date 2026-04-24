'use server'

import { createClient } from '@/lib/supabase/server'
import type {
  BehaviorSignal, BehaviorSignalInsert, SignalType,
  SignalSentiment, SignalIntentLevel, SignalsAggregate,
} from '@/types/behavior.types'
import { ALL_SIGNAL_TYPES } from '@/types/behavior.types'
import type { LeadEventType } from '@/types/leads-marketing.types'

type ActionResult<T = BehaviorSignal> =
  | { success: true;  data: T }
  | { success: false; error: string }

// Mapeo de eventos de lead a señales de comportamiento
const EVENT_TO_SIGNAL: Partial<Record<LeadEventType, {
  signal_type:    SignalType
  sentiment?:     SignalSentiment
  intent_level?:  SignalIntentLevel
  intensity_score?: number
}>> = {
  mensaje_recibido:    { signal_type: 'message_received', sentiment: 'neutral',   intent_level: 'medium',   intensity_score: 50 },
  intencion_detectada: { signal_type: 'showed_interest',  sentiment: 'positive',  intent_level: 'high',     intensity_score: 70 },
  reunion_agendada:    { signal_type: 'meeting_booked',   sentiment: 'positive',  intent_level: 'high',     intensity_score: 80 },
  docs_solicitados:    { signal_type: 'docs_requested',   sentiment: 'positive',  intent_level: 'high',     intensity_score: 75 },
  docs_recibidos:      { signal_type: 'docs_received',    sentiment: 'positive',  intent_level: 'very_high',intensity_score: 85 },
  contrato_firmado:    { signal_type: 'contract_signed',  sentiment: 'positive',  intent_level: 'very_high',intensity_score: 95 },
  sin_respuesta:       { signal_type: 'no_response',      sentiment: 'negative',  intent_level: 'low',      intensity_score: 20 },
  convertido:          { signal_type: 'operation_completed', sentiment: 'positive', intent_level: 'very_high', intensity_score: 100 },
  reactivado:          { signal_type: 'reactivated',      sentiment: 'neutral',   intent_level: 'medium',   intensity_score: 55 },
}

// ── 1. registerSignal ─────────────────────────────────────────

export async function registerSignal(
  params: BehaviorSignalInsert,
): Promise<ActionResult> {
  if (!ALL_SIGNAL_TYPES.includes(params.signal_type)) {
    return { success: false, error: `Tipo de señal inválido: ${params.signal_type}` }
  }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('user_behavior_signals')
    .insert({
      lead_id:        params.lead_id,
      client_id:      params.client_id,
      signal_type:    params.signal_type,
      signal_source:  params.signal_source ?? 'manual',
      signal_channel: params.signal_channel ?? null,
      signal_time:    params.signal_time ?? new Date().toISOString(),
      intensity_score: params.intensity_score ?? 50,
      sentiment:      params.sentiment ?? null,
      intent_level:   params.intent_level ?? null,
      description:    params.description ?? null,
      metadata_json:  params.metadata_json ?? null,
      created_by:     params.created_by ?? null,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as BehaviorSignal }
}

// ── 2. registerSignalFromEvent ────────────────────────────────

export async function registerSignalFromEvent(leadEvent: {
  lead_id:    string
  event_type: LeadEventType
  description?: string | null
  created_by?:  string | null
}): Promise<ActionResult> {
  const mapping = EVENT_TO_SIGNAL[leadEvent.event_type]
  if (!mapping) {
    return { success: false, error: `No hay mapeo para el evento: ${leadEvent.event_type}` }
  }

  return registerSignal({
    lead_id:        leadEvent.lead_id,
    client_id:      null,
    signal_type:    mapping.signal_type,
    signal_source:  'sistema',
    signal_channel: null,
    signal_time:    new Date().toISOString(),
    intensity_score: mapping.intensity_score ?? 50,
    sentiment:      mapping.sentiment ?? null,
    intent_level:   mapping.intent_level ?? null,
    description:    leadEvent.description ?? null,
    metadata_json:  null,
    created_by:     leadEvent.created_by ?? null,
  })
}

// ── 3. getSignalsByLead ───────────────────────────────────────

export async function getSignalsByLead(leadId: string): Promise<BehaviorSignal[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('user_behavior_signals')
    .select('*')
    .eq('lead_id', leadId)
    .order('signal_time', { ascending: false })
    .limit(200)

  return (data ?? []) as BehaviorSignal[]
}

// ── 4. getSignalsByClient ─────────────────────────────────────

export async function getSignalsByClient(clientId: string): Promise<BehaviorSignal[]> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('user_behavior_signals')
    .select('*')
    .eq('client_id', clientId)
    .order('signal_time', { ascending: false })
    .limit(200)

  return (data ?? []) as BehaviorSignal[]
}

// ── 5. aggregateSignalsForScoring ─────────────────────────────

export async function aggregateSignalsForScoring(leadId: string): Promise<SignalsAggregate> {
  const signals = await getSignalsByLead(leadId)

  const positives = signals.filter(s => s.sentiment === 'positive')
  const negatives = signals.filter(s => s.sentiment === 'negative' || s.sentiment === 'doubtful')

  // Tipo de señal más frecuente
  const typeCounts: Record<string, number> = {}
  for (const s of signals) {
    typeCounts[s.signal_type] = (typeCounts[s.signal_type] ?? 0) + 1
  }
  const topSignalType = (Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] ?? null) as SignalType | null

  // Intent level dominante (jerarquía: very_high > high > medium > low)
  const intentCounts: Record<string, number> = {}
  for (const s of signals) {
    if (s.intent_level) {
      intentCounts[s.intent_level] = (intentCounts[s.intent_level] ?? 0) + 1
    }
  }
  const INTENT_ORDER: SignalIntentLevel[] = ['very_high', 'high', 'medium', 'low']
  const dominantIntent = INTENT_ORDER.find(i => (intentCounts[i] ?? 0) > 0) ?? null

  return {
    total_positive:  positives.length,
    total_negative:  negatives.length,
    last_signal:     signals[0] ?? null,
    top_signal_type: topSignalType,
    dominant_intent: dominantIntent,
  }
}
