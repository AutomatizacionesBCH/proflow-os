// ProFlow OS — Tipos de Playbooks
// Estrategias repetibles para leads y clientes

export type PlaybookCategory =
  | 'lead_followup'
  | 'sales_closing'
  | 'vip_reactivation'
  | 'dormant_reactivation'
  | 'trust_recovery'
  | 'marketing_campaign'

export type PlaybookTargetSegment =
  | 'hot_lead'
  | 'warm_lead'
  | 'trust_issue'
  | 'vip_active'
  | 'vip_dormant'
  | 'spot_client'
  | 'dormant_client'
  | 'high_potential'

export type PlaybookStepActionType =
  | 'call'
  | 'whatsapp_message'
  | 'email'
  | 'sms'
  | 'assign_to_magda'
  | 'assign_to_alberto'
  | 'request_docs'
  | 'send_trust_explanation'
  | 'create_campaign'
  | 'wait'

export type AssignmentStatus = 'in_progress' | 'completed' | 'paused' | 'cancelled'

// ── Entidades ─────────────────────────────────────────────────

export type Playbook = {
  id:                string
  name:              string
  category:          PlaybookCategory | null
  target_segment:    PlaybookTargetSegment | null
  trigger_condition: string | null
  description:       string | null
  status:            string
  created_at:        string
  updated_at:        string
}

export type PlaybookInsert = Omit<Playbook, 'id' | 'created_at' | 'updated_at'> & { id?: string }

export type PlaybookStep = {
  id:                 string
  playbook_id:        string
  step_order:         number
  action_type:        PlaybookStepActionType | null
  channel:            string | null
  timing_description: string | null
  message_template:   string | null
  expected_result:    string | null
  created_at:         string
  updated_at:         string
}

export type PlaybookStepInsert = Omit<PlaybookStep, 'id' | 'created_at' | 'updated_at'> & { id?: string }

export type PlaybookAssignment = {
  id:           string
  playbook_id:  string
  lead_id:      string | null
  client_id:    string | null
  assigned_to:  string | null
  current_step: number
  status:       AssignmentStatus
  started_at:   string
  completed_at: string | null
  notes:        string | null
  created_at:   string
  updated_at:   string
}

export type PlaybookAssignmentInsert = Omit<PlaybookAssignment, 'id' | 'created_at' | 'updated_at'> & { id?: string }

// Tipo enriquecido para mostrar en UI
export type AssignmentWithContext = PlaybookAssignment & {
  playbook:          Playbook
  total_steps:       number
  current_step_data: PlaybookStep | null
}

// ── Labels en español ─────────────────────────────────────────

export const CATEGORY_LABELS: Record<PlaybookCategory, string> = {
  lead_followup:        'Seguimiento',
  sales_closing:        'Cierre de venta',
  vip_reactivation:     'Reactivación VIP',
  dormant_reactivation: 'Reactivación',
  trust_recovery:       'Recuperar confianza',
  marketing_campaign:   'Campaña',
}

export const CATEGORY_COLORS: Record<PlaybookCategory, string> = {
  lead_followup:        'bg-blue-900/40 text-blue-400 border-blue-500/20',
  sales_closing:        'bg-green-900/40 text-green-400 border-green-500/20',
  vip_reactivation:     'bg-amber-900/40 text-amber-400 border-amber-500/20',
  dormant_reactivation: 'bg-purple-900/40 text-purple-400 border-purple-500/20',
  trust_recovery:       'bg-red-900/40 text-red-400 border-red-500/20',
  marketing_campaign:   'bg-pink-900/40 text-pink-400 border-pink-500/20',
}

export const SEGMENT_LABELS: Record<PlaybookTargetSegment, string> = {
  hot_lead:       '🔥 Lead Caliente',
  warm_lead:      '🟡 Lead Tibio',
  trust_issue:    '🔒 Desconfianza',
  vip_active:     '⭐ VIP Activo',
  vip_dormant:    '⭐ VIP Dormido',
  spot_client:    '📍 Cliente Spot',
  dormant_client: '💤 Cliente Dormido',
  high_potential: '🚀 Alto Potencial',
}

export const ACTION_TYPE_LABELS: Record<PlaybookStepActionType, string> = {
  call:                   'Llamada',
  whatsapp_message:       'WhatsApp',
  email:                  'Email',
  sms:                    'SMS',
  assign_to_magda:        'Asignar a Magda',
  assign_to_alberto:      'Asignar a Alberto',
  request_docs:           'Solicitar documentos',
  send_trust_explanation: 'Explicación de confianza',
  create_campaign:        'Crear campaña',
  wait:                   'Esperar',
}

export const ACTION_TYPE_COLORS: Record<PlaybookStepActionType, string> = {
  call:                   'bg-green-900/40 text-green-400',
  whatsapp_message:       'bg-emerald-900/40 text-emerald-400',
  email:                  'bg-blue-900/40 text-blue-400',
  sms:                    'bg-sky-900/40 text-sky-400',
  assign_to_magda:        'bg-violet-900/40 text-violet-400',
  assign_to_alberto:      'bg-indigo-900/40 text-indigo-400',
  request_docs:           'bg-amber-900/40 text-amber-400',
  send_trust_explanation: 'bg-orange-900/40 text-orange-400',
  create_campaign:        'bg-pink-900/40 text-pink-400',
  wait:                   'bg-slate-800 text-slate-400',
}

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatus, string> = {
  in_progress: 'En progreso',
  completed:   'Completado',
  paused:      'Pausado',
  cancelled:   'Cancelado',
}

export const ALL_CATEGORIES: PlaybookCategory[] = [
  'lead_followup', 'sales_closing', 'vip_reactivation',
  'dormant_reactivation', 'trust_recovery', 'marketing_campaign',
]

export const ALL_SEGMENTS: PlaybookTargetSegment[] = [
  'hot_lead', 'warm_lead', 'trust_issue',
  'vip_active', 'vip_dormant', 'spot_client',
  'dormant_client', 'high_potential',
]

export const ALL_ACTION_TYPES: PlaybookStepActionType[] = [
  'call', 'whatsapp_message', 'email', 'sms',
  'assign_to_magda', 'assign_to_alberto',
  'request_docs', 'send_trust_explanation',
  'create_campaign', 'wait',
]

// Mapeo de tipo de lead → playbook recomendado
export const LEAD_TYPE_TO_SEGMENT: Record<string, PlaybookTargetSegment> = {
  vip:           'vip_active',
  dormant:       'dormant_client',
  trust_issue:   'trust_issue',
  spot:          'spot_client',
  high_potential:'hot_lead',
  new:           'warm_lead',
  unclear:       'warm_lead',
}
