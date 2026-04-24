// ProFlow OS — Tipos de Behavior Tracking
// Señales de comportamiento para leads y clientes

export type SignalType =
  | 'message_received'
  | 'message_sent'
  | 'fast_reply'
  | 'no_response'
  | 'asked_price'
  | 'asked_security'
  | 'showed_fear'
  | 'showed_interest'
  | 'requested_meeting'
  | 'meeting_booked'
  | 'meeting_missed'
  | 'docs_requested'
  | 'docs_received'
  | 'contract_sent'
  | 'contract_signed'
  | 'operation_completed'
  | 'email_opened'
  | 'email_clicked'
  | 'whatsapp_replied'
  | 'sms_replied'
  | 'reactivated'
  | 'unsubscribed'

export type SignalSentiment  = 'positive' | 'neutral' | 'doubtful' | 'negative'
export type SignalIntentLevel = 'low' | 'medium' | 'high' | 'very_high'

export type BehaviorSignal = {
  id:             string
  lead_id:        string | null
  client_id:      string | null
  signal_type:    SignalType
  signal_source:  string | null
  signal_channel: string | null
  signal_time:    string
  intensity_score: number
  sentiment:      SignalSentiment | null
  intent_level:   SignalIntentLevel | null
  description:    string | null
  metadata_json:  Record<string, unknown> | null
  created_by:     string | null
  created_at:     string
}

export type BehaviorSignalInsert = Omit<BehaviorSignal, 'id' | 'created_at'> & { id?: string }

export type SignalsAggregate = {
  total_positive:  number
  total_negative:  number
  last_signal:     BehaviorSignal | null
  top_signal_type: SignalType | null
  dominant_intent: SignalIntentLevel | null
}

// ── Labels en español ─────────────────────────────────────────

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  message_received:    'Mensaje recibido',
  message_sent:        'Mensaje enviado',
  fast_reply:          'Respuesta rápida',
  no_response:         'Sin respuesta',
  asked_price:         'Preguntó precio',
  asked_security:      'Preguntó seguridad',
  showed_fear:         'Mostró temor',
  showed_interest:     'Mostró interés',
  requested_meeting:   'Solicitó reunión',
  meeting_booked:      'Reunión agendada',
  meeting_missed:      'Reunión perdida',
  docs_requested:      'Documentos solicitados',
  docs_received:       'Documentos recibidos',
  contract_sent:       'Contrato enviado',
  contract_signed:     'Contrato firmado',
  operation_completed: 'Operación completada',
  email_opened:        'Email abierto',
  email_clicked:       'Email cliqueado',
  whatsapp_replied:    'WhatsApp respondido',
  sms_replied:         'SMS respondido',
  reactivated:         'Lead reactivado',
  unsubscribed:        'Se dio de baja',
}

export const SENTIMENT_LABELS: Record<SignalSentiment, string> = {
  positive: 'Positivo',
  neutral:  'Neutral',
  doubtful: 'Dubitativo',
  negative: 'Negativo',
}

export const INTENT_LABELS: Record<SignalIntentLevel, string> = {
  low:       'Baja',
  medium:    'Media',
  high:      'Alta',
  very_high: 'Muy alta',
}

export const ALL_SIGNAL_TYPES: SignalType[] = [
  'message_received', 'message_sent', 'fast_reply', 'no_response',
  'asked_price', 'asked_security', 'showed_fear', 'showed_interest',
  'requested_meeting', 'meeting_booked', 'meeting_missed',
  'docs_requested', 'docs_received', 'contract_sent', 'contract_signed',
  'operation_completed', 'email_opened', 'email_clicked',
  'whatsapp_replied', 'sms_replied', 'reactivated', 'unsubscribed',
]
