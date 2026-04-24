// Módulo servidor — NO importar desde Client Components
// Sales Agent: genera estrategias de cierre comercial para leads calientes

import { createClient } from '@/lib/supabase/server'
import type { SalesAnalysis } from '@/types/agent.types'

export type { SalesAnalysis, SavedSalesAnalysis } from '@/types/agent.types'

// ── Contexto del negocio ──────────────────────────────────────────────────────
const SALES_SYSTEM_PROMPT = `Eres un agente experto en cierre comercial de ProFlow, un servicio \
financiero chileno que ayuda a empresas y personas naturales a obtener liquidez inmediata \
mediante la venta del cupo disponible en sus tarjetas de crédito.

El cliente cede temporalmente su cupo en dólares a cambio de pesos chilenos de forma inmediata. \
El cliente asume la responsabilidad de pagar su tarjeta de crédito en la fecha de facturación \
acordada con su entidad bancaria.

Las principales objeciones son:
- desconfianza en el proceso
- miedo a no poder pagar después
- dudas sobre la seguridad
- querer pensarlo más

Magda maneja el contacto inicial y el seguimiento.
Alberto ejecuta la operación cuando el cliente está listo.

Tu objetivo es generar una estrategia concreta y un mensaje específico para cerrar este lead ahora mismo.

Responde ÚNICAMENTE con un objeto JSON válido sin texto adicional, sin bloques de código markdown, sin explicaciones. Usa exactamente esta estructura:
{"closing_strategy":"texto","main_objection":"texto","objection_response":"texto","suggested_message":"texto","best_channel":"whatsapp","best_time":"ahora","confidence_score":75,"urgency_reason":"texto","assigned_to":"Magda"}`

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/)
  return match ? match[0] : text
}

// ── Llamada a la API de OpenAI ────────────────────────────────────────────────
async function callSalesAPI(userMessage: string): Promise<SalesAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno')

  const requestBody = {
    model:      'gpt-4o',
    max_tokens: 1000,
    messages:   [
      { role: 'system', content: SALES_SYSTEM_PROMPT },
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
    return JSON.parse(extractJSON(rawText)) as SalesAnalysis
  } catch {
    console.error('[sales-agent] Parseo JSON fallido. Reintentando...')
  }

  // Reintento con instrucción reforzada
  const retryBody = {
    ...requestBody,
    messages: [
      { role: 'system', content: SALES_SYSTEM_PROMPT },
      { role: 'user',   content: userMessage + '\n\nIMPORTANTE: Responde SOLO con el JSON, sin ningún texto adicional ni bloques de código.' },
    ],
  }
  const rawText2 = await callAPI(retryBody)
  try {
    return JSON.parse(extractJSON(rawText2)) as SalesAnalysis
  } catch {
    console.error('[sales-agent] Reintento también falló:', rawText2)
    throw new Error('No se pudo parsear la respuesta del Sales Agent como JSON válido')
  }
}

// ── Función principal exportable ─────────────────────────────────────────────
export async function analyzeSalesOpportunity(
  leadId: string
): Promise<SalesAnalysis & { lead_name: string }> {
  const supabase = await createClient()
  const db = supabase as any

  const { data: lead, error: leadErr } = await db
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single()
  if (leadErr || !lead) throw new Error(`Lead ${leadId} no encontrado`)

  // Contexto enriquecido: eventos, señales y última recomendación del Lead Intelligence Agent
  const [eventsRes, signalsRes, lastRecRes] = await Promise.all([
    db.from('lead_events')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(10),
    db.from('user_behavior_signals')
      .select('*')
      .eq('lead_id', leadId)
      .order('signal_time', { ascending: false })
      .limit(10),
    db.from('marketing_recommendations')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  const events  = eventsRes.data  ?? []
  const signals = signalsRes.data ?? []
  const lastRec = lastRecRes.data ?? null

  const lines = [
    '=== DATOS DEL LEAD ===',
    `Nombre: ${lead.full_name}`,
    `Etapa actual: ${STAGE_ES[lead.stage as string] ?? lead.stage}`,
    `Heat score: ${lead.heat_score ?? 0}`,
    `Prioridad: ${lead.priority_label ?? 'sin definir'}`,
    `Canal de origen: ${lead.source_channel ?? 'desconocido'}`,
    `Responsable asignado: ${lead.assigned_to ?? 'sin asignar'}`,
    `Próxima acción pendiente: ${lead.next_action ?? 'ninguna'}`,
  ]
  if (lead.last_interaction_at) lines.push(`Último contacto: ${lead.last_interaction_at}`)
  if (lead.notes)               lines.push(`Notas internas: ${lead.notes}`)
  if (lead.phone)               lines.push(`Teléfono: ${lead.phone}`)
  if (lead.email)               lines.push(`Email: ${lead.email}`)

  if (events.length > 0) {
    lines.push('', '=== HISTORIAL RECIENTE ===')
    for (const e of events as Record<string, unknown>[]) {
      lines.push(
        `- [${new Date(e.created_at as string).toLocaleDateString('es-CL')}] ${e.event_type}` +
        (e.description ? `: ${e.description}` : '')
      )
    }
  }

  if (signals.length > 0) {
    lines.push('', '=== SEÑALES DE COMPORTAMIENTO ===')
    for (const s of signals as Record<string, unknown>[]) {
      lines.push(
        `- ${s.signal_type} | ${s.sentiment} | intención: ${s.intent_level}` +
        (s.description ? ` → ${s.description}` : '')
      )
    }
  }

  if (lastRec) {
    lines.push('', '=== ÚLTIMA RECOMENDACIÓN DEL AGENTE DE INTELIGENCIA ===')
    lines.push(`Acción recomendada: ${lastRec.next_best_action}`)
    lines.push(`Urgencia: ${lastRec.urgency}`)
    lines.push(`Razonamiento: ${lastRec.reasoning}`)
  }

  const analysis = await callSalesAPI(lines.join('\n'))
  return { ...analysis, lead_name: lead.full_name as string }
}
