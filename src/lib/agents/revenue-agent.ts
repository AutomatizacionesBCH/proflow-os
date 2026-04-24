// Módulo servidor — NO importar desde Client Components
// Revenue Agent: analiza el negocio completo y genera recomendaciones estratégicas

import { createClient } from '@/lib/supabase/server'
import type { RevenueAnalysis } from '@/types/agent.types'

export type { RevenueAnalysis, SavedRevenueAnalysis } from '@/types/agent.types'

// ── Contexto del negocio ──────────────────────────────────────────────────────
const REVENUE_SYSTEM_PROMPT = `Eres un director financiero y estratega de negocios experto de ProFlow, \
un servicio financiero chileno que ayuda a empresas y personas naturales a obtener liquidez inmediata \
mediante la venta del cupo disponible en sus tarjetas de crédito.

El cliente cede temporalmente su cupo en dólares a cambio de pesos chilenos de forma inmediata. \
El cliente asume la responsabilidad de pagar su tarjeta de crédito en la fecha de facturación \
acordada con su entidad bancaria.

Tu objetivo es analizar los datos reales del negocio y generar recomendaciones estratégicas concretas \
para maximizar la utilidad, optimizar el uso de procesadores, identificar los canales más rentables \
y detectar oportunidades o riesgos que el equipo debe atender.

Sé directo, específico y usa los números reales que te entrego. \
No generalices — basa cada recomendación en los datos.

Responde ÚNICAMENTE con un objeto JSON válido sin texto adicional, sin bloques de código markdown. \
Usa exactamente esta estructura:
{"business_summary":"texto","top_opportunities":["texto","texto","texto"],"top_risks":["texto","texto","texto"],"recommendations":[{"title":"texto","description":"texto","expected_impact":"texto","action_required":"texto","priority":"alta","category":"marketing"}],"channel_performance":[{"channel_name":"texto","leads_generated":0,"conversion_rate":0,"revenue_clp":0,"profit_clp":0,"cost_clp":0,"roi":0,"recommendation":"mantener"}]}`

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractJSON(text: string): string {
  const match = text.match(/\{[\s\S]*\}/)
  return match ? match[0] : text
}

function formatCLPshort(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

// ── Llamada a la API de OpenAI ────────────────────────────────────────────────
async function callRevenueAPI(userMessage: string): Promise<RevenueAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno')

  const requestBody = {
    model:      'gpt-4o',
    max_tokens: 2000,
    messages:   [
      { role: 'system', content: REVENUE_SYSTEM_PROMPT },
      { role: 'user',   content: userMessage },
    ],
  }

  const callAPI = async (body: typeof requestBody) => {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body:    JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText)
      throw new Error(`OpenAI API ${res.status}: ${err}`)
    }
    const data = await res.json()
    const text: string = data.choices?.[0]?.message?.content ?? ''
    if (!text) throw new Error('El agente IA devolvió una respuesta vacía')
    return text
  }

  const rawText = await callAPI(requestBody)
  try {
    return JSON.parse(extractJSON(rawText)) as RevenueAnalysis
  } catch {
    console.error('[revenue-agent] Parseo JSON fallido. Reintentando...')
  }

  const retryBody = {
    ...requestBody,
    messages: [
      { role: 'system', content: REVENUE_SYSTEM_PROMPT },
      { role: 'user',   content: userMessage + '\n\nIMPORTANTE: Responde SOLO con el JSON, sin ningún texto adicional ni bloques de código.' },
    ],
  }
  const rawText2 = await callAPI(retryBody)
  try {
    return JSON.parse(extractJSON(rawText2)) as RevenueAnalysis
  } catch {
    console.error('[revenue-agent] Reintento también falló:', rawText2)
    throw new Error('No se pudo parsear la respuesta del Revenue Agent como JSON válido')
  }
}

// ── Función principal exportable ─────────────────────────────────────────────
export async function analyzeRevenue(): Promise<RevenueAnalysis> {
  const supabase = await createClient()
  const db = supabase as any

  const now     = new Date()
  const d90str  = new Date(now.getTime() - 90 * 86_400_000).toISOString().slice(0, 10)
  const d60str  = new Date(now.getTime() - 60 * 86_400_000).toISOString().slice(0, 10)
  const d30str  = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10)
  const d90iso  = new Date(now.getTime() - 90 * 86_400_000).toISOString()

  // Datos en paralelo
  const [
    opsRes,
    companiesRes,
    processorsRes,
    cashRes,
    spendRes,
    leadsRes,
    clientsRes,
    attributionRes,
  ] = await Promise.all([
    db.from('operations')
      .select('operation_date, amount_usd, profit_clp, company_id, processor_id, client_id, status')
      .gte('operation_date', d90str)
      .neq('status', 'anulada')
      .limit(5000),
    db.from('companies').select('id, name').limit(200),
    db.from('processors').select('id, name, status, daily_limit_usd').order('name').limit(50),
    db.from('cash_positions').select('date, available_clp').order('date', { ascending: false }).limit(5),
    db.from('marketing_spend').select('channel, amount_clp, date').gte('date', d90str).limit(1000),
    db.from('leads')
      .select('source_channel, converted_to_client_id, created_at')
      .gte('created_at', d90iso)
      .limit(10000),
    db.from('clients').select('id, full_name, tags').limit(5000),
    db.from('attribution_truth')
      .select('first_touch_channel, profit_clp, revenue_usd')
      .gte('first_contact_at', d90str)
      .not('profit_clp', 'is', null)
      .limit(2000),
  ])

  type Op = { operation_date: string; amount_usd: number; profit_clp: number; company_id: string; processor_id: string; client_id: string }
  const ops = (opsRes.data ?? []) as Op[]

  // Partición por periodo
  const ops30 = ops.filter(o => o.operation_date >= d30str)
  const ops60 = ops.filter(o => o.operation_date >= d60str)
  const sumUSD    = (arr: Op[]) => arr.reduce((s, o) => s + (o.amount_usd ?? 0), 0)
  const sumProfit = (arr: Op[]) => arr.reduce((s, o) => s + (o.profit_clp ?? 0), 0)

  // Mapas de nombres
  type Company   = { id: string; name: string }
  type Processor = { id: string; name: string; status: string; daily_limit_usd: number | null }
  type Client    = { id: string; full_name: string; tags: string[] | null }

  const companyMap   = Object.fromEntries(((companiesRes.data ?? []) as Company[]).map(c => [c.id, c.name]))
  const processorMap = Object.fromEntries(((processorsRes.data ?? []) as Processor[]).map(p => [p.id, p.name]))
  const clientMap    = Object.fromEntries(((clientsRes.data ?? []) as Client[]).map(c => [c.id, c.full_name]))

  // Top compañías por utilidad (últimos 90d)
  const byCompany: Record<string, { usd: number; profit: number; ops: number }> = {}
  for (const o of ops) {
    const k = companyMap[o.company_id] ?? o.company_id ?? 'Sin empresa'
    byCompany[k] ??= { usd: 0, profit: 0, ops: 0 }
    byCompany[k].usd    += o.amount_usd ?? 0
    byCompany[k].profit += o.profit_clp ?? 0
    byCompany[k].ops    += 1
  }
  const topCompanies = Object.entries(byCompany)
    .sort((a, b) => b[1].profit - a[1].profit)
    .slice(0, 5)

  // Top procesadores por volumen (últimos 90d)
  const byProcessor: Record<string, { usd: number; profit: number; ops: number }> = {}
  for (const o of ops) {
    const k = processorMap[o.processor_id] ?? o.processor_id ?? 'Sin procesador'
    byProcessor[k] ??= { usd: 0, profit: 0, ops: 0 }
    byProcessor[k].usd    += o.amount_usd ?? 0
    byProcessor[k].profit += o.profit_clp ?? 0
    byProcessor[k].ops    += 1
  }
  const topProcessors = Object.entries(byProcessor)
    .sort((a, b) => b[1].usd - a[1].usd)
    .slice(0, 5)

  // Top clientes por volumen (últimos 90d)
  const byClient: Record<string, { usd: number; ops: number }> = {}
  for (const o of ops) {
    const k = clientMap[o.client_id] ?? o.client_id ?? 'Desconocido'
    byClient[k] ??= { usd: 0, ops: 0 }
    byClient[k].usd += o.amount_usd ?? 0
    byClient[k].ops += 1
  }
  const topClients = Object.entries(byClient)
    .sort((a, b) => b[1].usd - a[1].usd)
    .slice(0, 8)

  // Gasto de marketing por canal
  type Spend = { channel: string; amount_clp: number }
  const spendByChannel: Record<string, number> = {}
  for (const s of (spendRes.data ?? []) as Spend[]) {
    spendByChannel[s.channel] = (spendByChannel[s.channel] ?? 0) + s.amount_clp
  }
  const totalSpend = Object.values(spendByChannel).reduce((s, v) => s + v, 0)

  // Leads y conversión por canal
  type Lead = { source_channel: string | null; converted_to_client_id: string | null }
  const leadsByChannel: Record<string, { total: number; converted: number }> = {}
  for (const l of (leadsRes.data ?? []) as Lead[]) {
    const ch = l.source_channel ?? 'otro'
    leadsByChannel[ch] ??= { total: 0, converted: 0 }
    leadsByChannel[ch].total     += 1
    if (l.converted_to_client_id) leadsByChannel[ch].converted += 1
  }

  // Atribución por canal (utilidad real)
  type AttrRow = { first_touch_channel: string | null; profit_clp: number | null }
  const attrByChannel: Record<string, number> = {}
  for (const a of (attributionRes.data ?? []) as AttrRow[]) {
    const ch = a.first_touch_channel ?? 'otro'
    attrByChannel[ch] = (attrByChannel[ch] ?? 0) + (a.profit_clp ?? 0)
  }

  // Caja
  type CashPos = { date: string; available_clp: number }
  const cashPositions = (cashRes.data ?? []) as CashPos[]
  const latestCash = cashPositions[0]

  // Procesadores con estado
  const processorDetails = ((processorsRes.data ?? []) as Processor[])
    .map(p => `  - ${p.name} | ${p.status} | límite: ${p.daily_limit_usd ? `USD ${p.daily_limit_usd}` : 'sin límite'}`)

  // ── Construir prompt ──────────────────────────────────────────────────────
  const lines: string[] = [
    `=== ANÁLISIS FINANCIERO PROFLOW — ${new Date().toLocaleDateString('es-CL')} ===`,
    '',
    '📊 OPERACIONES:',
    `  Últimos 30 días: ${ops30.length} ops | USD ${sumUSD(ops30).toFixed(0)} | Utilidad ${formatCLPshort(sumProfit(ops30))}`,
    `  Últimos 60 días: ${ops60.length} ops | USD ${sumUSD(ops60).toFixed(0)} | Utilidad ${formatCLPshort(sumProfit(ops60))}`,
    `  Últimos 90 días: ${ops.length} ops | USD ${sumUSD(ops).toFixed(0)} | Utilidad ${formatCLPshort(sumProfit(ops))}`,
    ops.length > 0
      ? `  Ticket promedio: USD ${(sumUSD(ops) / ops.length).toFixed(0)} | Utilidad por op: ${formatCLPshort(sumProfit(ops) / ops.length)}`
      : '  Sin operaciones en el período',
    '',
    '🏢 TOP EMPRESAS (últimos 90d):',
    ...topCompanies.map(([name, d]) =>
      `  - ${name}: ${d.ops} ops | USD ${d.usd.toFixed(0)} | Utilidad ${formatCLPshort(d.profit)}`),
    topCompanies.length === 0 ? '  Sin datos' : '',
    '',
    '⚙️ TOP PROCESADORES (últimos 90d):',
    ...topProcessors.map(([name, d]) =>
      `  - ${name}: ${d.ops} ops | USD ${d.usd.toFixed(0)} | Utilidad ${formatCLPshort(d.profit)}`),
    topProcessors.length === 0 ? '  Sin datos' : '',
    '',
    '👥 TOP CLIENTES (últimos 90d):',
    ...topClients.map(([name, d]) =>
      `  - ${name}: ${d.ops} ops | USD ${d.usd.toFixed(0)}`),
    topClients.length === 0 ? '  Sin datos' : '',
    '',
    '💰 CAJA:',
    latestCash
      ? `  Disponible actual: ${formatCLPshort(latestCash.available_clp)} CLP (actualizado ${latestCash.date})`
      : '  Sin registro de caja',
    cashPositions.length > 1
      ? `  Historial reciente: ${cashPositions.slice(0, 4).map(c => formatCLPshort(c.available_clp)).join(' → ')}`
      : '',
    '',
    '🔌 PROCESADORES ACTIVOS:',
    ...processorDetails,
    processorDetails.length === 0 ? '  Sin procesadores' : '',
    '',
    '📣 MARKETING Y CONVERSIÓN (últimos 90d):',
    `  Gasto total: ${formatCLPshort(totalSpend)} CLP`,
    ...Object.entries(spendByChannel).map(([ch, amt]) => {
      const ld = leadsByChannel[ch] ?? { total: 0, converted: 0 }
      const profit = attrByChannel[ch] ?? 0
      const roi = amt > 0 ? ((profit / amt) * 100).toFixed(0) : '—'
      const convRate = ld.total > 0 ? ((ld.converted / ld.total) * 100).toFixed(1) : '0'
      return `  - ${ch}: gasto ${formatCLPshort(amt)} | ${ld.total} leads | ${convRate}% conv | utilidad atribuida ${formatCLPshort(profit)} | ROI ${roi}%`
    }),
    '',
    '📈 LEADS SIN GASTO EN MARKETING (orgánicos/referidos, últimos 90d):',
    ...Object.entries(leadsByChannel)
      .filter(([ch]) => !spendByChannel[ch])
      .map(([ch, d]) => {
        const profit = attrByChannel[ch] ?? 0
        const convRate = d.total > 0 ? ((d.converted / d.total) * 100).toFixed(1) : '0'
        return `  - ${ch}: ${d.total} leads | ${convRate}% conv | utilidad atribuida ${formatCLPshort(profit)}`
      }),
  ]

  return await callRevenueAPI(lines.filter(l => l !== '').join('\n'))
}
