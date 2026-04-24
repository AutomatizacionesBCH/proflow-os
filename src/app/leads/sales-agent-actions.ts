'use server'

import { createClient } from '@/lib/supabase/server'
import { analyzeSalesOpportunity } from '@/lib/agents/sales-agent'
import type { SavedSalesAnalysis } from '@/types/agent.types'

// ── Analizar un lead específico ───────────────────────────────────────────────
export async function analyzeSalesAction(
  leadId: string
): Promise<{ success: boolean; data?: SavedSalesAnalysis; error?: string }> {
  try {
    const analysis = await analyzeSalesOpportunity(leadId)

    const supabase = await createClient()
    const db = supabase as any

    const { data, error } = await db
      .from('sales_analyses')
      .insert({
        lead_id:            leadId,
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
      .select()
      .single()

    if (error) throw new Error(error.message)
    return { success: true, data: data as SavedSalesAnalysis }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[analyzeSalesAction]', message)
    return { success: false, error: message }
  }
}

// ── Analizar todos los leads hot y warm ───────────────────────────────────────
export async function analyzeAllWarmLeadsAction(): Promise<{
  success:   boolean
  count?:    number
  analyses?: SavedSalesAnalysis[]
  error?:    string
}> {
  try {
    const supabase = await createClient()
    const db = supabase as any

    const { data: leads, error } = await db
      .from('leads')
      .select('id')
      .in('priority_label', ['hot', 'warm'])
      .neq('stage', 'operated')
      .neq('stage', 'lost')
      .order('heat_score', { ascending: false })
      .limit(10)

    if (error) throw new Error(error.message)
    if (!leads || leads.length === 0) return { success: true, count: 0, analyses: [] }

    const saved: SavedSalesAnalysis[] = []

    for (const lead of leads) {
      try {
        const analysis = await analyzeSalesOpportunity(lead.id)
        const { data } = await db
          .from('sales_analyses')
          .insert({
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
          .select()
          .single()
        if (data) saved.push(data as SavedSalesAnalysis)
      } catch (e) {
        console.error(`[analyzeAllWarmLeads] Error en lead ${lead.id}:`, e)
      }
    }

    return { success: true, count: saved.length, analyses: saved }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[analyzeAllWarmLeadsAction]', message)
    return { success: false, error: message }
  }
}
