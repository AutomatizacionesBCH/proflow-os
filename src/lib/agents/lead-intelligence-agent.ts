// Módulo servidor — NO importar desde Client Components
// Llama directamente a la API de OpenAI via fetch (sin SDK)

import { createClient } from '@/lib/supabase/server'
import type { AIRecommendation } from '@/types/agent.types'

export type { AIRecommendation } from '@/types/agent.types'
export type { SavedRecommendation } from '@/types/agent.types'

// ── Contexto del negocio ──────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres un agente comercial experto de ProFlow, un servicio financiero chileno que \
ayuda a empresas y personas naturales a obtener liquidez inmediata mediante la \
venta del cupo disponible en sus tarjetas de crédito.

El cliente cede temporalmente su cupo en dólares a cambio de pesos chilenos \
de forma inmediata. El cliente asume la responsabilidad de pagar su tarjeta \
de crédito en la fecha de facturación acordada con su entidad bancaria.

El beneficio principal para el cliente es resolver su problema de liquidez \
de forma rápida, sin trámites bancarios complejos ni esperas.

Magda es la ejecutiva comercial que hace el primer contacto, explica el servicio, \
genera confianza y acompaña al cliente durante el proceso.
Alberto es el operador que ejecuta la transacción cuando el cliente está listo.

Tu objetivo es analizar el estado actual de este lead y determinar:
- qué tan cerca está de tomar la decisión
- qué obstáculos puede tener (desconfianza, dudas sobre el proceso, preocupación por el pago futuro)
- cuál es la siguiente acción más efectiva para avanzar hacia el cierre

Responde ÚNICAMENTE con un objeto JSON válido sin texto adicional, sin bloques de código markdown, sin explicaciones. Usa exactamente esta estructura:
{"heat_score":0,"priority_label":"cold","lead_type":"unclear","assigned_to_recommendation":"Magda","next_best_action":"texto","reasoning":"texto","urgency":"baja","suggested_message":"texto"}`

// ── Helpers de formato para el prompt ────────────────────────────────────────
const STAGE_ES: Record<string, string> = {
  new:               'Nuevo',
  contacted:         'Contactado',
  qualified:         'Calificado',
  docs_pending:      'Documentos pendientes',
  ready_to_schedule: 'Listo para agendar',
  ready_to_operate:  'Listo para operar',
  operated:          'Operado',
  dormant:           'Dormido',
  lost:              'Perdido',
}

function formatLead(lead: Record<string, unknown>): string {
  const lines = [
    `Nombre: ${lead.full_name}`,
    `Etapa actual: ${STAGE_ES[lead.stage as string] ?? lead.stage}`,
    `Heat score actual: ${lead.heat_score ?? 0}`,
    `Prioridad actual: ${lead.priority_label ?? 'sin definir'}`,
    `Canal de origen: ${lead.source_channel ?? 'desconocido'}`,
    `Campaña: ${lead.campaign_name ?? 'sin campaña'}`,
    `Responsable asignado: ${lead.assigned_to ?? 'sin asignar'}`,
    `Próxima acción pendiente: ${lead.next_action ?? 'ninguna'}`,
  ]
  if (lead.next_action_due_at)  lines.push(`Fecha próxima acción: ${lead.next_action_due_at}`)
  if (lead.last_interaction_at) lines.push(`Último contacto registrado: ${lead.last_interaction_at}`)
  if (lead.notes)               lines.push(`Notas internas: ${lead.notes}`)
  if (lead.phone)               lines.push(`Teléfono: ${lead.phone}`)
  if (lead.email)               lines.push(`Email: ${lead.email}`)
  return lines.join('\n')
}

function formatEvents(events: Record<string, unknown>[]): string {
  if (!events.length) return 'Sin eventos registrados.'
  return events
    .map(e =>
      `- [${new Date(e.created_at as string).toLocaleDateString('es-CL')}] ${e.event_type}` +
      (e.description ? `: ${e.description}` : '')
    )
    .join('\n')
}

function formatSignals(signals: Record<string, unknown>[]): string {
  if (!signals.length) return 'Sin señales de comportamiento registradas.'
  return signals
    .map(s =>
      `- ${s.signal_type} | sentimiento: ${s.sentiment} | intención: ${s.intent_level} | intensidad: ${s.intensity_score}/100` +
      (s.description ? ` → ${s.description}` : '')
    )
    .join('\n')
}

// Extrae el primer bloque JSON de un texto que puede contener texto alrededor
function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/)
  return match ? match[0] : text
}

// ── Llamada directa a la API de OpenAI ───────────────────────────────────────
async function callOpenAIAPI(userMessage: string): Promise<AIRecommendation> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno')

  const requestBody = {
    model:      'gpt-4o',
    max_tokens: 1000,
    messages:   [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userMessage },
    ],
  }

  const callAPI = async (body: typeof requestBody) => {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      throw new Error(`OpenAI API ${res.status}: ${errText}`)
    }

    const data = await res.json()
    const text: string = data.choices?.[0]?.message?.content ?? ''
    if (!text) throw new Error('El agente IA devolvió una respuesta vacía')
    return text
  }

  // Intento 1
  const rawText = await callAPI(requestBody)
  try {
    return JSON.parse(extractJSON(rawText)) as AIRecommendation
  } catch {
    console.error('[lead-agent] Parseo JSON fallido. Reintentando con instrucción explícita...')
  }

  // Reintento: instrucción reforzada de JSON puro
  const retryBody = {
    ...requestBody,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userMessage + '\n\nIMPORTANTE: Responde SOLO con el JSON, sin ningún texto adicional ni bloques de código.' },
    ],
  }
  const rawText2 = await callAPI(retryBody)
  try {
    return JSON.parse(extractJSON(rawText2)) as AIRecommendation
  } catch {
    console.error('[lead-agent] Reintento también falló:', rawText2)
    throw new Error('No se pudo parsear la respuesta del agente IA como JSON válido')
  }
}

// ── Función principal exportable ─────────────────────────────────────────────
export async function analyzeLeadWithAI(
  leadId: string
): Promise<AIRecommendation & { lead_name: string }> {
  const supabase = await createClient()
  const db = supabase as any

  // Datos del lead
  const { data: lead, error: leadErr } = await db
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()
  if (leadErr || !lead) throw new Error(`Lead ${leadId} no encontrado`)

  // Eventos recientes (máx. 20)
  const { data: events } = await db
    .from('lead_events')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(20)

  // Señales de comportamiento recientes (máx. 20)
  const { data: signals } = await db
    .from('user_behavior_signals')
    .select('*')
    .eq('lead_id', leadId)
    .order('signal_time', { ascending: false })
    .limit(20)

  const userMessage = [
    '=== DATOS DEL LEAD ===',
    formatLead(lead),
    '',
    '=== HISTORIAL DE EVENTOS ===',
    formatEvents(events ?? []),
    '',
    '=== SEÑALES DE COMPORTAMIENTO ===',
    formatSignals(signals ?? []),
  ].join('\n')

  const recommendation = await callOpenAIAPI(userMessage)
  return { ...recommendation, lead_name: lead.full_name as string }
}

// ── Consulta libre sobre el pipeline ─────────────────────────────────────────
export async function queryLeadsData(
  userQuery: string
): Promise<{ answer: string; not_applicable: boolean }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY no está configurada')

  const supabase = await createClient()
  const db = supabase as any

  const { data: leads } = await db
    .from('leads')
    .select('full_name, heat_score, priority_label, stage, source_channel, assigned_to, created_at, last_interaction_at')
    .order('heat_score', { ascending: false })
    .limit(60)

  const today = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const systemPrompt = `Eres un asistente analítico de ProFlow OS. Fecha actual: ${today}.

Analizas el pipeline de leads de La Caja Chica, servicio financiero chileno.
Campos de cada lead: full_name, heat_score (0-100), priority_label (hot/warm/follow_up/cold),
stage (new/contacted/qualified/docs_pending/ready_to_schedule/ready_to_operate/operated/dormant/lost),
source_channel, assigned_to, created_at, last_interaction_at.

Si la pregunta NO es sobre leads o el pipeline comercial, responde: {"not_applicable":true,"answer":""}
De lo contrario: {"not_applicable":false,"answer":"respuesta concisa aquí"}
Responde ÚNICAMENTE con JSON válido.`

  const leadsText = (leads ?? []).map((l: Record<string, unknown>) =>
    `• ${l.full_name} | score:${l.heat_score} | ${l.priority_label} | ${l.stage}` +
    ` | canal:${l.source_channel ?? '?'} | asignado:${l.assigned_to ?? '—'}` +
    ` | registrado:${new Date(l.created_at as string).toLocaleDateString('es-CL')}` +
    (l.last_interaction_at ? ` | contacto:${new Date(l.last_interaction_at as string).toLocaleDateString('es-CL')}` : '')
  ).join('\n')

  const userContent = `=== LEADS (top ${leads?.length ?? 0} por heat score) ===\n${leadsText}\n\n=== PREGUNTA ===\n${userQuery}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model:    'gpt-4o',
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`OpenAI API ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text: string = data.choices?.[0]?.message?.content ?? ''
  if (!text) throw new Error('Respuesta vacía del agente')

  try {
    const parsed = JSON.parse(extractJSON(text))
    return {
      not_applicable: Boolean(parsed.not_applicable),
      answer:         String(parsed.answer ?? ''),
    }
  } catch {
    return { not_applicable: false, answer: text }
  }
}
