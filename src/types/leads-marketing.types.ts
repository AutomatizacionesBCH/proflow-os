// ============================================================
// ProFlow OS — Leads & Marketing Types
// Alineados con migración 009_leads_marketing_extension.sql
// ============================================================

// ── Enums ────────────────────────────────────────────────────

export type LeadStage =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'docs_pending'
  | 'ready_to_schedule'
  | 'ready_to_operate'
  | 'operated'
  | 'dormant'
  | 'lost'

export type LeadPriority = 'hot' | 'warm' | 'follow_up' | 'cold'

export type LeadType =
  | 'vip'
  | 'spot'
  | 'new'
  | 'dormant'
  | 'high_potential'
  | 'trust_issue'
  | 'unclear'

export type LeadSourcePlatform = 'vambe' | 'linkedin' | 'x' | 'manual'

export type LeadEventType =
  | 'mensaje_recibido'
  | 'intencion_detectada'
  | 'reunion_agendada'
  | 'docs_solicitados'
  | 'docs_recibidos'
  | 'contrato_firmado'
  | 'sin_respuesta'
  | 'convertido'
  | 'reactivado'

export type CampaignChannel = 'email' | 'whatsapp' | 'sms'

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'finished'

export type MessageStatus = 'pending' | 'approved' | 'sent' | 'rejected'

export type AudienceStatus = 'active' | 'archived'

export type IntegrationName = 'vambe' | 'linkedin' | 'x' | 'meta' | 'tiktok'

export type IntegrationStatus = 'active' | 'inactive' | 'error'


// ── Tablas ───────────────────────────────────────────────────

export type Lead = {
  id: string

  // Origen
  external_source_id: string | null
  source_platform: LeadSourcePlatform | null
  source_channel: string | null
  campaign_name: string | null

  // Contacto
  full_name: string
  phone: string | null
  whatsapp: string | null
  email: string | null
  linkedin_profile: string | null
  x_handle: string | null

  // Clasificación
  stage: LeadStage
  heat_score: number
  priority_label: LeadPriority | null
  lead_type: LeadType | null
  lead_status_reason: string | null

  // Gestión
  assigned_to: string | null
  assigned_to_recommendation: string | null
  last_interaction_at: string | null
  next_action: string | null
  next_action_due_at: string | null

  // Conversión
  converted_to_client_id: string | null

  // Extras
  notes: string | null
  raw_payload: Record<string, unknown> | null

  created_at: string
  updated_at: string
}

export type LeadInsert = Omit<Lead, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}

export type LeadUpdate = Partial<LeadInsert>

// ─────────────────────────────────────────────────────────────

export type LeadEvent = {
  id: string
  lead_id: string
  event_type: LeadEventType
  description: string | null
  payload: Record<string, unknown> | null
  created_by: string | null
  created_at: string
}

export type LeadEventInsert = Omit<LeadEvent, 'id' | 'created_at'> & {
  id?: string
}

// ─────────────────────────────────────────────────────────────

export type Audience = {
  id: string
  name: string
  description: string | null
  rules_json: Record<string, unknown> | null
  member_count: number
  status: AudienceStatus
  created_at: string
  updated_at: string
}

export type AudienceInsert = Omit<Audience, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}

// ─────────────────────────────────────────────────────────────

export type Campaign = {
  id: string
  name: string
  objective: string | null
  audience_id: string | null
  channel: CampaignChannel | null
  copy_version: string | null
  status: CampaignStatus
  launched_at: string | null
  created_at: string
  updated_at: string
}

export type CampaignInsert = Omit<Campaign, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}

// ─────────────────────────────────────────────────────────────

export type CampaignMessage = {
  id: string
  campaign_id: string
  lead_id: string | null
  client_id: string | null
  message_body: string | null
  channel: CampaignChannel | null
  status: MessageStatus
  approved_by: string | null
  sent_at: string | null
  conversion_result: string | null
  created_at: string
}

export type CampaignMessageInsert = Omit<CampaignMessage, 'id' | 'created_at'> & {
  id?: string
}

// ─────────────────────────────────────────────────────────────

export type Integration = {
  id: string
  name: IntegrationName
  status: IntegrationStatus
  config_json: Record<string, unknown> | null
  last_sync_at: string | null
  webhook_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type IntegrationUpdate = Partial<Omit<Integration, 'id' | 'name' | 'created_at'>>


// ── Helpers de UI ────────────────────────────────────────────

export const STAGE_LABELS: Record<LeadStage, string> = {
  new:               'Nuevo',
  contacted:         'Contactado',
  qualified:         'Calificado',
  docs_pending:      'Docs pendientes',
  ready_to_schedule: 'Listo para agendar',
  ready_to_operate:  'Listo para operar',
  operated:          'Operado',
  dormant:           'Dormido',
  lost:              'Perdido',
}

export const PRIORITY_LABELS: Record<LeadPriority, string> = {
  hot:       '🔥 Caliente',
  warm:      '🟡 Tibio',
  follow_up: '🔁 Seguimiento',
  cold:      '🧊 Frío',
}

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  vip:           'VIP',
  spot:          'Spot',
  new:           'Nuevo',
  dormant:       'Dormido',
  high_potential:'Alto potencial',
  trust_issue:   'Desconfianza',
  unclear:       'Sin definir',
}

export const STAGE_ORDER: LeadStage[] = [
  'new', 'contacted', 'qualified', 'docs_pending',
  'ready_to_schedule', 'ready_to_operate', 'operated',
  'dormant', 'lost',
]
