import type { Lead, LeadStage, LeadPriority } from '@/types'

export type ScoreResult = {
  heat_score:                 number
  priority_label:             LeadPriority
  assigned_to_recommendation: string
  next_action:                string
}

const NEXT_BEST_ACTION: Record<LeadStage, string> = {
  new:               'Contactar por WhatsApp',
  contacted:         'Hacer seguimiento',
  qualified:         'Solicitar documentos',
  docs_pending:      'Revisar documentos recibidos',
  ready_to_schedule: 'Agendar reunión',
  ready_to_operate:  'Pasar a Alberto para operar',
  operated:          'Hacer seguimiento post-operación',
  dormant:           'Intentar reactivar',
  lost:              'Archivar lead',
}

const QUALIFIED_OR_HIGHER: LeadStage[] = [
  'qualified', 'docs_pending', 'ready_to_schedule', 'ready_to_operate', 'operated',
]

const ALBERTO_STAGES: LeadStage[] = ['ready_to_schedule', 'ready_to_operate', 'operated']

// Keywords that indicate strong buying intent
const POSITIVE_KEYWORDS = ['monto alto', 'urgente', 'quiere operar']
// Keywords that indicate hesitation
const NEGATIVE_KEYWORDS = ['lo pensaré', 'después', 'no por ahora']

export function calculateLeadScore(lead: Lead): ScoreResult {
  let score = 0
  const now = Date.now()

  // ── Interaction recency ───────────────────────────────────
  if (lead.last_interaction_at) {
    const hours = (now - new Date(lead.last_interaction_at).getTime()) / 3_600_000
    if (hours <= 2)  score += 20
    if (hours > 72)  score -= 20
  }

  // ── Stage bonuses ─────────────────────────────────────────
  if (QUALIFIED_OR_HIGHER.includes(lead.stage)) score += 20
  if (lead.stage === 'ready_to_operate')         score += 20
  if (lead.stage === 'ready_to_schedule')        score += 20

  // ── Stage penalties ───────────────────────────────────────
  if (lead.stage === 'dormant') score -= 20
  if (lead.stage === 'lost')    score -= 30

  // ── Prior conversion bonus ────────────────────────────────
  if (lead.converted_to_client_id) score += 15

  // ── Notes keywords ────────────────────────────────────────
  if (lead.notes) {
    const n = lead.notes.toLowerCase()
    if (POSITIVE_KEYWORDS.some(kw => n.includes(kw))) score += 10
    if (NEGATIVE_KEYWORDS.some(kw => n.includes(kw))) score -= 10
  }

  // ── Contact reachability ──────────────────────────────────
  if (!lead.phone && !lead.whatsapp) score -= 15

  // ── Clamp to [0, 100] ─────────────────────────────────────
  const heat_score = Math.max(0, Math.min(100, score))

  const priority_label: LeadPriority =
    heat_score >= 80 ? 'hot' :
    heat_score >= 60 ? 'warm' :
    heat_score >= 40 ? 'follow_up' : 'cold'

  const assigned_to_recommendation = ALBERTO_STAGES.includes(lead.stage) ? 'Alberto' : 'Magda'

  const next_action = NEXT_BEST_ACTION[lead.stage]

  return { heat_score, priority_label, assigned_to_recommendation, next_action }
}
