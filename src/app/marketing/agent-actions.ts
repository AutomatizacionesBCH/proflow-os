'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { analyzeAndProposeCampaigns } from '@/lib/agents/marketing-intelligence-agent'
import type { SavedMarketingProposal } from '@/types/agent.types'

// ── Ejecutar el agente y guardar propuestas en BD ─────────────────────────────
export async function runMarketingAgentAction(): Promise<{
  success:    boolean
  count?:     number
  proposals?: SavedMarketingProposal[]
  error?:     string
}> {
  try {
    const proposals = await analyzeAndProposeCampaigns()
    if (!proposals.length) return { success: true, count: 0, proposals: [] }

    const supabase = await createClient()
    const db = supabase as any

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

    const { data, error } = await db
      .from('marketing_proposals')
      .insert(rows)
      .select()

    if (error) throw new Error(error.message)
    revalidatePath('/marketing')
    return { success: true, count: (data ?? []).length, proposals: (data ?? []) as SavedMarketingProposal[] }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    console.error('[runMarketingAgentAction]', message)
    return { success: false, error: message }
  }
}

// ── Descartar una propuesta ───────────────────────────────────────────────────
export async function discardProposalAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await (supabase as any)
      .from('marketing_proposals')
      .update({ status: 'discarded' })
      .eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/marketing')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error' }
  }
}

// ── Marcar propuesta como convertida en campaña ───────────────────────────────
export async function markProposalCreatedAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { error } = await (supabase as any)
      .from('marketing_proposals')
      .update({ status: 'created' })
      .eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/marketing')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error' }
  }
}
