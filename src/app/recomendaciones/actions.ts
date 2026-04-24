'use server'

import { createClient }           from '@/lib/supabase/server'
import { revalidatePath }          from 'next/cache'
import { analyzeRevenue }          from '@/lib/agents/revenue-agent'
import { analyzeAndProposeCampaigns } from '@/lib/agents/marketing-intelligence-agent'
import { analyzeSalesOpportunity } from '@/lib/agents/sales-agent'

// ── Aprobar una recomendación individual ──────────────────────────────────────
export async function approveRecommendationAction(
  source: string,
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const db = supabase as any

    if (source === 'lead_intelligence') {
      const { error } = await db
        .from('marketing_recommendations')
        .update({ status: 'aprobada', approved_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    } else if (source === 'sales_agent') {
      const { error } = await db
        .from('sales_analyses')
        .update({ status: 'aprobada' })
        .eq('id', id)
      if (error) throw new Error(error.message)
    } else if (source === 'marketing_agent') {
      const { error } = await db
        .from('marketing_proposals')
        .update({ status: 'created' })
        .eq('id', id)
      if (error) throw new Error(error.message)
    }
    // revenue_agent: recomendaciones viven dentro del JSONB del análisis, sin estado individual

    revalidatePath('/recomendaciones')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ── Descartar una recomendación individual ────────────────────────────────────
export async function dismissRecommendationAction(
  source: string,
  id: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const db = supabase as any

    if (source === 'lead_intelligence') {
      const { error } = await db
        .from('marketing_recommendations')
        .update({ status: 'descartada', dismissed_reason: reason ?? null })
        .eq('id', id)
      if (error) throw new Error(error.message)
    } else if (source === 'sales_agent') {
      const { error } = await db
        .from('sales_analyses')
        .update({ status: 'descartada' })
        .eq('id', id)
      if (error) throw new Error(error.message)
    } else if (source === 'marketing_agent') {
      const { error } = await db
        .from('marketing_proposals')
        .update({ status: 'discarded' })
        .eq('id', id)
      if (error) throw new Error(error.message)
    }

    revalidatePath('/recomendaciones')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ── Aprobar todas las recomendaciones urgentes ────────────────────────────────
export async function approveAllUrgentAction(): Promise<{
  success: boolean
  count?:  number
  error?:  string
}> {
  try {
    const supabase = await createClient()
    const db = supabase as any
    let count = 0
    const now = new Date().toISOString()

    // Lead Intelligence — urgency alta y pendiente
    const { data: leadRecs } = await db
      .from('marketing_recommendations')
      .select('id')
      .eq('urgency', 'alta')
      .eq('status', 'pendiente')
    if (leadRecs?.length) {
      await db
        .from('marketing_recommendations')
        .update({ status: 'aprobada', approved_at: now })
        .in('id', leadRecs.map((r: any) => r.id))
      count += leadRecs.length
    }

    // Sales Agent — confianza >= 70 y pendiente
    const { data: sales } = await db
      .from('sales_analyses')
      .select('id, confidence_score')
      .eq('status', 'pendiente')
    const highConf = (sales ?? []).filter((s: any) => s.confidence_score >= 70)
    if (highConf.length) {
      await db
        .from('sales_analyses')
        .update({ status: 'aprobada' })
        .in('id', highConf.map((s: any) => s.id))
      count += highConf.length
    }

    // Marketing Agent — prioridad alta y pendiente
    const { data: proposals } = await db
      .from('marketing_proposals')
      .select('id')
      .eq('priority', 'alta')
      .eq('status', 'pending')
    if (proposals?.length) {
      await db
        .from('marketing_proposals')
        .update({ status: 'created' })
        .in('id', proposals.map((p: any) => p.id))
      count += proposals.length
    }

    revalidatePath('/recomendaciones')
    return { success: true, count }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ── Ejecutar todos los agentes IA en paralelo ─────────────────────────────────
export async function runAllAgentsAction(): Promise<{
  success:  boolean
  results?: { agent: string; status: 'ok' | 'error'; count?: number; error?: string }[]
  error?:   string
}> {
  const supabase = await createClient()
  const db = supabase as any
  const results: { agent: string; status: 'ok' | 'error'; count?: number; error?: string }[] = []

  // Revenue Agent
  try {
    const analysis = await analyzeRevenue()
    await db.from('revenue_analyses').insert({ analysis_data: analysis })
    results.push({ agent: 'Revenue Agent', status: 'ok', count: analysis.recommendations.length })
  } catch (e) {
    results.push({ agent: 'Revenue Agent', status: 'error', error: e instanceof Error ? e.message : 'Error' })
  }

  // Marketing Intelligence Agent
  try {
    const proposals = await analyzeAndProposeCampaigns()
    if (proposals.length > 0) {
      const rows = proposals.map(p => ({
        audience_name:        p.audience_name,
        audience_description: p.audience_description,
        estimated_size:       p.estimated_size ?? 0,
        campaign_objective:   p.campaign_objective,
        suggested_channel:    p.suggested_channel,
        suggested_copy:       p.suggested_copy,
        expected_impact:      p.expected_impact,
        priority:             p.priority,
        reasoning:            p.reasoning,
        status:               'pending',
      }))
      await db.from('marketing_proposals').insert(rows)
    }
    results.push({ agent: 'Marketing Intelligence', status: 'ok', count: proposals.length })
  } catch (e) {
    results.push({ agent: 'Marketing Intelligence', status: 'error', error: e instanceof Error ? e.message : 'Error' })
  }

  // Sales Agent — top 5 leads hot/warm para no superar timeout
  try {
    const { data: leads } = await db
      .from('leads')
      .select('id')
      .in('priority_label', ['hot', 'warm'])
      .neq('stage', 'operated')
      .neq('stage', 'lost')
      .order('heat_score', { ascending: false })
      .limit(5)

    let salesCount = 0
    for (const lead of leads ?? []) {
      try {
        const analysis = await analyzeSalesOpportunity(lead.id)
        await db.from('sales_analyses').insert({
          lead_id:            lead.id,
          lead_name:          analysis.lead_name,
          closing_strategy:   analysis.closing_strategy,
          main_objection:     analysis.main_objection,
          objection_response: analysis.objection_response,
          suggested_message:  analysis.suggested_message,
          best_channel:       analysis.best_channel,
          best_time:          analysis.best_time,
          confidence_score:   analysis.confidence_score,
          urgency_reason:     analysis.urgency_reason,
          assigned_to:        analysis.assigned_to,
        })
        salesCount++
      } catch {}
    }
    results.push({ agent: 'Sales Agent', status: 'ok', count: salesCount })
  } catch (e) {
    results.push({ agent: 'Sales Agent', status: 'error', error: e instanceof Error ? e.message : 'Error' })
  }

  revalidatePath('/recomendaciones')
  revalidatePath('/dashboard')
  revalidatePath('/marketing')
  revalidatePath('/leads')
  return { success: true, results }
}
