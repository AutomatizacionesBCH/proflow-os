// Módulo servidor — NO importar desde Client Components
// Marketing Intelligence Agent: analiza el negocio y propone campañas

import { createClient } from '@/lib/supabase/server'
import type { MarketingProposal } from '@/types/agent.types'

export type { MarketingProposal, SavedMarketingProposal } from '@/types/agent.types'

// ── Contexto del negocio ──────────────────────────────────────────────────────
const MARKETING_SYSTEM_PROMPT = `Eres un estratega de marketing experto de ProFlow, un servicio \
financiero chileno que ayuda a empresas y personas naturales a obtener liquidez inmediata \
mediante la venta del cupo disponible en sus tarjetas de crédito.

El cliente cede temporalmente su cupo en dólares a cambio de pesos chilenos de forma inmediata. \
El cliente asume la responsabilidad de pagar su tarjeta de crédito en la fecha de facturación \
acordada con su entidad bancaria.

Tu objetivo es analizar los datos del negocio y proponer campañas concretas, mensajes listos \
para usar y audiencias bien definidas. No envías nada solo — solo propones para que el equipo apruebe.

Los canales disponibles son whatsapp, email y sms.
El tono debe ser cercano, profesional y generar confianza.

Detecta y propone para estas situaciones prioritarias:
1. Clientes VIP sin operación en más de 60 días → mensaje de reactivación personalizado
2. Leads calientes (hot/warm) sin conversión → secuencia de seguimiento urgente
3. Leads con problema de confianza (trust_issue) → mensaje que resuelva la desconfianza
4. Clientes frecuentes sin operación en 30 días → recordatorio de oportunidad
5. Leads dormidos recuperables (últimos 90 días) → mensaje suave de reactivación

Solo propone campañas para situaciones que tengan datos reales que lo justifiquen (cantidad > 0).
Genera entre 3 y 5 propuestas concretas y priorizadas.

Responde ÚNICAMENTE con un objeto JSON válido sin texto adicional, sin bloques de código markdown. \
Usa exactamente esta estructura:
{"proposals":[{"audience_name":"texto","audience_description":"texto","estimated_size":0,"campaign_objective":"texto","suggested_channel":"whatsapp","suggested_copy":"texto completo","expected_impact":"texto","priority":"alta","reasoning":"texto"}]}`

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/)
  return match ? match[0] : text
}

// ── Llamada a la API de OpenAI ────────────────────────────────────────────────
async function callMarketingAPI(userMessage: string): Promise<MarketingProposal[]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno')

  const requestBody = {
    model:      'gpt-4o',
    max_tokens: 2000,
    messages:   [
      { role: 'system', content: MARKETING_SYSTEM_PROMPT },
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

  const rawText = await callAPI(requestBody)
  try {
    const parsed = JSON.parse(extractJSON(rawText))
    return (parsed.proposals ?? []) as MarketingProposal[]
  } catch {
    console.error('[marketing-agent] Parseo JSON fallido. Reintentando...')
  }

  const retryBody = {
    ...requestBody,
    messages: [
      { role: 'system', content: MARKETING_SYSTEM_PROMPT },
      { role: 'user',   content: userMessage + '\n\nIMPORTANTE: Responde SOLO con el JSON, sin ningún texto adicional ni bloques de código.' },
    ],
  }
  const rawText2 = await callAPI(retryBody)
  try {
    const parsed = JSON.parse(extractJSON(rawText2))
    return (parsed.proposals ?? []) as MarketingProposal[]
  } catch {
    console.error('[marketing-agent] Reintento también falló:', rawText2)
    throw new Error('No se pudo parsear la respuesta del Marketing Agent como JSON válido')
  }
}

// ── Función principal exportable ─────────────────────────────────────────────
export async function analyzeAndProposeCampaigns(): Promise<MarketingProposal[]> {
  const supabase = await createClient()
  const db = supabase as any

  const now          = new Date()
  const days30ago    = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const days60ago    = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const days90ago    = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  const d30str       = days30ago.toISOString().slice(0, 10)
  const d60str       = days60ago.toISOString().slice(0, 10)
  const d90str       = days90ago.toISOString()

  // Estadísticas del pipeline en paralelo
  const [
    { count: hotCount },
    { count: warmCount },
    { count: followUpCount },
    { count: coldCount },
    { count: dormantCount },
    { count: trustIssueCount },
    { count: unconvertedHot },
    { count: unconvertedWarm },
    audiencesRes,
    campaignsRes,
    spendRes,
    vipClientsRes,
    frecuenteClientsRes,
    recentOps60Res,
    recentOps30Res,
  ] = await Promise.all([
    db.from('leads').select('*', { count: 'exact', head: true })
      .eq('priority_label', 'hot').neq('stage', 'operated').neq('stage', 'lost'),
    db.from('leads').select('*', { count: 'exact', head: true })
      .eq('priority_label', 'warm').neq('stage', 'operated').neq('stage', 'lost'),
    db.from('leads').select('*', { count: 'exact', head: true })
      .eq('priority_label', 'follow_up').neq('stage', 'operated').neq('stage', 'lost'),
    db.from('leads').select('*', { count: 'exact', head: true })
      .eq('priority_label', 'cold').neq('stage', 'operated').neq('stage', 'lost'),
    db.from('leads').select('*', { count: 'exact', head: true })
      .eq('stage', 'dormant').gte('created_at', d90str),
    db.from('leads').select('*', { count: 'exact', head: true })
      .eq('lead_type', 'trust_issue'),
    db.from('leads').select('*', { count: 'exact', head: true })
      .eq('priority_label', 'hot').is('converted_to_client_id', null)
      .neq('stage', 'operated').neq('stage', 'lost'),
    db.from('leads').select('*', { count: 'exact', head: true })
      .eq('priority_label', 'warm').is('converted_to_client_id', null)
      .neq('stage', 'operated').neq('stage', 'lost'),
    db.from('audiences').select('name, description').limit(15),
    db.from('campaigns').select('name, objective, channel, status').eq('status', 'active').limit(10),
    db.from('marketing_spend').select('channel, amount_clp').gte('date', d30str),
    db.from('clients').select('id').contains('tags', ['VIP']).limit(200),
    db.from('clients').select('id').contains('tags', ['frecuente']).limit(500),
    db.from('operations').select('client_id').gte('operation_date', d60str).limit(5000),
    db.from('operations').select('client_id').gte('operation_date', d30str).limit(5000),
  ])

  // Calcular clientes VIP y frecuentes dormidos
  const recentClients60 = new Set(((recentOps60Res.data ?? []) as { client_id: string }[]).map(o => o.client_id))
  const recentClients30 = new Set(((recentOps30Res.data ?? []) as { client_id: string }[]).map(o => o.client_id))
  const vipDormant      = ((vipClientsRes.data ?? []) as { id: string }[]).filter(c => !recentClients60.has(c.id)).length
  const frecuenteDormant = ((frecuenteClientsRes.data ?? []) as { id: string }[]).filter(c => !recentClients30.has(c.id)).length

  // Gasto por canal (últimos 30 días)
  const spendByChannel: Record<string, number> = {}
  for (const s of (spendRes.data ?? []) as { channel: string; amount_clp: number }[]) {
    spendByChannel[s.channel] = (spendByChannel[s.channel] ?? 0) + s.amount_clp
  }

  const spendLines = Object.entries(spendByChannel).length > 0
    ? Object.entries(spendByChannel).map(([ch, amt]) => `  ${ch}: $${amt.toLocaleString('es-CL')} CLP`)
    : ['  Sin registros de gasto este mes']

  const audienceLines = (audiencesRes.data ?? []).length > 0
    ? (audiencesRes.data as { name: string; description: string | null }[])
        .map(a => `  - "${a.name}"${a.description ? `: ${a.description}` : ''}`)
    : ['  Sin audiencias creadas']

  const campaignLines = (campaignsRes.data ?? []).length > 0
    ? (campaignsRes.data as { name: string; objective: string | null; channel: string | null }[])
        .map(c => `  - "${c.name}" | canal: ${c.channel ?? '?'} | objetivo: ${c.objective ?? '—'}`)
    : ['  Sin campañas activas']

  const userMessage = [
    `=== DATOS DEL NEGOCIO — ${new Date().toLocaleDateString('es-CL')} ===`,
    '',
    'PIPELINE DE LEADS:',
    `  Hot sin cierre: ${unconvertedHot ?? 0}`,
    `  Warm sin cierre: ${unconvertedWarm ?? 0}`,
    `  Follow-up: ${followUpCount ?? 0}`,
    `  Cold: ${coldCount ?? 0}`,
    `  Dormidos (últimos 90 días): ${dormantCount ?? 0}`,
    `  Con problema de confianza (trust_issue): ${trustIssueCount ?? 0}`,
    '',
    'CLIENTES:',
    `  VIP sin operación en 60+ días: ${vipDormant} (de ${(vipClientsRes.data ?? []).length} VIP totales)`,
    `  Frecuentes sin operación en 30+ días: ${frecuenteDormant} (de ${(frecuenteClientsRes.data ?? []).length} frecuentes totales)`,
    '',
    'GASTO DE MARKETING (últimos 30 días):',
    ...spendLines,
    '',
    'AUDIENCIAS EXISTENTES:',
    ...audienceLines,
    '',
    'CAMPAÑAS ACTIVAS:',
    ...campaignLines,
  ].join('\n')

  return await callMarketingAPI(userMessage)
}
