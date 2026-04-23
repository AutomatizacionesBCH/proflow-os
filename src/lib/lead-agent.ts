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

const ALBERTO_STAGES: LeadStage[] = ['ready_to_schedule', 'ready_to_operate', 'operated']

// Keywords that indicate strong buying intent
const POSITIVE_KEYWORDS = ['monto alto', 'urgente', 'quiere operar']
// Keywords that indicate hesitation
const NEGATIVE_KEYWORDS = ['lo pensaré', 'después', 'no por ahora']

export function calculateLeadScore(lead: Lead): ScoreResult {
  let score = 0
  const now = Date.now()

  // ── Stage score ───────────────────────────────────────────
  if      (lead.stage === 'operated')          score += 40
  else if (lead.stage === 'qualified')         score += 30
  else if (lead.stage === 'contacted')         score += 15
  else if (lead.stage === 'new' && lead.phone) score += 10
  else if (lead.stage === 'lost')              score -= 30

  // ── Interaction recency ───────────────────────────────────
  if (lead.last_interaction_at) {
    const hours = (now - new Date(lead.last_interaction_at).getTime()) / 3_600_000
    if (hours <= 24) score += 20
    else if (hours <= 72) score += 10
  }

  // ── Contact reachability ──────────────────────────────────
  if (lead.phone || lead.whatsapp) score += 5
  else                             score -= 15

  // ── Prior conversion bonus ────────────────────────────────
  if (lead.converted_to_client_id) score += 15

  // ── Notes keywords ────────────────────────────────────────
  if (lead.notes) {
    const n = lead.notes.toLowerCase()
    if (POSITIVE_KEYWORDS.some(kw => n.includes(kw))) score += 10
    if (NEGATIVE_KEYWORDS.some(kw => n.includes(kw))) score -= 10
  }

  // ── Clamp to [0, 100] ─────────────────────────────────────
  const heat_score = Math.max(0, Math.min(100, score))

  const priority_label: LeadPriority =
    heat_score >= 60 ? 'hot' :
    heat_score >= 40 ? 'warm' :
    heat_score >= 20 ? 'follow_up' : 'cold'

  const assigned_to_recommendation = ALBERTO_STAGES.includes(lead.stage) ? 'Alberto' : 'Magda'

  const next_action = NEXT_BEST_ACTION[lead.stage]

  return { heat_score, priority_label, assigned_to_recommendation, next_action }
}
