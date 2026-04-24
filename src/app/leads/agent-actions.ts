'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { analyzeLeadWithAI, queryLeadsData } from '@/lib/agents/lead-intelligence-agent'
import type { SavedRecommendation, BehaviorSignal } from '@/types/agent.types'
import type { LeadEvent } from '@/types/leads-marketing.types'

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

    // Obtener leads con heat_score >= 20 (warm + follow_up), excluyendo operated y lost
    const { data: leads, error } = await db
      .from('leads')
      .select('id')
      .gte('heat_score', 20)
      .neq('stage', 'operated')
      .neq('stage', 'lost')
      .order('heat_score', { ascending: false })
      .limit(10) // límite para evitar timeouts

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

// ── Consulta libre sobre el pipeline ─────────────────────────────────────────
export async function queryLeadsWithAIAction(query: string): Promise<{
  success:         boolean
  answer?:         string
  not_applicable?: boolean
  error?:          string
}> {
  try {
    if (!query.trim()) return { success: false, error: 'La consulta no puede estar vacía' }
    const result = await queryLeadsData(query)
    return { success: true, ...result }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[queryLeadsWithAIAction]', message)
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

// ── Obtener detalle completo de un lead (eventos, señales, última rec) ────────
export async function getLeadDetailsAction(leadId: string): Promise<{
  success:             boolean
  events?:             LeadEvent[]
  signals?:            BehaviorSignal[]
  lastRecommendation?: SavedRecommendation | null
  error?:              string
}> {
  try {
    const supabase = await createClient()
    const db = supabase as any

    const [eventsRes, signalsRes, recRes] = await Promise.all([
      db.from('lead_events')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(30),
      db.from('user_behavior_signals')
        .select('*')
        .eq('lead_id', leadId)
        .order('signal_time', { ascending: false })
        .limit(30),
      db.from('marketing_recommendations')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ])

    return {
      success:             true,
      events:              (eventsRes.data ?? []) as LeadEvent[],
      signals:             (signalsRes.data ?? []) as BehaviorSignal[],
      lastRecommendation:  recRes.data ? (recRes.data as SavedRecommendation) : null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[getLeadDetailsAction]', message)
    return { success: false, error: message }
  }
}

// ── Actualizar campos puntuales de un lead ────────────────────────────────────
export async function updateLeadFieldAction(
  leadId: string,
  fields: { stage?: string; assigned_to?: string | null; notes?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { error } = await db
      .from('leads')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', leadId)
    if (error) throw new Error(error.message)
    revalidatePath('/leads')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error' }
  }
}

// ── Registrar señal de comportamiento ─────────────────────────────────────────
export async function registerSignalAction(
  leadId: string,
  signal: { signal_type: string; sentiment: string; intent_level: string; intensity_score: number; description: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const db = supabase as any
    const { error } = await db.from('user_behavior_signals').insert({
      lead_id:         leadId,
      signal_time:     new Date().toISOString(),
      signal_type:     signal.signal_type,
      sentiment:       signal.sentiment,
      intent_level:    signal.intent_level,
      intensity_score: signal.intensity_score,
      description:     signal.description || null,
    })
    if (error) throw new Error(error.message)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error' }
  }
}
