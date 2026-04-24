/* eslint-disable @typescript-eslint/no-explicit-any */
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type ActionResult = { success: true } | { success: false; error: string }

// ── Calcula confidence_score según qué campos están presentes ────────────────
function calcConfidence(record: Record<string, any>): number {
  let score = 0
  if (record.first_touch_channel)    score += 20
  if (record.first_touch_campaign)   score += 10
  if (record.last_touch_channel)     score += 20
  if (record.converted_to_client_at) score += 20
  if (record.operation_id)           score += 15
  if (record.profit_clp)             score += 15
  return score
}

// ── 1. Se llama cuando un lead se convierte en cliente ───────────────────────
export async function updateAttributionOnLeadConversion(
  leadId: string,
  clientId: string
): Promise<ActionResult> {
  const supabase = await createClient()

  // Obtener datos del lead
  const { data: lead, error: leadErr } = await (supabase as any)
    .from('leads')
    .select('source_channel, source_platform, campaign_name, created_at, last_interaction_at')
    .eq('id', leadId)
    .single()

  if (leadErr) return { success: false, error: leadErr.message }

  const l = lead as any
  const now = new Date().toISOString()
  const firstContact = l.created_at ?? now
  const convertedAt  = now

  // Calcular días de conversión
  const conversionDays = Math.round(
    (new Date(convertedAt).getTime() - new Date(firstContact).getTime()) / (1000 * 60 * 60 * 24)
  )

  const record: Record<string, any> = {
    lead_id:                leadId,
    client_id:              clientId,
    first_touch_platform:   l.source_platform ?? null,
    first_touch_channel:    l.source_channel  ?? null,
    first_touch_campaign:   l.campaign_name   ?? null,
    last_touch_platform:    l.source_platform ?? null,
    last_touch_channel:     l.source_channel  ?? null,
    last_touch_campaign:    l.campaign_name   ?? null,
    first_contact_at:       firstContact,
    last_interaction_at:    l.last_interaction_at ?? firstContact,
    converted_to_client_at: convertedAt,
    conversion_days:        conversionDays,
    attribution_model:      'last_touch',
  }
  record.confidence_score = calcConfidence(record)

  // Upsert por lead_id (un lead → un registro de atribución)
  const { data: existing } = await (supabase as any)
    .from('attribution_truth')
    .select('id')
    .eq('lead_id', leadId)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await (supabase as any)
      .from('attribution_truth')
      .update(record)
      .eq('id', existing.id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await (supabase as any)
      .from('attribution_truth')
      .insert(record)
    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/marketing')
  return { success: true }
}

// ── 2. Se llama cuando se registra una operación ─────────────────────────────
export async function updateAttributionOnOperation(
  clientId: string,
  operationId: string
): Promise<ActionResult> {
  const supabase = await createClient()

  // Obtener datos de la operación
  const { data: op, error: opErr } = await supabase
    .from('operations')
    .select('amount_usd, gross_clp, profit_clp, operation_date')
    .eq('id', operationId)
    .single()

  if (opErr) return { success: false, error: opErr.message }

  // Buscar registro de atribución del cliente
  const { data: existing } = await (supabase as any)
    .from('attribution_truth')
    .select('id, confidence_score')
    .eq('client_id', clientId)
    .maybeSingle()

  const updates: Record<string, any> = {
    operation_id:   operationId,
    operation_date: op.operation_date,
    amount_usd:     op.amount_usd,
    revenue_clp:    op.gross_clp,
    profit_clp:     op.profit_clp,
  }

  if (existing?.id) {
    // Recalcular confidence con los nuevos datos
    const newRecord = { ...existing, ...updates }
    updates.confidence_score = calcConfidence(newRecord)

    const { error } = await (supabase as any)
      .from('attribution_truth')
      .update(updates)
      .eq('id', existing.id)
    if (error) return { success: false, error: error.message }
  } else {
    // No hay registro previo del lead — crear con confidence_score bajo
    updates.client_id         = clientId
    updates.attribution_model = 'last_touch'
    updates.confidence_score  = calcConfidence(updates)

    const { error } = await (supabase as any)
      .from('attribution_truth')
      .insert(updates)
    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/marketing')
  return { success: true }
}

// ── 3. Métricas agregadas para el dashboard ───────────────────────────────────
export type AttributionChannelMetric = {
  channel:             string
  leads:               number
  clients:             number
  operations:          number
  conversion_rate:     number   // % leads → clientes
  profit_clp:          number
  avg_conversion_days: number
}

export type AttributionCampaignMetric = {
  campaign:   string
  channel:    string
  clients:    number
  profit_clp: number
}

export type AttributionMetrics = {
  byChannel:  AttributionChannelMetric[]
  byCampaign: AttributionCampaignMetric[]
  totals: {
    total_clients:             number
    total_operations:          number
    total_profit_clp:          number
    avg_conversion_days:       number
  }
}

export async function calculateAttributionMetrics(): Promise<
  { success: true; data: AttributionMetrics } | { success: false; error: string }
> {
  const supabase = await createClient()

  const { data: rows, error } = await (supabase as any)
    .from('attribution_truth')
    .select('last_touch_channel, last_touch_campaign, client_id, operation_id, profit_clp, conversion_days')
    .limit(10000)

  if (error) return { success: false, error: error.message }

  const records = (rows as any[]) ?? []

  // ── Agregación por canal ────────────────────────────────────────────────────
  const channelMap: Record<string, {
    clients: Set<string>
    operations: Set<string>
    profit: number
    convDays: number[]
  }> = {}

  for (const r of records) {
    const ch = r.last_touch_channel ?? 'Sin canal'
    if (!channelMap[ch]) channelMap[ch] = { clients: new Set(), operations: new Set(), profit: 0, convDays: [] }
    if (r.client_id)    channelMap[ch].clients.add(r.client_id)
    if (r.operation_id) channelMap[ch].operations.add(r.operation_id)
    if (r.profit_clp)   channelMap[ch].profit += Number(r.profit_clp)
    if (r.conversion_days != null) channelMap[ch].convDays.push(r.conversion_days)
  }

  // ── Leads por canal desde tabla leads ────────────────────────────────────────
  const { data: leadsData } = await (supabase as any)
    .from('leads')
    .select('source_channel')
    .limit(10000)

  const leadsPerChannel: Record<string, number> = {}
  for (const l of (leadsData as any[]) ?? []) {
    const ch = l.source_channel ?? 'Sin canal'
    leadsPerChannel[ch] = (leadsPerChannel[ch] ?? 0) + 1
  }

  const byChannel: AttributionChannelMetric[] = Object.entries(channelMap).map(([channel, m]) => {
    const leads    = leadsPerChannel[channel] ?? 0
    const clients  = m.clients.size
    const convRate = leads > 0 ? (clients / leads) * 100 : 0
    const avgDays  = m.convDays.length > 0
      ? Math.round(m.convDays.reduce((a, b) => a + b, 0) / m.convDays.length)
      : 0
    return {
      channel,
      leads,
      clients,
      operations:          m.operations.size,
      conversion_rate:     Math.round(convRate * 10) / 10,
      profit_clp:          m.profit,
      avg_conversion_days: avgDays,
    }
  }).sort((a, b) => b.profit_clp - a.profit_clp)

  // ── Agregación por campaña ──────────────────────────────────────────────────
  const campaignMap: Record<string, { channel: string; clients: Set<string>; profit: number }> = {}
  for (const r of records) {
    const key = r.last_touch_campaign ?? 'Sin campaña'
    if (!campaignMap[key]) campaignMap[key] = { channel: r.last_touch_channel ?? '—', clients: new Set(), profit: 0 }
    if (r.client_id)  campaignMap[key].clients.add(r.client_id)
    if (r.profit_clp) campaignMap[key].profit += Number(r.profit_clp)
  }

  const byCampaign: AttributionCampaignMetric[] = Object.entries(campaignMap)
    .map(([campaign, m]) => ({
      campaign,
      channel:    m.channel,
      clients:    m.clients.size,
      profit_clp: m.profit,
    }))
    .sort((a, b) => b.profit_clp - a.profit_clp)
    .slice(0, 10)

  // ── Totales ─────────────────────────────────────────────────────────────────
  const allClients    = new Set(records.filter(r => r.client_id).map(r => r.client_id))
  const allOps        = new Set(records.filter(r => r.operation_id).map(r => r.operation_id))
  const totalProfit   = records.reduce((s, r) => s + (Number(r.profit_clp) || 0), 0)
  const allDays       = records.filter(r => r.conversion_days != null).map(r => r.conversion_days)
  const avgConvDays   = allDays.length > 0
    ? Math.round(allDays.reduce((a: number, b: number) => a + b, 0) / allDays.length)
    : 0

  return {
    success: true,
    data: {
      byChannel,
      byCampaign,
      totals: {
        total_clients:       allClients.size,
        total_operations:    allOps.size,
        total_profit_clp:    totalProfit,
        avg_conversion_days: avgConvDays,
      },
    },
  }
}
