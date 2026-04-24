'use server'

import { createClient } from '@/lib/supabase/server'
import { analyzeLeadWithAI } from '@/lib/agents/lead-intelligence-agent'
import type { SavedRecommendation } from '@/types/agent.types'

// ── Analizar un lead individual ───────────────────────────────────────────────
export async function analyzeLeadAction(
  leadId: string
): Promise<{ success: boolean; data?: SavedRecommendation; error?: string }> {
  try {
    const recommendation = await analyzeLeadWithAI(leadId)

    const supabase = await createClient()
    const db = supabase as any

    const { data, error } = await db
      .from('marketing_recommendations')
      .insert({
        lead_id:                    leadId,
        lead_name:                  recommendation.lead_name,
        heat_score:                 recommendation.heat_score,
        priority_label:             recommendation.priority_label,
        lead_type:                  recommendation.lead_type,
        assigned_to_recommendation: recommendation.assigned_to_recommendation,
        next_best_action:           recommendation.next_best_action,
        reasoning:                  recommendation.reasoning,
        urgency:                    recommendation.urgency,
        suggested_message:          recommendation.suggested_message,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    return { success: true, data: data as SavedRecommendation }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[analyzeLeadAction]', message)
    return { success: false, error: message }
  }
}

// ── Analizar todos los leads calientes (heat_score > 40) ──────────────────────
export async function analyzeAllHotLeadsAction(): Promise<{
  success:         boolean
  count?:          number
  recommendations?: SavedRecommendation[]
  error?:          string
}> {
  try {
    const supabase = await createClient()
    const db = supabase as any

    // Obtener leads con heat_score > 40, excluyendo operated y lost
    const { data: leads, error } = await db
      .from('leads')
      .select('id')
      .gt('heat_score', 40)
      .neq('stage', 'operated')
      .neq('stage', 'lost')
      .order('heat_score', { ascending: false })
      .limit(15) // límite para evitar timeouts

    if (error) throw new Error(error.message)
    if (!leads || leads.length === 0) return { success: true, count: 0, recommendations: [] }

    const savedRecs: SavedRecommendation[] = []

    for (const lead of leads) {
      try {
        const rec = await analyzeLeadWithAI(lead.id)

        const { data: saved } = await db
          .from('marketing_recommendations')
          .insert({
            lead_id:                    lead.id,
            lead_name:                  rec.lead_name,
            heat_score:                 rec.heat_score,
            priority_label:             rec.priority_label,
            lead_type:                  rec.lead_type,
            assigned_to_recommendation: rec.assigned_to_recommendation,
            next_best_action:           rec.next_best_action,
            reasoning:                  rec.reasoning,
            urgency:                    rec.urgency,
            suggested_message:          rec.suggested_message,
          })
          .select()
          .single()

        if (saved) savedRecs.push(saved as SavedRecommendation)
      } catch (e) {
        console.error(`[analyzeAllHotLeads] Error en lead ${lead.id}:`, e)
      }
    }

    return { success: true, count: savedRecs.length, recommendations: savedRecs }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[analyzeAllHotLeadsAction]', message)
    return { success: false, error: message }
  }
}

// ── Marcar recomendación como vista ──────────────────────────────────────────
export async function markRecommendationViewedAction(id: string): Promise<void> {
  const supabase = await createClient()
  const db = supabase as any
  await db
    .from('marketing_recommendations')
    .update({ viewed_at: new Date().toISOString() })
    .eq('id', id)
}
